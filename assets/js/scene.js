// AZURO scene: the woodblock print, drawn in the browser so every layer can move. A castle on its stone foundation,
// three gilded stones at the waterline (the three 0.5 SOL backing buys), Fuji, banded mist, a red sun, a seigaiha sea.
(function () {
  const INK = '#1c1b22';
  const f = v => (Math.round(v * 10) / 10).toString();
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const bez = (p0, p1, p2, p3, n = 120) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1), u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; });
  const pts = a => a.map(p => f(p[0]) + ',' + f(p[1])).join(' ');

  function fuji(cx, base, peak, half) {
    const L = bez([cx - half, base], [cx - half * 0.55, base - (base - peak) * 0.42], [cx - half * 0.22, peak + (base - peak) * 0.3], [cx - half * 0.07, peak]);
    const R = bez([cx + half * 0.07, peak], [cx + half * 0.22, peak + (base - peak) * 0.3], [cx + half * 0.55, base - (base - peak) * 0.42], [cx + half, base]);
    const w = half * 0.07, top = [[cx - w, peak], [cx - w * 0.5, peak - 8], [cx, peak - 2], [cx + w * 0.4, peak - 10], [cx + w, peak]];
    const sy = peak + (base - peak) * 0.24;
    const xAt = (c, y) => c.reduce((b, p) => Math.abs(p[1] - y) < Math.abs(b[1] - y) ? p : b)[0];
    const lx = xAt(L, sy), rx = xAt(R, sy), span = rx - lx;
    const tongue = [[rx, sy]]; for (let i = 1; i < 9; i++) tongue.push([rx - span * i / 9, sy + (i % 2 ? -0.06 : 0.12) * (base - peak) * (0.6 + 0.4 * Math.sin(i * 1.7))]); tongue.push([lx, sy]);
    const snow = top.concat(R.filter(p => p[1] <= sy), tongue, L.filter(p => p[1] <= sy).reverse());
    return `<g class="az-fuji"><polygon points="${pts(L.concat(top.slice(1, -1), R))}" fill="url(#azFuji)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
      `<polygon points="${pts(snow)}" fill="#f4ecd8" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/></g>`;
  }

  function mist(rects, cls) {
    return `<g class="${cls}">` + rects.map(([x, y, w, h]) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="none" stroke="#b9a984" stroke-width="5"/>`).join('') +
      rects.map(([x, y, w, h]) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="#f1e7cf"/>`).join('') + '</g>';
  }

  function castle(CX, YW, s, R) {
    const YT = YW - 280 * s, HWB = 380 * s, HWT = 255 * s;
    const hw = y => { const t = (YW - y) / (YW - YT); return HWT + (HWB - HWT) * Math.pow(1 - t, 2.4); };
    const wall = [];
    for (let i = 0; i <= 60; i++) { const y = YW - (YW - YT) * i / 60; wall.push([CX - hw(y), y]); }
    for (let i = 0; i <= 60; i++) { const y = YT + (YW - YT) * i / 60; wall.push([CX + hw(y), y]); }
    let o = `<g class="az-castle"><g class="az-wall"><polygon points="${pts(wall)}" fill="#59606e" stroke="${INK}" stroke-width="3.2"/>`;
    let y = YW, row = 0, goldDone = false, gi = 0;
    const rowsOut = [];
    while (y > YT + 4 * s) {
      const hgt = (30 + (row % 3) * 4) * s, y0 = Math.max(YT, y - hgt), y1 = y;
      const xl0 = CX - hw(y0), xl1 = CX - hw(y1), xr0 = CX + hw(y0), xr1 = CX + hw(y1), total = xr1 - xl1;
      const goldRow = !goldDone && y1 <= YW - 38 * s; if (goldRow) goldDone = true;
      let edges = [0], acc = (row % 2 ? 120 : 70) * s / total; edges.push(acc);
      while (acc < 1 - ((row % 2 ? 70 : 120) * s / total) - 0.02) { acc += (48 + R() * 62) * s / total; edges.push(Math.min(acc, 1)); }
      edges.push(1); edges = [...new Set(edges.filter(e => e <= 1))].sort((a, b) => a - b);
      let mid = null;
      if (goldRow) {
        const g = 112 * s / total; mid = [0.5 - 1.5 * g, 0.5 - 0.5 * g, 0.5 + 0.5 * g, 0.5 + 1.5 * g];
        edges = [...new Set([0, 1].concat(edges.filter(e => e < mid[0] - 0.02 || e > mid[3] + 0.02), mid))].sort((a, b) => a - b);
      }
      let rowS = `<g class="az-row" style="--r:${row}">`;
      for (let k = 0; k < edges.length - 1; k++) {
        const a = edges[k], b = edges[k + 1], j = () => (R() - 0.5) * 5 * s;
        const X = (fr, l, r) => l + (r - l) * fr;
        const p = [[X(a, xl0, xr0) + (a === 0 ? 0 : 3 * s + j()), y0 + 3 * s + j() * 0.6], [X(b, xl0, xr0) - (b === 1 ? 0 : 3 * s + j()), y0 + 3 * s + j() * 0.6],
          [X(b, xl1, xr1) - (b === 1 ? 0 : 3 * s + j()), y1 - 3 * s + j() * 0.6], [X(a, xl1, xr1) + (a === 0 ? 0 : 3 * s + j()), y1 - 3 * s + j() * 0.6]];
        const isGold = goldRow && mid && [0, 1, 2].some(n => Math.abs(a - mid[n]) < 1e-9);
        if (isGold) {
          gi++;
          rowS += `<g class="az-gold" data-n="${gi}"><polygon points="${pts(p)}" fill="url(#azGold)" stroke="${INK}" stroke-width="${f(3 * s)}" stroke-linejoin="round"/>` +
            `<line x1="${f(p[0][0] + 10 * s)}" y1="${f(p[0][1] + 7 * s)}" x2="${f(p[1][0] - 14 * s)}" y2="${f(p[1][1] + 7 * s)}" stroke="#fff3c4" stroke-width="${f(2.5 * s)}" stroke-linecap="round" class="az-glint"/></g>`;
        } else {
          rowS += `<polygon points="${pts(p)}" fill="url(#azStone)" fill-opacity="${(0.82 + R() * 0.18).toFixed(2)}" stroke="${INK}" stroke-width="${f(2.4 * s)}" stroke-linejoin="round"/>`;
        }
      }
      rowsOut.push(rowS + '</g>');
      y = y0; row++;
    }
    o += rowsOut.join('') + '</g>';
    o += `<rect x="${f(CX - HWT - 16 * s)}" y="${f(YT - 10 * s)}" width="${f(2 * HWT + 32 * s)}" height="${f(14 * s)}" fill="#2b2f3a" stroke="${INK}" stroke-width="3"/>`;
    // the keep: four tiers
    const TIERS = [[236, 92, 306, 82, 'one'], [190, 76, 252, 64, 'two'], [148, 64, 202, 54, 'one'], [106, 56, 158, 46, 'top']];
    let base = YT - 10 * s, keep = '<g class="az-keep">';
    TIERS.forEach(([whw0, wh0, ehw0, rh0, gable], k) => {
      const whw = whw0 * s, wh = wh0 * s, ehw = ehw0 * s, rh = rh0 * s, wt = base - wh;
      let t = `<g class="az-tier" style="--k:${k}">`;
      t += `<rect x="${f(CX - whw)}" y="${f(wt)}" width="${f(2 * whw)}" height="${f(wh)}" fill="#f2ebdc"/>`;
      const bt = wt + wh * 0.52;
      t += `<rect x="${f(CX - whw)}" y="${f(bt)}" width="${f(2 * whw)}" height="${f(base - bt)}" fill="#24272f"/>`;
      for (let xx = CX - whw + 26 * s; xx < CX + whw - 10 * s; xx += 26 * s) t += `<line x1="${f(xx)}" y1="${f(bt + 2)}" x2="${f(xx)}" y2="${f(base - 1)}" stroke="#3a3f4b" stroke-width="2"/>`;
      const nwin = Math.max(2, Math.floor(2 * whw0 / 70));
      for (let i = 0; i < nwin; i++) {
        const wx = CX - whw + (i + 0.5) * (2 * whw / nwin), ww = 30 * s, wy = wt + wh * 0.16, wwh = wh * 0.3;
        t += `<rect x="${f(wx - ww / 2)}" y="${f(wy)}" width="${f(ww)}" height="${f(wwh)}" fill="#24272f"/>`;
        for (let bb = 1; bb < 4; bb++) t += `<line x1="${f(wx - ww / 2 + bb * ww / 4)}" y1="${f(wy)}" x2="${f(wx - ww / 2 + bb * ww / 4)}" y2="${f(wy + wwh)}" stroke="#f2ebdc" stroke-width="${f(2 * s)}"/>`;
      }
      t += `<rect x="${f(CX - whw)}" y="${f(wt)}" width="${f(2 * whw)}" height="${f(wh)}" fill="none" stroke="${INK}" stroke-width="3"/>`;
      const ye = wt + 14 * s, ytop = ye - rh, nhw = k + 1 < TIERS.length ? (TIERS[k + 1][0] + 8) * s : 64 * s, lift = (16 + k * 2) * s;
      const d = `M${f(CX - ehw)},${f(ye - lift)} Q${f(CX - ehw + 34 * s)},${f(ye + 5 * s)} ${f(CX - ehw + 84 * s)},${f(ye)} L${f(CX + ehw - 84 * s)},${f(ye)} Q${f(CX + ehw - 34 * s)},${f(ye + 5 * s)} ${f(CX + ehw)},${f(ye - lift)} ` +
        `Q${f(CX + nhw + (ehw - nhw) * 0.3)},${f(ye - lift - 6 * s)} ${f(CX + nhw)},${f(ytop)} L${f(CX - nhw)},${f(ytop)} Q${f(CX - nhw - (ehw - nhw) * 0.3)},${f(ye - lift - 6 * s)} ${f(CX - ehw)},${f(ye - lift)} Z`;
      t += `<path d="${d}" fill="url(#azTiles)"/>`;
      t += `<path d="M${f(CX - ehw + 6 * s)},${f(ye - lift + 4 * s)} Q${f(CX - ehw + 36 * s)},${f(ye + 3 * s)} ${f(CX - ehw + 84 * s)},${f(ye - 2 * s)} L${f(CX + ehw - 84 * s)},${f(ye - 2 * s)} Q${f(CX + ehw - 36 * s)},${f(ye + 3 * s)} ${f(CX + ehw - 6 * s)},${f(ye - lift + 4 * s)}" fill="none" stroke="#efe7d6" stroke-width="${f(9 * s)}" stroke-linecap="round"/>`;
      t += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>`;
      if (gable !== 'top') {
        const gx = gable === 'one' ? [CX] : [CX - 92 * s, CX + 92 * s];
        for (const g of gx) {
          const gw = rh * (gable === 'one' ? 0.95 : 0.7), ap = ytop + rh * (gable === 'one' ? 0 : 0.22);
          t += `<polygon points="${f(g - gw)},${f(ye - 5 * s)} ${f(g)},${f(ap)} ${f(g + gw)},${f(ye - 5 * s)}" fill="#f3ecdd" stroke="${INK}" stroke-width="2.8"/>`;
          t += `<circle cx="${f(g)}" cy="${f(ap + 16 * s)}" r="${f(5 * s)}" fill="#d6ad4c" stroke="${INK}" stroke-width="1.6"/>`;
          const cp = `M${f(g - gw - 14 * s)},${f(ye - 1)} Q${f(g - gw * 0.45)},${f(ye - (ye - ap) * 0.55)} ${f(g)},${f(ap - 7 * s)} Q${f(g + gw * 0.45)},${f(ye - (ye - ap) * 0.55)} ${f(g + gw + 14 * s)},${f(ye - 1)}`;
          t += `<path d="${cp}" fill="none" stroke="#283454" stroke-width="${f(11 * s)}" stroke-linecap="round"/><path d="${cp}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
        }
      } else {
        t += `<rect x="${f(CX - nhw - 6 * s)}" y="${f(ytop - 8 * s)}" width="${f(2 * nhw + 12 * s)}" height="${f(10 * s)}" fill="#283454" stroke="${INK}" stroke-width="3"/>`;
        for (const sg of [-1, 1]) { const sx = CX + sg * (nhw + 2 * s); t += `<path d="M${f(sx)},${f(ytop - 6 * s)} q${f(sg * 4 * s)},${f(-24 * s)} ${f(sg * -10 * s)},${f(-38 * s)} q${f(sg * 16 * s)},${f(6 * s)} ${f(sg * 18 * s)},${f(20 * s)} q${f(sg * 2 * s)},${f(10 * s)} ${f(sg * -8 * s)},${f(18 * s)} z" fill="#d9b04c" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`; }
      }
      keep += t + '</g>';
      base = ytop;
    });
    o += keep + '</g></g>';
    return { svg: o, top: base, wallTop: YT, hwb: HWB };
  }

  function sea(W, H, top, R0) {
    // two copies side by side so the group can slide one period forever
    const period = 2 * R0;
    let w = '';
    let r = 0;
    for (let yy = top + 10; yy < H + R0; yy += R0 / 2, r++) {
      const off = r % 2 ? R0 : 0;
      for (let xx = -R0 + off; xx < W + 3 * period; xx += period) {
        w += `<path d="M${f(xx - R0)},${f(yy)}A${f(R0)},${f(R0)} 0 0 1 ${f(xx + R0)},${f(yy)}" fill="#22355f" stroke="#a6b6d3" stroke-width="2.4"/>`;
        for (const rr of [R0 * 0.7, R0 * 0.42, R0 * 0.16]) w += `<path d="M${f(xx - rr)},${f(yy)}A${f(rr)},${f(rr)} 0 0 1 ${f(xx + rr)},${f(yy)}" fill="none" stroke="#a6b6d3" stroke-width="2.2"/>`;
      }
    }
    return `<g class="az-sea"><rect x="0" y="${f(top)}" width="${W}" height="${f(H - top)}" fill="#22355f"/><g clip-path="url(#azSeaClip)"><g class="az-waves" style="--p:${period}px">${w}</g></g>` +
      `<line x1="0" y1="${f(top)}" x2="${W}" y2="${f(top)}" stroke="${INK}" stroke-width="4"/></g>` +
      `<clipPath id="azSeaClip"><rect x="0" y="${f(top)}" width="${W}" height="${f(H - top)}"/></clipPath>`;
  }

  // mode: 'wide' (desktop hero), 'tall' (phone hero), 'strip' (a thin band for the terminal and 404)
  function render(mode) {
    const R = rng(7);
    const tall = mode === 'tall', strip = mode === 'strip';
    const W = tall ? 900 : 1600, H = tall ? 1600 : strip ? 520 : 900;
    const seaTop = tall ? 1440 : strip ? 440 : 780;
    const C = tall ? { cx: 520, foot: seaTop + 22, s: 0.6 } : strip ? { cx: 1240, foot: seaTop + 20, s: 0.6 } : { cx: 1150, foot: seaTop + 22, s: 0.68 };
    const sun = tall ? [370, 1120, 92] : strip ? [1050, 170, 82] : [985, 300, 108];
    const defs = `<defs><linearGradient id="azSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2b52" stop-opacity=".95"/><stop offset=".14" stop-color="#2a3d6c" stop-opacity=".7"/><stop offset=".4" stop-color="#2a3d6c" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="azFuji" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26396a"/><stop offset=".55" stop-color="#4b6194"/><stop offset="1" stop-color="#8fa1c2"/></linearGradient>` +
      `<linearGradient id="azStone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9bfc5"/><stop offset="1" stop-color="#8b95a1"/></linearGradient>` +
      `<linearGradient id="azGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0d27a"/><stop offset=".6" stop-color="#d1a544"/><stop offset="1" stop-color="#a97b26"/></linearGradient>` +
      `<pattern id="azTiles" width="11" height="40" patternUnits="userSpaceOnUse"><rect width="11" height="40" fill="#283454"/><line x1="5.5" y1="0" x2="5.5" y2="40" stroke="#3d4b72" stroke-width="2.4"/></pattern></defs>`;
    let s = `<svg class="az-scene" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs}`;
    s += `<rect class="az-sky" width="${W}" height="${H}" fill="url(#azSky)"/>`;
    s += `<circle class="az-sun" cx="${sun[0]}" cy="${sun[1]}" r="${sun[2]}" fill="#c8392b"/>`;
    if (tall) s += fuji(800, seaTop + 10, 1170, 300); else if (strip) s += fuji(1500, seaTop + 10, 250, 330); else s += fuji(1470, seaTop + 10, 455, 380);
    s += mist(tall ? [[-60, 1330, 520, 44], [560, 1350, 520, 40], [600, 1010, 420, 32]] : strip ? [[-60, 368, 900, 42], [500, 388, 700, 36], [1500, 300, 400, 34]] : [[780, 640, 900, 52], [1080, 664, 700, 46], [-80, 720, 560, 40], [1260, 190, 420, 34]], 'az-mist az-mist-back');
    s += `<g class="az-birds">` + [[0, 0, 1], [46, 28, 0.8], [-40, 40, 0.7]].map(([dx, dy, k]) => `<path d="M${-15 * k + dx},${-5 * k + dy} Q${-6 * k + dx},${-12 * k + dy} ${dx},${dy} Q${6 * k + dx},${-12 * k + dy} ${15 * k + dx},${-5 * k + dy}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`).join('') + '</g>';
    const c = castle(C.cx, C.foot, C.s, R);
    s += c.svg;
    s += sea(W, H, seaTop, tall ? 32 : strip ? 24 : 30);
    // foam where the wall meets the water, but not over the gold
    let foam = '';
    for (let fx = C.cx - c.hwb - 30; fx < C.cx + c.hwb + 30; fx += 40 * C.s) { if (Math.abs(fx + 9 - C.cx) < 175 * C.s) continue; foam += `<path d="M${f(fx)},${f(seaTop + 2)} q${f(10 * C.s)},${f(-14 * C.s)} ${f(22 * C.s)},${f(-4 * C.s)} q${f(-8 * C.s)},0 ${f(-6 * C.s)},${f(8 * C.s)}" fill="#f4ecd8" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`; }
    s += `<g class="az-foam">${foam}</g>`;
    s += '</svg>';
    return { svg: s, seaFrac: (H - seaTop) / H, H, W };
  }

  window.AzScene = { render };
})();
