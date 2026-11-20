// AZURO trades. build: a pump.fun buy or sell for the user's own wallet to sign (the curve through pump's SDK, a
// graduated coin's pool through PumpPortal's local builder). send: relay a signed transaction. Nothing is custodied.
const L = require('./_lib');
const { PublicKey, VersionedTransaction, TransactionMessage, ComputeBudgetProgram } = L.web3;
const { TOKEN_2022_PROGRAM_ID } = L.spl;
const BN = L.BN;

async function chainState() {
  return L.memo('chain', 60000, async () => {
    const { S } = L.pump();
    if (L.MOCK) return require(process.env.AZ_MOCK_MODULE).chain(S);
    const on = L.pump().online();
    const [global, feeConfig] = await Promise.all([on.fetchGlobal(), on.fetchFeeConfig().catch(() => null)]);
    return { global, feeConfig };
  });
}

async function build(b) {
  const mint = String(b.mint || ''), wallet = String(b.wallet || ''), side = b.side === 'sell' ? 'sell' : 'buy';
  if (!L.B58.test(mint)) L.fail('Bad coin address.');
  if (!L.B58.test(wallet)) L.fail('Connect a wallet first.');
  const slip = Math.max(0.5, Math.min(25, +b.slippage || 5));
  const q = await L.ensure();
  if (q) { const [r] = await q`select 1 from az_launch where mint = ${mint} and status in ('live','sent')`; if (!r) L.fail('This coin was not launched on Azuro.'); }
  const { S, sdk } = L.pump();
  const user = new PublicKey(wallet), mintPk = new PublicKey(mint);
  if (L.MOCK) return require(process.env.AZ_MOCK_MODULE).trade({ side, mint, wallet, sol: +b.sol, pct: +b.pct, slip });
  const { global, feeConfig } = await chainState();
  const on = L.pump().online();
  let ixs, quote;
  const curve = await on.fetchBondingCurve(mintPk).catch(() => null);
  if (curve && !curve.complete) {
    if (side === 'buy') {
      const sol = Math.round(Math.max(0, +b.sol || 0) * 1e9); if (sol < 1e6) L.fail('Buy at least 0.001 SOL.'); if (sol > 1000e9) L.fail('That is too much for one trade.');
      const st = await on.fetchBuyState(mintPk, user, TOKEN_2022_PROGRAM_ID);
      const amount = S.getBuyTokenAmountFromSolAmount({ global, feeConfig, mintSupply: global.tokenTotalSupply, bondingCurve: st.bondingCurve, amount: new BN(sol), quoteMint: PublicKey.default });
      ixs = await sdk.buyInstructions({ global, bondingCurveAccountInfo: st.bondingCurveAccountInfo, bondingCurve: st.bondingCurve, associatedUserAccountInfo: st.associatedUserAccountInfo,
        mint: mintPk, user, solAmount: new BN(sol), amount, slippage: slip, tokenProgram: TOKEN_2022_PROGRAM_ID });
      quote = { side, sol: sol / 1e9, tokens: +amount.toString() / 1e6 };
    } else {
      const bal = await L.rpc('getTokenAccountsByOwner', [wallet, { mint }, { encoding: 'jsonParsed' }]);
      let raw = 0n; for (const a of (bal && bal.value) || []) raw += BigInt(a.account.data.parsed.info.tokenAmount.amount);
      const pct = Math.max(1, Math.min(100, +b.pct || 100));
      const amount = new BN(((raw * BigInt(Math.round(pct * 100))) / 10000n).toString());
      if (amount.lten(0)) L.fail('You do not hold this coin.');
      const st = await on.fetchSellState(mintPk, user, TOKEN_2022_PROGRAM_ID);
      const solOut = S.getSellSolAmountFromTokenAmount({ global, feeConfig, mintSupply: global.tokenTotalSupply, bondingCurve: st.bondingCurve, amount });
      ixs = await sdk.sellInstructions({ global, bondingCurveAccountInfo: st.bondingCurveAccountInfo, bondingCurve: st.bondingCurve, mint: mintPk, user, amount, solAmount: solOut, slippage: slip, tokenProgram: TOKEN_2022_PROGRAM_ID });
      quote = { side, sol: +solOut.toString() / 1e9, tokens: +amount.toString() / 1e6 };
    }
    const bh = await L.conn().getLatestBlockhash('confirmed');
    const msg = new TransactionMessage({ payerKey: user, recentBlockhash: bh.blockhash, instructions: [ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: L.RULES.priorityMicroLamports }), ...ixs] }).compileToV0Message();
    return { ok: true, venue: 'curve', quote, tx: Buffer.from(new VersionedTransaction(msg).serialize()).toString('base64') };
  }
  // graduated: the PumpSwap pool, through PumpPortal's local transaction builder (it returns an unsigned transaction)
  const amount = side === 'buy' ? Math.max(0.001, +b.sol || 0) : Math.max(1, Math.min(100, +b.pct || 100)) + '%';
  const r = await fetch('https://pumpportal.fun/api/trade-local', { method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ publicKey: wallet, action: side, mint, amount, denominatedInSol: side === 'buy' ? 'true' : 'false', slippage: slip, priorityFee: 0.0001, pool: 'pump-amm' }) });
  if (r.status !== 200) L.fail('The pool trade could not be prepared right now. Nothing was sent.');
  const bytes = Buffer.from(await r.arrayBuffer());
  return { ok: true, venue: 'pool', quote: { side, sol: side === 'buy' ? +amount : null, pct: side === 'sell' ? b.pct : null }, tx: bytes.toString('base64') };
}

async function send(b) {
  let tx; try { tx = VersionedTransaction.deserialize(Buffer.from(String(b.tx || ''), 'base64')); } catch { L.fail('The signed transaction could not be read.'); }
  const sig = await L.rpc('sendTransaction', [Buffer.from(tx.serialize()).toString('base64'), { encoding: 'base64', skipPreflight: false, preflightCommitment: 'confirmed', maxRetries: 3 }])
    .catch(e => L.fail('Solana did not accept it: ' + String(e.message).slice(0, 140)));
  return { ok: true, sig };
}

async function status(sig) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{60,100}$/.test(sig)) L.fail('bad signature');
  const st = await L.rpc('getSignatureStatuses', [[sig], { searchTransactionHistory: true }]);
  const s = st && st.value && st.value[0];
  return { ok: true, status: !s ? 'pending' : s.err ? 'failed' : s.confirmationStatus || 'processed', err: s && s.err || null };
}

module.exports = L.wrap(async (req, res) => {
  const qs = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  if (req.method === 'GET') return L.out(res, 200, await status(String(qs.sig || '')));
  const b = await L.body(req);
  if (qs.do === 'build') return L.out(res, 200, await build(b));
  if (qs.do === 'send') return L.out(res, 200, await send(b));
  L.fail('unknown action');
});
