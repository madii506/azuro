// AZURO launch. prepare: check the rules, store the image, build ONE transaction (create, three 0.5 SOL platform buys,
// burn, close, the creator's capped buy) and simulate it. submit: take the creator-signed transaction back, check it is
// byte for byte the message we built, sign as the platform last, send it, and wait for Solana to confirm it.
const L = require('./_lib');
const { PublicKey, Keypair, VersionedTransaction, TransactionMessage, ComputeBudgetProgram } = L.web3;
const { AddressLookupTableProgram, SystemProgram } = require('@solana/web3.js');
const { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, NATIVE_MINT, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction, createBurnCheckedInstruction, createCloseAccountInstruction } = L.spl;
const BN = L.BN;
const TTL_MS = 150000;                    // a prepared launch has this long to be signed and submitted

async function chain() {
  return L.memo('chain', 60000, async () => {
    const { S } = L.pump();
    if (L.MOCK) return require(process.env.AZ_MOCK_MODULE).chain(S);
    const on = L.pump().online();
    const [global, feeConfig] = await Promise.all([on.fetchGlobal(), on.fetchFeeConfig().catch(() => null)]);
    return { global, feeConfig };
  });
}

// the one transaction. Returns the instructions and the numbers the site shows.
async function buildLaunch({ creator, mint, name, ticker, uri, devLamports, plat }) {
  const { S, sdk } = L.pump();
  const { global, feeConfig } = await chain();
  if (global.createV2Enabled === false) L.fail('pump.fun is not accepting new coins right now. Try again soon.');
  const creatorPk = new PublicKey(creator), mintPk = new PublicKey(mint);
  const supply = global.tokenTotalSupply;
  const q0 = { global, feeConfig, mintSupply: supply, quoteMint: PublicKey.default };
  const ixs = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: L.RULES.priorityMicroLamports }),
    await sdk.createV2Instruction({ mint: mintPk, name, symbol: ticker, uri, creator: creatorPk, user: creatorPk, mayhemMode: false }),
  ];
  let curve = Object.assign(S.newBondingCurve(global), { creator: creatorPk });
  const start = { q: curve.virtualQuoteReserves.toString(), t: curve.virtualTokenReserves.toString() };
  const advance = (c, amount) => {
    const q = amount.mul(c.virtualQuoteReserves).div(c.virtualTokenReserves.sub(amount)).add(new BN(1));
    return Object.assign({}, c, { virtualTokenReserves: c.virtualTokenReserves.sub(amount), realTokenReserves: c.realTokenReserves.sub(amount),
      virtualQuoteReserves: c.virtualQuoteReserves.add(q), realQuoteReserves: (c.realQuoteReserves || new BN(0)).add(q) });
  };
  const platAta = getAssociatedTokenAddressSync(mintPk, plat, true, TOKEN_2022_PROGRAM_ID);
  ixs.push(createAssociatedTokenAccountIdempotentInstruction(plat, platAta, plat, mintPk, TOKEN_2022_PROGRAM_ID));
  const back = [];
  let burned = new BN(0), backCost = new BN(0);
  for (let i = 0; i < L.RULES.backBuys; i++) {
    const budget = new BN(L.RULES.backLamports);
    const amount = S.getBuyTokenAmountFromSolAmount(Object.assign({}, q0, { bondingCurve: curve, amount: budget }));
    const cost = S.getBuySolAmountFromTokenAmount(Object.assign({}, q0, { bondingCurve: curve, amount }));
    if (amount.lten(0) || cost.gt(budget)) L.fail('The backing could not be priced. Nothing was charged.');
    ixs.push(await sdk.buyInstruction({ global, mint: mintPk, creator: creatorPk, user: plat, associatedUser: platAta, amount, solAmount: budget, slippage: 0,
      tokenProgram: TOKEN_2022_PROGRAM_ID, mayhemMode: false }));
    curve = advance(curve, amount);
    burned = burned.add(amount); backCost = backCost.add(cost);
    back.push({ tokens: amount.toString(), cost: cost.toString() });
  }
  ixs.push(createBurnCheckedInstruction(platAta, mintPk, plat, BigInt(burned.toString()), L.DEC, [], TOKEN_2022_PROGRAM_ID));
  ixs.push(createCloseAccountInstruction(platAta, plat, plat, [], TOKEN_2022_PROGRAM_ID));
  const floor = { q: curve.virtualQuoteReserves.toString(), t: curve.virtualTokenReserves.toString() };
  let dev = null;
  const devIxs = [];
  if (devLamports > 0) {
    const devAta = getAssociatedTokenAddressSync(mintPk, creatorPk, true, TOKEN_2022_PROGRAM_ID);
    const budget = new BN(devLamports);
    const amount = S.getBuyTokenAmountFromSolAmount(Object.assign({}, q0, { bondingCurve: curve, amount: budget }));
    const cost = S.getBuySolAmountFromTokenAmount(Object.assign({}, q0, { bondingCurve: curve, amount }));
    devIxs.push(createAssociatedTokenAccountIdempotentInstruction(creatorPk, devAta, creatorPk, mintPk, TOKEN_2022_PROGRAM_ID));
    devIxs.push(await sdk.buyInstruction({ global, mint: mintPk, creator: creatorPk, user: creatorPk, associatedUser: devAta, amount, solAmount: budget, slippage: 0,
      tokenProgram: TOKEN_2022_PROGRAM_ID, mayhemMode: false }));
    curve = advance(curve, amount);
    dev = { lamports: devLamports, tokens: amount.toString(), cost: cost.toString() };
  }
  return { ixs, devIxs, start, floor, after: { q: curve.virtualQuoteReserves.toString(), t: curve.virtualTokenReserves.toString() }, back, burned: burned.toString(), backCost: backCost.toString(), dev };
}

function compile(ixs, payer, blockhash, alts) {
  const msg = new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message(alts || []);
  return new VersionedTransaction(msg);
}
const sizeOf = tx => { try { return tx.serialize().length; } catch { return Infinity; } };

// ---------------------------------------------------------------- the lookup table: four buys do not fit in one transaction
// without one. It holds only accounts that are the same for every launch (pump's programs, PDAs, fee recipients, the pool's
// own volume account). The pool wallet creates it once, on the first launch, and extends it if pump adds an account.
async function staticKeys(plat) {
  const { global } = await chain();
  const one = async () => { const b = await buildLaunch({ creator: Keypair.generate().publicKey.toBase58(), mint: Keypair.generate().publicKey.toBase58(), name: 'x', ticker: 'XX', uri: 'https://x', devLamports: 1e8, plat }); b.ixs = b.ixs.concat(b.devIxs); return b; };
  const set = b => new Set(b.ixs.flatMap(ix => ix.keys.filter(k => !k.isSigner).map(k => k.pubkey.toBase58())));
  const [a, b] = [set(await one()), set(await one())];
  const keys = [...a].filter(k => b.has(k));
  for (const r of [global.feeRecipient, ...(global.feeRecipients || []), global.reservedFeeRecipient, ...(global.reservedFeeRecipients || []), ...(global.buybackFeeRecipients || [])])
    if (r && !r.equals(PublicKey.default)) keys.push(r.toBase58());
  return [...new Set(keys)].filter(k => k !== plat.toBase58());
}

async function kvGet(q, k) { const [r] = await q`select v from az_kv where k = ${k}`; return r ? r.v : null; }
async function kvSet(q, k, v) { await q`insert into az_kv (k, v) values (${k}, ${v}) on conflict (k) do update set v = excluded.v`; }

async function readAlt(address) {
  if (L.MOCK) return require(process.env.AZ_MOCK_MODULE).alt(address);
  const r = await L.conn().getAddressLookupTable(new PublicKey(address));
  return r && r.value;
}

async function sendPlain(ixs, signer) {
  const bh = await L.conn().getLatestBlockhash('confirmed');
  const tx = compile(ixs, signer.publicKey, bh.blockhash);
  tx.sign([signer]);
  const sig = await L.rpc('sendTransaction', [Buffer.from(tx.serialize()).toString('base64'), { encoding: 'base64', preflightCommitment: 'confirmed', maxRetries: 3 }]);
  for (let i = 0; i < 30; i++) {
    await L.sleep(1000);
    const st = await L.rpc('getSignatureStatuses', [[sig]]).catch(() => null), s = st && st.value && st.value[0];
    if (s && s.err) throw new Error('lookup table transaction failed');
    if (s && (s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized')) return sig;
  }
  throw new Error('lookup table transaction did not confirm');
}

async function ensureAlt(q, pl) {
  const need = await staticKeys(pl.publicKey);
  let address = process.env.ALT_ADDRESS || await kvGet(q, 'alt');
  let table = address ? await readAlt(address).catch(() => null) : null;
  if (!table) {
    const slot = L.MOCK ? 1 : await L.conn().getSlot('finalized');
    const [ix, addr] = AddressLookupTableProgram.createLookupTable({ authority: pl.publicKey, payer: pl.publicKey, recentSlot: slot });
    if (!L.MOCK) await sendPlain([ix], pl);
    address = addr.toBase58(); await kvSet(q, 'alt', address);
    table = null;
  }
  const have = new Set(table ? table.state.addresses.map(a => a.toBase58()) : []);
  const missing = need.filter(k => !have.has(k));
  for (let i = 0; i < missing.length; i += 20) {
    const chunk = missing.slice(i, i + 20).map(k => new PublicKey(k));
    if (L.MOCK) { require(process.env.AZ_MOCK_MODULE).extendAlt(address, chunk); continue; }
    await sendPlain([AddressLookupTableProgram.extendLookupTable({ lookupTable: new PublicKey(address), authority: pl.publicKey, payer: pl.publicKey, addresses: chunk })], pl);
  }
  if (missing.length && !L.MOCK) await L.sleep(1500);      // a freshly extended table is usable from the next slot
  for (let i = 0; i < 6; i++) {
    const t = await readAlt(address).catch(() => null);
    if (t && need.every(k => t.state.addresses.some(a => a.toBase58() === k))) return t;
    await L.sleep(800);
  }
  throw new Error('lookup table not ready');
}

async function simulate(tx) {
  const b64 = Buffer.from(tx.serialize()).toString('base64');
  const r = await L.rpc('simulateTransaction', [b64, { encoding: 'base64', sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed' }]);
  const v = r && (r.value || r);
  return { ok: !v.err, err: v.err || null, logs: (v.logs || []).slice(-12), units: v.unitsConsumed || null };
}

function readable(sim) {
  const logs = (sim.logs || []).join('\n');
  if (/insufficient lamports|insufficient funds|0x1\b/i.test(logs)) return 'Your wallet does not have enough SOL for this launch.';
  if (/already in use/i.test(logs)) return 'That mint address is already used. Try again.';
  return 'This launch would not go through right now.';
}

// Jito: two transactions that must land back to back (the backing, then the creator's buy) go as one bundle
const TIP_LAMPORTS = Math.round(+(process.env.JITO_TIP_SOL || 0.0001) * 1e9);
const JITO = (process.env.JITO_URL || 'https://mainnet.block-engine.jito.wtf').replace(/\/$/, '');
const TIPS = ['96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5', 'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe', 'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY', 'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh', 'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt', 'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL', '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT'];
async function tipAccounts() {
  if (L.MOCK) return TIPS;
  return L.memo('tips', 3600e3, async () => {
    try { const j = await L.getJ(JITO + '/api/v1/bundles', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTipAccounts', params: [] }) }, 6000); if (j && Array.isArray(j.result) && j.result.length) return j.result; } catch { }
    return TIPS;
  });
}
async function bundle(txs) {
  if (L.MOCK) { require(process.env.AZ_MOCK_MODULE).registerBundle(txs); return 'mock-bundle'; }
  const bs58 = require('bs58');
  const j = await L.getJ(JITO + '/api/v1/bundles', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'sendBundle', params: [txs.map(t => bs58.encode(t.serialize()))] }) }, 8000);
  return j && j.result;
}
async function landed(sig, seconds) {
  for (let i = 0; i < seconds; i++) {
    await L.sleep(1000);
    const st = await L.rpc('getSignatureStatuses', [[sig], { searchTransactionHistory: false }]).catch(() => null), s = st && st.value && st.value[0];
    if (s && s.err) return false;
    if (s && (s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized')) return true;
  }
  return false;
}

const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const link = (s, re) => { s = clean(s, 200); if (!s) return ''; if (!/^https:\/\//i.test(s)) L.fail('Links must start with https://'); if (re && !re.test(s)) L.fail('That link does not look right.'); return s; };

async function rulesFor(q, creator) {
  const [w] = await q`select count(*)::int as n from az_launch where creator = ${creator} and status in ('live','sent') and created > now() - interval '24 hours'`;
  const [d] = await q`select count(*)::int as n from az_launch where status in ('live','sent') and created > now() - interval '24 hours'`;
  return { mine: w.n, today: d.n };
}

async function tickerTaken(q, tkey) {
  const rows = await q`select ticker, status, created from az_launch where tkey = ${tkey} and (status in ('live','sent') or (status = 'prepared' and created > now() - interval '3 minutes')) limit 1`;
  return rows[0] || null;
}

async function prepare(b) {
  const pl = L.platform(); if (!pl) L.fail('The backing pool is not connected yet, so nothing can launch. Nothing was charged.', 503);
  const q = await L.ensure(); if (!q) L.fail('The launch registry is not connected yet. Nothing was charged.', 503);
  const creator = String(b.creator || ''), mint = String(b.mint || '');
  if (!L.B58.test(creator)) L.fail('Connect a wallet first.');
  if (!L.B58.test(mint) || mint === creator) L.fail('Bad mint address.');
  const name = clean(b.name, 32), ticker = clean(b.ticker, 10).toUpperCase().replace(/^\$/, '');
  if (!name) L.fail('Give your coin a name.');
  if (!/^[A-Z0-9]{2,10}$/.test(ticker)) L.fail('A ticker is 2 to 10 letters or numbers.');
  const descr = clean(b.descr, 280);
  const x = link(b.x, /^https:\/\/(x|twitter)\.com\//i), tg = link(b.tg, /^https:\/\/t\.me\//i), web = link(b.web);
  const dev = Math.round(Math.max(0, +b.dev || 0) * 1e9);
  if (!(dev >= 0) || dev > L.RULES.devMaxLamports) L.fail('The dev buy is capped at ' + L.RULES.devMaxLamports / 1e9 + ' SOL.');
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || '')); if (!m) L.fail('Add an image for your coin.');
  const png = Buffer.from(m[1], 'base64'); if (png.length < 300 || png.length > 1.5e6) L.fail('That image is too large. Use one under 1.5 MB.');
  let dh, col, probe; try { const h = L.imageHash(png); dh = h.dhash; col = h.color; probe = h.probe; } catch { L.fail('That image could not be read. Try a PNG or JPG.'); }
  const imgSha = L.sha(png);

  // the rules, in order: pool, limits, one ticker, one image
  L.forget('pool');
  const fresh = await L.poolState();
  if (!fresh.canLaunch) L.fail('The backing pool is refilling. Launches open again as soon as it can back one.', 503);
  const lim = await rulesFor(q, creator);
  if (lim.mine >= L.RULES.perWalletPerDay) L.fail(`One wallet can launch ${L.RULES.perWalletPerDay} backed coin${L.RULES.perWalletPerDay > 1 ? 's' : ''} a day. Come back tomorrow.`, 429);
  if (lim.today >= L.RULES.perDay) L.fail(`Today's ${L.RULES.perDay} backed launches are all set. The next window opens within 24 hours.`, 429);
  const taken = await tickerTaken(q, ticker); if (taken) L.fail(`$${ticker} is taken. One ticker, once.`, 409);
  const imgs = await q`select ticker, img_sha, img_dhash, img_color from az_launch where status in ('live','sent') or (status = 'prepared' and created > now() - interval '3 minutes')`;
  const dup = imgs.find(r => r.img_sha === imgSha || L.nearImage(r.img_dhash, r.img_color, probe));
  if (dup) L.fail(`That image is already used by $${dup.ticker}. One image, once.`, 409);
  const [mt] = await q`select 1 from az_launch where mint = ${mint}`; if (mt) L.fail('That mint address is already used.');

  // the image and metadata, hosted here so the coin always has them
  const id = L.sha(mint + ':' + Date.now()).slice(0, 12);
  const meta = { name, symbol: ticker, description: descr || `${name} launched pre-backed on Azuro: 1.5 SOL bought and burned in its launch transaction.`,
    image: `${L.SITE}/i/${id}.png`, showName: true, createdOn: L.SITE, twitter: x || undefined, telegram: tg || undefined, website: web || `${L.SITE}/app#coin/${mint}` };
  await q`insert into az_media (id, mime, data, meta) values (${id}, 'image/png', ${m[1]}, ${JSON.stringify(meta)}) on conflict (id) do nothing`;
  const uri = `${L.SITE}/m/${id}`;

  // reserve the ticker while the creator signs
  await q`insert into az_launch (id, mint, creator, name, ticker, tkey, descr, x, tg, web, img_sha, img_dhash, img_color, meta_uri, dev_lamports, status)
          values (${id}, ${mint}, ${creator}, ${name}, ${ticker}, ${ticker}, ${descr}, ${x}, ${tg}, ${web}, ${imgSha}, ${dh}, ${col}, ${uri}, ${dev}, 'prepared')`;
  try {
    const built = await buildLaunch({ creator, mint, name, ticker, uri, devLamports: dev, plat: pl.publicKey });
    const alt = await ensureAlt(q, pl);
    const bh = await L.conn().getLatestBlockhash('confirmed');
    const payer = new PublicKey(creator);
    let tx = compile(built.ixs.concat(built.devIxs), payer, bh.blockhash, [alt]), tx2 = null;
    if (sizeOf(tx) > 1232) {
      tx = compile(built.ixs, payer, bh.blockhash, [alt]);
      const tips = await tipAccounts();
      tx2 = compile([ComputeBudgetProgram.setComputeUnitPrice({ microLamports: L.RULES.priorityMicroLamports }), ...built.devIxs,
        SystemProgram.transfer({ fromPubkey: payer, toPubkey: new PublicKey(tips[Math.floor(Math.random() * tips.length)]), lamports: TIP_LAMPORTS })], payer, bh.blockhash, [alt]);
    }
    const bytes = sizeOf(tx);
    if (bytes > 1232 || (tx2 && sizeOf(tx2) > 1232)) L.fail('This launch does not fit in one transaction. Try a shorter name.');
    const sim = await simulate(tx);
    if (!sim.ok) { await q`update az_launch set status = 'failed', err = ${JSON.stringify(sim.err)} where id = ${id}`; L.fail(readable(sim) + ' Nothing was charged.'); }
    const msgHash = L.sha(Buffer.from(tx.message.serialize())) + (tx2 ? ':' + L.sha(Buffer.from(tx2.message.serialize())) : '');
    await q`update az_launch set msg_hash = ${msgHash}, back_lamports = ${built.backCost}, burned = ${built.burned}, floor_q = ${built.floor.q}, floor_t = ${built.floor.t},
            start_q = ${built.start.q}, start_t = ${built.start.t} where id = ${id}`;
    const sol = await L.solUsd();
    const P = (s) => (+s.q / 1e9) / (+s.t / 1e6);
    return {
      ok: true, id, mint, bytes, units: sim.units, expiresIn: TTL_MS,
      tx: Buffer.from(tx.serialize()).toString('base64'), tx2: tx2 ? Buffer.from(tx2.serialize()).toString('base64') : null, bundled: !!tx2,
      anatomy: [
        { k: 'create', who: 'you', text: `Create $${ticker} on pump.fun` },
        ...built.back.map((b, i) => ({ k: 'back', who: 'pool', n: i + 1, sol: +b.cost / 1e9, tokens: +b.tokens / 1e6 })),
        { k: 'burn', who: 'pool', tokens: +built.burned / 1e6 },
        { k: 'close', who: 'pool' },
        ...(built.dev ? [{ k: 'dev', who: 'you', sol: +built.dev.cost / 1e9, tokens: +built.dev.tokens / 1e6 }] : []),
      ],
      numbers: { startPrice: P(built.start), floorPrice: P(built.floor), afterPrice: P(built.after), backSol: +built.backCost / 1e9, burned: +built.burned / 1e6,
        devSol: built.dev ? +built.dev.cost / 1e9 : 0, devTokens: built.dev ? +built.dev.tokens / 1e6 : 0, sol },
    };
  } catch (e) {
    await q`update az_launch set status = 'failed', err = ${String(e.message || e).slice(0, 300)} where id = ${id} and status = 'prepared'`.catch(() => { });
    throw e;
  }
}

async function submit(b) {
  const pl = L.platform(); if (!pl) L.fail('The backing pool is not connected.', 503);
  const q = await L.ensure(); if (!q) L.fail('The launch registry is not connected.', 503);
  const [row] = await q`select * from az_launch where id = ${String(b.id || '')}`;
  if (!row) L.fail('That launch was not found. Prepare it again.');
  if (row.status !== 'prepared') L.fail(row.status === 'live' ? 'This coin is already live.' : 'This launch can no longer be sent. Prepare it again.');
  if (Date.now() - new Date(row.created).getTime() > TTL_MS) { await q`update az_launch set status = 'expired' where id = ${row.id}`; L.fail('That took too long, so nothing was sent. Prepare the launch again.'); }
  const hashes = String(row.msg_hash || '').split(':');
  const read = s => { try { return VersionedTransaction.deserialize(Buffer.from(String(s || ''), 'base64')); } catch { return null; } };
  const tx = read(b.tx), tx2 = hashes[1] ? read(b.tx2) : null;
  if (!tx || (hashes[1] && !tx2)) L.fail('The signed transaction could not be read.');
  if (L.sha(Buffer.from(tx.message.serialize())) !== hashes[0] || (tx2 && L.sha(Buffer.from(tx2.message.serialize())) !== hashes[1]))
    L.fail('This is not the transaction that was prepared, so the pool will not sign it.');
  for (const t of [tx, tx2].filter(Boolean)) {
    const keys = t.message.staticAccountKeys.slice(0, t.message.header.numRequiredSignatures).map(k => k.toBase58());
    for (const [i, k] of keys.entries()) {
      if (k === pl.publicKey.toBase58()) continue;
      if (t.signatures[i].every(x => x === 0)) L.fail(k === row.creator ? 'Your wallet did not sign the launch.' : 'The coin key did not sign the launch.');
    }
  }
  tx.sign([pl]);
  const raw = Buffer.from(tx.serialize()).toString('base64');
  let sig;
  try {
    sig = require('bs58').encode(tx.signatures[0]);
    if (tx2) {
      const sent = await bundle([tx, tx2]).catch(() => null);
      if (!sent || !(await landed(sig, 14))) {             // no bundle, or it did not land: the same signed bytes, one after the other
        await L.rpc('sendTransaction', [raw, { encoding: 'base64', skipPreflight: false, preflightCommitment: 'confirmed', maxRetries: 3 }]);
        if (await landed(sig, 30)) await L.rpc('sendTransaction', [Buffer.from(tx2.serialize()).toString('base64'), { encoding: 'base64', skipPreflight: true, maxRetries: 3 }]).catch(() => null);
      }
    } else {
      sig = await L.rpc('sendTransaction', [raw, { encoding: 'base64', skipPreflight: false, preflightCommitment: 'confirmed', maxRetries: 3 }]);
    }
  }
  catch (e) { await q`update az_launch set status = 'failed', err = ${String(e.message).slice(0, 300)} where id = ${row.id}`; L.fail('Solana did not accept the launch: ' + String(e.message).slice(0, 140) + '. Nothing was charged.'); }
  await q`update az_launch set status = 'sent', sig = ${sig} where id = ${row.id}`;
  L.forget('pool', 'coins', 'home', 'wall');
  for (let i = 0; i < 24; i++) {
    await L.sleep(i < 4 ? 900 : 1500);
    const st = await L.rpc('getSignatureStatuses', [[sig], { searchTransactionHistory: false }]).catch(() => null);
    const s = st && st.value && st.value[0];
    if (s && s.err) { await q`update az_launch set status = 'failed', err = ${JSON.stringify(s.err)} where id = ${row.id}`; L.fail('The launch failed on chain, so nothing happened. Check Solscan: ' + sig); }
    if (s && (s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized')) {
      await q`update az_launch set status = 'live', live_at = now() where id = ${row.id}`;
      L.forget('pool', 'coins', 'home', 'wall');
      return { ok: true, status: 'live', sig, mint: row.mint, ticker: row.ticker };
    }
  }
  return { ok: true, status: 'sent', sig, mint: row.mint, ticker: row.ticker };
}

async function check(qs) {
  const what = String(qs.check || '');
  if (what === 'ticker') {
    const t = String(qs.v || '').toUpperCase().replace(/^\$/, '');
    if (!/^[A-Z0-9]{2,10}$/.test(t)) return { ok: true, available: false, reason: '2 to 10 letters or numbers' };
    const q = await L.ensure(); if (!q) return { ok: true, available: null, reason: 'registry offline' };
    const taken = await tickerTaken(q, t);
    return { ok: true, available: !taken, reason: taken ? 'taken' : null };
  }
  if (what === 'rules') {
    const [pool, q] = await Promise.all([L.poolState(), L.ensure()]);
    let today = null; if (q) { const [d] = await q`select count(*)::int as n from az_launch where status in ('live','sent') and created > now() - interval '24 hours'`; today = d.n; }
    let curve = null;
    try {
      const { global, feeConfig } = await chain();
      const tier = feeConfig && feeConfig.feeTiers && feeConfig.feeTiers[0] && feeConfig.feeTiers[0].fees;
      const bps = tier ? (+tier.protocolFeeBps.toString() + +tier.creatorFeeBps.toString()) : (+global.feeBasisPoints.toString() + +global.creatorFeeBasisPoints.toString());
      // SOL curves start from initialVirtualSolReserves; initialVirtualQuoteReserves is for other quote mints
      curve = { vq: +(global.initialVirtualSolReserves || global.initialVirtualQuoteReserves).toString() / 1e9, vt: +global.initialVirtualTokenReserves.toString() / 1e6,
        rt: +global.initialRealTokenReserves.toString() / 1e6, supply: +global.tokenTotalSupply.toString() / 1e6, fee: bps / 1e4 };
      if (!(curve.vq > 0 && curve.vt > 0)) curve = null;
    } catch { curve = null; }
    const sol = await L.solUsd().catch(() => null);
    return { ok: true, pool, registry: !!q, today, curve, sol, rules: { backSol: L.RULES.backLamports / 1e9, backBuys: L.RULES.backBuys, devMaxSol: L.RULES.devMaxLamports / 1e9, perWalletPerDay: L.RULES.perWalletPerDay, perDay: L.RULES.perDay } };
  }
  L.fail('unknown check');
}

module.exports = L.wrap(async (req, res) => {
  const url = new URL(req.url, 'http://x'), qs = Object.fromEntries(url.searchParams);
  if (req.method === 'GET') return L.out(res, 200, await check(qs));
  if (req.method !== 'POST') L.fail('method not allowed', 405);
  const b = await L.body(req);
  if (qs.step === 'prepare') return L.out(res, 200, await prepare(b));
  if (qs.step === 'submit') return L.out(res, 200, await submit(b));
  L.fail('unknown step');
});
module.exports.buildLaunch = buildLaunch;
module.exports.compile = compile;
module.exports.staticKeys = staticKeys;
module.exports.ensureAlt = ensureAlt;
module.exports.sizeOf = sizeOf;
