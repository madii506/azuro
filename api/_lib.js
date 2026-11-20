// AZURO server library. Every launch is pre-backed: the platform buys the new coin three times (0.5 SOL each)
// inside the launch transaction, burns every token it bought and closes its token account. The creator signs in
// their own wallet; the platform signs last, only the exact message it built. No other custody.
const { Connection, PublicKey, Keypair, VersionedTransaction, TransactionMessage, ComputeBudgetProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, NATIVE_MINT, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction,
  createBurnCheckedInstruction, createCloseAccountInstruction } = require('@solana/spl-token');
const BN = require('bn.js');
const crypto = require('crypto');

const MOCK = process.env.AZ_MOCK === '1';
const SITE = (process.env.SITE_URL || 'https://azuro-iota.vercel.app').replace(/\/$/, '');
const RPCS = [process.env.RPC_URL, 'https://api.mainnet-beta.solana.com', 'https://solana-rpc.publicnode.com'].filter(Boolean);
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// the rules, all overridable from the environment
const RULES = {
  backBuys: 3,
  backLamports: Math.round(+(process.env.BACK_SOL || 0.5) * 1e9),         // each platform buy
  devMaxLamports: Math.round(+(process.env.DEV_MAX_SOL || 0.5) * 1e9),     // dev buy cap
  reserveLamports: Math.round(+(process.env.POOL_RESERVE_SOL || 0.03) * 1e9), // kept in the pool for fees and rent
  perWalletPerDay: +(process.env.LAUNCHES_PER_WALLET_PER_DAY || 2),
  perDay: +(process.env.BACKED_PER_DAY || 40),
  priorityMicroLamports: +(process.env.PRIORITY_MICRO_LAMPORTS || 150000),
  dupDistance: 30,                                                       // of 256 dHash bits; this close (and the same colours) is "the same image"
};
const DEC = 6, SUPPLY = 1_000_000_000;

const out = (res, code, body, cache) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', cache || 'no-store'); res.end(JSON.stringify(body)); };
const safeJSON = s => { try { return JSON.parse(s || '{}'); } catch { return {}; } };
const body = req => new Promise(ok => { if (req.body) return ok(typeof req.body === 'string' ? safeJSON(req.body) : req.body); let d = ''; req.on('data', c => { d += c; if (d.length > 4e6) req.destroy(); }); req.on('end', () => ok(safeJSON(d))); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = (m, code) => { const e = new Error(m); e.user = true; e.code = code || 400; throw e; };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const wrap = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (e) {
    if (!e.user) console.error(e);
    out(res, e.user ? (e.code || 400) : 500, { ok: false, error: e.user ? e.message : 'Something went wrong on our side. Nothing was sent.' });
  }
};

async function getJ(url, init, ms = 9000) {
  for (let k = 0; k < 2; k++) {
    const r = await fetch(url, Object.assign({ signal: AbortSignal.timeout(ms), headers: { accept: 'application/json' } }, init || {}));
    if (r.status === 429 && !k) { await sleep(1200); continue; }
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { }
    if (!r.ok) { const e = new Error((j && (j.error || j.message)) || url.split('/')[2] + ' ' + r.status); e.status = r.status; throw e; }
    return j;
  }
}

const cache = new Map(), flying = new Map();
async function memo(k, ttl, fn) {
  const c = cache.get(k); if (c && Date.now() - c.t < ttl) return c.v;
  if (flying.has(k)) return flying.get(k);
  const p = (async () => { try { const v = await fn(); cache.set(k, { t: Date.now(), v }); return v; } catch (e) { if (c) return c.v; throw e; } finally { flying.delete(k); } })();
  flying.set(k, p); return p;
}
const forget = (...keys) => { for (const k of [...cache.keys()]) if (keys.some(p => k.startsWith(p))) cache.delete(k); };

// ---------------------------------------------------------------- Solana
let mock = null;
if (MOCK) mock = require(process.env.AZ_MOCK_MODULE);
async function rpc(method, params) {
  if (MOCK) return mock.rpc(method, params);
  let last;
  for (const u of RPCS) {
    try {
      const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(12000) });
      if (r.status === 429 || r.status === 401 || r.status === 403 || r.status >= 500) { last = new Error('Solana RPC ' + r.status); continue; }
      const j = await r.json();
      if (j.error) { last = new Error(j.error.message || 'Solana RPC error'); if (/busy|rate|limit|timeout|unavailable/i.test(last.message)) continue; throw last; }
      return j.result;
    } catch (e) { last = e; }
  }
  throw last || new Error('Solana is busy, try again');
}
let _conn = null;
const conn = () => _conn || (_conn = MOCK ? mock.connection() : new Connection(RPCS[0], 'confirmed'));

let _sdk = null;
function pump() {
  if (_sdk) return _sdk;
  const S = require('@pump-fun/pump-sdk');
  _sdk = { S, sdk: S.PUMP_SDK, online: () => new S.OnlinePumpSdk(conn()) };
  return _sdk;
}

// the platform wallet: the backing pool. Its key lives only in the server environment.
let _pk;
function platform() {
  if (_pk !== undefined) return _pk;
  const raw = (process.env.PLATFORM_KEY || '').trim();
  _pk = null;
  if (raw) {
    try {
      const bytes = raw.startsWith('[') ? Uint8Array.from(JSON.parse(raw)) : require('bs58').decode(raw);
      _pk = Keypair.fromSecretKey(bytes);
    } catch { _pk = null; }
  }
  return _pk;
}
const poolAddress = () => (platform() && platform().publicKey.toBase58()) || (B58.test(process.env.POOL_ADDRESS || '') ? process.env.POOL_ADDRESS : null);

async function solUsd() {
  return memo('solusd', 30000, async () => {
    if (MOCK) return mock.solUsd();
    try { const j = await getJ('https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112'); const p = j && j.So11111111111111111111111111111111111111112; if (p && p.usdPrice) return +p.usdPrice; } catch { }
    try { const j = await getJ('https://api.coinbase.com/v2/prices/SOL-USD/spot'); return +j.data.amount; } catch { }
    return null;
  });
}

async function poolState() {
  return memo('pool', 8000, async () => {
    const addr = poolAddress();
    if (!addr) return { address: null, connected: false, lamports: null, capacity: 0, canLaunch: false };
    const r = await rpc('getBalance', [addr, { commitment: 'confirmed' }]).catch(() => null);
    const lamports = r ? (r.value != null ? r.value : r) : null;
    const per = RULES.backLamports * RULES.backBuys + 3_000_000;   // three buys, plus a little for the account rent round-trip
    const capacity = lamports == null ? 0 : Math.max(0, Math.floor((lamports - RULES.reserveLamports) / per));
    return { address: addr, connected: !!platform(), lamports, capacity, canLaunch: !!platform() && capacity > 0 };
  });
}

// ---------------------------------------------------------------- the registry (Postgres)
let pg = null, pgReady = null;
function db() {
  if (pg) return pg;
  if (process.env.AZ_PGLITE) { const { PGlite } = require(process.env.AZ_PGLITE); const lite = new PGlite(); pg = (s, ...v) => lite.sql(s, ...v).then(r => r.rows); return pg; }
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL; if (!url) return null;
  const { neon } = require('@neondatabase/serverless'); pg = neon(url); return pg;
}
async function ensure() {
  const q = db(); if (!q) return null;
  if (!pgReady) pgReady = (async () => {
    await q`create table if not exists az_launch (
      id text primary key, mint text unique not null, creator text not null, name text not null, ticker text not null, tkey text not null,
      descr text, x text, tg text, web text, img_sha text not null, img_dhash text not null, img_color text, meta_uri text,
      dev_lamports bigint default 0, back_lamports bigint default 0, burned text, floor_q text, floor_t text, start_q text, start_t text,
      msg_hash text, status text not null, sig text, err text, created timestamptz default now(), live_at timestamptz)`;
    await q`create table if not exists az_media (id text primary key, mime text not null, data text not null, meta text, created timestamptz default now())`;
    await q`create index if not exists az_launch_status on az_launch (status, created desc)`;
    await q`create table if not exists az_kv (k text primary key, v text)`;
    return q;
  })().catch(e => { pgReady = null; throw e; });
  return pgReady;
}

// ---------------------------------------------------------------- images: one image, once
// "one image, once": a 256-bit difference hash at four crop levels (so a trimmed or re-bordered copy still matches),
// plus mirrored probes for a flipped copy, and a 4x4 colour grid so two different images with similar shapes pass
function imageHash(png) {
  const UPNG = require('upng-js');
  const img = UPNG.decode(png);
  const rgba = new Uint8Array(UPNG.toRGBA8(img)[0]);
  const W = img.width, H = img.height;
  const cell = (x0, x1, y0, y1) => {
    let r = 0, g = 0, b = 0, n = 0;
    const sx = Math.max(1, Math.floor((x1 - x0) / 12)), sy = Math.max(1, Math.floor((y1 - y0) / 12));
    for (let yy = y0; yy < y1; yy += sy) for (let xx = x0; xx < x1; xx += sx) { const i = (yy * W + xx) * 4, a = rgba[i + 3] / 255; r += rgba[i] * a + 255 * (1 - a); g += rgba[i + 1] * a + 255 * (1 - a); b += rgba[i + 2] * a + 255 * (1 - a); n++; }
    return [r / n, g / n, b / n];
  };
  const span = (lo, hi, i, n) => { const a = Math.floor(lo + i * (hi - lo) / n); return [a, Math.max(a + 1, Math.floor(lo + (i + 1) * (hi - lo) / n))]; };
  const hash = (c, flip) => {
    const gw = 17, gh = 16, lum = [];
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const [x0, x1] = span(W * c, W * (1 - c), flip ? gw - 1 - x : x, gw), [y0, y1] = span(H * c, H * (1 - c), y, gh);
      const v = cell(x0, x1, y0, y1); lum.push(v[0] * 0.299 + v[1] * 0.587 + v[2] * 0.114);
    }
    let hex = '';
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw - 1; x += 4) { let n = 0; for (let k = 0; k < 4; k++) n = n * 2 + (lum[y * gw + x + k] > lum[y * gw + x + k + 1] + 1.5 ? 1 : 0); hex += n.toString(16); }
    return hex;
  };
  const colors = flip => { let s = ''; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const [x0, x1] = span(0, W, flip ? 3 - x : x, 4), [y0, y1] = span(0, H, y, 4); for (const v of cell(x0, x1, y0, y1)) s += Math.round(v).toString(16).padStart(2, '0'); } return s; };
  const CROPS = [0, 0.03, 0.06, 0.09], color = colors(false), mirror = colors(true);
  return { dhash: CROPS.map(c => hash(c, false)).join(','), color, probe: CROPS.flatMap(c => [{ h: hash(c, false), col: color }, { h: hash(c, true), col: mirror }]) };
}
const colorDistance = (a, b) => { if (!a || !b || a.length !== b.length) return 255; let s = 0; for (let i = 0; i < a.length; i += 2) s += Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)); return s / (a.length / 2); };
const POP = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
const hamming = (a, b) => { if (!a || !b || a.length !== b.length) return 999; let n = 0; for (let i = 0; i < a.length; i++) n += POP[parseInt(a[i], 16) ^ parseInt(b[i], 16)]; return n; };
// is a new image (its probes) the same picture as a stored one (its crop hashes and colours)?
const nearImage = (storedHash, storedColor, probe) => probe.some(p => colorDistance(storedColor, p.col) < 22 && String(storedHash || '').split(',').some(s => hamming(s, p.h) <= RULES.dupDistance));

// ---------------------------------------------------------------- the curve: math the site shows, from the program's own numbers
const lam = v => +(v instanceof BN ? v.toString() : v) / 1e9;
const tok = v => +(v instanceof BN ? v.toString() : v) / 10 ** DEC;
function curveView(c, floorQ, floorT, burned, sol) {
  // c: decoded curve (BN fields) or plain strings; price in SOL per whole token
  const vQ = +String(c.virtualQuoteReserves || c.virtualSolReserves), vT = +String(c.virtualTokenReserves);
  const price = vT ? (vQ / 1e9) / (vT / 1e6) : null;
  const supply = SUPPLY - (burned ? +burned / 1e6 : 0);
  const fq = floorQ ? +floorQ : null, ft = floorT ? +floorT : null;
  const floor = fq && ft ? (fq / 1e9) / (ft / 1e6) : null;
  const realT = +String(c.realTokenReserves);
  const progress = Math.max(0, Math.min(1, 1 - realT / 793_100_000e6));
  return {
    price, priceUsd: price != null && sol ? price * sol : null,
    mcapSol: price != null ? price * supply : null, mcapUsd: price != null && sol ? price * supply * sol : null,
    floor, floorUsd: floor != null && sol ? floor * sol : null, floorMcapUsd: floor != null && sol ? floor * supply * sol : null,
    aboveFloor: price && floor ? price / floor : null,
    progress, complete: !!c.complete, curveSol: +String(c.realQuoteReserves || c.realSolReserves || 0) / 1e9, supply,
  };
}

module.exports = {
  MOCK, SITE, RULES, B58, DEC, SUPPLY, out, body, sleep, fail, sha, wrap, getJ, memo, forget, rpc, conn, pump, platform, poolAddress, solUsd, poolState,
  db, ensure, imageHash, colorDistance, hamming, nearImage, lam, tok, curveView,
  web3: { PublicKey, Keypair, VersionedTransaction, TransactionMessage, ComputeBudgetProgram, LAMPORTS_PER_SOL },
  spl: { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, NATIVE_MINT, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction, createBurnCheckedInstruction, createCloseAccountInstruction },
  BN,
};
