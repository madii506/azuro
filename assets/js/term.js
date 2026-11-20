// AZURO terminal. Views: market, launch, coin, pool, wall, ledger, docs. Every number is read live from /api; every
// transaction is built by the server for the user's own wallet to sign. Hash routes: #market, #launch, #coin/<mint> ...
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const W = window.AzWallet, CFG = window.AZURO || {};
  const view = $('#view');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n, d = 2) => n == null || !isFinite(n) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const usd = n => n == null || !isFinite(n) ? '—' : n >= 1e6 ? '$' + fmt(n / 1e6, 2) + 'M' : n >= 1e4 ? '$' + fmt(n / 1e3, 1) + 'K' : n >= 1 ? '$' + fmt(n, 0) : '$' + fmt(n, 2);
  const SUB = '₀₁₂₃₄₅₆₇₈₉';
  // drawn icons for the seals and headers
  const I = { mark: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="5.4"/><rect x="2.6" y="16.4" width="5.6" height="4" rx=".9"/><rect x="9.2" y="16.4" width="5.6" height="4" rx=".9"/><rect x="15.8" y="16.4" width="5.6" height="4" rx=".9"/></svg>', launch: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 8h-4.5v9h-5v-9H5z"/></svg>', market: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="12" width="4.5" height="8.5" rx=".6"/><rect x="9.75" y="7.5" width="4.5" height="13" rx=".6"/><rect x="16" y="3.5" width="4.5" height="17" rx=".6"/></svg>', wall: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="9" height="4.6" rx=".5"/><rect x="12.5" y="4" width="9" height="4.6" rx=".5"/><rect x="2.5" y="9.7" width="4" height="4.6" rx=".5"/><rect x="7.5" y="9.7" width="9" height="4.6" rx=".5"/><rect x="17.5" y="9.7" width="4" height="4.6" rx=".5"/><rect x="2.5" y="15.4" width="9" height="4.6" rx=".5"/><rect x="12.5" y="15.4" width="9" height="4.6" rx=".5"/></svg>', list: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="3" rx=".6"/><rect x="3.5" y="10.5" width="17" height="3" rx=".6"/><rect x="3.5" y="16.5" width="11" height="3" rx=".6"/></svg>', doc: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M5.5 2.5h9l4.5 4.5v14.5h-13.5zM8.5 11h7v2h-7zM8.5 14.6h7v2h-7zM8.5 18.2h4.5v1.8H8.5z"/></svg>', pulse: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 13h4l2.5-7 5 13 2.5-6h5"/></svg>', top: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l6.5 7.5h-4.2v5.5H9.7V10H5.5z"/><rect x="4" y="18" width="16" height="3.2" rx=".6"/></svg>', climb: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 21v-4.5h5V12h5V7.5h5V3h4v18z"/></svg>', new: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/></svg>', flame: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.5 2c.6 3.6 6 5.6 6 11.6A6.5 6.5 0 0 1 5.5 13.6c0-2.8 1.7-4.7 2.9-6.4.2 2.4 1.3 3.7 2.8 4.1-.9-3.2.5-6.4 1.3-9.3z"/></svg>', stone: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="7.5" width="19" height="9.5" rx="2"/></svg>', plus: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3.5h4v6.5h6.5v4H14v6.5h-4V14H3.5v-4H10z"/></svg>', close: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>', empty: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7.2"/></svg>', ok: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>', no: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>', wait: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.5h12v2.8l-4.4 6.7 4.4 6.7v2.8H6v-2.8l4.4-6.7L6 5.3z"/></svg>', hash: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3l-2 18M16.5 3l-2 18M4 8.5h16.5M3.5 15.5H20"/></svg>', sum: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3.5h14v3.5H10.5l5 5-5 5H19v3.5H5v-3l6.2-5.5L5 6.5z"/></svg>', coin: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17zm0 3.6a4.9 4.9 0 1 0 0 9.8a4.9 4.9 0 1 0 0-9.8z"/></svg>', warn: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 2.5l10.5 18.5h-21zM10.8 9.5h2.4v5.6h-2.4zM10.8 16.6h2.4v2.4h-2.4z"/></svg>', rules: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 21.5V9.5a6.5 6.5 0 0 1 13 0v12z"/></svg>' };
  function px(n, pre = '') {   // tiny prices, the way Dexscreener writes them: 0.0₅4353 = 0.000004353 (the subscript counts every zero after the point)
    if (n == null || !isFinite(n) || n <= 0) return '—';
    if (n >= 0.01) return pre + fmt(n, n >= 1 ? 2 : 4);
    const [m, e] = n.toExponential(3).split('e'), z = -Number(e) - 1;
    if (z < 3) return pre + n.toFixed(z + 4);
    return pre + '0.0' + String(z).split('').map(c => SUB[c]).join('') + m.replace('.', '');
  }
  const solf = (n, d = 3) => n == null || !isFinite(n) ? '—' : fmt(n, d) + ' SOL';
  const short = a => a ? a.slice(0, 4) + '…' + a.slice(-4) : '—';
  const ago = t => { if (!t) return '—'; const s = (Date.now() - new Date(t).getTime()) / 1000; return s < 60 ? Math.max(1, Math.round(s)) + 's' : s < 3600 ? Math.round(s / 60) + 'm' : s < 86400 ? Math.round(s / 3600) + 'h' : Math.round(s / 86400) + 'd'; };
  const tok = n => n == null || !isFinite(n) ? '—' : n >= 1e6 ? fmt(n / 1e6, 2) + 'M' : n >= 1e3 ? fmt(n / 1e3, 1) + 'K' : fmt(n, 0);
  const api = (u, o) => fetch(u, Object.assign({ cache: 'no-store' }, o || {})).then(r => r.json()).catch(() => ({ ok: false, error: 'The server could not be reached.' }));
  const post = (u, b) => api(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  const say = t => { $('#live').textContent = t; };

  function toast(text, kind, link) {
    const t = document.createElement('div');
    t.className = 'toast' + (kind === 'bad' ? ' bad' : '');
    t.innerHTML = `<span class="seal">${kind === 'bad' ? I.no : I.ok}</span><div>${esc(text)}${link ? `<br><a href="${esc(link.href)}" target="_blank" rel="noopener">${esc(link.text)}</a>` : ''}</div>`;
    const box = $('#toasts'); while (box.children.length >= 2) box.firstChild.remove();
    box.appendChild(t); say(text);
    setTimeout(() => t.remove(), kind === 'bad' ? 9000 : 6500);
  }

  // ---------------------------------------------------------------- state + data
  const S = { coins: [], loaded: false, offline: false, sol: null, registry: true, home: null, rules: null, filter: 'all', sort: 'new', dir: -1, timers: [], ws: null, draft: { name: '', ticker: '', descr: '', x: '', tg: '', web: '', dev: 0, image: null }, prev: {} };
  async function loadCoins() {
    const j = await api('/api/data?v=coins');
    if (j && j.ok) { S.coins = j.coins || []; S.sol = j.sol; S.registry = j.registry; S.offline = false; tape(); } else S.offline = true;
    S.loaded = true;
    return j;
  }
  async function loadRules() { const j = await api('/api/launch?check=rules'); if (j && j.ok) S.rules = j; return j; }
  const STARS = 'azuro.stars';
  S.stars = new Set((() => { try { return JSON.parse(localStorage.getItem(STARS) || '[]'); } catch { return []; } })());
  function star(mint) { S.stars.has(mint) ? S.stars.delete(mint) : S.stars.add(mint); try { localStorage.setItem(STARS, JSON.stringify([...S.stars])); } catch { } return S.stars.has(mint); }
  // what T tokens sell for on the curve if every other holder sold first (the curve then sits at its floor with only yours out)
  function floorBack(price, floor, T) {
    const cu = S.rules && S.rules.curve; if (!cu || !price || !floor || !(T > 0)) return null;
    const k = cu.vq * cu.vt, fq = Math.sqrt(k * floor), ft = Math.sqrt(k / floor);
    return T < ft ? fq * T / (ft - T) * (1 - cu.fee) : null;
  }
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // count a number up (or down) to its new value; the text format is the caller's
  function countTo(el, to, f) {
    if (!el) return; if (to == null || !isFinite(to)) { el.textContent = f(to); el.dataset.v = ''; return; }
    const from = el.dataset.v === '' || el.dataset.v == null ? 0 : +el.dataset.v; el.dataset.v = to;
    if (RM || from === to) { el.textContent = f(to); return; }
    const t0 = performance.now(), d = 750, step = t => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = f(from + (to - from) * e); if (k < 1 && el.isConnected) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function every(fn, ms) { const id = setInterval(() => { if (!document.hidden) fn(); }, ms); S.timers.push(id); }
  function cleanup() { S.timers.forEach(clearInterval); S.timers = []; if (S.ws) { try { S.ws.close(); } catch { } S.ws = null; } }

  function tape() {
    const list = S.coins.slice(0, 16);
    const run = $('#taperun');
    if (!list.length) { run.innerHTML = `<span>No coins yet · the first launch sets the first stone · every launch is backed by <b>1.5 SOL</b> before anyone can trade</span>`; return; }
    run.innerHTML = list.map(c => `<span>$${esc(c.ticker)} <i>backed ${fmt(c.backSol || 1.5, 2)} SOL</i> · ${c.curve && c.curve.aboveFloor ? '<b>×' + fmt(c.curve.aboveFloor, 2) + '</b> above floor' : 'floor set'} · ${ago(c.created)}</span>`).join('');
  }

  // ---------------------------------------------------------------- wallet button + picker
  function wbtn() {
    const b = $('#wbtn');
    b.textContent = W.W.addr ? short(W.W.addr) : 'Connect';
    b.classList.toggle('red', !!W.W.addr);
    b.classList.toggle('ink', !W.W.addr);
  }
  function openPicker() {
    const list = $('#wlist');
    list.innerHTML = W.WALLETS.map(w => `<button type="button" data-w="${w.name}"><span>${w.name}</span><small>${w.get() ? 'DETECTED' : W.mobile && w.ul ? 'OPEN IN APP' : 'INSTALL'}</small></button>`).join('') +
      (W.W.addr ? `<button type="button" data-w="__off"><span>Disconnect ${esc(short(W.W.addr))}</span><small>${esc(W.W.name || '')}</small></button>` : '');
    $('#wpick').classList.add('on');
  }
  $('#wbtn').addEventListener('click', () => openPicker());
  $('#wlist').addEventListener('click', async e => {
    const b = e.target.closest('button[data-w]'); if (!b) return;
    $('#wpick').classList.remove('on');
    if (b.dataset.w === '__off') { await W.disconnect(); toast('Wallet disconnected.'); return; }
    try { const r = await W.connect(b.dataset.w); if (r) toast('Connected ' + short(r.addr) + '.'); }
    catch (err) { toast(err.message || 'The wallet did not connect.', 'bad'); }
  });
  $$('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('on'); }));
  W.on(() => { wbtn(); if (S.onWallet) S.onWallet(); });

  // ---------------------------------------------------------------- palette
  let palSel = 0, palItems = [];
  const COMMANDS = [['Launch a coin', '#launch', 'LAUNCH'], ['The market', '#market', 'VIEW'], ['The pool', '#pool', 'VIEW'], ['The wall', '#wall', 'VIEW'], ['Your ledger', '#ledger', 'VIEW'], ['Docs', '#docs', 'VIEW'], ['Home page', '/', 'SITE']];
  function palRender() {
    const q = $('#palIn').value.trim().toLowerCase().replace(/^\$/, '');
    const coins = S.coins.filter(c => !q || c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.mint.toLowerCase() === q).slice(0, 8)
      .map(c => ({ t: `$${c.ticker} · ${c.name}`, h: '#coin/' + c.mint, s: c.curve && c.curve.mcapUsd ? usd(c.curve.mcapUsd) : 'COIN' }));
    const cmds = COMMANDS.filter(c => !q || c[0].toLowerCase().includes(q)).map(c => ({ t: c[0], h: c[1], s: c[2] }));
    palItems = coins.concat(cmds);
    palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
    $('#palRes').innerHTML = palItems.length ? palItems.map((p, i) => `<a href="${esc(p.h)}" class="${i === palSel ? 'sel' : ''}"><span>${esc(p.t)}</span><small>${esc(p.s)}</small></a>`).join('') : '<a href="#market"><span>Nothing matches</span><small>MARKET</small></a>';
  }
  function openPal() { $('#pal').classList.add('on'); $('#palIn').value = ''; palSel = 0; palRender(); setTimeout(() => $('#palIn').focus(), 20); }
  $('#openPal').addEventListener('click', openPal);
  $('#palIn').addEventListener('input', () => { palSel = 0; palRender(); });
  $('#palIn').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { palSel = Math.min(palItems.length - 1, palSel + 1); palRender(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { palSel = Math.max(0, palSel - 1); palRender(); e.preventDefault(); }
    if (e.key === 'Enter' && palItems[palSel]) { $('#pal').classList.remove('on'); location.href = palItems[palSel].h; }
  });
  $('#palRes').addEventListener('click', () => $('#pal').classList.remove('on'));
  addEventListener('keydown', e => {
    const typing = /input|textarea|select/i.test(document.activeElement && document.activeElement.tagName);
    if (e.key === 'Escape') $$('.modal').forEach(m => m.classList.remove('on'));
    if (typing) return;
    if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); openPal(); }
    const keys = { 1: 'market', 2: 'launch', 3: 'pool', 4: 'wall', 5: 'ledger', 6: 'docs' };
    if (keys[e.key] && !e.metaKey && !e.ctrlKey && !e.altKey) location.hash = keys[e.key];
  });

  // ---------------------------------------------------------------- router
  function route() {
    cleanup();
    const h = (location.hash || '#market').slice(1), [v, arg] = h.split('/');
    const name = { market: 1, launch: 1, coin: 1, pool: 1, wall: 1, ledger: 1, docs: 1 }[v] ? v : 'market';
    $$('#tabs a,#btabs a').forEach(a => a.classList.toggle('on', a.dataset.v === name || (name === 'coin' && a.dataset.v === 'market')));
    S.onWallet = null;
    ({ market, launch, coin, pool, wall, ledger, docs })[name](arg);
    view.classList.remove('vin'); void view.offsetWidth; view.classList.add('vin');
    view.focus({ preventScroll: true });
    scrollTo({ top: 0, behavior: 'instant' });
    document.title = name === 'market' ? 'AZURO terminal' : `AZURO · ${name}`;
  }
  addEventListener('hashchange', route);

  // ---------------------------------------------------------------- market
  const FILTERS = [['all', 'All'], ['new', 'New'], ['rising', 'Rising'], ['near', 'Near graduation'], ['grad', 'Graduated'], ['mine', 'Mine'], ['stars', '★ Watching']];
  const SORTS = { new: c => new Date(c.created).getTime(), mcap: c => (c.curve && c.curve.mcapUsd) || 0, floor: c => (c.curve && c.curve.aboveFloor) || 0, curve: c => (c.curve && c.curve.progress) || 0, ticker: c => c.ticker };
  function filtered() {
    let L = S.coins.slice();
    const f = S.filter;
    if (f === 'new') L = L.filter(c => Date.now() - new Date(c.created).getTime() < 6 * 3600e3);
    if (f === 'rising') L = L.filter(c => c.curve && c.curve.aboveFloor > 1.5);
    if (f === 'near') L = L.filter(c => c.curve && !c.curve.complete && c.curve.progress > 0.6);
    if (f === 'grad') L = L.filter(c => c.curve && c.curve.complete);
    if (f === 'mine') L = L.filter(c => W.W.addr && c.creator === W.W.addr);
    if (f === 'stars') L = L.filter(c => S.stars.has(c.mint));
    const k = SORTS[S.sort] || SORTS.new;
    L.sort((a, b) => { const x = k(a), y = k(b); return (x > y ? 1 : x < y ? -1 : 0) * S.dir; });
    return L;
  }
  function market() {
    view.innerHTML = `<div class="vh"><div><h1><span class="seal">${I.market}</span>The market</h1><p>Every coin launched on Azuro, live from its bonding curve. The floor column shows how far each coin trades above the price its backing can never fall below.</p></div>
      <div class="chips" id="fil">${FILTERS.map(([k, l]) => `<button type="button" data-f="${k}" class="${S.filter === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="boards" id="boards"></div>
      <div class="kv" id="mkv" style="margin-bottom:22px"><div><b>—</b><small>Coins set</small></div><div><b>—</b><small>SOL under coins</small></div><div><b>—</b><small>Tokens burned</small></div><div><b>—</b><small>Pool</small></div></div>
      <div class="panel"><div class="ph"><span><span class="k">${I.market}</span>Board</span><span id="mcount">loading</span></div>
      <div class="mkwrap"><table class="mk" id="mk"><thead><tr><th>#</th><th data-s="ticker">Coin</th><th data-s="new">Age</th><th data-s="mcap">Market cap</th><th>Price</th><th data-s="floor">Above floor</th><th data-s="curve">Curve</th><th>Backed</th><th></th></tr></thead><tbody></tbody></table></div>
      <div class="cards" id="mcards" style="padding:14px"></div><div id="mempty"></div></div>
      <div class="panel pulse" style="margin-top:22px"><div class="ph"><span><span class="k">${I.pulse}</span>Pulse · every trade on every Azuro coin</span><span id="pst">connecting</span></div><div class="pb" id="pulse"><div class="dash">Trades stream in here the moment they land on pump.fun.</div></div></div>`;
    $('#fil').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.filter = b.dataset.f; $$('#fil button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    $('#mk thead').addEventListener('click', e => { const th = e.target.closest('th[data-s]'); if (!th) return; if (S.sort === th.dataset.s) S.dir *= -1; else { S.sort = th.dataset.s; S.dir = th.dataset.s === 'ticker' ? 1 : -1; } draw(); });
    $('#mk tbody').addEventListener('click', e => { const st = e.target.closest('[data-star]'); if (st) { e.stopPropagation(); const on = star(st.dataset.star); toast(on ? 'Added to your watchlist.' : 'Removed from your watchlist.'); draw(); return; } const b = e.target.closest('[data-buy]'); const tr = e.target.closest('tr[data-m]'); if (b) { e.stopPropagation(); location.hash = 'coin/' + b.dataset.buy; return; } if (tr) location.hash = 'coin/' + tr.dataset.m; });
    S.onWallet = () => draw();
    let entered = false;
    function draw() {
      boards();
      $$('#mk th').forEach(th => th.classList.toggle('sorted', th.dataset.s === S.sort));
      const L = filtered();
      $('#mcount').textContent = S.coins.length ? `${L.length} of ${S.coins.length} coins` : '';
      const body = $('#mk tbody');
      if (!L.length) {
        body.innerHTML = ''; $('#mcards').innerHTML = '';
        $('#mempty').innerHTML = !S.loaded ? `<div class="emptybox"><b>Reading the market…</b></div>`
          : S.offline && !S.coins.length ? `<div class="emptybox"><b>The market could not be reached.</b><span>It tries again every few seconds.</span></div>`
          : S.registry === false ? `<div class="emptybox"><b>The registry is offline.</b><span>Coins will show here as soon as it reconnects.</span></div>`
          : S.filter === 'stars' && S.coins.length ? `<div class="emptybox"><b>Your watchlist is empty.</b><span>Tap the ★ next to a coin to keep it here. It stays in this browser.</span></div>`
          : S.coins.length ? `<div class="emptybox"><b>No coins match this filter.</b><span>Try another one.</span></div>`
            : `<div class="emptybox"><b>No coins yet.</b><span>The first coin launched here becomes the first stone in the wall.</span><a class="btn red" href="#launch">Launch the first coin →</a></div>`;
      } else {
        $('#mempty').innerHTML = '';
        body.innerHTML = L.map((c, i) => {
          const v = c.curve || {}, prev = S.prev[c.mint], fl = prev && v.price && prev !== v.price ? (v.price > prev ? 'flash-up' : 'flash-down') : '';
          const w = v.aboveFloor ? Math.min(100, Math.log(v.aboveFloor) / Math.log(20) * 100) : 0;
          return `<tr data-m="${esc(c.mint)}"${!entered ? ` class="rin" style="--i:${Math.min(i, 14)}"` : ''}><td>${i + 1}</td><td><div class="coin-cell"><button type="button" class="star${S.stars.has(c.mint) ? ' on' : ''}" data-star="${esc(c.mint)}" aria-label="Watch $${esc(c.ticker)}">★</button><img src="${esc(c.img)}" alt="" loading="lazy" width="38" height="38"><div><b>$${esc(c.ticker)}</b><span>${esc(c.name)}</span></div></div></td>
            <td>${ago(c.created)}</td><td class="${fl}">${usd(v.mcapUsd)}</td><td class="${fl}">${px(v.priceUsd, '$')}</td>
            <td><span class="flr"><i style="--w:${w.toFixed(0)}%"></i>${v.aboveFloor ? '×' + fmt(v.aboveFloor, 2) : '—'}</span></td>
            <td><span class="cv"><i style="--w:${Math.round((v.progress || 0) * 100)}%"></i>${v.complete ? 'pool' : Math.round((v.progress || 0) * 100) + '%'}</span></td>
            <td>${c.sig ? `<a class="stampok" href="https://solscan.io/tx/${esc(c.sig)}" target="_blank" rel="noopener" title="The backing, on Solscan" onclick="event.stopPropagation()">${I.mark}</a>` : '<span class="dash">—</span>'}</td>
            <td><button class="btn sm red" type="button" data-buy="${esc(c.mint)}">Trade</button></td></tr>`;
        }).join('');
        $('#mcards').innerHTML = L.map(c => fudaCard(c)).join('');
        L.forEach(c => { if (c.curve && c.curve.price) S.prev[c.mint] = c.curve.price; });
        if (S.loaded) entered = true;
        stream();
      }
      const h = S.home;
      if (h) {
        const k = $$('#mkv b');
        countTo(k[0], h.counts.coins, n => n == null ? '—' : String(Math.round(n))); countTo(k[1], h.counts.lockedSol, n => fmt(n, 1)); countTo(k[2], h.counts.burned, tok);
        countTo(k[3], h.pool && h.pool.lamports != null ? h.pool.lamports / 1e9 : null, n => n == null ? '—' : fmt(n, 2) + ' SOL');
      }
    }
    // three small boards from the same live list: furthest above the floor, closest to graduating, newest
    function boards() {
      const L = S.coins.filter(c => c.curve), el = $('#boards'); if (!el) return;
      if (!L.length) { el.innerHTML = ''; return; }
      const row = (c, v) => `<a href="#coin/${esc(c.mint)}"><img src="${esc(c.img)}" alt="" width="28" height="28" loading="lazy"><span>$${esc(c.ticker)}</span><b>${v}</b></a>`;
      const hi = L.slice().sort((a, b) => (b.curve.aboveFloor || 0) - (a.curve.aboveFloor || 0)).slice(0, 3);
      const near = L.filter(c => !c.curve.complete).sort((a, b) => (b.curve.progress || 0) - (a.curve.progress || 0)).slice(0, 3);
      const fresh = S.coins.slice(0, 3);
      el.innerHTML = `<div class="board"><h4><span class="k">${I.top}</span>Highest above floor</h4>${hi.map(c => row(c, '×' + fmt(c.curve.aboveFloor, 2))).join('')}</div>
        <div class="board"><h4><span class="k">${I.climb}</span>Closest to graduating</h4>${near.map(c => row(c, `<i class="mini" style="--w:${Math.round(c.curve.progress * 100)}%"></i>${Math.round(c.curve.progress * 100)}%`)).join('') || '<p class="dash">—</p>'}</div>
        <div class="board"><h4><span class="k">${I.new}</span>Newest stones</h4>${fresh.map(c => row(c, ago(c.created))).join('')}</div>`;
    }
    // every trade on every Azuro coin, live from PumpPortal's public feed; rows flash as their coin trades
    let pulseKeys = '';
    function stream() {
      const keys = S.coins.slice(0, 200).map(c => c.mint), k = keys.join(',');
      if (!keys.length || k === pulseKeys) return;
      const st = $('#pst');
      try {
        if (!S.ws || S.ws.readyState > 1) {
          S.ws = new WebSocket('wss://pumpportal.fun/api/data');
          S.ws.onopen = () => { pulseKeys = ''; stream(); if ($('#pst')) $('#pst').textContent = 'live'; };
          S.ws.onerror = () => { if ($('#pst')) $('#pst').textContent = 'feed offline'; };
          S.ws.onclose = () => { pulseKeys = ''; };
          S.ws.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch { return; } if (d && d.mint && d.txType) pulse(d); };
          return;
        }
        if (S.ws.readyState !== 1) return;
        S.ws.send(JSON.stringify({ method: 'subscribeTokenTrade', keys })); pulseKeys = k;
      } catch { if (st) st.textContent = 'feed offline'; }
    }
    const feed = [];
    function pulse(d) {
      const c = S.coins.find(x => x.mint === d.mint); if (!c) return;
      feed.unshift({ d, c, t: Date.now() }); feed.length = Math.min(feed.length, 14);
      const el = $('#pulse'); if (!el) return;
      el.innerHTML = feed.map((f, i) => `<a class="tick ${f.d.txType === 'buy' ? 'b' : 's'}${i === 0 ? ' new' : ''}" href="#coin/${esc(f.c.mint)}"><span class="side">${f.d.txType === 'buy' ? 'BUY' : 'SELL'}</span><img src="${esc(f.c.img)}" alt="" width="22" height="22"><span>$${esc(f.c.ticker)}</span><b>${fmt(+f.d.solAmount, 3)} SOL</b><small>${esc(short(f.d.traderPublicKey))}</small></a>`).join('');
      const tr = document.querySelector(`#mk tr[data-m="${CSS.escape(d.mint)}"]`);
      if (tr) { tr.classList.remove('hit-b', 'hit-s'); void tr.offsetWidth; tr.classList.add(d.txType === 'buy' ? 'hit-b' : 'hit-s'); }
    }
    const refresh = async () => { await Promise.all([loadCoins(), api('/api/data?v=home').then(j => { if (j && j.ok) S.home = j; })]); draw(); };
    draw(); refresh(); every(refresh, 8000);
  }
  function fudaCard(c) {
    const v = c.curve || {};
    return `<a class="fuda" href="#coin/${esc(c.mint)}"><div class="top"><span>$${esc(c.ticker)}</span><span class="age">${ago(c.created)}</span></div>` +
      `<div class="body"><img src="${esc(c.img)}" alt="" loading="lazy" width="64" height="64"><div style="min-width:0"><div class="nm">${esc(c.name)}</div>` +
      `<div class="stats"><span>MCAP<b>${usd(v.mcapUsd)}</b></span><span>ABOVE FLOOR<b>${v.aboveFloor ? '×' + fmt(v.aboveFloor, 2) : '—'}</b></span></div></div></div>` +
      `<div class="bar"><i style="width:${Math.round((v.progress || 0) * 100)}%"></i></div><span class="seal stamp">${I.mark}</span></a>`;
  }

  // ---------------------------------------------------------------- share card
  // drawn on a canvas from the coin's own image and live numbers; saved as a PNG the user can post anywhere
  async function shareCard(c, extra) {
    try { await Promise.all(['800 60px Mincho', '600 20px Mono', '400 40px Brush'].map(f => document.fonts.load(f, 'AZURO$'))); } catch { }
    const W = 1200, H = 630, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const img = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
    const [paper, art, seal] = await Promise.all([img('/assets/img/washi.jpg'), img(c.img), img('/assets/img/seal.png')]);
    g.fillStyle = '#ece1c6'; g.fillRect(0, 0, W, H);
    if (paper) { g.globalAlpha = 0.9; for (let x = 0; x < W; x += 640) for (let y = 0; y < H; y += 640) g.drawImage(paper, x, y, 640, 640); g.globalAlpha = 1; }
    g.fillStyle = '#1c1b22'; g.fillRect(0, 0, W, 14); g.fillRect(0, H - 14, W, 14);
    // the coin
    g.fillStyle = '#1c1b22'; g.fillRect(78, 128, 340, 340);
    if (art) g.drawImage(art, 70, 120, 340, 340); g.lineWidth = 6; g.strokeStyle = '#1c1b22'; g.strokeRect(70, 120, 340, 340);
    // words
    g.fillStyle = '#686270'; g.font = '600 20px Mono, monospace'; g.fillText('LAUNCHED PRE-BACKED ON AZURO', 470, 150);
    g.fillStyle = '#1c1b22'; g.font = `800 ${c.ticker.length > 7 ? 74 : 92}px Mincho, Georgia, serif`; g.fillText('$' + c.ticker, 466, 248);
    g.fillStyle = '#3b3843'; g.font = '600 30px Mincho, Georgia, serif'; g.fillText(c.name.slice(0, 32), 470, 296);
    // three gold stones
    for (let i = 0; i < 3; i++) { const x = 470 + i * 118, y = 330; const gr = g.createLinearGradient(0, y, 0, y + 56); gr.addColorStop(0, '#f0d27a'); gr.addColorStop(1, '#c39437'); g.fillStyle = gr; g.fillRect(x, y, 104, 56); g.lineWidth = 4; g.strokeStyle = '#1c1b22'; g.strokeRect(x, y, 104, 56); g.fillStyle = '#1c1b22'; g.font = '700 22px Mono, monospace'; g.fillText('0.5', x + 32, y + 36); }
    g.fillStyle = '#1c1b22'; g.font = '600 24px Mono, monospace';
    const lines = [`backed with 1.5 SOL in its launch tx`].concat(extra || []);
    lines.forEach((t, i) => g.fillText(t, 470, 434 + i * 36));
    // the seal and the mark
    if (seal) { g.save(); g.translate(1050, 120); g.rotate(-0.12); g.drawImage(seal, -70, -70, 140, 140); g.restore(); }
    g.fillStyle = '#1c1b22'; g.font = '800 30px Mincho, Georgia, serif'; g.fillText('A Z U R O', 70, 560); g.fillStyle = '#686270'; g.font = '600 18px Mono, monospace'; g.fillText(location.host + '/app#coin/' + c.mint.slice(0, 6) + '…', 470, 560);
    const a = document.createElement('a'); a.download = `azuro-${c.ticker.toLowerCase()}.png`; a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
    toast('Share card saved.');
    return cv;
  }

  // ---------------------------------------------------------------- launch
  function launch() {
    const D = S.draft;
    view.innerHTML = `<div class="vh"><div><h1><span class="seal">${I.launch}</span>Launch a coin</h1><p>One form, one signature. Your coin is created on pump.fun and backed in the same transaction: three 0.5 SOL buys from the pool, every token burned.</p></div></div>
    <div class="lgrid">
      <div class="panel"><div class="ph"><span><span class="k">${I.launch}</span>Your coin</span><span id="lstate">draft</span></div><div class="pb">
        <div class="field"><label>Image <em>PNG, JPG, GIF or WebP · cropped square</em></label>
          <div class="drop${D.image ? ' has' : ''}" id="drop"><div class="ph" id="imgph">${D.image ? `<img src="${D.image}" alt="">` : '＋'}</div><div><b>${D.image ? 'Image ready' : 'Add an image'}</b><span>${D.image ? 'Click to change it.' : 'Drop it here or click. It must not be on Azuro already.'}</span></div><input type="file" id="file" accept="image/png,image/jpeg,image/gif,image/webp" aria-label="Coin image"></div></div>
        <div class="two"><div class="field"><label for="fname">Name <em id="nlen">0/32</em></label><input class="inp" id="fname" maxlength="32" placeholder="Sakura Floor" value="${esc(D.name)}"></div>
          <div class="field"><label for="ftick">Ticker <em id="tstat"></em></label><input class="inp mono" id="ftick" maxlength="10" placeholder="SAKURA" value="${esc(D.ticker)}" autocapitalize="characters"></div></div>
        <div class="field"><label for="fdesc">Description <em>optional</em></label><textarea class="inp" id="fdesc" maxlength="280" placeholder="What it is, in a line or two.">${esc(D.descr)}</textarea></div>
        <div class="two"><div class="field"><label for="fx">X link <em>optional</em></label><input class="inp" id="fx" placeholder="https://x.com/…" value="${esc(D.x)}"></div><div class="field"><label for="ftg">Telegram <em>optional</em></label><input class="inp" id="ftg" placeholder="https://t.me/…" value="${esc(D.tg)}"></div></div>
        <div class="field"><label for="fweb">Website <em>optional</em></label><input class="inp" id="fweb" placeholder="https://…" value="${esc(D.web)}"></div>
        <div class="field"><label for="fdev">Your buy <em>optional · capped at <span id="devcap">0.5</span> SOL · lands after the backing</em></label>
          <div class="devrow"><input class="inp mono" id="fdev" type="number" min="0" max="0.5" step="0.01" value="${D.dev || 0}"><div class="presets" id="devp">${[0, 0.1, 0.25, 0.5].map(v => `<button type="button" data-v="${v}" class="${+D.dev === v ? 'on' : ''}">${v ? v + ' SOL' : 'None'}</button>`).join('')}</div></div></div>
        <ul class="rules" id="lrules"></ul>
        <div class="cost" id="lcost"></div>
        <ol class="stepper" id="lstep"><li data-k="prep">Prepare</li><li data-k="sign">Sign</li><li data-k="back">Backing</li><li data-k="live">Live</li></ol>
        <div id="lmsg"></div>
        <button class="btn red" id="lgo" type="button" style="width:100%">Connect a wallet to launch</button>
      </div></div>
      <div class="preview" id="lprev">
        <div id="lcard"></div>
        <div class="panel"><div class="ph"><span><span class="k">${I.list}</span>The launch transaction</span><span id="lbytes">one transaction</span></div><div class="pb"><ol class="anat" id="lanat"></ol></div></div>
      </div>
    </div>`;
    const set = (k, v) => { D[k] = v; paint(); };
    $('#fname').addEventListener('input', e => set('name', e.target.value));
    $('#fdesc').addEventListener('input', e => set('descr', e.target.value));
    $('#fx').addEventListener('input', e => set('x', e.target.value.trim()));
    $('#ftg').addEventListener('input', e => set('tg', e.target.value.trim()));
    $('#fweb').addEventListener('input', e => set('web', e.target.value.trim()));
    let tq;
    $('#ftick').addEventListener('input', e => {
      const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10); e.target.value = v; D.ticker = v; D.tickerOk = null; paint();
      clearTimeout(tq); if (v.length < 2) return;
      tq = setTimeout(async () => { const j = await api('/api/launch?check=ticker&v=' + encodeURIComponent(v)); if (D.ticker === v) { D.tickerOk = j.ok ? j.available : null; paint(); } }, 350);
    });
    const devIn = $('#fdev');
    devIn.addEventListener('input', () => { D.dev = Math.max(0, Math.min(capDev(), +devIn.value || 0)); paint(); });
    $('#devp').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; D.dev = +b.dataset.v; devIn.value = D.dev; paint(); });
    const drop = $('#drop'), file = $('#file');
    file.addEventListener('change', () => file.files[0] && takeImage(file.files[0]));
    ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) takeImage(f); });
    async function takeImage(f) {
      if (!/^image\//.test(f.type)) return toast('That file is not an image.', 'bad');
      if (f.size > 8e6) return toast('That image is over 8 MB.', 'bad');
      const url = URL.createObjectURL(f), img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'), N = 512; c.width = c.height = N;
        const g = c.getContext('2d'), s = Math.min(img.width, img.height);
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, N, N);
        g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, N, N);
        D.image = c.toDataURL('image/png'); URL.revokeObjectURL(url);
        drop.classList.add('has'); $('#imgph').innerHTML = `<img src="${D.image}" alt="">`;
        drop.querySelector('b').textContent = 'Image ready'; drop.querySelector('span').textContent = 'Click to change it.';
        paint();
      };
      img.onerror = () => toast('That image could not be read.', 'bad');
      img.src = url;
    }
    const capDev = () => (S.rules && S.rules.rules && S.rules.rules.devMaxSol) || 0.5;
    S.onWallet = () => paint();
    let busy = false, prepared = null, landed = false;
    // what the backing will do, worked out here from pump.fun's own curve constants; the server's numbers replace it at prepare
    function est() {
      const R = S.rules; if (!R || !R.curve || !R.rules) return null;
      const { vq, vt, rt, supply, fee } = R.curve, n = R.rules.backBuys, back = R.rules.backSol;
      let q = vq, t = vt, burned = 0; const buys = [];
      for (let i = 0; i < n; i++) { const net = back / (1 + fee), out = t - q * t / (q + net); buys.push(out); burned += out; q += net; t -= out; }
      const floor = q / t, start = vq / vt;
      let devTok = 0; if (+D.dev > 0) { const net = +D.dev / (1 + fee); devTok = t - q * t / (q + net); }
      return { buys, burned, floor, start, devTok, progress: burned / rt, mcapUsd: R.sol ? floor * (supply - burned) * R.sol : null, floorUsd: R.sol ? floor * R.sol : null };
    }
    function paint() {
      const R = S.rules, pool = R && R.pool, cap = capDev();
      if (prepared && !busy && !landed && prepared._key !== (D.ticker || '') + '|' + (+D.dev || 0)) prepared = null;
      $('#devcap').textContent = cap;
      $('#nlen').textContent = (D.name || '').length + '/32';
      $$('#devp button').forEach(b => b.classList.toggle('on', +b.dataset.v === +D.dev));
      const tk = D.ticker || '', tOk = D.tickerOk;
      $('#tstat').innerHTML = tk.length < 2 ? '2 to 10 letters' : tOk === true ? '<span class="ok">✓ free</span>' : tOk === false ? '<span class="no">✗ taken</span>' : 'checking…';
      const rules = [
        ['The pool can back a launch', !pool ? null : pool.canLaunch, !pool ? '…' : pool.connected ? `${pool.capacity} left` : 'not connected'],
        ['Your ticker is free', tk.length < 2 ? null : tOk, tk.length < 2 ? '—' : tOk === true ? '$' + tk : tOk === false ? 'taken' : '…'],
        ['Your image is new', D.image ? null : null, D.image ? 'checked at launch' : 'add one'],
        ['Your buy is within the cap', +D.dev <= cap, fmt(+D.dev || 0, 2) + ' / ' + cap + ' SOL'],
        ['Wallet connected', !!W.W.addr, W.W.addr ? short(W.W.addr) : 'connect'],
      ];
      $('#lrules').innerHTML = rules.map(([t, ok, v]) => `<li><span>${ok === true ? '<span class="ok">✓</span>' : ok === false ? '<span class="no">✗</span>' : '·'} ${t}</span><b>${esc(v)}</b></li>`).join('');
      const back = (R && R.rules && R.rules.backSol) || 0.5, n = (R && R.rules && R.rules.backBuys) || 3;
      $('#lcost').innerHTML = `<div class="pool"><span>The pool backs your coin</span><b>${n} × ${back} SOL</b></div><div><span>Your buy, after the backing</span><b>${fmt(+D.dev || 0, 2)} SOL</b></div><div><span>pump.fun accounts and network fee</span><b>about 0.02 SOL</b></div><div><span>Azuro fee</span><b>none</b></div>`;
      const E = est();
      if (!landed) $('#lcard').innerHTML = fudaCard({ mint: '', ticker: tk || 'TICKER', name: D.name || 'Your coin', img: D.image || '/assets/img/seal.png', created: Date.now(), curve: E ? { progress: E.progress, aboveFloor: 1, mcapUsd: E.mcapUsd } : null }).replace('href="#coin/"', 'href="#launch"') +
        (E ? `<div class="estnote">At launch: ${usd(E.mcapUsd)} market cap with the floor right under it, ${tok(E.burned)} tokens already burned and the curve ${Math.round(E.progress * 100)}% along.</div>` : '');
      anatomy(E);
      const go = $('#lgo');
      if (busy) { go.disabled = true; return; }
      go.disabled = false;
      if (landed) { go.textContent = 'Launch another coin →'; return; }
      if (pool && !pool.canLaunch) { go.textContent = pool.connected ? 'The pool is refilling' : 'Launching opens soon'; go.disabled = true; }
      else if (!W.W.addr) go.textContent = 'Connect a wallet to launch';
      else go.textContent = `Launch $${tk || 'TICKER'} pre-backed →`;
    }
    function anatomy(E) {
      const p = prepared, n = (S.rules && S.rules.rules && S.rules.rules.backBuys) || 3, back = (S.rules && S.rules.rules && S.rules.rules.backSol) || 0.5;
      const rows = p ? p.anatomy : [{ k: 'create', who: 'you' }, ...Array.from({ length: n }, (_, i) => ({ k: 'back', who: 'pool', n: i + 1, sol: back, tokens: E && E.buys[i], est: 1 })), { k: 'burn', who: 'pool', tokens: E && E.burned, est: 1 }, { k: 'close', who: 'pool' }].concat(+D.dev > 0 ? [{ k: 'dev', who: 'you', sol: +D.dev, tokens: E && E.devTok, est: 1 }] : []);
      const K = { create: I.launch, back: I.stone, burn: I.flame, close: I.close, dev: I.plus };
      $('#lanat').innerHTML = rows.map(r => `<li><span class="seal${r.who === 'you' ? ' you' : ''}">${K[r.k]}</span><span>${{ create: `Create $${esc(D.ticker || 'TICKER')} on pump.fun`, back: `Backing buy ${r.n} of ${n}`, burn: 'Burn every token the pool bought', close: 'Close the pool\'s token account', dev: 'Your buy, right behind the backing' }[r.k]}<small>${r.who === 'you' ? 'signed by you' : 'paid by the pool'}${r.tokens ? ' · ' + (r.est ? '≈' : '') + tok(r.tokens) + ' tokens' : ''}</small></span><b>${r.sol ? fmt(r.sol, 3) + ' SOL' : r.k === 'burn' && r.tokens ? (r.est ? '≈' : '') + tok(r.tokens) : ''}</b></li>`).join('') +
        (p ? `<li><span class="seal">${I.mark}</span><span>The floor this sets<small>${fmt((p.numbers.floorPrice / p.numbers.startPrice - 1) * 100, 1)}% over a plain launch price, and the curve can never go below it</small></span><b>${px(p.numbers.floorPrice * (p.numbers.sol || 0), '$')}</b></li>`
          : E ? `<li><span class="seal">${I.mark}</span><span>The floor this sets<small>about ${fmt((E.floor / E.start - 1) * 100, 1)}% over a plain launch price, for good</small></span><b>≈${px(E.floorUsd, '$')}</b></li>` : '');
      $('#lbytes').textContent = p ? (p.bundled ? 'two transactions, one bundle' : `one transaction · ${p.bytes} bytes`) : 'one transaction';
    }
    function step(k, state) { const order = ['prep', 'sign', 'back', 'live']; $$('#lstep li').forEach(li => { const i = order.indexOf(li.dataset.k), j = order.indexOf(k); li.className = i < j || (i === j && state === 'done') ? 'done' : i === j ? 'on' : ''; }); }
    function msg(text, kind) { $('#lmsg').innerHTML = text ? `<div class="msg ${kind || ''}"><span class="seal">${kind === 'bad' ? I.no : kind === 'good' ? I.ok : I.wait}</span><div>${text}</div></div>` : ''; }
    $('#lgo').addEventListener('click', async () => {
      if (landed) { launch(); return; }
      if (!W.W.addr) return openPicker();
      if (busy) return;
      const tk = D.ticker || '';
      if (!D.image) return msg('Add an image for your coin.', 'bad');
      if (!(D.name || '').trim()) return msg('Give your coin a name.', 'bad');
      if (tk.length < 2) return msg('A ticker is 2 to 10 letters or numbers.', 'bad');
      busy = true; paint(); msg('Preparing your launch and checking the rules…'); step('prep'); $('#lstate').textContent = 'preparing';
      try {
        const S3 = await W.web3();
        const mintKp = S3.Keypair.generate();
        const p = await post('/api/launch?step=prepare', { creator: W.W.addr, mint: mintKp.publicKey.toBase58(), name: D.name, ticker: tk, descr: D.descr, x: D.x, tg: D.tg, web: D.web, dev: +D.dev || 0, image: D.image });
        if (!p.ok) throw new Error(p.error || 'This launch could not be prepared. Nothing was charged.');
        prepared = p; p._key = tk + '|' + (+D.dev || 0); paint(); step('sign'); $('#lstate').textContent = 'sign in your wallet';
        msg(`Check the transaction in your wallet: it creates $${esc(tk)} and the pool backs it with ${fmt(p.numbers.backSol, 3)} SOL. You have ${Math.round(p.expiresIn / 1000)} seconds.`);
        let signed;
        try { signed = await W.signLaunch([p.tx, p.tx2], mintKp); }
        catch (e) { if (W.isReject(e)) throw new Error('You cancelled. Nothing was sent.'); throw e; }
        step('back'); $('#lstate').textContent = 'backing'; msg('The pool is signing the backing and sending your launch to Solana…');
        const r = await post('/api/launch?step=submit', { id: p.id, tx: signed[0], tx2: signed[1] || null });
        if (!r.ok) throw new Error(r.error || 'The launch was not sent.');
        step('live', 'done'); $('#lstate').textContent = r.status === 'live' ? 'live' : 'sent';
        msg(r.status === 'live' ? `$${esc(tk)} is live and backed.` : `$${esc(tk)} was sent. Solana is still confirming it.`, 'good');
        landed = true; receipt(p, r); replay();
        S.draft = { name: '', ticker: '', descr: '', x: '', tg: '', web: '', dev: 0, image: null };
        toast(`$${tk} launched pre-backed.`, null, { href: 'https://solscan.io/tx/' + r.sig, text: 'View on Solscan' });
        loadCoins(); loadRules().then(() => { });
      } catch (e) {
        msg(esc(e.message || 'Something went wrong. Nothing was sent.'), 'bad'); $('#lstate').textContent = 'stopped';
        $$('#lstep li').forEach(li => { if (li.classList.contains('on')) li.className = ''; });
      } finally { busy = false; paint(); }
    });
    // light the transaction's steps one by one, the way they ran on chain
    function replay() {
      const rows = $$('#lanat li'); if (RM) { rows.forEach(li => li.classList.add('lit')); return; }
      rows.forEach((li, i) => { li.classList.remove('lit'); setTimeout(() => li.classList.add('lit'), 250 + i * 330); });
    }
    function receipt(p, r) {
      $('#lcard').innerHTML = `<div class="receipt"><span class="seal big">${I.mark}</span><div class="eyebrow"><b>RECEIPT</b> — backed launch</div><h3>$${esc(r.ticker || D.ticker)} is set on stone</h3>
        <dl><dt>Mint</dt><dd>${esc(r.mint)}</dd><dt>Backing</dt><dd>${p.anatomy.filter(a => a.k === 'back').map(a => fmt(a.sol, 3)).join(' + ')} SOL</dd>
        <dt>Burned</dt><dd>${tok(p.numbers.burned)} tokens</dd><dt>Your buy</dt><dd>${p.numbers.devSol ? fmt(p.numbers.devSol, 3) + ' SOL' : 'none'}</dd><dt>Floor</dt><dd>${px(p.numbers.floorPrice * (p.numbers.sol || 0), '$')}</dd></dl>
        <div class="rstones">${p.anatomy.filter(a => a.k === 'back').map((a, i) => `<i style="--i:${i}">${fmt(a.sol, 2)}</i>`).join('')}<span class="burnt">${I.flame} <b id="rburn">0</b> burned</span></div>
        <div class="acts"><a class="btn sm red" href="#coin/${esc(r.mint)}">Open the coin</a><button class="btn sm" type="button" id="rcard">Save share card</button><a class="btn sm" href="https://solscan.io/tx/${esc(r.sig)}" target="_blank" rel="noopener">Solscan</a><a class="btn sm" href="https://pump.fun/coin/${esc(r.mint)}" target="_blank" rel="noopener">pump.fun</a>
        <a class="btn sm" target="_blank" rel="noopener" href="https://x.com/intent/tweet?text=${encodeURIComponent(`I just launched $${r.ticker || D.ticker}, pre-backed: 1.5 SOL bought and burned in its launch transaction, so it has a floor from block one.`)}&url=${encodeURIComponent(location.origin + '/app#coin/' + r.mint)}">Share on X</a></div></div>`;
      setTimeout(() => countTo($('#rburn'), p.numbers.burned, tok), RM ? 0 : 1300);
      $('#rcard').addEventListener('click', () => shareCard({ ticker: r.ticker || D.ticker, name: D.name || r.ticker, mint: r.mint, img: D.image || '/assets/img/seal.png' }, [`${tok(p.numbers.burned)} tokens burned forever`, `floor ${px(p.numbers.floorPrice * (p.numbers.sol || 0), '$')}`]));
    }
    paint();
    loadRules().then(paint);
    every(() => loadRules().then(paint), 15000);
  }

  // ---------------------------------------------------------------- coin page
  function coin(mint) {
    if (!mint) { location.hash = 'market'; return; }
    view.innerHTML = `<div id="chd"><div class="emptybox"><b>Reading the coin…</b></div></div>`;
    let C = null, side = 'buy', amt = 0.1, pct = 100, slip = 5, tf = 5, candles = [], trades = [];
    async function load() {
      const j = await api(`/api/data?v=coin&mint=${encodeURIComponent(mint)}${W.W.addr ? '&wallet=' + W.W.addr : ''}`);
      if (!j.ok) { $('#chd').innerHTML = `<div class="emptybox"><b>This coin could not be read.</b><span>${esc(j.error || '')}</span></div>`; return; }
      if (!j.found) { $('#chd').innerHTML = `<div class="emptybox"><b>This coin was not launched on Azuro.</b><span>Only coins backed here have a page.</span><a class="btn" href="#market">Back to the market</a></div>`; return; }
      const first = !C; C = j; S.sol = j.sol || S.sol;
      if (first) build(); else update();
    }
    function build() {
      const c = C.coin;
      document.title = `$${c.ticker} · AZURO`;
      view.innerHTML = `<div class="chead"><img src="${esc(c.img)}" alt="" width="96" height="96"><div><h1>$${esc(c.ticker)}<small>${esc(c.name)}</small></h1>
        <div class="links"><button type="button" id="cca">${esc(short(c.mint))} · copy</button><a href="https://pump.fun/coin/${esc(c.mint)}" target="_blank" rel="noopener">pump.fun</a><a href="https://solscan.io/token/${esc(c.mint)}" target="_blank" rel="noopener">Solscan</a>
        <a href="https://dexscreener.com/solana/${esc(c.mint)}" target="_blank" rel="noopener">Dexscreener</a>${c.x ? `<a href="${esc(c.x)}" target="_blank" rel="noopener">X</a>` : ''}${c.tg ? `<a href="${esc(c.tg)}" target="_blank" rel="noopener">Telegram</a>` : ''}${c.web ? `<a href="${esc(c.web)}" target="_blank" rel="noopener">Website</a>` : ''}</div></div>
        <div class="acts"><button type="button" class="btn sm" id="cstar">${S.stars.has(c.mint) ? '★ Watching' : '☆ Watch'}</button><a class="btn sm" id="cshare" target="_blank" rel="noopener" href="#">Share</a><button type="button" class="btn sm" id="ccard">Card</button><a class="btn sm" href="#market">← Market</a></div></div>
        ${c.descr ? `<p style="margin:-4px 0 18px;color:var(--ink2);max-width:80ch">${esc(c.descr)}</p>` : ''}
        <div class="kv" id="ckv" style="margin-bottom:22px"><div><b>—</b><small>Price</small></div><div><b>—</b><small>Market cap</small></div><div><b>—</b><small>Above the floor</small></div><div><b>—</b><small>Bonding curve</small></div></div>
        <div class="cgrid"><div style="display:grid;gap:22px;min-width:0">
          <div class="panel"><div class="ph"><span><span class="k">${I.market}</span>Chart<span class="hide-m"> · ▲ up, ▼ down</span></span><div class="tf" id="tfs">${[[5, '5m'], [15, '15m'], [60, '1h']].map(([m, l]) => `<button type="button" data-m="${m}" class="${m === tf ? 'on' : ''}">${l}</button>`).join('')}</div></div><div class="pb"><div class="chart" id="chart"><svg id="csvg"></svg><div class="tip" id="ctip"></div></div></div></div>
          <div class="panel trades"><div class="ph"><span><span class="k">${I.pulse}</span>Live trades</span><span id="wsst">connecting</span></div><div class="pb list" id="trl"><div class="dash">Trades appear here as they happen.</div></div></div>
          <div class="panel"><div class="ph"><span><span class="k">${I.list}</span>Top holders</span><span id="hcount"></span></div><div class="pb list" id="hol"></div></div>
        </div><div style="display:grid;gap:22px;min-width:0">
          <div class="panel trade"><div class="tabs2"><button type="button" class="buy on" data-side="buy">Buy</button><button type="button" class="sell" data-side="sell">Sell</button></div><div class="pb" id="tpane"></div></div>
          <div class="panel backing"><div class="ph"><span><span class="k">${I.mark}</span>The backing</span><span>${c.sig ? 'confirmed' : 'pending'}</span></div><div class="pb" id="bk"></div></div>
          <div class="panel"><div class="ph"><span><span class="k">${I.hash}</span>The numbers</span></div><div class="pb list" id="cnum"></div></div>
        </div></div>`;
      $('#cca').addEventListener('click', async () => { try { await navigator.clipboard.writeText(c.mint); toast('Address copied.'); } catch { toast(c.mint); } });
      $('#ccard').addEventListener('click', () => { const v = C.coin.curve || {}; shareCard(C.coin, [v.aboveFloor ? `trades ×${fmt(v.aboveFloor, 2)} above its floor` : `${tok(C.coin.burned)} tokens burned forever`, v.mcapUsd ? `market cap ${usd(v.mcapUsd)}` : `floor ${px(v.floorUsd, '$')}`]); });
      $('#cstar').addEventListener('click', () => { const on = star(c.mint); $('#cstar').textContent = on ? '★ Watching' : '☆ Watch'; toast(on ? `$${c.ticker} is on your watchlist.` : `$${c.ticker} left your watchlist.`); });
      $('#cshare').addEventListener('click', () => { const v = C.coin.curve || {};
        $('#cshare').href = 'https://x.com/intent/tweet?text=' + encodeURIComponent(`$${c.ticker} launched pre-backed on Azuro: 1.5 SOL bought and burned in its launch transaction${v.aboveFloor ? `, and it trades ×${fmt(v.aboveFloor, 2)} above its floor` : ''}.`) + '&url=' + encodeURIComponent(location.origin + '/app#coin/' + c.mint); });
      $$('.trade .tabs2 button').forEach(b => b.addEventListener('click', () => { side = b.dataset.side; $$('.trade .tabs2 button').forEach(x => x.classList.toggle('on', x === b)); tpane(); }));
      $('#tfs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tf = +b.dataset.m; $$('#tfs button').forEach(x => x.classList.toggle('on', x === b)); chart(); });
      tpane(); update(); chart(); stream();
    }
    function update() {
      const c = C.coin, v = c.curve || {}, sol = C.sol;
      const k = $$('#ckv b');
      if (k.length) {
        k[0].textContent = px(v.priceUsd, '$'); k[1].textContent = usd(v.mcapUsd);
        k[2].textContent = v.aboveFloor ? '×' + fmt(v.aboveFloor, 2) : '—';
        k[3].textContent = v.complete ? 'graduated' : Math.round((v.progress || 0) * 100) + '%';
      }
      const bk = $('#bk');
      if (bk && !bk.dataset.done) {
        bk.dataset.done = 1;
        bk.innerHTML = `<div class="stones">${[1, 2, 3].map(i => `<i style="--i:${i - 1}">0.5</i>`).join('')}</div>
        <div class="list"><div class="row"><span class="seal" style="font-size:12px">${I.stone}</span><span>Bought by the pool</span><b>${c.backSol ? fmt(c.backSol, 3) + ' SOL' : '—'}</b><span></span></div>
        <div class="row"><span class="seal" style="font-size:12px">${I.flame}</span><span>Burned, forever</span><b id="bkburn">${tok(c.burned)}</b><span></span></div>
        <div class="row"><span class="seal you" style="font-size:12px;background:var(--indigo2)">${I.plus}</span><span>Creator's buy</span><b>${c.devSol ? fmt(c.devSol, 3) + ' SOL' : 'none'}</b><span></span></div>
        <div class="row" id="bkfloor"><span class="seal" style="font-size:12px">${I.mark}</span><span>Floor price</span><b id="bkfl">${px(v.floorUsd, '$')}</b><span></span></div></div>
        <div class="bkacts">${c.sig ? `<a class="btn sm" href="https://solscan.io/tx/${esc(c.sig)}" target="_blank" rel="noopener">The launch transaction ↗</a>` : ''}<button class="btn sm" type="button" id="bkplay">Replay the backing</button></div>`;
        $('#bkplay').addEventListener('click', replayBacking);
        setTimeout(replayBacking, 350);
      } else if ($('#bkfl')) $('#bkfl').textContent = px(v.floorUsd, '$');
      const cn = $('#cnum');
      if (cn) cn.innerHTML = [['Price in SOL', px(v.price) + ' SOL'], ['Floor in SOL', px(v.floor) + ' SOL'], ['Floor market cap', usd(v.floorMcapUsd)], ['SOL in the curve', v.curveSol != null ? fmt(v.curveSol, 2) : '—'],
        ['Supply after the burn', tok(v.supply)], ['Created', c.created ? new Date(c.created).toLocaleString() : '—'], ['Creator', `<a href="https://solscan.io/account/${esc(c.creator)}" target="_blank" rel="noopener">${esc(short(c.creator))}</a>`],
        ['You hold', C.you != null ? tok(C.you) : W.W.addr ? '0' : 'connect a wallet'],
        ...(C.you ? [['Your floor value', (() => { const w = worstBack(curveMath(), C.you); return w != null ? fmt(w, 4) + ' SOL' : '—'; })()]] : [])].map(([a, b]) => `<div class="row" style="grid-template-columns:1fr auto"><span>${a}</span><b>${b}</b></div>`).join('');
      const hol = $('#hol');
      if (hol) {
        const sup = v.supply || 1e9;
        $('#hcount').textContent = C.holders.length ? 'top ' + C.holders.length : '';
        hol.innerHTML = C.holders.length ? C.holders.map((h, i) => `<div class="row"><span class="dash">${i + 1}</span><span>${h.curve ? '<span class="tag ink">curve</span>' : h.owner ? `<a href="https://solscan.io/account/${esc(h.owner)}" target="_blank" rel="noopener">${esc(short(h.owner))}</a>` : esc(short(h.account))}${W.W.addr && h.owner === W.W.addr ? ' <span class="tag red">you</span>' : ''}${h.owner === C.coin.creator ? ' <span class="tag">dev</span>' : ''}</span><b>${tok(h.amount)}</b><span class="dash">${fmt(h.amount / sup * 100, 2)}%</span></div>`).join('')
          : '<div class="dash">Holders could not be read right now.</div>';
      }
      if (candles.length) chart(true);
      quote();
    }
    // the three backing buys drop in, the burn counts up, the floor lights: what the launch transaction did
    function replayBacking() {
      const bk = $('#bk'); if (!bk || !C) return;
      const st = $$('#bk .stones i'), b = $('#bkburn'), fl = $('#bkfloor');
      if (RM) return;
      st.forEach(i => i.classList.remove('fall')); fl.classList.remove('lit'); void bk.offsetWidth;
      st.forEach((i, n) => setTimeout(() => i.classList.add('fall'), n * 360));
      setTimeout(() => { b.dataset.v = 0; countTo(b, C.coin.burned, tok); }, 1150);
      setTimeout(() => fl.classList.add('lit'), 1950);
    }
    function tpane() {
      const p = $('#tpane'); if (!p) return;
      p.innerHTML = side === 'buy'
        ? `<div class="field" style="margin:0"><label for="tamt">Spend <em>SOL</em></label><input class="inp mono" id="tamt" type="number" min="0.001" step="0.01" value="${amt}"></div><div class="presets" id="tpre">${[0.1, 0.5, 1, 2].map(v => `<button type="button" data-v="${v}" class="${v === amt ? 'on' : ''}">${v} SOL</button>`).join('')}</div>`
        : `<div class="field" style="margin:0"><label>Sell <em>of what you hold</em></label></div><div class="presets" id="tpre">${[25, 50, 75, 100].map(v => `<button type="button" data-v="${v}" class="${v === pct ? 'on' : ''}">${v}%</button>`).join('')}</div>`;
      p.innerHTML += `<div class="field" style="margin:0"><label>Slippage <em>the most the price may move</em></label></div><div class="presets" id="tslip">${[1, 5, 10].map(v => `<button type="button" data-v="${v}" class="${v === slip ? 'on' : ''}">${v}%</button>`).join('')}</div>
        <div class="quote" id="tq"></div><button class="btn ${side === 'buy' ? 'red' : 'ink'}" id="tgo" type="button" style="width:100%">${W.W.addr ? (side === 'buy' ? 'Buy $' + esc(C.coin.ticker) : 'Sell $' + esc(C.coin.ticker)) : 'Connect a wallet to trade'}</button>
        <div class="dash" style="font-size:12.5px">Trades go straight to pump.fun from your wallet. Azuro adds no fee.</div>`;
      const ai = $('#tamt'); if (ai) ai.addEventListener('input', () => { amt = +ai.value || 0; $$('#tpre button').forEach(b => b.classList.toggle('on', +b.dataset.v === amt)); quote(); });
      $('#tpre').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (side === 'buy') { amt = +b.dataset.v; if (ai) ai.value = amt; } else pct = +b.dataset.v; $$('#tpre button').forEach(x => x.classList.toggle('on', x === b)); quote(); });
      $('#tslip').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; slip = +b.dataset.v; $$('#tslip button').forEach(x => x.classList.toggle('on', x === b)); });
      $('#tgo').addEventListener('click', trade);
      quote();
    }
    // the curve is constant product (k = SOL x tokens), so the live price and the floor price give both states exactly
    function curveMath() {
      const v = (C && C.coin.curve) || {}, cu = S.rules && S.rules.curve;
      if (!cu || !v.price || !v.floor || v.complete) return null;
      const k = cu.vq * cu.vt;
      return { k, fee: cu.fee, vq: Math.sqrt(k * v.price), vt: Math.sqrt(k / v.price), fq: Math.sqrt(k * v.floor), ft: Math.sqrt(k / v.floor) };
    }
    // what T tokens sell for if every other holder sold first: the curve sits at its floor with only yours still out
    const worstBack = (m, T) => m ? floorBack(C.coin.curve.price, C.coin.curve.floor, T) : null;
    function quote() {
      const q = $('#tq'); if (!q || !C) return; const v = C.coin.curve || {}, m = curveMath(), T$ = '$' + esc(C.coin.ticker);
      if (side === 'buy') {
        if (!v.price || !(amt > 0)) { q.textContent = ''; return; }
        if (!m) { q.textContent = `≈ ${tok(amt / v.price / 1.0125)} ${C.coin.ticker} before price impact`; return; }
        const net = amt / (1 + m.fee), T = m.vt - m.k / (m.vq + net), w = worstBack(m, T);
        q.innerHTML = `You get ≈ ${tok(T)} ${T$}` + (w != null ? `<span class="worst"><b>Worst case: ${fmt(w, 3)} SOL back</b> · ${Math.round(w / amt * 100)}% of what you put in, even if every other holder sells first.</span>` : '');
      } else {
        if (!C.you) { q.textContent = W.W.addr ? 'You hold none of this coin.' : ''; return; }
        const T = C.you * pct / 100;
        if (!m) { q.textContent = `${pct}% of ${tok(C.you)} ${C.coin.ticker} ≈ ${fmt(T * (v.price || 0), 4)} SOL before impact`; return; }
        const back = (m.vq - m.k / (m.vt + T)) * (1 - m.fee);
        q.innerHTML = `${pct}% of your ${tok(C.you)} ${T$} ≈ <b>${fmt(back, 4)} SOL</b> now, after pump.fun's fee.`;
      }
    }
    async function trade() {
      if (!W.W.addr) return openPicker();
      const b = $('#tgo'); b.disabled = true; b.textContent = 'Preparing…';
      try {
        const j = await post('/api/trade?do=build', { mint, wallet: W.W.addr, side, sol: amt, pct, slippage: slip });
        if (!j.ok) throw new Error(j.error || 'The trade could not be prepared. Nothing was sent.');
        b.textContent = 'Sign in your wallet…';
        let sig; try { sig = await W.signAndSend(j.tx); } catch (e) { if (W.isReject(e)) throw new Error('You cancelled. Nothing was sent.'); throw e; }
        toast(`${side === 'buy' ? 'Bought' : 'Sold'} $${C.coin.ticker}. Waiting for Solana…`, null, { href: 'https://solscan.io/tx/' + sig, text: 'View on Solscan' });
        for (let i = 0; i < 20; i++) { await new Promise(r => setTimeout(r, 1500)); const s = await api('/api/trade?sig=' + sig); if (s.status === 'confirmed' || s.status === 'finalized') { toast(`Confirmed: ${side === 'buy' ? 'bought' : 'sold'} $${C.coin.ticker}.`); break; } if (s.status === 'failed') { toast('The trade failed on chain. Nothing changed hands.', 'bad'); break; } }
        load();
      } catch (e) { toast(e.message || 'The trade did not go through.', 'bad'); }
      finally { if ($('#tgo')) { b.disabled = false; tpane(); } }
    }
    async function chart(quiet) {
      if (!quiet) { const j = await api(`/api/data?v=chart&mint=${encodeURIComponent(mint)}`); candles = (j && j.candles) || []; }
      const svg = $('#csvg'); if (!svg) return;
      const box = $('#chart').getBoundingClientRect(), Wd = Math.max(300, box.width), Hd = box.height;
      svg.setAttribute('viewBox', `0 0 ${Wd} ${Hd}`);
      const v = (C && C.coin.curve) || {};
      // the feed is 5 minute candles in SOL per token; 15m and 1h group them
      let L = candles.slice();
      const per = tf / 5;
      if (per > 1) { const g = []; for (let i = 0; i < L.length; i += per) { const s = L.slice(i, i + per); g.push({ t: s[0].t, o: s[0].o, c: s[s.length - 1].c, h: Math.max(...s.map(x => x.h)), l: Math.min(...s.map(x => x.l)) }); } L = g; }
      if (!L.length) { svg.innerHTML = `<text x="${Wd / 2}" y="${Hd / 2}" text-anchor="middle" font-family="Mono,monospace" font-size="13" fill="#686270">The chart fills in as the coin trades.</text>`; return; }
      const sol = (C && C.sol) || S.sol || 0, k$ = sol || 1, cur = sol ? '$' : '';   // without a SOL price the chart stays in SOL
      L = L.map(k => ({ t: k.t, o: k.o * k$, h: k.h * k$, l: k.l * k$, c: k.c * k$ }));
      const floor = (sol ? v.floorUsd : v.floor) || null;
      const lo = Math.min(...L.map(k => k.l), floor || Infinity) * 0.97, hi = Math.max(...L.map(k => k.h)) * 1.03;
      const PL = 8, PR = 78, PT = 14, PB = 26, n = L.length, cw = (Wd - PL - PR) / n;
      const Y = p => PT + (Hd - PT - PB) * (1 - (Math.log(p) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)));
      let s = '';
      for (let i = 0; i <= 4; i++) { const p = Math.exp(Math.log(lo) + (Math.log(hi) - Math.log(lo)) * i / 4), y = Y(p); s += `<line x1="${PL}" x2="${Wd - PR}" y1="${y}" y2="${y}" stroke="rgba(28,27,34,.1)"/><text x="${Wd - PR + 6}" y="${y + 4}" font-family="Mono,monospace" font-size="10.5" fill="#686270">${px(p, cur)}</text>`; }
      if (floor) { const y = Y(floor); s += `<line x1="${PL}" x2="${Wd - PR}" y1="${y}" y2="${y}" stroke="#c8392b" stroke-width="2" stroke-dasharray="7 5"/><rect x="${Wd - PR + 2}" y="${y - 10}" width="${PR - 4}" height="20" fill="#c8392b"/><text x="${Wd - PR + 7}" y="${y + 4}" font-family="Mono,monospace" font-weight="700" font-size="10.5" fill="#f5eedd">floor</text>`; }
      L.forEach((k, i) => {
        const x = PL + i * cw + cw / 2, up = k.c >= k.o, bw = Math.max(2, cw * 0.62);
        const y1 = Y(Math.max(k.o, k.c)), y2 = Y(Math.min(k.o, k.c));
        s += `<g class="cd" style="--i:${i}"><line x1="${x}" x2="${x}" y1="${Y(k.h)}" y2="${Y(k.l)}" stroke="#1c1b22" stroke-width="1.4"/><rect x="${x - bw / 2}" y="${y1}" width="${bw}" height="${Math.max(1.5, y2 - y1)}" fill="${up ? '#f5eedd' : '#1c1b22'}" stroke="#1c1b22" stroke-width="1.4"/></g>`;
      });
      const last = L[L.length - 1], yl = Y(last.c);
      s += `<line x1="${PL}" x2="${Wd - PR}" y1="${yl}" y2="${yl}" stroke="#1c1b22" stroke-dasharray="2 4"/><rect x="${Wd - PR + 2}" y="${yl - 10}" width="${PR - 4}" height="20" fill="#1c1b22"/><text x="${Wd - PR + 6}" y="${yl + 4}" font-family="Mono,monospace" font-size="10.5" fill="#f5eedd">${px(last.c, cur)}</text>`;
      svg.innerHTML = s;
      svg.classList.toggle('drawin', !quiet && !RM);
      svg.onmousemove = e => {
        const r = svg.getBoundingClientRect(), i = Math.max(0, Math.min(n - 1, Math.floor((e.clientX - r.left - PL) / cw))), k = L[i], tip = $('#ctip');
        tip.style.display = 'block'; tip.style.left = Math.min(r.width - 170, e.clientX - r.left + 12) + 'px'; tip.style.top = '10px';
        tip.innerHTML = `${new Date(k.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · O ${px(k.o, cur)} H ${px(k.h, cur)}<br>L ${px(k.l, cur)} C ${px(k.c, cur)} · ${k.c >= k.o ? '▲ up' : '▼ down'}`;
      };
      svg.onmouseleave = () => { $('#ctip').style.display = 'none'; };
    }
    function stream() {
      const st = $('#wsst');
      try {
        const ws = new WebSocket('wss://pumpportal.fun/api/data'); S.ws = ws;
        ws.onopen = () => { ws.send(JSON.stringify({ method: 'subscribeTokenTrade', keys: [mint] })); if (st) st.textContent = 'live'; };
        ws.onmessage = e => {
          let d; try { d = JSON.parse(e.data); } catch { return; }
          if (!d || d.mint !== mint || !d.txType) return;
          trades.unshift(d); trades = trades.slice(0, 40);
          const el = $('#trl'); if (!el) return;
          el.innerHTML = trades.map(t => `<div class="row"><span class="${t.txType === 'buy' ? 'b' : 's'}">${t.txType === 'buy' ? 'BUY' : 'SELL'}</span><span><a href="https://solscan.io/tx/${esc(t.signature)}" target="_blank" rel="noopener">${esc(short(t.traderPublicKey))}</a></span><b>${fmt(+t.solAmount, 3)} SOL</b><span class="dash">${tok(+t.tokenAmount)}</span></div>`).join('');
        };
        ws.onerror = () => { if (st) st.textContent = 'feed offline'; };
        ws.onclose = () => { if (st && st.textContent !== 'feed offline') st.textContent = 'closed'; };
      } catch { if (st) st.textContent = 'feed offline'; }
    }
    S.onWallet = () => { load(); tpane(); };
    load(); every(load, 8000); every(() => chart(), 30000);
    let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => chart(true), 150); });
  }

  // ---------------------------------------------------------------- pool
  function pool() {
    view.innerHTML = `<div class="vh"><div><h1><span class="seal">${I.mark}</span>The pool</h1><p>One public wallet pays every backing buy. When it can't cover a launch, launching waits. Nothing launches unbacked.</p></div></div>
      <div class="lgrid"><div style="display:grid;gap:22px;min-width:0">
        <div class="panel"><div class="ph"><span><span class="k">${I.coin}</span>Balance</span><span id="pst">reading</span></div><div class="pb"><div class="pbig" id="pbal"><span id="pbaln">—</span><small>SOL</small></div><div class="paddr" id="paddr"></div>
          <div class="kv flat"><div><b id="pcap">—</b><small>Launches it can back</small></div><div><b id="ptoday">—</b><small>Backed today</small></div><div><b id="pday">—</b><small>Daily limit</small></div><div><b id="pwal">—</b><small>Per wallet a day</small></div></div></div></div>
        <div class="panel"><div class="ph"><span><span class="k">${I.stone}</span>Stones it can still set</span><span id="pslots"></span></div><div class="pb"><div class="slots" id="pstones"></div><p class="slotnote" id="pnote"></p></div></div>
        <div class="panel"><div class="ph"><span><span class="k">${I.sum}</span>All time</span></div><div class="pb"><div class="kv flat"><div><b id="pcoins">—</b><small>Coins backed</small></div><div><b id="plocked">—</b><small>SOL under coins</small></div><div><b id="pburn">—</b><small>Tokens burned</small></div><div><b id="pgrad">—</b><small>Graduated</small></div></div></div></div>
      </div>
        <div class="panel"><div class="ph"><span><span class="k">${I.list}</span>Backing receipts</span><span id="prc"></span></div><div class="pb list" id="plist"><div class="dash">Loading…</div></div></div></div>
      <div class="panel" style="margin-top:22px"><div class="ph"><span><span class="k">${I.doc}</span>How the pool works</span></div><div class="pb doc"><p>Each launch costs the pool three buys of 0.5 SOL, paid inside the launch transaction. The tokens those buys receive are burned in the same transaction and the pool's token account is closed, so the pool never holds a single coin and can never sell. A small reserve stays in the wallet for fees. The pool's key lives only on the server that signs the backing, and it signs only the exact transaction it built for your launch.</p></div></div>`;
    const load = async () => {
      const j = await api('/api/data?v=pool');
      if (!j.ok) { $('#pst').textContent = 'offline'; $('#plist').innerHTML = '<div class="dash">The pool could not be read right now.</div>'; return; }
      const p = j.pool || {}, c = j.counts || {};
      countTo($('#pbaln'), p.lamports != null ? p.lamports / 1e9 : null, n => n == null ? '—' : fmt(n, 3));
      $('#pst').textContent = p.connected ? (p.canLaunch ? 'backing' : 'refilling') : 'not connected';
      $('#paddr').innerHTML = p.address ? `<a href="https://solscan.io/account/${esc(p.address)}" target="_blank" rel="noopener">${esc(p.address)}</a><button type="button" class="btn sm" id="pcopy">Copy</button>` : '<span class="dash">The pool address appears here once it is connected.</span>';
      const cp = $('#pcopy'); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(p.address); toast('Pool address copied.'); } catch { toast(p.address); } };
      $('#pcap').textContent = p.connected ? p.capacity : '—'; $('#ptoday').textContent = c.today; $('#pday').textContent = j.rules.perDay; $('#pwal').textContent = j.rules.perWalletPerDay;
      // the stones the pool's balance can still pay for, against what is left of today's launches
      const can = p.connected ? p.capacity : 0, left = Math.max(0, j.rules.perDay - (c.today || 0)), shown = Math.min(48, Math.max(can, left));
      const fresh = !$('#pstones i');
      $('#pstones').innerHTML = Array.from({ length: shown }, (_, i) => `<i class="${i < Math.min(can, left) ? 'g' : i < can ? 'w' : ''}${fresh ? ' set' : ''}" style="--i:${i}"></i>`).join('') || '<span class="dash">—</span>';

      $('#pslots').textContent = p.connected ? `${Math.min(can, left)} ready` : '';
      $('#pnote').textContent = !p.connected ? 'The pool is not connected yet, so no launch can be backed.' : can < left ? `The balance covers ${can} more launch${can === 1 ? '' : 'es'}; today's limit allows ${left}. Topping up the pool opens the rest.` : `${left} launch${left === 1 ? '' : 'es'} left today, and the balance covers ${can}.`;
      $('#pcoins').textContent = c.coins; $('#plocked').textContent = fmt(c.lockedSol || 0, 2); $('#pburn').textContent = tok(c.burned); $('#pgrad').textContent = c.graduated || 0;
      $('#prc').textContent = j.receipts.length ? j.receipts.length + ' latest' : '';
      $('#plist').innerHTML = j.receipts.length ? j.receipts.map(r => `<div class="row"><span class="seal" style="font-size:11px">${I.stone}</span><span><a href="#coin/${esc(r.mint)}">$${esc(r.ticker)}</a> <span class="dash">· ${ago(r.created)}</span></span><b>${r.backSol ? fmt(r.backSol, 3) : '—'} SOL</b><span>${r.sig ? `<a href="https://solscan.io/tx/${esc(r.sig)}" target="_blank" rel="noopener">tx ↗</a>` : ''}</span></div>`).join('')
        : '<div class="dash">No backings yet. The first launch will show here.</div>';
    };
    load(); every(load, 10000);
  }

  // ---------------------------------------------------------------- wall
  // the castle from the home page's woodblock, cropped to the keep, standing on a foundation of every backed coin
  function sky() {
    const el = $('#gsky'); if (!el) return;
    const put = () => {
      if (!S.sky) S.sky = window.AzScene.render('strip').svg.replace(/viewBox="[^"]*"/, 'viewBox="0 -43 1600 340"').replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="xMaxYMax slice"')
        .replace(/<rect class="az-sky" width="(\d+)" height="(\d+)"/, (m, w, h) => `<rect class="az-sky" y="-60" width="${w}" height="${+h + 60}"`);
      const e2 = $('#gsky'); if (e2) e2.innerHTML = S.sky;
    };
    if (window.AzScene) return put();
    const sc = document.createElement('script'); sc.src = '/assets/js/scene.js?v=1'; sc.onload = put; document.head.appendChild(sc);
  }
  function wall() {
    view.innerHTML = `<div class="vh"><div><h1><span class="seal">${I.wall}</span>The wall</h1><p>Every coin backed on Azuro is a stone in the castle's foundation, set from the bottom up in launch order. The three newest are gold, graduated coins are blue, and the dashed slots are today's open launches.</p></div><div class="chips"><a class="btn sm red" href="#launch">Set your stone →</a></div></div>
      <div class="castle"><div class="sky" id="gsky"></div><div class="gwall"><div class="wall" id="gw"><div class="empty">Loading the wall…</div></div></div></div>
      <div class="wallfoot"><span class="legend"><i class="g"></i>newest<i></i>backed<i class="b"></i>graduated<i class="o"></i>open today</span><span id="gwn"></span></div>`;
    sky();
    let first = true;
    const draw = () => {
      if (!S.loaded) return;
      const L = S.coins.slice().reverse(), n = L.length, h = S.home && S.home.counts, R = (S.home && S.home.rules) || {};
      const pl = S.home && S.home.pool, openAll = h && R.perDay && pl && pl.connected ? Math.max(0, Math.min(R.perDay - h.today, pl.capacity)) : 0, open = Math.min(openAll, innerWidth < 760 ? 8 : 40);   // a phone shows a few open slots, the count says the rest
      const stones = L.map((c, i) => { const g = c.curve && c.curve.complete, a = c.curve && c.curve.aboveFloor;
        return `<a class="stone${g ? ' grad' : i >= n - 3 ? ' gold' : ''}${first ? ' set' : ''}"${first ? ` style="--i:${Math.min(i, 40)}"` : ''} href="#coin/${esc(c.mint)}" title="$${esc(c.ticker)} · ${esc(c.name)}${a ? ' · ×' + fmt(a, 2) + ' above its floor' : ''}">$${esc(c.ticker)}</a>`; }).join('');
      $('#gw').innerHTML = (stones || '') + Array.from({ length: open }, (_, i) => i === 0 ? `<a class="stone ghost${first ? ' set' : ''}" style="--i:${Math.min(n, 40) + 2}" href="#launch">+ yours</a>` : `<span class="stone ghost${first ? ' set' : ''}" style="--i:${Math.min(n, 40) + 2 + i}" aria-hidden="true"></span>`).join('')
        || `<div class="empty">No stones yet. The first coin backed here becomes the first stone.${pl && !pl.connected ? '<br>Launching opens when the pool is connected.' : ''}</div>`;
      const locked = L.reduce((s, c) => s + (c.backSol || 0), 0), burned = L.reduce((s, c) => s + (c.burned || 0), 0);
      $('#gwn').textContent = n ? `${n} stone${n === 1 ? '' : 's'} · ${fmt(locked, 1)} SOL under them · ${tok(burned)} tokens burned${openAll ? ` · ${openAll} open today` : ''}` : '';
      first = false;
    };
    draw();
    const refresh = () => Promise.all([loadCoins(), api('/api/data?v=home').then(j => { if (j && j.ok) S.home = j; })]).then(draw);
    refresh(); every(refresh, 12000);
  }

  // ---------------------------------------------------------------- ledger
  // a holding's floor value is what it sells for on the curve if every other holder sold first: amount x floor price
  function ledger() {
    view.innerHTML = `<div class="vh"><div><h1><span class="seal">${I.list}</span>Your ledger</h1><p>The Azuro coins in your wallet, what they are worth now, and the least they sell for on the curve even if every other holder sells first.</p></div></div><div id="lg"></div>`;
    const load = async () => {
      if (!W.W.addr) { $('#lg').innerHTML = `<div class="panel"><div class="emptybox"><b>Connect a wallet to see your ledger.</b><span>It's read straight from Solana. Nothing is stored.</span><button class="btn red" type="button" id="lgc">Connect</button></div></div>`; $('#lgc').addEventListener('click', openPicker); return; }
      const j = await api('/api/data?v=ledger&wallet=' + W.W.addr);
      if (!j.ok) { $('#lg').innerHTML = `<div class="panel"><div class="emptybox"><b>Your ledger could not be read.</b><span>${esc(j.error || 'Try again in a moment.')}</span></div></div>`; return; }
      const held = j.held.map(h => { const price = h.valueSol != null && h.amount ? h.valueSol / h.amount : null, floor = price && h.aboveFloor ? price / h.aboveFloor : null;
        return Object.assign({}, h, { floorSol: !h.grad && floor ? floorBack(price, floor, h.amount) : null }); });
      const tot = held.reduce((s, h) => s + (h.valueSol || 0), 0), flo = held.reduce((s, h) => s + (h.floorSol || 0), 0);
      $('#lg').innerHTML = `<div class="kv" style="margin-bottom:22px"><div><b>${fmt(tot, 3)} SOL</b><small>Worth now · ${j.sol ? usd(tot * j.sol) : '—'}</small></div><div><b>${fmt(flo, 3)} SOL</b><small>At the floor · ${j.sol ? usd(flo * j.sol) : '—'}</small></div><div><b>${held.length}</b><small>Coins held</small></div><div><b>${j.mine.length}</b><small>Coins you launched</small></div></div>
        <div class="panel"><div class="ph"><span><span class="k">${I.list}</span>Held</span><span>${held.length ? 'now · floor' : ''}</span></div><div class="pb list ledg">${held.length ? held.map(h => `<div class="row"><img src="${esc(h.img)}" alt="" width="32" height="32"><span><a href="#coin/${esc(h.mint)}">$${esc(h.ticker)}</a> <span class="dash">${tok(h.amount)}</span></span><b>${h.valueSol != null ? fmt(h.valueSol, 4) + ' SOL' : '—'}</b><span class="fl">${h.floorSol != null ? fmt(h.floorSol, 4) + ' SOL' : '—'}<small>${h.aboveFloor ? '×' + fmt(h.aboveFloor, 2) + ' above' : ''}</small></span></div>`).join('') : '<div class="dash">No Azuro coins in this wallet yet. <a href="#market">Find one →</a></div>'}</div></div>
        <div class="panel" style="margin-top:22px"><div class="ph"><span><span class="k">${I.launch}</span>Launched</span><span>${j.mine.length ? j.mine.length + ' coin' + (j.mine.length === 1 ? '' : 's') : ''}</span></div><div class="pb list ledg">${j.mine.length ? j.mine.map(c => { const v = c.curve || {}; return `<div class="row"><img src="${esc(c.img)}" alt="" width="32" height="32"><span><a href="#coin/${esc(c.mint)}">$${esc(c.ticker)}</a> <span class="dash">${ago(c.created)} · curve ${v.complete ? 'done' : Math.round((v.progress || 0) * 100) + '%'}</span></span><b>${usd(v.mcapUsd)}</b><span class="fl">${v.aboveFloor ? '×' + fmt(v.aboveFloor, 2) : '—'}<small>${c.sig ? `<a href="https://solscan.io/tx/${esc(c.sig)}" target="_blank" rel="noopener">backing ↗</a>` : ''}</small></span></div>`; }).join('') : '<div class="dash">You have not launched a coin yet. <a href="#launch">Launch one →</a></div>'}</div></div>
        <p class="ledgnote">A floor value is what your tokens sell for on the curve if every other holder sold first, after pump.fun's fee, worked out from each coin's live curve. A graduated coin trades in its pool instead, so it shows a dash.</p>`;
    };
    S.onWallet = load; load(); every(load, 15000);
  }

  // ---------------------------------------------------------------- docs
  function docs() {
    const R = (S.rules && S.rules.rules) || { backSol: 0.5, backBuys: 3, devMaxSol: 0.5, perDay: 40, perWalletPerDay: 2 };
    view.innerHTML = `<div class="vh"><div><h1><span class="seal">${I.doc}</span>Docs</h1><p>How a backed launch works, the math behind the floor, the rules, and what Azuro does and doesn't do.</p></div></div>
    <div class="docs"><nav class="toc"><a href="#d-what">What Azuro is</a><a href="#d-tx">The launch transaction</a><a href="#d-floor">The floor</a><a href="#d-rules">The rules</a><a href="#d-costs">Costs</a><a href="#d-trade">Trading</a><a href="#d-pool">The pool</a><a href="#d-risk">Risks</a><a href="#d-api">Public API</a></nav>
    <article class="doc">
      <h2 id="d-what"><span class="seal">${I.mark}</span>What Azuro is</h2>
      <p>Azuro is a launchpad for pump.fun coins where every coin is backed before anyone can trade it. The platform buys each new coin ${R.backBuys} times, ${R.backSol} SOL each, inside the transaction that creates it. Every token those buys receive is burned in the same transaction. The SOL they paid stays in the coin's curve forever, which gives the coin a floor from its first block.</p>
      <h2 id="d-tx"><span class="seal">${I.launch}</span>The launch transaction</h2>
      <p>One transaction, in this order:</p>
      <ol><li><code>create_v2</code>: pump.fun creates your coin. You are its creator and receive its creator fees.</li><li>${R.backBuys} × <code>buy</code> by the pool, ${R.backSol} SOL each, for an exact number of tokens.</li><li><code>burn</code>: every token the pool bought, burned.</li><li><code>close_account</code>: the pool's token account is closed and its rent returned.</li><li>Optional: your own <code>buy</code>, up to ${R.devMaxSol} SOL.</li></ol>
      <p>Because the backing sits inside the create transaction, nobody can buy between the launch and the backing. When your own buy doesn't fit in the same transaction, it goes in a second one, sent together with the first as a Jito bundle so it lands right behind the backing. The pool signs last, and only after checking that the transaction is byte for byte the one it built.</p>
      <h2 id="d-floor"><span class="seal">${I.stone}</span>The floor</h2>
      <p>pump.fun's curve is a constant product of virtual reserves: <code>SOL × tokens = k</code>, starting from 30 SOL and 1.073 billion tokens. A buy adds SOL (after fees) and removes tokens; a sell does the reverse. SOL only comes out when tokens go back in.</p>
      <p>The backing adds about ${fmt(R.backSol * R.backBuys / 1.0125, 2)} SOL to the curve after fees and takes out roughly 50 million tokens, which are burned. Those tokens can never be sold back, so even if every holder sold everything they own, the curve would stop at the state the backing left it in. That price is the floor: about 10% above a plain launch price, and it can't be undercut on the curve.</p>
      <pre>floor price = (30 + backing after fees)² / k      k = 30 × 1,073,000,000</pre>
      <p>When a coin graduates, its SOL and remaining tokens move into its pump.fun pool. The burned tokens stay burned, so the backing stays in the pool too.</p>
      <h3 class="dh">What the floor means when you buy</h3>
      <p>The worst case for a holder is that every other holder sells first. The curve then sits at its floor with only your tokens still out, and selling them returns:</p>
      <pre>worst case = floor SOL × your tokens / (floor tokens − your tokens) × (1 − fee)</pre>
      <p>The trade panel shows this number before you buy, and your ledger shows it for everything you hold. Right after a launch it is close to what you put in. The higher a coin trades above its floor, the further it can fall before it gets there.</p>
      <h2 id="d-rules"><span class="seal">${I.rules}</span>The rules</h2>
      <table><tr><th>Rule</th><th>Value</th></tr><tr><td>Backing buys per launch</td><td>${R.backBuys} × ${R.backSol} SOL</td></tr><tr><td>Creator buy cap</td><td>${R.devMaxSol} SOL</td></tr><tr><td>Backed launches a day</td><td>${R.perDay}</td></tr><tr><td>Launches per wallet a day</td><td>${R.perWalletPerDay}</td></tr><tr><td>Tickers</td><td>one ticker, once</td></tr><tr><td>Images</td><td>one image, once (near copies included)</td></tr></table>
      <h2 id="d-costs"><span class="seal">${I.sum}</span>Costs</h2>
      <p>You pay pump.fun's account rent for the new coin, the network fee and your own optional buy: your wallet shows the exact total before you sign. The pool pays the backing. Azuro adds no fee to launches or trades.</p>
      <h2 id="d-trade"><span class="seal">${I.market}</span>Trading</h2>
      <p>Trades are built for your wallet against pump.fun's curve with pump.fun's own SDK. Graduated coins trade in their pump.fun pool. Your wallet signs every trade. You pay pump.fun's normal trading fees and the network fee.</p>
      <h2 id="d-pool"><span class="seal">${I.coin}</span>The pool</h2>
      <p>The pool is one public wallet. Its balance and every backing it paid are on the Pool page and on Solscan. Its key lives only on the server that builds launches, and it signs nothing but the backing of a launch it just built and checked. When the pool can't cover a launch, launching pauses.</p>
      <h2 id="d-risk"><span class="seal">${I.warn}</span>Risks</h2>
      <ul><li>A floor is not a guarantee of profit. If you buy above the floor, you can lose most of what you put in.</li><li>Memecoins are extremely risky and most go to zero relative to where people buy them.</li><li>Azuro is independent and not affiliated with pump.fun. Coins live on pump.fun's program.</li><li>Nothing here is financial advice.</li></ul>
      <h2 id="d-api"><span class="seal">${I.doc}</span>Public API</h2>
      <pre>GET /api/data?v=home              pool, counts, latest coins, the wall
GET /api/data?v=coins             every coin with its live curve
GET /api/data?v=coin&mint=…       one coin, holders, floor math
GET /api/data?v=pool              pool balance, limits, backing receipts
GET /api/launch?check=rules       rules, curve constants, pool state
GET /api/launch?check=ticker&v=…  is a ticker free</pre>
    </article></div>`;
    $$('.toc a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); const t = document.getElementById(a.getAttribute('href').slice(1)); if (t) scrollTo({ top: t.getBoundingClientRect().top + scrollY - 110, behavior: 'smooth' }); }));
    if (!S.rules) loadRules().then(() => { if ((location.hash || '').startsWith('#docs')) docs(); });
  }

  // ---------------------------------------------------------------- boot
  wbtn(); W.restore().then(wbtn);
  loadCoins(); loadRules();
  api('/api/data?v=home').then(j => { if (j && j.ok) S.home = j; });
  route();
})();
