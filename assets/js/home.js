// AZURO home: the shoji opens, the foundation is set stone by stone, three gold stones drop in, the keep rises.
// Live numbers come from /api/data; the floor chart is pump.fun's own curve math.
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = document.body;
  const fmt = (n, d = 2) => n == null || !isFinite(n) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const usd = n => n == null || !isFinite(n) ? '—' : n >= 1e6 ? '$' + fmt(n / 1e6, 2) + 'M' : n >= 1e4 ? '$' + fmt(n / 1e3, 1) + 'K' : '$' + fmt(n, 0);
  const sci = n => { if (n == null || !isFinite(n)) return '—'; const e = Math.floor(Math.log10(n)); return (n / 10 ** e).toFixed(3) + '×10' + String(e).replace('-', '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- scenes ----------
  let mode = null, heroScene = null;
  // with "xMidYMax slice" the art is scaled to cover and pinned to the bottom, so the waterline sits at a fixed
  // distance from the bottom: (viewBox height - sea top) times the scale
  function placeSea(box, sea, sc) {
    const r = box.getBoundingClientRect(); if (!r.width || !sc) return;
    const k = Math.max(r.width / sc.W, r.height / sc.H);
    sea.style.height = Math.round(sc.seaFrac * sc.H * k) + 'px';
  }
  function scenes() {
    const m = innerWidth / innerHeight < 1.05 ? 'tall' : 'wide';
    if (m !== mode) { mode = m; heroScene = AzScene.render(m); $('#heroArt').innerHTML = heroScene.svg; }
    placeSea($('#top'), $('#heroSea'), heroScene);
  }
  scenes();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(scenes, 200); });

  // ---------- the intro ----------
  let seen = false; try { seen = sessionStorage.getItem('azSeen') === '1'; } catch { }
  function finish(skipped) {
    if (body.classList.contains('done')) return;
    if (skipped) body.classList.add('skipped');
    body.classList.remove('intro'); body.classList.add('open', 'done');
    try { sessionStorage.setItem('azSeen', '1'); } catch { }
    if (skipped) setTimeout(() => body.classList.remove('skipped'), 50);
  }
  function labels() {
    const svg = $('#heroArt svg'); if (!svg) return;
    $$('.az-gold', svg).forEach((g, i) => {
      const r = g.getBoundingClientRect(); if (!r.width) return;
      const l = document.createElement('div'); l.className = 'lbl05'; l.textContent = '0.5 SOL';
      l.style.left = (r.left + r.width / 2) + 'px'; l.style.top = (r.top - 8 + scrollY) + 'px';
      document.body.appendChild(l);
      setTimeout(() => l.classList.add('on'), 1000 + i * 300);
      setTimeout(() => l.remove(), 4200 + i * 300);
    });
  }
  if (RM || seen) finish(true);
  else {
    setTimeout(() => { body.classList.add('open'); body.classList.remove('intro'); labels(); }, 1700);
    setTimeout(() => finish(false), 3000);
    setTimeout(() => finish(false), 6000);   // backstop
    const sk = () => finish(true);
    $('#skip').addEventListener('click', sk);
    addEventListener('keydown', sk, { once: true });
    addEventListener('wheel', sk, { once: true, passive: true });
    addEventListener('touchstart', sk, { once: true, passive: true });
  }

  // ---------- petals that followed you through the gate ----------
  if (document.documentElement.classList.contains('from-gate') && !RM) {
    const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); cv.style.cssText = 'position:fixed;inset:0;z-index:40;pointer-events:none;transition:opacity 1.2s';
    document.body.appendChild(cv);
    const g = cv.getContext('2d'), d = Math.min(1.5, devicePixelRatio || 1), W = innerWidth, H = innerHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0);
    const P = Array.from({ length: innerWidth < 700 ? 10 : 18 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.8, s: 5 + Math.random() * 7, vx: 0.5 + Math.random() * 0.8, vy: 0.35 + Math.random() * 0.6, r: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.05, w: Math.random() * 6.3, c: Math.random() < 0.72 ? '#efb6c3' : '#f5eedd' }));
    const t0 = performance.now(); let last = 0;
    const fr = t => {
      if (t - t0 > 6500) { cv.remove(); return; }
      if (t - t0 > 5000) cv.style.opacity = '0';
      requestAnimationFrame(fr); if (t - last < 33) return; last = t; g.clearRect(0, 0, W, H);
      for (const p of P) { p.w += 0.03; p.x += p.vx + Math.sin(p.w) * 0.4; p.y += p.vy; p.r += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(p.w))); g.beginPath(); g.moveTo(0, -p.s);
        g.bezierCurveTo(p.s * 0.95, -p.s * 0.55, p.s * 0.7, p.s * 0.75, 0, p.s); g.bezierCurveTo(-p.s * 0.7, p.s * 0.75, -p.s * 0.95, -p.s * 0.55, 0, -p.s);
        g.fillStyle = p.c; g.fill(); g.lineWidth = 1.1; g.strokeStyle = 'rgba(28,27,34,.6)'; g.stroke(); g.restore(); }
    };
    requestAnimationFrame(fr);
  }

  // ---------- nav, reveals ----------
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('solid', scrollY > innerHeight * 0.55);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); if (e.target.matches('figure')) e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  // ---------- 02: the transaction plays itself ----------
  const steps = $$('#steps li'), rows = $$('#txlist li'), golds = $$('.mini-gold'), smoke = $('#smoke'), st = $('#txst');
  let step = 0, playing = false;
  function show(n) {
    steps.forEach(li => li.classList.toggle('on', +li.dataset.s <= n));
    rows.forEach(li => li.classList.toggle('on', +li.dataset.s <= n));
    golds.forEach(g => g.classList.toggle('on', +g.dataset.g <= n));
    smoke.classList.toggle('on', n === 5);
    st.textContent = n === 0 ? 'building' : n < 6 ? 'step ' + n + ' of 6' : 'confirmed';
  }
  function tick() { if (!playing) return; step = step >= 6 ? 0 : step + 1; show(step); setTimeout(tick, step === 6 ? 2600 : step === 0 ? 500 : 1050); }
  new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !playing) { playing = true; tick(); } else if (!v) playing = false; }, { threshold: 0.25 }).observe($('#how'));
  steps.forEach(li => li.addEventListener('click', () => { playing = false; step = +li.dataset.s; show(step); }));
  if (RM) show(6);

  // ---------- 03: the floor ----------
  let C = { vq: 30, vt: 1073e6, rt: 793.1e6, supply: 1e9, fee: 0.0125, back: 0.5, buys: 3, sol: null, live: false };
  function model() {
    const k = C.vq * C.vt;
    let vq = C.vq;
    for (let i = 0; i < C.buys; i++) vq += C.back / (1 + C.fee);
    const vtF = k / vq, burned = C.vt - vtF;
    const p0 = C.vq / C.vt, pf = vq / vtF;
    const xEnd = k / (C.vt - C.rt) - C.vq;           // real SOL in the curve at graduation
    return { k, vqF: vq, vtF, burned, p0, pf, xF: vq - C.vq, xEnd };
  }
  const svg = $('#curve'), W = 640, H = 360, PL = 64, PR = 18, PT = 22, PB = 46;
  function draw(sold) {
    const M = model(), supplyAfter = C.supply - M.burned;
    const mcap = x => { const vq = C.vq + x; return (vq * vq / M.k) * supplyAfter; };    // SOL
    const xMax = 60, yMax = mcap(xMax) * 1.04, yMin = 0;
    const X = x => PL + (W - PL - PR) * x / xMax, Y = v => H - PB - (H - PT - PB) * (v - yMin) / (yMax - yMin);
    const sol = C.sol;
    const lab = v => sol ? usd(v * sol) : fmt(v, 0) + ' SOL';
    let s = '';
    const axl = v => !v ? (sol ? '$0' : '0') : sol && yMax * sol >= 1e4 ? '$' + fmt(v * sol / 1e3, 1) + 'K' : lab(v);   // one format down the whole axis
    for (let i = 0; i <= 4; i++) { const v = yMax * i / 4, y = Y(v); s += `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="rgba(28,27,34,.12)"/><text x="${PL - 8}" y="${y + 4}" text-anchor="end" font-family="Mono,monospace" font-size="11" fill="#686270">${axl(v)}</text>`; }
    for (let x = 0; x <= xMax; x += 10) s += `<text x="${X(x)}" y="${H - PB + 18}" text-anchor="middle" font-family="Mono,monospace" font-size="11" fill="#686270">${x}</text>`;
    s += `<text x="${(PL + W - PR) / 2}" y="${H - 8}" text-anchor="middle" font-family="Mono,monospace" font-size="11" fill="#686270">SOL in the curve</text>`;
    // the locked part under the floor
    let lock = `M${X(0)},${Y(0)}`; for (let i = 0; i <= 20; i++) { const x = M.xF * i / 20; lock += ` L${X(x)},${Y(mcap(x))}`; } lock += ` L${X(M.xF)},${Y(0)} Z`;
    s += `<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#f5eedd"/><line x1="0" y1="0" x2="0" y2="7" stroke="#c8392b" stroke-width="3"/></pattern></defs>`;
    s += `<path d="${lock}" fill="url(#hatch)" stroke="#c8392b" stroke-width="2"/>`;
    let d = ''; for (let i = 0; i <= 120; i++) { const x = xMax * i / 120; d += (i ? ' L' : 'M') + X(x).toFixed(1) + ',' + Y(mcap(x)).toFixed(1); }
    s += `<path d="${d}" fill="none" stroke="#1c1b22" stroke-width="3.5" stroke-linejoin="round"/>`;
    const yf = Y(mcap(M.xF));
    s += `<line x1="${PL}" y1="${yf}" x2="${W - PR}" y2="${yf}" stroke="#c8392b" stroke-width="2.5" stroke-dasharray="8 6"/>`;
    const ft = 'FLOOR ' + lab(mcap(M.xF)), fw = Math.round(22 + ft.length * 7.3);
    s += `<g transform="translate(${W - PR - fw},${yf - 34})"><rect width="${fw}" height="26" fill="#c8392b"/><text x="11" y="18" font-family="Mono,monospace" font-weight="700" font-size="12" fill="#f5eedd">${ft}</text></g>`;
    // the coin, pumped to 40 SOL, sold back by the slider
    const top = 40, x = Math.max(M.xF, top - (top - M.xF) * sold / 100);
    const mx = X(x), my = Y(mcap(x));
    s += `<line x1="${mx}" y1="${my}" x2="${mx}" y2="${H - PB}" stroke="rgba(28,27,34,.35)" stroke-dasharray="3 4"/>`;
    s += `<circle cx="${mx}" cy="${my}" r="9" fill="#f5eedd" stroke="#1c1b22" stroke-width="3"/><circle cx="${mx}" cy="${my}" r="3.5" fill="#1c1b22"/>`;
    // the label goes where the curve isn't: up and left of the marker, else down and right, never across the floor line
    const tl = sold >= 100 ? 'everyone sold: it stopped at the floor' : 'market cap ' + lab(mcap(x));
    let tx = mx + 16, ty = my + 18, ta = 'start';
    if (sold < 100 && mx - 16 - tl.length * 7.6 > PL + 6) { tx = mx - 16; ty = my - 12; ta = 'end'; }
    else if (ty > yf - 6 && ty < yf + 12) ty = yf + 22;
    s += `<text x="${tx}" y="${ty}" text-anchor="${ta}" font-family="Mono,monospace" font-weight="700" font-size="12.5" fill="#1c1b22">${tl}</text>`;
    s += `<circle cx="${X(0)}" cy="${Y(mcap(0))}" r="5" fill="#1c1b22"/>`;
    svg.innerHTML = s;
    $('#sellv').textContent = sold + '%';
    const n = (k, v) => { const el = $(`#nums [data-n="${k}"]`); if (el) el.textContent = v; };
    n('p0', sol ? '$' + sci(M.p0 * sol) : sci(M.p0) + ' SOL');
    n('pf', sol ? '$' + sci(M.pf * sol) : sci(M.pf) + ' SOL');
    n('up', '+' + fmt((M.pf / M.p0 - 1) * 100, 1) + '%');
    n('mf', sol ? usd(M.pf * supplyAfter * sol) : fmt(M.pf * supplyAfter, 1) + ' SOL');
    n('burn', fmt(M.burned / 1e6, 1) + 'M (' + fmt(M.burned / C.supply * 100, 2) + '%)');
    const vqn = C.vq + x;
    n('now', sol ? '$' + sci((vqn * vqn / M.k) * sol) : sci(vqn * vqn / M.k) + ' SOL');
  }
  const sell = $('#sell');
  sell.addEventListener('input', () => draw(+sell.value));
  draw(0);
  // auto-demo once when the chart scrolls into view
  new IntersectionObserver((es, o) => {
    if (!es[0].isIntersecting || RM) return; o.disconnect();
    let v = 0; const iv = setInterval(() => { v = Math.min(100, v + 2); sell.value = v; draw(v); if (v >= 100) clearInterval(iv); }, 40);
    sell.addEventListener('pointerdown', () => clearInterval(iv), { once: true });
  }, { threshold: 0.5 }).observe(svg);

  fetch('/api/launch?check=rules').then(r => r.json()).then(j => {
    if (j && j.curve) { Object.assign(C, j.curve, { live: true }); $('#src').textContent = "Computed live from pump.fun's curve account and fee schedule, fees included."; }
    if (j && j.rules) { C.back = j.rules.backSol || C.back; C.buys = j.rules.backBuys || C.buys; }
    draw(+sell.value);
  }).catch(() => { });

  // ---------- live: the pool, the wall, the latest ----------
  const ago = t => { const s = (Date.now() - new Date(t).getTime()) / 1000; return s < 60 ? Math.max(1, Math.round(s)) + 's' : s < 3600 ? Math.round(s / 60) + 'm' : s < 86400 ? Math.round(s / 3600) + 'h' : Math.round(s / 86400) + 'd'; };
  let lastWall = null;   // null until the first read, so an empty wall still renders its empty state
  function card(c) {
    const v = c.curve || {};
    return `<a class="fuda" href="/app#coin/${esc(c.mint)}"><div class="top"><span>$${esc(c.ticker)}</span><span class="age">${ago(c.created)}</span></div>` +
      `<div class="body"><img src="${esc(c.img)}" alt="" loading="lazy" width="64" height="64"><div style="min-width:0"><div class="nm">${esc(c.name)}</div>` +
      `<div class="stats"><span>MCAP<b>${usd(v.mcapUsd)}</b></span><span>ABOVE FLOOR<b>${v.aboveFloor ? '×' + fmt(v.aboveFloor, 2) : '—'}</b></span></div></div></div>` +
      `<div class="bar" title="bonding curve"><i style="width:${Math.round((v.progress || 0) * 100)}%"></i></div><span class="seal stamp"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="5.4"/><rect x="2.6" y="16.4" width="5.6" height="4" rx=".9"/><rect x="9.2" y="16.4" width="5.6" height="4" rx=".9"/><rect x="15.8" y="16.4" width="5.6" height="4" rx=".9"/></svg></span></a>`;
  }
  async function live() {
    let j = null;
    try { j = await fetch('/api/data?v=home', { cache: 'no-store' }).then(r => r.ok ? r.json() : null); } catch { }
    const set = (k, v, n, d) => { const el = $(`#live [data-k="${k}"]`); if (!el) return;
      if (n == null || RM) { el.textContent = v; return; }
      const from = +(el.dataset.v || 0), t0 = performance.now(); el.dataset.v = n;
      const step = t => { const q = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - q, 3); el.textContent = fmt(from + (n - from) * e, d); if (q < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step); };
    if (!j || !j.ok) { set('pool', '—'); set('cap', '—'); $('#wallStones').innerHTML = '<div class="empty">The wall is offline right now.<small>LIVE DATA COULD NOT BE READ</small></div>'; return; }
    const p = j.pool || {};
    set('pool', p.lamports != null ? fmt(p.lamports / 1e9, 2) : '—', p.lamports != null ? p.lamports / 1e9 : null, 2);
    set('cap', p.connected ? String(p.capacity) : '—', p.connected ? p.capacity : null, 0);
    set('coins', String(j.counts.coins), j.counts.coins, 0);
    set('locked', fmt(j.counts.lockedSol, 1), j.counts.lockedSol, 1);
    if (j.sol) { C.sol = j.sol; draw(+sell.value); }
    // the wall
    const key = j.wall.map(w => w.m).join(',');
    if (key !== lastWall) {
      const fresh = new Set(lastWall ? j.wall.map(w => w.m).filter(m => !lastWall.includes(m)) : []);
      lastWall = key;
      $('#wallStones').innerHTML = j.wall.length ? j.wall.map((w, i) => `<a class="stone${w.g ? ' grad' : i < 3 ? ' gold' : ''}${fresh.has(w.m) ? ' new' : ''}" style="--i:${Math.min(i, 40)}" href="/app#coin/${esc(w.m)}" title="$${esc(w.t)}">$${esc(w.t)}</a>`).join('') +
        '<a class="stone ghost" href="/app#launch">+ your coin</a>'
        : '<div class="empty">No stones yet. The first coin backed here becomes the first stone.<small><a href="/app#launch" style="color:inherit">LAUNCH THE FIRST COIN →</a></small></div>';
    }
    $('#wallCount').textContent = j.counts.coins ? `${j.counts.coins} stone${j.counts.coins > 1 ? 's' : ''} · ${fmt(j.counts.lockedSol, 1)} SOL under them · ${fmt(j.counts.burned / 1e6, 1)}M tokens burned` : '';
    $('#latest').innerHTML = j.latest.map(card).join('');
    // the pool
    $('#poolBig').innerHTML = (p.lamports != null ? fmt(p.lamports / 1e9, 2) : '—') + '<small>SOL</small>';
    if (p.address) $('#poolAddr').innerHTML = `<span class="chip ${p.connected ? 'live' : 'off'}"><i></i>${p.connected ? 'BACKING' : 'NOT CONNECTED'}</span><a href="https://solscan.io/account/${esc(p.address)}" target="_blank" rel="noopener">${esc(p.address)}</a>`;
    const g = (k, v) => { const el = $(`#gauge [data-g="${k}"]`); if (el) el.textContent = v; };
    g('cap', p.connected ? p.capacity : '—'); g('today', j.counts.today); g('perDay', j.rules.perDay); g('perWallet', j.rules.perWalletPerDay);
    const left = Math.max(0, j.rules.perDay - j.counts.today), shown = Math.min(j.rules.perDay, 60);
    $('#slots').innerHTML = Array.from({ length: shown }, (_, i) => `<i class="${i < shown - Math.min(left, p.connected ? p.capacity : 0) ? 'used' : ''}" title="${i < shown - left ? 'used today' : 'open'}"></i>`).join('');
  }
  live(); setInterval(() => { if (!document.hidden) live(); }, 15000);

  // ---------- $AZURO ----------
  const CFG = window.AZURO || {};
  if (CFG.ca) {
    $('#coin').hidden = false;
    $('#caText').textContent = CFG.ca;
    $('#caBuy').href = 'https://pump.fun/coin/' + CFG.ca;
    $('#caChart').href = 'https://dexscreener.com/solana/' + CFG.ca;
    if (CFG.x) $('#caX').href = CFG.x; else $('#caX').remove();
    $('#caCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(CFG.ca); $('#caCopy').textContent = 'Copied'; setTimeout(() => $('#caCopy').textContent = 'Copy', 1400); } catch { } });
  }
})();
