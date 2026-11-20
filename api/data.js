// AZURO data: the registry joined with each coin's live bonding curve. Everything shown is read, nothing is made up:
// prices and the floor come from the curve's own reserves, the pool from the pool wallet's balance.
const L = require('./_lib');
const { PublicKey } = L.web3;
const { TOKEN_2022_PROGRAM_ID } = L.spl;

async function rows() {
  return L.memo('rows', 5000, async () => {
    const q = await L.ensure(); if (!q) return { on: false, rows: [] };
    const r = await q`select id, mint, creator, name, ticker, descr, x, tg, web, sig, status, created, live_at, back_lamports, burned, floor_q, floor_t, start_q, start_t, dev_lamports from az_launch where status in ('live','sent') order by created desc limit 600`;
    // a launch that was sent but never confirmed back to us: ask Solana once
    const sent = r.filter(x => x.status === 'sent' && x.sig && Date.now() - new Date(x.created).getTime() > 20000);
    if (sent.length) {
      const st = await L.rpc('getSignatureStatuses', [sent.map(x => x.sig), { searchTransactionHistory: true }]).catch(() => null);
      for (const [i, x] of sent.entries()) {
        const s = st && st.value && st.value[i];
        if (s && !s.err && s.confirmationStatus) { x.status = 'live'; await q`update az_launch set status = 'live', live_at = coalesce(live_at, now()) where id = ${x.id}`.catch(() => { }); }
        else if (s && s.err) { x.status = 'failed'; await q`update az_launch set status = 'failed', err = ${JSON.stringify(s.err)} where id = ${x.id}`.catch(() => { }); }
        else if (Date.now() - new Date(x.created).getTime() > 600000) { x.status = 'failed'; await q`update az_launch set status = 'failed', err = 'never landed' where id = ${x.id}`.catch(() => { }); }
      }
    }
    return { on: true, rows: r.filter(x => x.status === 'live' || x.status === 'sent') };
  });
}

async function curves(list) {
  const key = 'curves:' + list.map(r => r.mint).join(',').slice(0, 2000);
  return L.memo(key, 6000, async () => {
    if (!list.length) return {};
    if (L.MOCK) return require(process.env.AZ_MOCK_MODULE).curvesFor(list);
    const { S, sdk } = L.pump(), out = {};
    for (let i = 0; i < list.length; i += 100) {
      const chunk = list.slice(i, i + 100);
      const r = await L.rpc('getMultipleAccounts', [chunk.map(x => S.bondingCurvePda(x.mint).toBase58()), { encoding: 'base64', commitment: 'confirmed' }]).catch(() => null);
      (r && r.value || []).forEach((a, j) => {
        if (!a) return;
        try { out[chunk[j].mint] = sdk.decodeBondingCurveNullable({ data: Buffer.from(a.data[0], 'base64'), owner: new PublicKey(a.owner), lamports: a.lamports, executable: false }); } catch { }
      });
    }
    return out;
  });
}

// graduated coins trade in their PumpSwap pool: read the market there
async function dex(mints) {
  if (!mints.length || L.MOCK) return {};
  return L.memo('dex:' + mints.join(','), 30000, async () => {
    const out = {};
    for (let i = 0; i < mints.length; i += 30) {
      try {
        const j = await L.getJ('https://api.dexscreener.com/latest/dex/tokens/' + mints.slice(i, i + 30).join(','));
        for (const p of (j && j.pairs) || []) {
          const m = p.baseToken && p.baseToken.address; if (!m || (out[m] && (out[m].liq || 0) > ((p.liquidity && p.liquidity.usd) || 0))) continue;
          out[m] = { priceUsd: +p.priceUsd || null, priceSol: +p.priceNative || null, mcapUsd: p.marketCap || p.fdv || null, liq: p.liquidity && p.liquidity.usd || null, vol24: p.volume && p.volume.h24 || null, ch24: p.priceChange && p.priceChange.h24, url: p.url };
        }
      } catch { }
    }
    return out;
  });
}

function view(r, c, d, sol) {
  const base = {
    id: r.id, mint: r.mint, name: r.name, ticker: r.ticker, creator: r.creator, img: `/i/${r.id}.png`, descr: r.descr || '', x: r.x || '', tg: r.tg || '', web: r.web || '',
    sig: r.sig, status: r.status, created: r.created, live: r.live_at, backSol: +r.back_lamports / 1e9 || null, burned: r.burned ? +r.burned / 1e6 : null,
    devSol: +r.dev_lamports / 1e9 || 0,
  };
  if (!c) return Object.assign(base, { curve: null });
  const v = L.curveView(c, r.floor_q, r.floor_t, r.burned, sol);
  if (v.complete && d) { v.price = d.priceSol; v.priceUsd = d.priceUsd; v.mcapUsd = d.mcapUsd; v.aboveFloor = d.priceSol && v.floor ? d.priceSol / v.floor : null; v.dex = d; }
  return Object.assign(base, { curve: v });
}

async function coins() {
  return L.memo('coins', 5000, async () => {
    const [{ on, rows: R }, sol] = await Promise.all([rows(), L.solUsd()]);
    const C = await curves(R);
    const grads = R.filter(r => C[r.mint] && C[r.mint].complete).map(r => r.mint);
    const D = await dex(grads);
    return { registry: on, sol, coins: R.map(r => view(r, C[r.mint], D[r.mint], sol)) };
  });
}

async function home() {
  return L.memo('home', 5000, async () => {
    const [c, pool] = await Promise.all([coins(), L.poolState()]);
    const day = Date.now() - 864e5;
    const live = c.coins;
    return {
      ok: true, registry: c.registry, sol: c.sol, pool, rules: { backSol: L.RULES.backLamports / 1e9, backBuys: L.RULES.backBuys, devMaxSol: L.RULES.devMaxLamports / 1e9, perDay: L.RULES.perDay, perWalletPerDay: L.RULES.perWalletPerDay },
      counts: { coins: live.length, today: live.filter(x => new Date(x.created).getTime() > day).length, lockedSol: live.reduce((s, x) => s + (x.backSol || 0), 0), burned: live.reduce((s, x) => s + (x.burned || 0), 0), graduated: live.filter(x => x.curve && x.curve.complete).length },
      latest: live.slice(0, 12),
      wall: live.slice(0, 400).map(x => ({ t: x.ticker, m: x.mint, a: x.curve ? x.curve.aboveFloor : null, g: !!(x.curve && x.curve.complete) })),
    };
  });
}

async function holders(mint) {
  return L.memo('holders:' + mint, 20000, async () => {
    const r = await L.rpc('getTokenLargestAccounts', [mint, { commitment: 'confirmed' }]).catch(() => null);
    const list = (r && r.value || []).filter(a => +a.amount > 0).slice(0, 15);
    if (!list.length) return [];
    const owners = await L.rpc('getMultipleAccounts', [list.map(a => a.address), { encoding: 'jsonParsed' }]).catch(() => null);
    const curveAta = (() => { try { const { S } = L.pump(); return L.spl.getAssociatedTokenAddressSync(new PublicKey(mint), S.bondingCurvePda(mint), true, TOKEN_2022_PROGRAM_ID).toBase58(); } catch { return null; } })();
    return list.map((a, i) => {
      const o = owners && owners.value && owners.value[i] && owners.value[i].data && owners.value[i].data.parsed && owners.value[i].data.parsed.info && owners.value[i].data.parsed.info.owner;
      return { account: a.address, owner: o || null, amount: +a.amount / 1e6, curve: a.address === curveAta };
    });
  });
}

async function coin(mint, wallet) {
  if (!L.B58.test(mint)) L.fail('bad mint');
  const c = await coins();
  const x = c.coins.find(k => k.mint === mint);
  if (!x) return { ok: true, found: false, registry: c.registry };
  const [h, you] = await Promise.all([holders(mint).catch(() => []), wallet && L.B58.test(wallet) ? balanceOf(wallet, mint).catch(() => null) : null]);
  const q = await L.ensure();
  let start = null;
  if (q) { const [r] = await q`select start_q, start_t, floor_q, floor_t from az_launch where mint = ${mint}`; start = r || null; }
  return { ok: true, found: true, sol: c.sol, coin: x, holders: h, you, math: start && { startQ: start.start_q, startT: start.start_t, floorQ: start.floor_q, floorT: start.floor_t } };
}

async function balanceOf(owner, mint) {
  const r = await L.rpc('getTokenAccountsByOwner', [owner, { mint }, { encoding: 'jsonParsed', commitment: 'confirmed' }]);
  let n = 0; for (const a of (r && r.value) || []) n += +(a.account.data.parsed.info.tokenAmount.uiAmount || 0);
  return n;
}

async function ledger(wallet) {
  if (!L.B58.test(wallet)) L.fail('bad wallet');
  const c = await coins();
  const by = Object.fromEntries(c.coins.map(x => [x.mint, x]));
  const r = await L.rpc('getTokenAccountsByOwner', [wallet, { programId: TOKEN_2022_PROGRAM_ID.toBase58() }, { encoding: 'jsonParsed', commitment: 'confirmed' }]).catch(() => null);
  const held = [];
  for (const a of (r && r.value) || []) {
    const i = a.account.data.parsed.info, x = by[i.mint]; if (!x) continue;
    const amt = +(i.tokenAmount.uiAmount || 0); if (!amt) continue;
    held.push({ mint: i.mint, ticker: x.ticker, name: x.name, img: x.img, amount: amt, valueSol: x.curve && x.curve.price ? amt * x.curve.price : null, aboveFloor: x.curve ? x.curve.aboveFloor : null, grad: !!(x.curve && x.curve.complete) });
  }
  const mine = c.coins.filter(x => x.creator === wallet);
  return { ok: true, sol: c.sol, held, mine };
}

async function chart(mint) {
  if (!L.B58.test(mint)) L.fail('bad mint');
  return L.memo('chart:' + mint, 30000, async () => {
    if (L.MOCK) return { ok: true, candles: require(process.env.AZ_MOCK_MODULE).candles ? require(process.env.AZ_MOCK_MODULE).candles(mint) : [] };
    try {
      const p = await L.getJ(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools?page=1`, { headers: { accept: 'application/json;version=20230302' } });
      const pool = p && p.data && p.data[0] && p.data[0].attributes && p.data[0].attributes.address;
      if (!pool) return { ok: true, candles: [] };
      const o = await L.getJ(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/minute?aggregate=5&limit=200&currency=token`, { headers: { accept: 'application/json;version=20230302' } });
      const list = (o && o.data && o.data.attributes && o.data.attributes.ohlcv_list) || [];
      return { ok: true, pool, candles: list.map(k => ({ t: k[0] * 1000, o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] })).reverse() };
    } catch { return { ok: true, candles: [] }; }
  });
}

module.exports = L.wrap(async (req, res) => {
  const qs = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const v = qs.v || 'home';
  if (v === 'home') return L.out(res, 200, await home(), 'public, max-age=4, s-maxage=4');
  if (v === 'coins') { const c = await coins(); return L.out(res, 200, Object.assign({ ok: true }, c), 'public, max-age=4, s-maxage=4'); }
  if (v === 'coin') return L.out(res, 200, await coin(String(qs.mint || ''), String(qs.wallet || '')));
  if (v === 'pool') { const h = await home(); return L.out(res, 200, { ok: true, pool: h.pool, counts: h.counts, rules: h.rules, sol: h.sol, receipts: (await coins()).coins.slice(0, 60).map(x => ({ ticker: x.ticker, mint: x.mint, sig: x.sig, backSol: x.backSol, burned: x.burned, created: x.created, status: x.status })) }); }
  if (v === 'ledger') return L.out(res, 200, await ledger(String(qs.wallet || '')));
  if (v === 'chart') return L.out(res, 200, await chart(String(qs.mint || '')), 'public, max-age=20, s-maxage=20');
  L.fail('unknown view');
});
