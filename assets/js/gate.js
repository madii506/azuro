// AZURO front page: a woodblock sunrise drawn on one canvas. The sun rises out of a moving seigaiha sea and keeps
// breathing, mist bands drift across it, birds cross, petals fall, its reflection shimmers on the water.
// ENTER walks into the home page; CONNECT links a wallet first and walks into the terminal.
(function () {
  const $ = s => document.querySelector(s);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const short = a => a ? a.slice(0, 4) + '…' + a.slice(-4) : '';
  const K = { ink: '#1c1b22', red: '#c8392b', sea: '#22355f', line: '#8598c4', mist: '#f2e9d3', mistLine: '#b9a888', paper: '#f5eedd' };
  const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);

  // ---------- the scene ----------
  const cv = $('#sky'), g = cv.getContext('2d');
  let W = 0, H = 0, D = 1, rows = [], horizon = 0, seaTop = 0, sunR = 0, sunY = 0, mists = [], birds = [], petals = [];
  const T0 = performance.now();
  let speed = 1, mx = 0, my = 0, px = 0, py = 0;

  // one row of seigaiha scales, drawn once into its own strip and slid sideways every frame
  function strip(R, first) {
    const tile = 2 * R, w = (Math.ceil(W / tile) + 3) * tile, c = document.createElement('canvas');
    c.width = Math.ceil(w * D); c.height = Math.ceil((R + 2) * D);
    const q = c.getContext('2d'); q.setTransform(D, 0, 0, D, 0, 0);
    for (let x = R; x < w + R; x += tile) {
      q.beginPath(); q.arc(x, R + 1, R, Math.PI, 0); q.closePath(); q.fillStyle = K.sea; q.fill();
      q.lineWidth = Math.max(1.1, R * 0.055); q.strokeStyle = K.line;
      for (const k of [0.97, 0.67, 0.37]) { q.beginPath(); q.arc(x, R + 1, R * k, Math.PI, 0); q.stroke(); }
      if (first) { q.lineWidth = 2; q.strokeStyle = K.ink; q.beginPath(); q.arc(x, R + 1, R - 0.5, Math.PI, 0); q.stroke(); }   // the far row draws the horizon in ink
    }
    return { c, tile, R, w };
  }
  function build() {
    D = Math.min(1.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * D); cv.height = Math.round(H * D); g.setTransform(D, 0, 0, D, 0, 0);
    const phone = W < 700;
    horizon = Math.round(H * (phone ? 0.75 : 0.74));
    sunR = Math.min(W * (phone ? 0.24 : 0.15), H * 0.2);
    sunY = H * 0.40;
    // the sea: small far rows at the horizon, each nearer row a little bigger
    rows = []; let R = Math.max(9, Math.min(W, 1600) * 0.011), y = horizon, k = 0;
    while (y < H + 4) { rows.push(Object.assign(strip(R, k === 0), { y, k, sp: 7 + k * 2.6, ph: Math.random() * 400 })); y += R * 0.5; R *= 1.11; k++; }
    seaTop = horizon + rows[0].R;
    // keep the buttons clear of the sun: the gap under the name grows with the sun
    const nh = $('.name').getBoundingClientRect().height / 2;
    $('main').style.setProperty('--gap', Math.max(28, Math.round(sunR - nh + 22)) + 'px');
    const nm = $('.name').getBoundingClientRect(), ct = $('.cta').getBoundingClientRect(), ch = phone ? 15 : 21;
    const zones = [[H * 0.05 + ch, nm.top - 26 - ch * 1.9], [ct.bottom + 26 + ch, horizon - 22 - ch * 1.9]];
    mists = [];
    zones.forEach(([a, b], z) => {
      const room = b - a; if (room < 0) return;
      const n = z === 0 ? (room > ch * 5 ? 2 : 1) : 1;
      for (let i = 0; i < n; i++) mists.push({ y: n === 1 ? (a + b) / 2 : a + room * (i ? 0.85 : 0.15), w: (0.22 + Math.random() * 0.12) * Math.max(W, 700), h: ch, v: (i + z) % 2 ? -6 - Math.random() * 4 : 5 + Math.random() * 4, x: Math.random() * W });
    });
    birds = Array.from({ length: phone ? 2 : 3 }, (_, i) => ({ x: Math.random() * W, y: H * (0.1 + i * 0.07), v: 16 + Math.random() * 14, s: phone ? 10 : 12 + Math.random() * 5, ph: Math.random() * 6 }));
    if (!petals.length) petals = Array.from({ length: phone ? 14 : 24 }, () => petal(true));
  }
  const petal = any => ({ x: any ? Math.random() * W : -30 - Math.random() * W * 0.3, y: any ? Math.random() * H : Math.random() * H * 0.7 - 40, s: 5 + Math.random() * 7,
    vx: 0.45 + Math.random() * 0.8, vy: 0.3 + Math.random() * 0.6, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.05, w: Math.random() * 6.28, c: Math.random() < 0.72 ? '#efb6c3' : K.paper });

  function capsule(x, y, w, h) { const r = h / 2; g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2); g.lineTo(x + r, y + h); g.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); g.closePath(); }

  function draw(now) {
    const t = (now - T0) / 1000;
    px += (mx - px) * 0.05; py += (my - py) * 0.05;
    g.clearRect(0, 0, W, H);
    // the sun: rises out of the sea over the first seconds, then breathes
    const rise = RM ? 1 : ease((t - 0.15) / 2.6);
    const r = sunR * (1 + 0.012 * Math.sin(t * 0.9));
    const cx = W / 2 - px * 14, cy = horizon + sunR * 1.1 + (sunY - horizon - sunR * 1.1) * rise + Math.sin(t * 0.6) * 2 - py * 8;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = K.red; g.fill();
    // mist bands drifting through the sky, some across the sun
    g.lineWidth = 2; g.strokeStyle = K.mistLine; g.fillStyle = K.mist;
    for (const m of mists) {
      m.x += m.v * speed / 30; const span = W + m.w;
      const x = ((m.x % span) + span) % span - m.w - px * 26 * (m.v > 0 ? 1 : -1), y = m.y - py * 8;
      // a kasumi cloud: a long band with a shorter one above and below, each outlined
      capsule(x + m.w * 0.16, y - m.h * 0.82, m.w * 0.5, m.h); g.fill(); g.stroke();
      capsule(x, y, m.w, m.h); g.fill(); g.stroke();
      capsule(x + m.w * 0.44, y + m.h * 0.82, m.w * 0.36, m.h); g.fill(); g.stroke();
    }
    // birds
    g.strokeStyle = K.ink; g.lineWidth = 2.4; g.lineCap = 'round';
    for (const b of birds) {
      b.x += b.v * speed / 30; if (b.x > W + 40) { b.x = -40; b.y = H * (0.08 + Math.random() * 0.22); }
      const a = 0.45 + 0.4 * Math.sin(t * 7 + b.ph), y = b.y + Math.sin(t * 0.8 + b.ph) * 5;
      g.beginPath(); g.moveTo(b.x - b.s, y); g.quadraticCurveTo(b.x - b.s / 2, y - b.s * a, b.x, y); g.quadraticCurveTo(b.x + b.s / 2, y - b.s * a, b.x + b.s, y); g.stroke();
    }
    // the sea: a solid ground, then the rows from far to near, each sliding at its own pace
    g.fillStyle = K.sea; g.fillRect(0, seaTop, W, H - seaTop);
    for (const row of rows) {
      const off = ((t * row.sp * speed + row.ph + px * row.k * 3) % row.tile + row.tile) % row.tile;
      const y = row.y + Math.sin(t * 1.1 + row.k * 0.9) * row.R * 0.06;
      g.drawImage(row.c, -off - (row.k % 2 ? row.R : 0) - row.tile, y - 1, row.w, row.R + 2);
    }
    // the sun's reflection: hard red bars that shimmer, as long as the sun is up
    const up = Math.max(0, Math.min(1, (horizon - (cy + r * 0.2)) / (r * 1.2)));
    if (up > 0) {
      g.fillStyle = K.red;
      for (let i = 0; i < 7; i++) {
        const y = seaTop + 8 + i * (H - seaTop) * 0.13; if (y > H - 4) break;
        const half = r * (0.82 - i * 0.1) * (0.78 + 0.22 * Math.sin(t * 1.8 + i * 1.7)) * up, h = Math.max(4, 5 + i * 1.2);
        if (half > 2) { capsule(cx - half, y, half * 2, h); g.fill(); }
      }
    }
    // petals over everything
    for (const p of petals) {
      p.w += 0.03 * speed;
      if (speed > 1.5) { const dx = p.x - W / 2, dy = p.y - H * 0.45; p.vx += dx * 0.002; p.vy += dy * 0.002; }
      p.x += p.vx * speed + Math.sin(p.w) * 0.4; p.y += p.vy * speed; p.r += p.vr;
      if (speed <= 1.5 && (p.x > W + 30 || p.y > H + 30)) Object.assign(p, petal(false));
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(p.w)));
      g.beginPath(); g.moveTo(0, -p.s); g.bezierCurveTo(p.s * 0.95, -p.s * 0.55, p.s * 0.7, p.s * 0.75, 0, p.s); g.bezierCurveTo(-p.s * 0.7, p.s * 0.75, -p.s * 0.95, -p.s * 0.55, 0, -p.s);
      g.fillStyle = p.c; g.fill(); g.lineWidth = 1.1; g.strokeStyle = 'rgba(28,27,34,.6)'; g.stroke(); g.restore();
    }
  }
  build();
  let last = 0;
  function loop(now) { requestAnimationFrame(loop); if (document.hidden || now - last < 32) return; last = now; draw(now); }
  if (RM) draw(T0 + 4000); else requestAnimationFrame(loop);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (RM) draw(T0 + 4000); }, 150); });
  addEventListener('pointermove', e => { mx = e.clientX / W - 0.5; my = e.clientY / H - 0.5; }, { passive: true });

  // ---------- walking in ----------
  let going = false;
  function go(url, toHome) {
    if (going) return; going = true;
    try { sessionStorage.setItem('azSeen', '1'); if (toHome) sessionStorage.setItem('azGate', '1'); } catch { }
    if (RM) { location.href = url; return; }
    document.body.classList.add('go');
    const t0 = performance.now(), ramp = () => { speed = 1 + 4 * ease((performance.now() - t0) / 700); if (speed < 4.9) requestAnimationFrame(ramp); }; ramp();
    setTimeout(() => { if (!window.__azHold) location.href = url; }, 1100);   // __azHold: tests stop here to look
  }
  addEventListener('pageshow', e => { if (e.persisted) { going = false; speed = 1; document.body.classList.remove('go'); petals.forEach(p => Object.assign(p, petal(true))); } });
  $('#enter').addEventListener('click', e => { e.preventDefault(); go('/home', true); });

  // ---------- connect ----------
  const Wt = window.AzWallet;
  function toast(text, bad) {
    const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : '');
    t.innerHTML = `<span class="seal">${bad ? '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' : '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>'}</span><div>${esc(text)}</div>`;
    const box = $('#toasts'); while (box.children.length >= 2) box.firstChild.remove(); box.appendChild(t); setTimeout(() => t.remove(), 6000);
  }
  function connected() {
    $('#connect').textContent = short(Wt.W.addr);
    toast('Connected ' + short(Wt.W.addr) + '. Opening the terminal.');
    setTimeout(() => go('/app', false), RM ? 0 : 650);
  }
  $('#connect').addEventListener('click', () => {
    if (Wt.W.addr) return connected();
    $('#wlist').innerHTML = Wt.WALLETS.map(w => `<button type="button" data-w="${w.name}"><span>${w.name}</span><small>${w.get() ? 'DETECTED' : Wt.mobile && w.ul ? 'OPEN IN APP' : 'INSTALL'}</small></button>`).join('');
    $('#wpick').classList.add('on');
  });
  $('#wpick').addEventListener('click', e => { if (e.target.id === 'wpick') $('#wpick').classList.remove('on'); });
  addEventListener('keydown', e => { if (e.key === 'Escape') $('#wpick').classList.remove('on'); });
  $('#wlist').addEventListener('click', async e => {
    const b = e.target.closest('button[data-w]'); if (!b) return;
    $('#wpick').classList.remove('on');
    try { const r = await Wt.connect(b.dataset.w); if (r && r.addr) connected(); }
    catch (err) { toast(err && err.message ? err.message : 'The wallet did not connect.', true); }
  });
  Wt.restore().then(() => { if (Wt.W.addr) $('#connect').textContent = short(Wt.W.addr); });
})();
