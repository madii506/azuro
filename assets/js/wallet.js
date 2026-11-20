// AZURO wallet: Phantom, Solflare or Backpack. Every transaction is signed in the user's own wallet; this file never
// sees a key. The launch transaction is also signed by the coin's fresh mint key, made in this browser for that launch.
(function () {
  const WALLETS = [
    { name: 'Phantom', get: () => window.phantom && window.phantom.solana && window.phantom.solana.isPhantom && window.phantom.solana, dl: 'https://phantom.com/download', ul: u => `https://phantom.app/ul/browse/${encodeURIComponent(u)}?ref=${encodeURIComponent(location.origin)}` },
    { name: 'Solflare', get: () => window.solflare && window.solflare.isSolflare && window.solflare, dl: 'https://solflare.com/download', ul: u => `https://solflare.com/ul/v1/browse/${encodeURIComponent(u)}?ref=${encodeURIComponent(location.origin)}` },
    { name: 'Backpack', get: () => window.backpack && window.backpack.isBackpack !== false && window.backpack, dl: 'https://backpack.app/download', ul: null },
  ];
  const KEY = 'azuro.wallet';
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { } } };
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const W = { addr: null, name: null, p: null };
  const subs = new Set();
  const emit = () => subs.forEach(f => { try { f(W); } catch (e) { console.error(e); } });
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };
  let web3P = null;
  function web3() {
    if (window.solanaWeb3) return Promise.resolve(window.solanaWeb3);
    if (web3P) return web3P;
    web3P = new Promise((ok, no) => { const s = document.createElement('script'); s.src = '/assets/js/web3.min.js'; s.onload = () => ok(window.solanaWeb3); s.onerror = () => { web3P = null; no(new Error('The signer could not load. Check your connection.')); }; document.head.appendChild(s); });
    return web3P;
  }
  const isReject = e => !!e && (e.code === 4001 || /reject|denied|cancel|declin|closed/i.test(`${e.name || ''} ${e.message || ''}`));

  function bind(p, name) {
    W.p = p; W.name = name; W.addr = p.publicKey ? p.publicKey.toString() : null;
    if (W.addr) store.set(KEY, name);
    try { p.on && p.on('accountChanged', pk => { if (pk) { W.addr = pk.toString(); emit(); } else disconnect(true); }); } catch { }
    try { p.on && p.on('disconnect', () => disconnect(true)); } catch { }
    emit();
  }
  async function connect(name, silent) {
    const w = WALLETS.find(x => x.name === name); if (!w) return null;
    const p = w.get();
    if (!p) {
      if (silent) return null;
      if (mobile && w.ul) { location.href = w.ul(location.href); return null; }
      window.open(w.dl, '_blank', 'noopener'); return null;
    }
    try { await (silent ? p.connect({ onlyIfTrusted: true }) : p.connect()); } catch (e) { if (!silent && !isReject(e)) throw e; return null; }
    if (!p.publicKey) return null;
    bind(p, name); return W;
  }
  async function disconnect(quiet) {
    const p = W.p; W.p = null; W.addr = null; W.name = null; store.set(KEY, null); emit();
    if (!quiet && p && p.disconnect) { try { await p.disconnect(); } catch { } }
  }
  async function restore() { const n = store.get(KEY); if (n) await connect(n, true).catch(() => null); }
  const installed = () => WALLETS.filter(w => w.get());

  // the launch: the wallet signs every transaction first, then the coin's mint key adds its signature to the first
  async function signLaunch(txs, mintKp) {
    if (!W.p) throw new Error('Connect a wallet first.');
    const S = await web3();
    const list = txs.filter(Boolean).map(t => S.VersionedTransaction.deserialize(b64(t)));
    let signed;
    if (list.length > 1 && W.p.signAllTransactions) signed = await W.p.signAllTransactions(list);
    else { signed = []; for (const t of list) signed.push(await W.p.signTransaction(t)); }
    signed[0].sign([mintKp]);
    return signed.map(t => toB64(t.serialize()));
  }
  // a trade: sign and send in the wallet, or sign here and relay through our server
  async function signAndSend(txB64) {
    if (!W.p) throw new Error('Connect a wallet first.');
    const S = await web3();
    const tx = S.VersionedTransaction.deserialize(b64(txB64));
    if (W.p.signAndSendTransaction) {
      try { const r = await W.p.signAndSendTransaction(tx); const sig = r && (r.signature || r); return typeof sig === 'string' ? sig : bs58(sig); }
      catch (e) { if (isReject(e)) throw e; }
    }
    const signed = await W.p.signTransaction(tx);
    const r = await fetch('/api/trade?do=send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tx: toB64(signed.serialize()) }) }).then(r => r.json());
    if (!r.ok) throw new Error(r.error || 'Solana did not accept it.');
    return r.sig;
  }
  const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  function bs58(u8) { const d = []; let s = ''; for (const byte of u8) { let c = byte; for (let j = 0; j < d.length; j++) { c += d[j] << 8; d[j] = c % 58; c = (c / 58) | 0; } while (c) { d.push(c % 58); c = (c / 58) | 0; } } for (const byte of u8) { if (byte) break; s += '1'; } for (let j = d.length - 1; j >= 0; j--) s += A[d[j]]; return s; }

  window.AzWallet = { WALLETS, W, connect, disconnect, restore, installed, signLaunch, signAndSend, web3, isReject, mobile, on: f => { subs.add(f); return () => subs.delete(f); } };
})();
