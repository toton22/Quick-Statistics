/* Statistics for Managers — widget pack "infer" (Inferential pillar).
   sampling-methods · clt · ci-sim · ci-calc · hypothesis-test · error-tradeoff · pvalue
   Catalogue + params: notes/WIDGETS.md. Uses only SFMW (widgets.js) and Stats (stats.js).
   Pure calculators are exposed as SFMW.infer (htest, power, ciCalc, tTable, zTable) for testing. */
(function () {
  'use strict';
  const W = window.SFMW, S = window.Stats;
  if (!W || !S) return;

  // =================================================================== shared helpers
  let UID = 0;
  const REDUCED = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  const isNum = v => v !== null && v !== undefined && v !== '' && typeof v !== 'boolean' && isFinite(+v);
  const num = (v, d) => (isNum(v) ? +v : d);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mi = s => String(s).replace(/-/g, '−');                                    // typographic minus (display only)
  const fx = (v, d) => (isFinite(v) ? mi((+v).toFixed(d)) : '—');                       // fixed decimals
  const tr = (v, d = 4) => (isFinite(v) ? mi(String(+(+v).toFixed(d))) : '—');          // trimmed decimals
  const xn = (v, d = 4) => String(+(+v).toFixed(d));                                     // number for an Excel formula
  const xp = (v, d = 4) => (v < 0 ? '(' + xn(v, d) + ')' : xn(v, d));
  const par = (v, d = 4) => (v < 0 ? '(' + tr(v, d) + ')' : tr(v, d));
  const r2 = v => Math.sign(v) * Math.round(Math.abs(v) * 100 + 1e-7) / 100;             // table rounding, half away from 0
  const r4 = v => Math.round(v * 1e4) / 1e4;
  const pctA = a => +(a * 100).toFixed(2) + '%';
  const pct1 = a => (a * 100).toFixed(1) + '%';
  const fP = p => S.fmtP(p);
  const pEq = p => (p < 0.0001 ? `< 0.0001 (exactly ${p < 1e-6 ? mi(p.toExponential(1)) : p.toFixed(-Math.floor(Math.log10(p)) + 1)})` : '= ' + p.toFixed(4));
  const f2 = v => fx(r2(v), 2);
  const xl = f => `<code class="xl">${f}</code>`;
  const frac = (a, b) => `<span class="wi-frac"><span>${a}</span><span>${b}</span></span>`;
  const rt = x => `√<span class="wi-sqrt">${x}</span>`;
  const eq = (...p) => `<span class="wi-eq">${p.map(x => `<span>${x}</span>`).join('<span>=</span>')}</span>`;
  const decOf = v => clamp(3 - Math.floor(Math.log10(Math.abs(v) || 1)), 0, 4);           // sensible decimals for a margin / SE
  function ufmt(unit) {
    unit = unit || ''; const pre = /^[$₹€£]$/.test(unit);
    return (v, d) => { if (!isFinite(v)) return '—'; const s = Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: d === undefined ? 2 : d }); return (v < 0 ? '−' : '') + (pre ? unit : '') + s + (unit && !pre ? ' ' + unit : ''); };
  }
  const normTail = v => { v = String(v === undefined || v === null ? '' : v).toLowerCase().trim(); return /^(left|lower|less|<)/.test(v) ? 'left' : /^(right|upper|greater|more|>)/.test(v) ? 'right' : 'two'; };
  const normTest = v => { v = String(v || '').toLowerCase().trim(); return v === 't' ? 't' : (v === 'p' || v.indexOf('prop') === 0) ? 'p' : 'z'; };
  const normProb = (v, d, lo, hi) => { let x = num(v, d); if (x >= 1 && x < 100) x /= 100; return clamp(x, lo, hi); };
  const freq = p => p >= 0.1 ? `about ${Math.round(p * 100)} times in 100` : p >= 0.01 ? `about ${(p * 100).toFixed(1)} times in 100` : p >= 0.001 ? `about ${Math.round(p * 1000)} times in 1,000` : 'less than once in 1,000';
  const nice = (lo, hi, k) => { try { const t = W.nice(lo, hi, k); return t.length ? t : [lo, hi]; } catch (e) { return [lo, hi]; } };

  // value printed in the course t table (3 dp, columns = upper-tail area); df > 100 uses the df = 100 row ("next smaller df")
  const T_COLS = [0.20, 0.10, 0.05, 0.025, 0.01, 0.005];
  function tTable(df, area) {
    const col = T_COLS.find(a => Math.abs(a - area) < 1e-9);
    if (col === undefined || !(df >= 1)) return null;
    const row = Math.min(100, Math.floor(df));
    return { v: +S.tInv(1 - col, row).toFixed(3), row, col };
  }
  // z a student reads from a normal table (areas to 4 dp, z to 2 dp); a tie between two rows gives the midpoint (1.645, 2.575)
  function zTable(area) {
    if (!(area > 0.5 && area < 1)) return NaN;
    let best = 0, bd = Infinity, tie = false;
    for (let k = 0; k <= 349; k++) {
      const z = k / 100, d = Math.abs(r4(S.normCdf(z)) - area);
      if (d < bd - 1e-12) { bd = d; best = z; tie = false; } else if (Math.abs(d - bd) <= 1e-12) tie = true;
    }
    return tie ? +(best + 0.005).toFixed(3) : best;
  }

  // one-sample test: test 'z' | 't' | 'p'; tail 'left' | 'right' | 'two'
  function htest(o) {
    const n = o.n, a = o.alpha; let se, diff, df = null;
    if (o.test === 'p') { se = Math.sqrt(o.p0 * (1 - o.p0) / n); diff = o.phat - o.p0; }
    else { se = o.sd / Math.sqrt(n); diff = o.xbar - o.mu0; if (o.test === 't') df = n - 1; }
    const stat = diff / se, cdf = x => (df ? S.tCdf(x, df) : S.normCdf(x)), inv = p => (df ? S.tInv(p, df) : S.normInv(p));
    let p, crit;
    if (o.tail === 'left') { p = cdf(stat); crit = [inv(a)]; }
    else if (o.tail === 'right') { p = cdf(-stat); crit = [inv(1 - a)]; }
    else { p = Math.min(1, 2 * cdf(-Math.abs(stat))); const c = inv(1 - a / 2); crit = [-c, c]; }
    return { se, diff, stat, df, p, crit, reject: p <= a };
  }
  // beta and power of a z test for a mean (sigma known)
  function power(o) {
    const se = o.sd / Math.sqrt(o.n), a = o.alpha; let cL = null, cU = null, beta;
    if (o.tail === 'right') { cU = o.mu0 + S.normInv(1 - a) * se; beta = S.normCdf((cU - o.mu1) / se); }
    else if (o.tail === 'left') { cL = o.mu0 + S.normInv(a) * se; beta = S.normCdf((o.mu1 - cL) / se); }
    else { const z = S.normInv(1 - a / 2); cL = o.mu0 - z * se; cU = o.mu0 + z * se; beta = S.normCdf((cU - o.mu1) / se) - S.normCdf((cL - o.mu1) / se); }
    const d = o.mu1 - o.mu0, za = o.tail === 'two' ? S.normInv(1 - a / 2) : S.normInv(1 - a);
    const wrong = (o.tail === 'right' && d <= 0) || (o.tail === 'left' && d >= 0) || d === 0;
    const n80 = wrong ? null : Math.ceil(((za + S.normInv(0.8)) * o.sd / Math.abs(d)) ** 2);
    return { se, cL, cU, beta, power: 1 - beta, n80 };
  }
  // confidence interval: mode 'mean' (known: sigma known -> z, else t) or 'prop'
  function ciCalc(o) {
    const a = 1 - o.conf; let est, se, crit, df = null;
    if (o.mode === 'prop') { est = o.phat; se = Math.sqrt(o.phat * (1 - o.phat) / o.n); crit = S.normInv(1 - a / 2); }
    else { est = o.xbar; se = o.s / Math.sqrt(o.n); if (o.known) crit = S.normInv(1 - a / 2); else { df = o.n - 1; crit = S.tInv(1 - a / 2, df); } }
    const me = crit * se; return { est, se, crit, df, me, lo: est - me, hi: est + me, alpha: a };
  }
  W.infer = { htest, power, ciCalc, tTable, zTable };

  // light rAF animation: step(t in 0..1); stops itself; reduced-motion = instant; timer fallback if rAF is paused
  function animate(dur, step, done) {
    let fin = false; const end = () => { if (fin) return; fin = true; step(1); if (done) done(); };
    if (REDUCED || dur <= 0) { end(); return () => {}; }
    let t0 = null, raf = 0;
    const f = ts => { if (fin) return; if (t0 === null) t0 = ts; const t = Math.min(1, (ts - t0) / dur); if (t >= 1) end(); else { step(t); raf = requestAnimationFrame(f); } };
    raf = requestAnimationFrame(f); const fb = setTimeout(end, dur + 400);
    return () => { fin = true; cancelAnimationFrame(raf); clearTimeout(fb); };
  }

  const CSS = `
.wi .wi-row{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:.55rem 1.2rem;align-items:center}
.wi .wi-segbox{display:flex;flex-wrap:wrap;align-items:center;gap:.25rem .45rem;min-width:0;max-width:100%}
.wi .wi-segbox>.w-btns{margin-top:0;min-width:0;max-width:100%}
.wi .wi-seglab{font-size:.8rem;font-weight:700;color:var(--muted);letter-spacing:.05em}
.wi .seg{max-width:100%}
.wi .w-readout .ro{max-width:100%;overflow-wrap:anywhere}
.wi code.xl{white-space:normal;overflow-wrap:anywhere}
.wi .wi-legend{display:flex;flex-wrap:wrap;gap:.25rem 1.1rem;font-size:.84rem;color:var(--ink-2);margin:.35rem 0 0}
.wi .wi-legend i{display:inline-block;width:.95rem;height:.95rem;border-radius:3px;vertical-align:-.15rem;margin-right:.35rem}
.wi .wi-sw-hatch{background:repeating-linear-gradient(45deg,var(--bad) 0 2px,transparent 2px 5px);box-shadow:inset 0 0 0 1px var(--bad)}
.wi .wi-sw-line{background:linear-gradient(90deg,transparent 38%,var(--acc-deep) 38% 62%,transparent 62%)}
.wi .wi-halo{paint-order:stroke;stroke:var(--surface);stroke-width:4px;stroke-linejoin:round;pointer-events:none}
.wi .wi-knob{cursor:grab;outline:none}
.wi .wi-knob:focus-visible .wi-dot{stroke:var(--focus);stroke-width:4}
.wi .wi-box{margin:.9rem 0 0;border:1px solid var(--line);border-radius:12px;background:var(--surface);overflow:hidden}
.wi .wi-box>header{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.15rem .8rem;padding:.5rem .85rem;background:var(--surface-2);font-weight:700;font-size:.92rem}
.wi .wi-box>header span{font-weight:400;color:var(--muted);font-size:.82rem}
.wi .wi-six{list-style:none;margin:0;padding:.15rem .85rem .45rem;counter-reset:six}
.wi .wi-six>li{position:relative;padding:.6rem 0 .6rem 2.25rem;border-bottom:1px dashed var(--line);font-size:.94rem;line-height:1.6;counter-increment:six;overflow-wrap:break-word}
.wi .wi-six>li:last-child{border-bottom:0}
.wi .wi-six>li::before{content:counter(six);position:absolute;left:0;top:.62rem;width:1.6rem;height:1.6rem;border-radius:50%;background:var(--acc-deep);color:#fff;display:grid;place-items:center;font-weight:700;font-size:.8rem;line-height:1}
.wi .wi-six>li>b:first-child{display:block;color:var(--acc-fg);font-size:.76rem;letter-spacing:.07em;text-transform:uppercase}
.wi .wi-lines>div>b:first-child{display:block;color:var(--acc-fg);font-size:.84rem}
.wi .wi-eq{display:inline-flex;flex-wrap:wrap;align-items:center;gap:.2rem .4rem;margin:.15rem 0;vertical-align:middle;max-width:100%}
.wi .wi-frac{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1.3;font-size:.94em}
.wi .wi-frac>span{padding:0 .25rem}
.wi .wi-frac>span:first-child{border-bottom:1.3px solid currentColor}
.wi .wi-sqrt{border-top:1.3px solid currentColor;padding:0 .12rem;margin-left:.04rem}
.wi .wi-muted{color:var(--muted);font-size:.88rem}
.wi .wi-dec{display:inline-block;font-weight:700;padding:.05rem .65rem;border-radius:999px;margin:.15rem 0}
.wi .wi-dec.rej{background:var(--acc-deep);color:#fff}
.wi .wi-dec.keep{background:var(--surface-2);color:var(--ink);box-shadow:inset 0 0 0 1px var(--line-2)}
.wi .wi-warn{margin:.7rem 0 0;padding:.5rem .75rem;border-radius:10px;background:var(--warn-bg);color:var(--warn);font-size:.9rem}
.wi .wi-lines{padding:.35rem .85rem .6rem;font-size:.94rem;line-height:1.6}
.wi .wi-lines>div{padding:.35rem 0;border-bottom:1px dashed var(--line);overflow-wrap:break-word}
.wi .wi-lines>div:last-child{border-bottom:0}
.wi .wi-dt{width:100%;border-collapse:separate;border-spacing:5px;table-layout:fixed;margin-top:.7rem;font-size:.88rem}
.wi .wi-dt th{font-size:.76rem;font-weight:700;color:var(--muted);text-align:left;vertical-align:bottom;padding:0 .15rem;line-height:1.3;overflow-wrap:break-word}
.wi .wi-dt thead th:first-child{width:24%}
.wi .wi-dt tbody th{vertical-align:middle}
.wi .wi-dt td{vertical-align:top;height:1px;padding:0}
.wi .wi-dt button{display:block;width:100%;height:100%;min-height:3.7rem;text-align:left;font:inherit;line-height:1.35;padding:.45rem .55rem;border-radius:10px;border:1px solid var(--line-2);border-left:6px solid var(--c);background:var(--surface);color:var(--ink);cursor:pointer;overflow-wrap:break-word}
.wi .wi-dt button b{font-weight:700;color:var(--acc-fg);white-space:nowrap;font-variant-numeric:tabular-nums}
.wi .wi-dt button[aria-pressed="true"]{background:var(--acc-bg);box-shadow:0 0 0 2px var(--acc-bd)}
.wi .wi-verd{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.5rem;margin-top:.8rem}
.wi .wi-verd>div{border:1px solid var(--line-2);border-radius:10px;padding:.45rem .7rem;font-size:.9rem;background:var(--surface)}
.wi .wi-verd>div b{display:block}
.wi .wi-verd>div.rej{background:var(--acc-bg);border-color:var(--acc-bd)}
.wi .wi-verd>div.rej b{color:var(--acc-fg)}
.wi label.ctl.wi-check{grid-template-columns:auto 1fr;cursor:pointer}
`;
  function setup(el) {
    if (!document.getElementById('sfmw-infer-css')) { const st = document.createElement('style'); st.id = 'sfmw-infer-css'; st.textContent = CSS; document.head.appendChild(st); }
    if (el && el.classList) el.classList.add('wi');
  }
  // labelled segmented control with a programmatic setter
  function seg(api, parent, label, opts, value, fn) {
    const box = W.el('div', { class: 'wi-segbox' }); if (label) box.appendChild(W.el('span', { class: 'wi-seglab' }, label));
    parent.appendChild(box); const g = api.seg(opts, value, fn, box);
    g.set = v => g.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(opts[i].v === v)));
    return g;
  }
  // readout pill whose label can change
  function ro(api, label) {
    const r = W.el('span', { class: 'ro' }, `<span>${label}</span> <b></b>`); api.readout.appendChild(r);
    const b = r.querySelector('b'), l = r.querySelector('span');
    return { set: v => { b.textContent = v; }, html: v => { b.innerHTML = v; }, lab: v => { l.innerHTML = v; }, el: r };
  }
  const row = api => { const r = W.el('div', { class: 'wi-row' }); api.controls.appendChild(r); return r; };
  const btn = (parent, label, fn, primary) => { const b = W.el('button', { type: 'button', class: 'btn small' + (primary ? ' primary' : '') }, label); b.onclick = fn; parent.appendChild(b); return b; };
  // draggable vertical marker for a test statistic (pointer + arrow keys)
  function knob(svg, T, B, label, onDrag, onKey, onEnd) {
    const g = W.s('g', { tabindex: 0, role: 'slider', 'aria-label': label, class: 'wi-knob' }, svg);
    W.s('rect', { x: -16, y: T - 28, width: 32, height: B - T + 28, style: 'fill:transparent' }, g);
    W.s('line', { x1: 0, x2: 0, y1: T - 6, y2: B, style: 'stroke:var(--acc-deep);stroke-width:3' }, g);
    W.s('circle', { cx: 0, cy: T - 9, r: 9, class: 'wi-dot', style: 'fill:var(--acc-deep);stroke:var(--surface);stroke-width:2.5' }, g);
    const txt = W.s('text', { y: T - 24, 'text-anchor': 'middle', class: 'wi-halo', style: 'font-size:13.5px;font-weight:700;fill:var(--acc-fg)' }, svg);
    W.drag(svg, g, onDrag, onEnd);
    g.addEventListener('keydown', e => {
      const k = e.key; let d = 0;
      if (k === 'ArrowLeft' || k === 'ArrowDown') d = -1; else if (k === 'ArrowRight' || k === 'ArrowUp') d = 1; else return;
      e.preventDefault(); onKey(d * (e.shiftKey ? 10 : 1));
    });
    return {
      g, txt,
      place(x, lab, lo, hi, vt) { g.setAttribute('transform', `translate(${x.toFixed(1)},0)`); txt.setAttribute('x', clamp(x, lo, hi).toFixed(1)); txt.textContent = lab; g.setAttribute('aria-valuetext', vt || lab); },
      show(on) { g.style.display = txt.style.display = on ? '' : 'none'; }
    };
  }
  // area under a density between a and b (clipped to [lo, hi])
  function areaPath(sx, sy, f, a, b, lo, hi, base) {
    a = clamp(a, lo, hi); b = clamp(b, lo, hi); if (!(b - a > 1e-9)) return '';
    let p = ''; for (let i = 0; i <= 90; i++) { const x = a + (b - a) * i / 90; p += (i ? 'L' : 'M') + sx(x).toFixed(1) + ',' + sy(f(x)).toFixed(1); }
    return p + `L${sx(b).toFixed(1)},${base}L${sx(a).toFixed(1)},${base}Z`;
  }
  function curvePath(sx, sy, f, lo, hi, k = 240) { let d = ''; for (let i = 0; i <= k; i++) { const x = lo + (hi - lo) * i / k; d += (i ? 'L' : 'M') + sx(x).toFixed(1) + ',' + sy(f(x)).toFixed(1); } return d; }
  function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  const range = n => Array.from({ length: n }, (_, i) => i);
  // phones: a narrower viewBox so chart text stays legible (decided once, at load)
  const narrow = api => { const w = api.stage.clientWidth || api.body.clientWidth || 800; return w > 0 && w < 540; };
  const halo = t => { t.classList.add('wi-halo'); return t; };
  const plate = t => { try { const b = t.getBBox(); if (b.width) t.parentNode.insertBefore(W.s('rect', { x: b.x - 4, y: b.y - 1, width: b.width + 8, height: b.height + 2, rx: 4, style: 'fill:var(--surface);opacity:.9' }), t); } catch (e) { /* not rendered yet */ } return t; };

  // =================================================================== sampling-methods
  W.register('sampling-methods', {
    title: 'Four ways to pick a sample of 20 customers',
    init(api, P, el) {
      setup(el); P = P || {};
      const U = ufmt(P.unit || '₹');
      const REG = [
        { k: 'North', c: 'var(--d-deep)', mu: 1800, st: [0, 1, 2, 3] },
        { k: 'South', c: 'var(--p-deep)', mu: 2600, st: [4, 5, 6] },
        { k: 'East', c: 'var(--r-deep)', mu: 1400, st: [7, 8] },
        { k: 'West', c: 'var(--i-deep)', mu: 3500, st: [9] }];
      const regOf = s => REG.findIndex(g => g.st.indexOf(s) >= 0);
      const rp = S.rng(2027), cust = [];
      for (let i = 0; i < 100; i++) { const s = Math.floor(i / 10), g = regOf(s); cust.push({ i, s, g, v: Math.max(300, Math.round((REG[g].mu + 450 * S.randn(rp)) / 10) * 10) }); }
      const popMean = S.mean(cust.map(c => c.v)), NS = 20, K = 100 / NS;
      const METH = [{ v: 'srs', label: 'Simple random' }, { v: 'sys', label: 'Systematic (every 5th)' }, { v: 'str', label: 'Stratified (by region)' }, { v: 'clu', label: 'Cluster (whole stores)' }];
      function sample(method, r) {
        if (method === 'srs') return { idx: shuffle(range(100), r).slice(0, NS) };
        if (method === 'sys') { const start = Math.floor(r() * K), idx = []; for (let j = start; j < 100; j += K) idx.push(j); return { idx, start: start + 1 }; }
        if (method === 'str') { const idx = [], alloc = []; REG.forEach((g, gi) => { const mem = cust.filter(c => c.g === gi).map(c => c.i), nh = Math.round(NS * mem.length / 100); alloc.push(nh); shuffle(mem, r).slice(0, nh).forEach(i => idx.push(i)); }); return { idx, alloc }; }
        const stores = shuffle(range(10), r).slice(0, 2).sort((a, b) => a - b), idx = []; stores.forEach(s => { for (let j = 0; j < 10; j++) idx.push(s * 10 + j); }); return { idx, stores };
      }
      // typical error of each method over 1,000 draws (root-mean-square error of the sample mean)
      const typical = {}; METH.forEach((m, k) => { const r = S.rng(4242 + k); let ss = 0; for (let t = 0; t < 1000; t++) { const d = S.mean(sample(m.v, r).idx.map(i => cust[i].v)) - popMean; ss += d * d; } typical[m.v] = Math.sqrt(ss / 1000); });

      const NAR = narrow(api), COLS = NAR ? 2 : 5, BW = NAR ? 136 : 116, BH = 76, GX = NAR ? 8 : 10, GY = NAR ? 10 : 12, Wd = 20 + COLS * BW + (COLS - 1) * GX;
      const CY = 6 + (10 / COLS) * (BH + GY) + 18, RH = 28;
      const svg = api.svg(Wd, CY + 4 * RH + 10, 'Population of 100 customers in 10 stores and 4 regions; the chosen sample is highlighted');
      const gStores = W.s('g', null, svg), gDots = W.s('g', null, svg), gComp = W.s('g', null, svg);
      const boxes = [], dots = [], dx0 = (BW - 80) / 2;
      for (let s = 0; s < 10; s++) {
        const col = s % COLS, rw = Math.floor(s / COLS), x = 10 + col * (BW + GX), y = 6 + rw * (BH + GY), g = REG[regOf(s)];
        const b = W.s('rect', { x, y, width: BW, height: BH, rx: 10, style: 'fill:var(--surface-2);stroke:var(--line-2);stroke-width:1.2' }, gStores);
        W.s('rect', { x: x + 8, y: y + 7, width: 9, height: 9, rx: 2, style: `fill:${g.c}` }, gStores);
        W.text(gStores, x + 22, y + 16, `Store ${s + 1} · ${g.k}`, 'font-size:11.5px;font-weight:700;fill:var(--ink-2)', 'start');
        boxes.push(b);
        for (let j = 0; j < 10; j++) {
          const c = cust[s * 10 + j];
          const d = W.s('circle', { cx: x + dx0 + 20 * (j % 5), cy: y + 36 + 22 * Math.floor(j / 5), r: 7.5, style: `fill:${g.c}` }, gDots);
          W.s('title', null, d).textContent = `Customer #${c.i + 1} · ${g.k} · spend ${U(c.v, 0)}`;
          dots.push(d);
        }
      }
      // composition chart
      const bx0 = 92, bx1 = Wd - (NAR ? 70 : 92), bsx = W.scale(0, 100, bx0, bx1), lx = NAR ? 92 : 250, lx2 = NAR ? 176 : 350;
      W.text(gComp, 10, CY - 12, NAR ? 'Region share' : 'Share of each region', 'font-size:12px;font-weight:700;fill:var(--ink-2)', 'start');
      W.s('rect', { x: lx, y: CY - 21, width: 14, height: 7, rx: 2, style: 'fill:var(--line-2)' }, gComp); W.text(gComp, lx + 18, CY - 13, 'population', 'font-size:11.5px;fill:var(--muted)', 'start');
      W.s('rect', { x: lx2, y: CY - 22, width: 14, height: 9, rx: 2, style: 'fill:var(--ink-2)' }, gComp); W.text(gComp, lx2 + 18, CY - 13, 'this sample', 'font-size:11.5px;fill:var(--muted)', 'start');
      const compBars = REG.map((g, gi) => {
        const y = CY + gi * RH;
        W.s('rect', { x: 10, y: y + 2, width: 10, height: 10, rx: 2, style: `fill:${g.c}` }, gComp);
        W.text(gComp, 26, y + 12, g.k, 'font-size:12px;fill:var(--ink-2)', 'start');
        const pop = cust.filter(c => c.g === gi).length;
        W.s('rect', { x: bx0, y, width: bsx(pop) - bx0, height: 7, rx: 2, style: 'fill:var(--line-2)' }, gComp);
        W.text(gComp, bsx(pop) + 6, y + 7, pop + '%', 'font-size:11px;fill:var(--muted)', 'start');
        const sb = W.s('rect', { x: bx0, y: y + 10, width: 0, height: 10, rx: 2, style: `fill:${g.c}` }, gComp);
        const st = W.text(gComp, bx0 + 6, y + 19, '', 'font-size:11.5px;font-weight:700;fill:var(--ink)', 'start');
        return { sb, st };
      });

      let method = 'srs', seed = 1, stopAnim = () => {};
      const r1 = row(api);
      const gM = seg(api, r1, 'Method', METH, method, v => { method = v; seed++; draw(); });
      btn(r1, 'New draw', () => { seed++; draw(); }, true);
      const roM = ro(api, 'Sample mean spend'), roPop = ro(api, 'Population mean'), roE = ro(api, 'Error'), roSt = ro(api, 'Stores visited'), roT = ro(api, 'Typical error of this method'), roX = ro(api, 'Excel');
      roPop.set(U(popMean, 0)); const note = api.note('');
      function draw() {
        stopAnim(); gM.set(method);
        const r = S.rng(seed * 7919 + METH.findIndex(m => m.v === method) * 104729), res = sample(method, r), chosen = new Set(res.idx);
        dots.forEach((d, i) => { d.style.opacity = chosen.has(i) ? '.18' : '.16'; d.style.stroke = 'none'; });
        boxes.forEach((b, s) => { const on = res.stores && res.stores.indexOf(s) >= 0; b.style.stroke = on ? 'var(--ink)' : 'var(--line-2)'; b.style.strokeWidth = on ? '2.6' : '1.2'; });
        let shown = 0;
        stopAnim = animate(700, t => { const k = Math.round(t * res.idx.length); for (; shown < k; shown++) { const d = dots[res.idx[shown]]; d.style.opacity = '1'; d.style.stroke = 'var(--ink)'; d.style.strokeWidth = '2.4'; } });
        const vals = res.idx.map(i => cust[i].v), mean = S.mean(vals), err = mean - popMean;
        const counts = REG.map((g, gi) => res.idx.filter(i => cust[i].g === gi).length);
        compBars.forEach((c, gi) => { const p = counts[gi] / NS * 100; c.sb.setAttribute('width', Math.max(0, bsx(p) - bx0).toFixed(1)); c.st.setAttribute('x', (bsx(p) + 6).toFixed(1)); c.st.textContent = `${Math.round(p)}%  (${counts[gi]})`; });
        const stores = new Set(res.idx.map(i => cust[i].s)).size;
        roM.set(U(mean, 0)); roE.set((err >= 0 ? '+' : '−') + U(Math.abs(err), 0)); roSt.set(`${stores} of 10`); roT.set('± ' + U(typical[method], 0));
        roX.set({ srs: '=RAND() beside each customer, sort, take the first 20 (ToolPak → Sampling → Random, 20)', sys: `k = 100/20 = 5; start =RANDBETWEEN(1,5), then every 5th row (ToolPak → Sampling → Periodic, 5)`, str: 'n per region = 20 × region size / 100 → 8, 6, 4, 2; then =RAND() and sort within each region', clu: '=RANDBETWEEN(1,10) to pick a store (twice); survey every customer there' }[method]);
        const mix = REG.map((g, gi) => `${counts[gi]} ${g.k}`).join(', '), off = `${err >= 0 ? 'over' : 'under'}states the true mean (${U(popMean, 0)}) by ${U(Math.abs(err), 0)}`;
        const T = U(typical[method], 0);
        const NOTE = {
          srs: () => `<b>Simple random:</b> every customer had the same 20-in-100 chance. This draw got ${mix} — the mix wobbles from draw to draw, so this sample ${off}. Typical miss: ±${T}.`,
          sys: () => `<b>Systematic:</b> start at customer #${res.start} and take every 5th one (k = 100 ÷ 20 = 5). Easy from a list; because the list runs store by store, the sample is spread over all 10 stores. It ${off}. Beware lists that repeat a pattern every k rows.`,
          str: () => `<b>Stratified:</b> each region gets its fair share — ${mix} (proportional to 40/30/20/10), picked at random inside each region. Spend differs a lot between regions, so this is usually the most accurate: typical miss only ±${T}. This sample ${off}.`,
          clu: () => `<b>Cluster:</b> picked Store ${res.stores[0] + 1} and Store ${res.stores[1] + 1} and surveyed everyone there — only 2 stores to visit, the cheapest option. But the mix (${mix}) depends on which stores come up, so the estimate is the least reliable: typical miss ±${T}. This sample ${off}.`
        };
        note.innerHTML = NOTE[method]();
      }
      draw();
    }
  });

  // =================================================================== clt
  W.register('clt', {
    title: 'Central Limit Theorem explorer',
    init(api, P, el) {
      setup(el); P = P || {};
      const SH = { skewed: 'Skewed', uniform: 'Uniform', bimodal: 'Bimodal', normal: 'Normal' };
      let shape = SH[String(P.shape || '').toLowerCase()] ? String(P.shape).toLowerCase() : 'skewed';
      let n = clamp(Math.round(num(P.n, 5)), 1, 100);
      const NP = 8000, cache = {};
      function pop(sh) {
        if (cache[sh]) return cache[sh];
        const r = S.rng({ skewed: 11, uniform: 12, bimodal: 13, normal: 14 }[sh]), a = new Float64Array(NP);
        for (let i = 0; i < NP; i++) {
          let v;
          do {
            if (sh === 'skewed') v = 4 - 16 * Math.log(1 - r());
            else if (sh === 'uniform') v = 100 * r();
            else if (sh === 'bimodal') v = (r() < 0.5 ? 28 : 72) + 7 * S.randn(r);
            else v = 50 + 12 * S.randn(r);
          } while (!(v >= 0 && v <= 100));
          a[i] = v;
        }
        let s = 0; for (let i = 0; i < NP; i++) s += a[i]; const mu = s / NP; let ss = 0; for (let i = 0; i < NP; i++) ss += (a[i] - mu) ** 2;
        const bins = new Array(50).fill(0); for (let i = 0; i < NP; i++) bins[Math.min(49, Math.floor(a[i] / 2))]++;
        return (cache[sh] = { a, mu, sigma: Math.sqrt(ss / NP), bins });
      }
      const NAR = narrow(api), Wd = NAR ? 420 : 640, H = 420, L = NAR ? 22 : 30, R = Wd - L, T1 = 30, B1 = 118, T2 = 192, B2 = 378, sx = W.scale(0, 100, L, R);
      const svg = api.svg(Wd, H, 'Population histogram (top) and histogram of sample means with the normal curve (bottom)');
      const gTop = W.s('g', null, svg), gSamp = W.s('g', null, svg), gBot = W.s('g', null, svg);
      const curve = W.s('path', { style: 'fill:none;stroke:var(--ink);stroke-width:2.2' }, svg), gMark = W.s('g', null, svg);
      W.axisX(svg, sx, B2, nice(0, 100, NAR ? 5 : 10), t => t, { x0: L, x1: R, label: 'value' });
      let means = [], last = null, rs = S.rng(501), resets = 0, stopAnim = () => {};
      const r1 = row(api);
      const gS = seg(api, r1, 'Population', Object.keys(SH).map(k => ({ v: k, label: SH[k] })), shape, v => { shape = v; reset(); });
      const sn = api.slider({ label: 'Sample size n', min: 1, max: 100, value: n, onInput: v => { n = v; reset(); } });
      const r2b = row(api);
      btn(r2b, 'Draw 1 sample', () => draw(1), true); btn(r2b, 'Draw 100', () => draw(100)); btn(r2b, 'Draw 1,000', () => draw(1000)); btn(r2b, 'Reset', () => { resets++; reset(); });
      const roC = ro(api, 'Samples drawn'), roM = ro(api, 'Mean of the means'), roS = ro(api, 'SD of the means'), roT = ro(api, 'Theory σ/√n'), roX = ro(api, 'Excel');
      const note = api.note('');
      function reset() { stopAnim(); means = []; last = null; rs = S.rng(501 + resets * 7919 + n * 31 + shape.length); gS.set(shape); render(); }
      function one() { const p = pop(shape), vals = new Array(n); let s = 0; for (let j = 0; j < n; j++) { const v = p.a[Math.floor(rs() * NP)]; vals[j] = v; s += v; } const m = s / n; if (means.length < 50000) means.push(m); last = { vals, m }; }
      function draw(k) {
        stopAnim();
        if (k === 1) { one(); render(); return; }
        let done = 0;
        stopAnim = animate(k >= 1000 ? 650 : 350, t => { const target = Math.round(t * k); while (done < target) { one(); done++; } render(); });
      }
      function render() {
        const p = pop(shape), se = p.sigma / Math.sqrt(n);
        W.clear(gTop); W.clear(gSamp); W.clear(gBot); W.clear(gMark);
        // population panel
        const pm = Math.max.apply(null, p.bins), syT = W.scale(0, pm * 1.08, B1, T1);
        p.bins.forEach((c, i) => W.s('rect', { x: sx(i * 2) + 0.5, y: syT(c), width: sx(2) - sx(0) - 1, height: B1 - syT(c), style: 'fill:var(--muted);opacity:.45' }, gTop));
        W.s('line', { x1: L, x2: R, y1: B1, y2: B1, style: 'stroke:var(--line-2)' }, gTop);
        nice(0, 100, NAR ? 5 : 10).forEach(t => W.s('line', { x1: sx(t), x2: sx(t), y1: B1, y2: B1 + 4, style: 'stroke:var(--line-2)' }, gTop));
        W.s('line', { x1: sx(p.mu), x2: sx(p.mu), y1: T1 - 4, y2: B1, style: 'stroke:var(--ink);stroke-width:1.6;stroke-dasharray:4 3' }, gTop);
        W.text(gTop, L, 14, `Population (${SH[shape].toLowerCase()}): μ = ${p.mu.toFixed(1)}, σ = ${p.sigma.toFixed(1)}`, 'font-size:12.5px;font-weight:700;fill:var(--ink-2)', 'start');
        halo(W.text(gTop, sx(p.mu) + 5, T1 + 8, 'μ', 'font-size:12px;font-weight:700;fill:var(--ink)', 'start'));
        if (last) {
          const show = last.vals.slice(0, 100);
          show.forEach((v, j) => W.s('circle', { cx: sx(v), cy: B1 + 14 + (j % 3) * 5, r: 3.2, style: 'fill:var(--acc-deep);opacity:.85' }, gSamp));
          W.s('line', { x1: sx(last.m), x2: sx(last.m), y1: B1 + 10, y2: T2 - 4, style: 'stroke:var(--acc-deep);stroke-width:1.6;stroke-dasharray:3 3' }, gSamp);
          halo(W.text(gSamp, clamp(sx(last.m), L + 70, R - 70), B1 + 46, `latest sample mean x̄ = ${last.m.toFixed(1)}`, 'font-size:12px;font-weight:700;fill:var(--acc-fg)'));
        }
        // sample means panel
        const BWS = [0.25, 0.5, 1, 2, 2.5, 5], bw = BWS.reduce((b, v) => (Math.abs(v - se / 2.5) < Math.abs(b - se / 2.5) ? v : b), 1), nb = Math.round(100 / bw), cnt = new Array(nb).fill(0);
        means.forEach(m => { cnt[Math.min(nb - 1, Math.floor(m / bw))]++; });
        const N = means.length, peak = N * bw / (se * Math.sqrt(2 * Math.PI)), ymax = Math.max(1, Math.max.apply(null, cnt), peak) * 1.1, syB = W.scale(0, ymax, B2, T2);
        cnt.forEach((c, i) => { if (c) W.s('rect', { x: sx(i * bw) + (bw >= 1 ? 0.5 : 0), y: syB(c), width: Math.max(0.8, sx(bw) - sx(0) - (bw >= 1 ? 1 : 0)), height: B2 - syB(c), style: 'fill:var(--acc-deep);opacity:.78' }, gBot); });
        W.text(gBot, L, T2 - 16, `Means of samples of size n = ${n}` + (N ? ` (${N.toLocaleString('en-IN')} samples)` : ''), 'font-size:12.5px;font-weight:700;fill:var(--ink-2)', 'start');
        if (N) { curve.setAttribute('d', curvePath(sx, syB, x => N * bw * S.normPdf(x, p.mu, se), 0, 100, 300)); curve.style.display = ''; }
        else { curve.style.display = 'none'; halo(W.text(gBot, (L + R) / 2, (T2 + B2) / 2, 'Press “Draw 1 sample” or “Draw 1,000” to start', 'font-size:14px;fill:var(--muted)')); }
        if (N) {
          const lx = clamp(sx(p.mu + 2.2 * se) + 6, L + 10, R - 150);
          halo(W.text(gMark, lx, T2 + 14, `normal curve N(μ, σ/√n)`, 'font-size:12px;fill:var(--ink)', 'start'));
        }
        if (last) W.s('path', { d: `M${sx(last.m).toFixed(1)},${B2}l-6,10h12z`, style: 'fill:var(--acc-deep)' }, gMark);
        // readouts
        const mm = N ? S.mean(means) : NaN, sdm = N > 1 ? S.sdS(means) : NaN;
        roC.set(N.toLocaleString('en-IN')); roM.set(N ? `${mm.toFixed(2)} (μ = ${p.mu.toFixed(2)})` : '—'); roS.set(N > 1 ? sdm.toFixed(2) : '—');
        roT.set(`${p.sigma.toFixed(2)}/√${n} = ${se.toFixed(2)}`); roX.set(`=AVERAGE(means) · =STDEV.S(means) · =${p.sigma.toFixed(2)}/SQRT(${n})`);
        let shapeTxt;
        if (shape === 'normal') shapeTxt = 'The population is already normal, so the sample means are normal for any n — only their spread shrinks.';
        else if (n === 1) shapeTxt = `With n = 1 each “mean” is just one value, so the means copy the population's ${shape} shape. Slide n up.`;
        else if (n < 10) shapeTxt = `The means are already less ${shape === 'uniform' ? 'flat' : shape === 'bimodal' ? 'two-humped' : 'skewed'} than the population; push n towards 30 and watch the bell curve take over.`;
        else if (n < 30) shapeTxt = 'The means are close to bell-shaped already.';
        else shapeTxt = `With n = ${n} (≥ 30) the means are bell-shaped, just as the CLT promises — even though the population is not.`;
        note.innerHTML = N > 1 ? `${N.toLocaleString('en-IN')} sample means centre on <b>${mm.toFixed(2)}</b> (μ = ${p.mu.toFixed(2)}) with SD <b>${sdm.toFixed(2)}</b> — close to σ/√n = ${se.toFixed(2)}. ${shapeTxt}`
          : `Each sample of n = ${n} values gives one sample mean. Draw many samples and the means form their own distribution: centred on μ, with spread σ/√n = ${se.toFixed(2)}. ${shapeTxt}`;
      }
      reset();
    }
  });

  // =================================================================== ci-sim
  W.register('ci-sim', {
    title: 'What does “95% confident” mean?',
    init(api, P, el) {
      setup(el); P = P || {};
      const mu = num(P.mu, 500), sd = Math.abs(num(P.sd, 80)) || 1, unit = P.unit || '', U = ufmt(unit);
      let n = clamp(Math.round(num(P.n, 25)), 5, 100), conf = Math.round(normProb(P.conf, 0.95, 0.8, 0.99) * 100) / 100, known = P.sigmaKnown === true || P.sigmaKnown === 'true';
      const K = 100, n0 = n, se0 = sd / Math.sqrt(n0), ylo = mu - 5 * se0, yhi = mu + 5 * se0;
      const NAR = narrow(api), Wd = NAR ? 440 : 640, H = 304, L = NAR ? 46 : 56, R = Wd - (NAR ? 6 : 10), T = 12, B = 268, sy = W.scale(ylo, yhi, B, T), colW = (R - L) / K;
      const svg = api.svg(Wd, H, '100 confidence intervals; the ones that miss the true mean are marked');
      W.axisY(svg, sy, L, nice(ylo, yhi, 6), t => (+t.toFixed(4)).toLocaleString('en-IN'), { grid: true, x1: R });
      const gI = W.s('g', null, svg), gMiss = W.s('g', null, svg);
      W.s('line', { x1: L, x2: R, y1: sy(mu), y2: sy(mu), style: 'stroke:var(--ink);stroke-width:1.6;stroke-dasharray:6 4' }, svg);
      halo(W.text(svg, R - 4, sy(mu) - 7, `true mean μ = ${U(mu)}`, 'font-size:12.5px;font-weight:700;fill:var(--ink)', 'end'));
      W.text(svg, (L + R) / 2, H - 6, 'sample 1 → sample 100   (▲ = interval missed μ)', 'font-size:11.5px;fill:var(--muted)');
      let seed = 1, samples = [], shown = K, tot = { hit: 0, all: 0 }, stopAnim = () => {};
      const sc = api.slider({ label: 'Confidence level', min: 80, max: 99, step: 1, value: conf * 100, fmt: v => v + '%', onInput: v => { conf = v / 100; resetTot(); render(); } });
      const sn = api.slider({ label: 'Sample size n', min: 5, max: 100, step: 1, value: n, onInput: v => { n = v; gen(); resetTot(); render(); } });
      const r1 = row(api);
      const gK = seg(api, r1, 'Method', [{ v: false, label: 'σ unknown → t' }, { v: true, label: 'σ known → z' }], known, v => { known = v; resetTot(); render(); });
      btn(r1, 'New sample (100 intervals)', () => { seed++; gen(); tot.hit += compute().hits; tot.all += K; play(); }, true);
      const roH = ro(api, 'Contain μ'), roMs = ro(api, 'Missed'), roME = ro(api, 'Margin of error'), roTot = ro(api, 'All intervals so far'), roX = ro(api, 'Excel');
      const note = api.note('');
      function gen() { const r = S.rng(seed * 7919 + n * 104729); samples = []; for (let k = 0; k < K; k++) { let s1 = 0, s2 = 0; for (let j = 0; j < n; j++) { const x = mu + sd * S.randn(r); s1 += x; s2 += x * x; } const m = s1 / n; samples.push({ m, s: Math.sqrt(Math.max(0, (s2 - n * m * m) / (n - 1))) }); } }
      function resetTot() { tot = { hit: 0, all: 0 }; tot.hit = compute().hits; tot.all = K; }
      function compute() {
        const a = 1 - conf, crit = known ? S.normInv(1 - a / 2) : S.tInv(1 - a / 2, n - 1); let hits = 0, meSum = 0;
        const iv = samples.map(s => { const me = crit * (known ? sd : s.s) / Math.sqrt(n); meSum += me; const lo = s.m - me, hi = s.m + me, hit = lo <= mu && mu <= hi; if (hit) hits++; return { m: s.m, lo, hi, hit, me }; });
        return { iv, hits, crit, meAvg: meSum / K };
      }
      function play() { stopAnim(); shown = 0; stopAnim = animate(900, t => { shown = Math.round(t * K); render(); }); }
      function render() {
        const c = compute(); W.clear(gI); W.clear(gMiss);
        c.iv.forEach((v, k) => {
          if (k >= shown) return;
          const x = L + (k + 0.5) * colW, y1 = sy(clamp(v.hi, ylo, yhi)), y2 = sy(clamp(v.lo, ylo, yhi));
          const ln = W.s('line', { x1: x, x2: x, y1, y2, style: v.hit ? 'stroke:var(--acc-deep);stroke-width:2.4;opacity:.42' : 'stroke:var(--bad);stroke-width:4.4;opacity:1' }, gI);
          W.s('title', null, ln).textContent = `Sample ${k + 1}: x̄ = ${tr(v.m, 2)}, interval ${tr(v.lo, 2)} to ${tr(v.hi, 2)} — ${v.hit ? 'contains μ' : 'misses μ'}`;
          W.s('circle', { cx: x, cy: sy(clamp(v.m, ylo, yhi)), r: v.hit ? 1.9 : 2.6, style: v.hit ? 'fill:var(--acc-deep)' : 'fill:var(--bad)' }, gI);
          if (v.hi > yhi) W.s('path', { d: `M${x - 3.5},${T + 5}L${x},${T - 1}L${x + 3.5},${T + 5}Z`, style: `fill:${v.hit ? 'var(--acc-deep)' : 'var(--bad)'}` }, gI);
          if (v.lo < ylo) W.s('path', { d: `M${x - 3.5},${B - 5}L${x},${B + 1}L${x + 3.5},${B - 5}Z`, style: `fill:${v.hit ? 'var(--acc-deep)' : 'var(--bad)'}` }, gI);
          if (!v.hit) W.s('path', { d: `M${x - 4},${B + 13}L${x},${B + 5}L${x + 4},${B + 13}Z`, style: 'fill:var(--bad)' }, gMiss);
        });
        const visHits = c.iv.slice(0, shown).filter(v => v.hit).length, cp = Math.round(conf * 100);
        roH.set(`${visHits} of ${shown}`); roMs.set(String(shown - visHits));
        roME.set(known ? `± ${tr(c.crit * sd / Math.sqrt(n), 2)}` : `± ${tr(c.meAvg, 2)} on average`);
        roTot.set(`${tot.hit} of ${tot.all} (${(tot.hit / Math.max(1, tot.all) * 100).toFixed(1)}%)`);
        roX.set(known ? `=CONFIDENCE.NORM(${xn(1 - conf, 2)},${xn(sd)},${n})` : `=CONFIDENCE.T(${xn(1 - conf, 2)},s,${n}) for each sample (s changes)`);
        if (shown === K) note.innerHTML = `<b>${c.hits} of these 100</b> ${cp}% intervals caught the true mean μ = ${U(mu)}; <b>${K - c.hits} missed</b> (red, ▲ below). “${cp}% confident” describes the <i>method</i>: in the long run about ${cp} in 100 intervals built this way contain μ. Any single interval either contains μ or it doesn't — we just never know which.` + (tot.all >= 300 ? ` Over all ${tot.all.toLocaleString('en-IN')} intervals so far: ${(tot.hit / tot.all * 100).toFixed(1)}%.` : ' Press “New sample” a few times and watch the running total settle near ' + cp + '%.');
        return c.hits;
      }
      gen(); resetTot(); play();
    }
  });

  // =================================================================== ci-calc
  W.register('ci-calc', {
    title: 'Confidence interval calculator',
    init(api, P, el) {
      setup(el); P = P || {};
      const noP = !Object.keys(P).length, U = ufmt(P.unit !== undefined ? P.unit : (noP ? '₹' : ''));
      let mode = isNum(P.p) ? 'prop' : 'mean', conf = normProb(P.conf, 0.95, 0.5, 0.999);
      const m = { xbar: num(P.xbar, 1500), s: num(P.s, isNum(P.sd) ? +P.sd : 200), n: isNum(P.p) ? 100 : num(P.n, 100), known: P.sigmaKnown === true || P.sigmaKnown === 'true' };
      const q = { phat: normProb(P.p, 0.4, 0, 1), n: isNum(P.p) ? num(P.n, 500) : 500 };
      const r1 = row(api);
      const gMode = seg(api, r1, 'Estimate', [{ v: 'mean', label: 'Mean μ' }, { v: 'prop', label: 'Proportion p' }], mode, v => { mode = v; layout(); update(); });
      const gSig = seg(api, r1, 'σ', [{ v: false, label: 'unknown → t' }, { v: true, label: 'known → z' }], m.known, v => { m.known = v; layout(); update(); });
      const cOpts = [0.90, 0.95, 0.98, 0.99]; if (!cOpts.some(c => Math.abs(c - conf) < 1e-9)) cOpts.push(conf); cOpts.sort((a, b) => a - b);
      const r2b = row(api);
      const gC = seg(api, r2b, 'Confidence', cOpts.map(c => ({ v: c, label: +(c * 100).toFixed(1) + '%' })), cOpts.find(c => Math.abs(c - conf) < 1e-9), v => { conf = v; update(); });
      const iX = api.number({ label: 'x̄ — sample mean', value: m.xbar, onInput: v => { m.xbar = v; update(); } });
      const iS = api.number({ label: 's — sample SD', value: m.s, min: 0, onInput: v => { m.s = v; update(); } });
      const iP = api.number({ label: 'p̂ — sample proportion', value: q.phat, min: 0, max: 1, onInput: v => { q.phat = v; update(); } });
      const iN = api.number({ label: 'n — sample size', value: mode === 'prop' ? q.n : m.n, min: 1, step: 1, onInput: v => { if (mode === 'prop') q.n = v; else m.n = v; update(); } });
      const NAR = narrow(api), Wd = NAR ? 400 : 640, X0 = NAR ? 18 : 26, X1 = Wd - X0;
      const svg = api.svg(Wd, 128, 'Number line showing the confidence interval');
      const g = W.s('g', null, svg);
      const roC = ro(api, 'Critical value'), roSE = ro(api, 'Standard error'), roME = ro(api, 'Margin of error'), roI = ro(api, 'Interval');
      const warn = W.el('p', { class: 'wi-warn', style: 'display:none' }); api.foot.appendChild(warn);
      const box = W.el('div', { class: 'wi-box' }, '<header>Working <span>formula → numbers → answer</span></header><div class="wi-lines"></div>'); api.foot.appendChild(box);
      const lines = box.querySelector('.wi-lines'); const note = api.note('');
      let hw = null;
      function layout() {
        const pm = mode === 'prop'; gSig.parentNode.parentNode.style.display = pm ? 'none' : '';
        iX.el.style.display = iS.el.style.display = pm ? 'none' : ''; iP.el.style.display = pm ? '' : 'none';
        iS.el.querySelector('span').textContent = m.known ? 'σ — population SD' : 's — sample SD'; iN.set(pm ? q.n : m.n); hw = null;
      }
      function update() {
        const pm = mode === 'prop', n = Math.round(pm ? q.n : m.n);
        let err = '';
        if (pm && !(q.phat >= 0 && q.phat <= 1 && n >= 1)) err = 'Enter p̂ as a proportion between 0 and 1 (e.g. 0.40) and n of at least 1.';
        if (!pm && !(isFinite(m.xbar) && m.s > 0 && n >= (m.known ? 1 : 2))) err = `Enter x̄, a standard deviation above 0 and n of at least ${m.known ? 1 : 2}.`;
        if (err) { warn.textContent = err; warn.style.display = ''; lines.innerHTML = ''; W.clear(g); [roC, roSE, roME, roI].forEach(r => r.set('—')); note.innerHTML = 'Fix the inputs above to see the interval.'; return; }
        warn.style.display = 'none';
        const r = ciCalc({ mode: pm ? 'prop' : 'mean', xbar: m.xbar, s: m.s, n, conf, known: m.known, phat: q.phat }), a = r.alpha;
        const isT = !pm && !m.known, sym = isT ? 't' : 'z', dm = pm ? 4 : decOf(r.me), ds = pm ? 4 : decOf(r.se);
        const fm = v => (pm ? tr(v, 4) : tr(v, dm)), fmU = v => (pm ? tr(v, 4) : U(v, dm));
        const area = a / 2, cpc = +(conf * 100).toFixed(1) + '%';
        let tab;
        if (isT) { const tt = tTable(r.df, area); tab = tt ? `t table: df = ${tt.row}${r.df > 100 ? ` (df = ${r.df} is not in the table — use the df = 100 row)` : ''}, upper-tail area ${tt.col} → ${tt.v.toFixed(3)}` : `t table: an upper-tail area of ${tr(area)} is not a column of the table — use Excel`; }
        else tab = `z table: area ${fx(1 - area, 4)} to the left → ${tr(zTable(1 - area), 3)}`;
        const critX = isT ? `=T.INV.2T(${xn(a)},${r.df})` : `=NORM.S.INV(${xn(1 - area)})`;
        const critSym = isT ? `t<sub>${tr(area)}, ${r.df}</sub>` : `z<sub>${tr(area)}</sub>`;
        const est = pm ? 'p̂' : 'x̄';
        let L1, L3, meX;
        if (pm) {
          L1 = `p̂ ± z<sub>α/2</sub> · ${rt('p̂(1 − p̂) / n')}`;
          L3 = eq('SE', rt('p̂(1 − p̂) / n'), rt(`${tr(q.phat)} × ${tr(1 - q.phat)} / ${n}`), `<b>${tr(r.se, 4)}</b>`);
          meX = `=NORM.S.INV(${xn(1 - area)})*SQRT(${xn(q.phat)}*(1-${xn(q.phat)})/${n})`;
        } else {
          const sd = m.known ? 'σ' : 's';
          L1 = `x̄ ± ${sym}<sub>α/2${isT ? ', n−1' : ''}</sub> · ${frac(sd, rt('n'))}`;
          L3 = eq('SE', frac(sd, rt('n')), frac(tr(m.s), rt(n)), `<b>${tr(r.se, ds)}</b>`);
          meX = m.known ? `=CONFIDENCE.NORM(${xn(a)},${xn(m.s)},${n})` : `=CONFIDENCE.T(${xn(a)},${xn(m.s)},${n})`;
        }
        lines.innerHTML =
          `<div><b>Formula</b>${L1}${isT ? ' <span class="wi-muted">— σ unknown, so use t with df = n − 1 = ' + r.df + '</span>' : !pm ? ' <span class="wi-muted">— σ known, so use z</span>' : ''}</div>` +
          `<div><b>Critical value</b>${critSym} = <b>${fx(r.crit, 3)}</b> <span class="wi-muted">(${tab}; Excel ${xl(critX)} → ${fx(r.crit, 3)})</span></div>` +
          `<div><b>Standard error</b>${L3}</div>` +
          `<div><b>Margin of error</b>${eq('ME', `${fx(r.crit, 3)} × ${tr(r.se, ds)}`, `<b>${fm(r.me)}</b>`)} <span class="wi-muted">(Excel ${xl(meX)} → ${fm(r.me)})</span></div>` +
          `<div><b>Interval</b>${est} ± ME = ${fm(r.est)} ± ${fm(r.me)} → <b>${fm(r.lo)} to ${fm(r.hi)}</b>${pm ? ` <span class="wi-muted">(${pct1(r.lo)} to ${pct1(r.hi)})</span>` : ''}</div>`;
        roC.set(`${sym} = ${fx(r.crit, 3)}`); roSE.set(tr(r.se, pm ? 4 : ds)); roME.set('± ' + fm(r.me)); roI.set(`${fm(r.lo)} to ${fm(r.hi)}`);
        // number line
        W.clear(g);
        const need = r.me * 1.45; if (hw === null || need > hw || need < hw / 4) hw = Math.max(need, r.me * 2.4);
        const lo = r.est - hw, hi = r.est + hw;
        const sx = W.scale(lo, hi, X0, X1), Y = 66;
        W.axisX(g, sx, 92, nice(lo, hi, NAR ? 4 : 6), t => (pm ? tr(t, 3) : (+t.toFixed(6)).toLocaleString('en-IN')), { x0: X0, x1: X1 });
        W.s('rect', { x: sx(r.lo), y: Y - 11, width: Math.max(1, sx(r.hi) - sx(r.lo)), height: 22, rx: 6, style: 'fill:var(--acc-bg);stroke:var(--acc-bd);stroke-width:1.2' }, g);
        W.s('line', { x1: sx(r.lo), x2: sx(r.hi), y1: Y, y2: Y, style: 'stroke:var(--acc-deep);stroke-width:4' }, g);
        [r.lo, r.hi].forEach(v => W.s('line', { x1: sx(v), x2: sx(v), y1: Y - 15, y2: Y + 15, style: 'stroke:var(--acc-deep);stroke-width:3' }, g));
        W.s('circle', { cx: sx(r.est), cy: Y, r: 6.5, style: 'fill:var(--surface);stroke:var(--ink);stroke-width:2.5' }, g);
        halo(W.text(g, sx(r.est), Y - 20, `${est} = ${fm(r.est)}`, 'font-size:13px;font-weight:700;fill:var(--ink)'));
        halo(W.text(g, sx(r.lo) - 6, Y + 4, fm(r.lo), 'font-size:12.5px;font-weight:700;fill:var(--acc-fg)', 'end'));
        halo(W.text(g, sx(r.hi) + 6, Y + 4, fm(r.hi), 'font-size:12.5px;font-weight:700;fill:var(--acc-fg)', 'start'));
        halo(W.text(g, X0, 16, `${cpc} confidence interval`, 'font-size:12px;font-weight:700;fill:var(--muted)', 'start'));
        // note
        let chk = '';
        if (pm) { const a1 = n * q.phat, a2 = n * (1 - q.phat); chk = a1 >= 5 && a2 >= 5 ? ` Check: np̂ = ${tr(a1, 1)} and n(1 − p̂) = ${tr(a2, 1)} are both ≥ 5, so the normal approximation is fine.` : ` <b>Caution:</b> np̂ = ${tr(a1, 1)} or n(1 − p̂) = ${tr(a2, 1)} is below 5 — the normal approximation is unreliable here.`; }
        else if (isT) chk = ` σ is unknown, so the t value (${fx(r.crit, 3)}) is used; it is a little larger than z = ${fx(S.normInv(1 - area), 3)}, which widens the interval to allow for estimating σ.`;
        note.innerHTML = pm ? `We are <b>${cpc} confident</b> that the population proportion is between <b>${pct1(r.lo)}</b> and <b>${pct1(r.hi)}</b>.${chk}`
          : `We are <b>${cpc} confident</b> that the population mean is between <b>${fmU(r.lo)}</b> and <b>${fmU(r.hi)}</b>. A higher confidence level widens the interval; a larger sample narrows it.${chk}`;
      }
      layout(); update();
    }
  });

  // =================================================================== hypothesis-test
  W.register('hypothesis-test', {
    title: 'Hypothesis test — the six-step method',
    init(api, P, el) {
      setup(el); P = P || {}; const uid = ++UID, noP = !Object.keys(P).length;
      const st = { test: normTest(P.test), tail: normTail(P.tail), alpha: normProb(P.alpha, 0.05, 0.0005, 0.5) };
      const fam = () => (st.test === 'p' ? 'p' : 'm');
      const U = ufmt(P.unit !== undefined ? String(P.unit) : (noP ? 'ml' : ''));
      const hasM = isNum(P.mu0), isP = st.test === 'p';
      const m = { mu0: num(P.mu0, 500), xbar: num(P.xbar, hasM ? +P.mu0 : 497.8), sd: num(P.sd, hasM ? Math.max(1, Math.abs(+P.mu0) * 0.1) : 6), n: !isP ? num(P.n, hasM ? 30 : 40) : 40 };
      const q = { p0: normProb(P.p0, 0.05, 0, 1), phat: isNum(P.phat) ? normProb(P.phat, 0, 0, 1) : (isNum(P.p0) ? normProb(P.p0, 0.05, 0, 1) : 0.0675), n: isP ? num(P.n, 400) : 400 };
      let ctx = P.context ? String(P.context).trim().replace(/[\s.]+$/, '') : (noP ? 'the machine no longer fills 500 ml on average' : '');
      if (/^[A-Z][a-z]/.test(ctx)) ctx = ctx.charAt(0).toLowerCase() + ctx.slice(1);
      const ctxTail = st.tail, ctxFam = fam();

      // ---- controls
      const r1 = row(api), r2b = row(api);
      const gT = seg(api, r1, 'Test', [{ v: 'z', label: 'z · σ known' }, { v: 't', label: 't · σ unknown' }, { v: 'p', label: 'z · proportion' }], st.test, v => { st.test = v; layout(); update(); });
      const gTl = seg(api, r2b, 'H₁', [{ v: 'left', label: '< left-tailed' }, { v: 'two', label: '≠ two-tailed' }, { v: 'right', label: '> right-tailed' }], st.tail, v => { st.tail = v; update(); });
      const aO = [0.10, 0.05, 0.01]; if (!aO.some(a => Math.abs(a - st.alpha) < 1e-9)) aO.push(st.alpha); aO.sort((a, b) => b - a);
      seg(api, r2b, 'α', aO.map(a => ({ v: a, label: Math.abs(a * 100 - Math.round(a * 100)) < 1e-9 ? a.toFixed(2) : String(a) })), aO.find(a => Math.abs(a - st.alpha) < 1e-9), v => { st.alpha = v; update(); });
      const iMu = api.number({ label: 'μ₀ — value in H₀', value: m.mu0, onInput: v => { m.mu0 = v; update(); } });
      const iX = api.number({ label: 'x̄ — sample mean', value: m.xbar, onInput: v => { m.xbar = v; update(); } });
      const iSd = api.number({ label: 'σ — population SD', value: m.sd, min: 0, onInput: v => { m.sd = v; update(); } });
      const iP0 = api.number({ label: 'p₀ — value in H₀', value: q.p0, min: 0, max: 1, onInput: v => { q.p0 = v; update(); } });
      const iPh = api.number({ label: 'p̂ — sample proportion', value: q.phat, min: 0, max: 1, onInput: v => { q.phat = v; update(); } });
      const iN = api.number({ label: 'n — sample size', value: isP ? q.n : m.n, min: 1, step: 1, onInput: v => { if (fam() === 'p') q.n = v; else m.n = v; update(); } });

      // ---- chart
      const NAR = narrow(api), Wd = NAR ? 400 : 640, H = 266, L = NAR ? 34 : 40, R = Wd - (NAR ? 12 : 16), T = 42, B = 212, hid = 'wi-hatch-' + uid;
      const svg = api.svg(Wd, H, 'Sampling distribution of the test statistic if H0 is true, with the rejection region, p-value area and the test statistic');
      const defs = W.s('defs', null, svg), pat = W.s('pattern', { id: hid, patternUnits: 'userSpaceOnUse', width: 7, height: 7, patternTransform: 'rotate(45)' }, defs);
      W.s('rect', { width: 7, height: 7, style: 'fill:var(--bad);opacity:.10' }, pat); W.s('line', { x1: 1, y1: 0, x2: 1, y2: 7, style: 'stroke:var(--bad);stroke-width:2.4;opacity:.8' }, pat);
      const gP = W.s('g', null, svg), gRej = W.s('g', null, svg), curve = W.s('path', { style: 'fill:none;stroke:var(--ink);stroke-width:2.2' }, svg), gAx = W.s('g', null, svg), gCrit = W.s('g', null, svg);
      let Rz = null, rng = 4, sxC = W.scale(-4, 4, L, R), dragging = false;
      const kb = knob(svg, T, B, 'Test statistic: drag, or use the arrow keys',
        pt => { dragging = true; setStat(clamp(sxC.inv(pt.x), -rng, rng)); },
        d => { if (!Rz || Rz.err) return; if (fam() === 'p') { const n = Math.round(q.n); q.phat = clamp((Math.round(q.phat * n) + d) / n, 0, 1); iPh.set(+q.phat.toFixed(4)); update(); } else setStat(clamp(Rz.stat + d * 0.05, -8, 8)); },
        () => { dragging = false; update(); });
      const legend = W.el('div', { class: 'wi-legend' }); api.stage.appendChild(legend);
      function setStat(z) {
        if (!Rz || Rz.err) return;
        if (fam() === 'p') { const n = Math.round(q.n); q.phat = clamp(Math.round((q.p0 + z * Rz.se) * n) / n, 0, 1); q.phat = +q.phat.toFixed(6); iPh.set(+q.phat.toFixed(4)); }
        else { const dec = clamp(Math.ceil(-Math.log10(Rz.se)) + 1, 0, 4); m.xbar = +(m.mu0 + z * Rz.se).toFixed(dec); iX.set(m.xbar); }
        update();
      }

      // ---- readouts, note, write-up
      const roS = ro(api, 'Test statistic'), roC = ro(api, 'Critical value'), roPv = ro(api, 'p-value'), roD = ro(api, 'Decision'), roX = ro(api, 'Excel p-value');
      const note = api.note('');
      const six = W.el('div', { class: 'wi-box' }, '<header>Six-step write-up <span>critical-value and p-value approaches</span></header><ol class="wi-six"></ol><p class="wi-warn" style="display:none;margin:.6rem .85rem"></p>');
      api.foot.appendChild(six); const ol = six.querySelector('ol'), warn = six.querySelector('.wi-warn');

      function layout() {
        const pf = fam() === 'p';
        [iMu, iX, iSd].forEach(c => { c.el.style.display = pf ? 'none' : ''; }); [iP0, iPh].forEach(c => { c.el.style.display = pf ? '' : 'none'; });
        iSd.el.querySelector('span').textContent = st.test === 't' ? 's — sample SD' : 'σ — population SD'; iN.set(pf ? q.n : m.n);
      }
      function calc() {
        const pf = fam() === 'p', n = Math.round(pf ? q.n : m.n);
        if (pf) { if (!(n >= 1 && q.p0 > 0 && q.p0 < 1 && q.phat >= 0 && q.phat <= 1)) return { err: 'Enter p₀ strictly between 0 and 1 (e.g. 0.05), p̂ between 0 and 1 (e.g. 0.0675) and n of at least 1.' }; }
        else if (!(isFinite(m.mu0) && isFinite(m.xbar) && m.sd > 0 && n >= (st.test === 't' ? 2 : 1))) return { err: `Enter μ₀ and x̄, a standard deviation above 0 and n of at least ${st.test === 't' ? 2 : 1}.` };
        const r = htest({ test: st.test, tail: st.tail, alpha: st.alpha, n, mu0: m.mu0, xbar: m.xbar, sd: m.sd, p0: q.p0, phat: q.phat });
        r.n = n; return r;
      }
      function claim() {
        const pf = fam() === 'p', op = { left: '<', right: '>', two: '≠' }[st.tail], sym = pf ? 'p' : 'μ', v = pf ? tr(q.p0) : U(m.mu0);
        if (ctx && st.tail === ctxTail && fam() === ctxFam) return `${ctx} (${sym} ${op} ${v})`;
        return `the population ${pf ? 'proportion' : 'mean'} is ${{ left: 'less than', right: 'greater than', two: 'different from' }[st.tail]} ${v}`;
      }
      function draw(r) {
        const df = r.df, pdf = x => (df ? S.tPdf(x, df) : S.normPdf(x)), cm = Math.max.apply(null, r.crit.map(Math.abs));
        if (!dragging) rng = clamp(Math.max(3.8, Math.abs(r.stat) + 0.8, cm + 0.8), 3.8, 8);
        const sx = W.scale(-rng, rng, L, R), sy = W.scale(0, pdf(0) * 1.12, B, T); sxC = sx;
        curve.setAttribute('d', curvePath(sx, sy, pdf, -rng, rng));
        [gP, gRej, gAx, gCrit].forEach(W.clear);
        const s = r.stat, as = Math.abs(s), PS = 'fill:var(--acc-deep);opacity:.45', RS = `fill:url(#${hid})`;
        const A = (g, a, b, style) => { const d = areaPath(sx, sy, pdf, a, b, -rng, rng, B); if (d) W.s('path', { d, style }, g); };
        if (st.tail === 'left') { A(gP, -rng, s, PS); A(gRej, -rng, r.crit[0], RS); }
        else if (st.tail === 'right') { A(gP, s, rng, PS); A(gRej, r.crit[0], rng, RS); }
        else { A(gP, -rng, -as, PS); A(gP, as, rng, PS); A(gRej, -rng, r.crit[0], RS); A(gRej, r.crit[1], rng, RS); }
        const sp = rng > (NAR ? 4.5 : 5.5) ? 2 : 1, ticks = []; for (let k = -Math.floor(rng / sp) * sp; k <= rng + 1e-9; k += sp) ticks.push(k);
        W.axisX(gAx, sx, B, ticks, t => mi(t), { x0: L, x1: R });
        const pf = fam() === 'p', c0 = pf ? q.p0 : m.mu0, dp = (String(+c0.toFixed(4)).split('.')[1] || '').length, dec = clamp(Math.max(Math.ceil(-Math.log10(r.se)) + 1, dp), pf ? 2 : 0, 4), sym = df ? 't' : 'z';
        ticks.forEach(t => W.text(gAx, sx(t), B + 39, mi((c0 + t * r.se).toLocaleString('en-IN', { maximumFractionDigits: dec })), 'font-size:11.5px;fill:var(--muted)'));
        W.text(gAx, 3, B + 19, sym, 'font-size:13px;font-weight:700;fill:var(--ink-2)', 'start'); W.text(gAx, 3, B + 39, pf ? 'p̂' : 'x̄', 'font-size:13px;font-weight:700;fill:var(--ink-2)', 'start');
        r.crit.forEach(c => {
          if (Math.abs(c) > rng) return; const x = sx(c), y = Math.max(T + 18, sy(pdf(c)) - 34), near = Math.abs(sx(clamp(r.stat, -rng, rng)) - x) < 40, side = r.stat < c ? 1 : -1;
          W.s('line', { x1: x, x2: x, y1: y + 5, y2: B, style: 'stroke:var(--bad);stroke-width:2;stroke-dasharray:5 4' }, gCrit);
          halo(W.text(gCrit, near ? x + side * 7 : x, y, fx(c, 3), 'font-size:13px;font-weight:700;fill:var(--bad)', near ? (side > 0 ? 'start' : 'end') : 'middle'));
        });
        const lab = (x, y, t, f) => halo(W.text(gCrit, x, y, t, `font-size:12.5px;font-weight:700;fill:${f}`));
        const rejL = c => lab(sx((-rng + c) / 2), B - 44, 'Reject H₀', 'var(--bad)'), rejR = c => lab(sx((c + rng) / 2), B - 44, 'Reject H₀', 'var(--bad)');
        if (st.tail === 'left') rejL(r.crit[0]); else if (st.tail === 'right') rejR(r.crit[0]); else { rejL(r.crit[0]); rejR(r.crit[1]); }
        lab(sx(0), B - 12, 'Do not reject H₀', 'var(--ink-2)');
        const off = as > rng ? (s > 0 ? ' →' : ' ←') : '';
        kb.show(true); kb.place(sx(clamp(s, -rng, rng)), `${sym} = ${fx(s, 3)}${off}`, L + 52, R - 52);
        legend.innerHTML = `<span><i class="wi-sw-hatch"></i>Rejection region (total area α = ${tr(st.alpha)})</span><span><i style="background:var(--acc-deep);opacity:.55"></i>p-value area = ${fP(r.p)}</span><span><i class="wi-sw-line"></i>Test statistic — drag it</span><span class="wi-muted">Curve: ${df ? `t distribution, df = ${df}` : 'standard normal (z)'} if H₀ is true</span>`;
      }
      function steps(r) {
        const pf = fam() === 'p', t = st.test, sym = t === 't' ? 't' : 'z', a = st.alpha, tail = st.tail, n = r.n, df = r.df, s = r.stat, as = Math.abs(s);
        const P0 = pf ? 'p' : 'μ', v0 = pf ? tr(q.p0) : tr(m.mu0), h0 = { left: '≥', right: '≤', two: '=' }[tail], h1 = { left: '<', right: '>', two: '≠' }[tail];
        const tname = { left: 'left-tailed (lower-tail)', right: 'right-tailed (upper-tail)', two: 'two-tailed' }[tail];
        const ctxOK = ctx && tail === ctxTail && fam() === ctxFam;
        const s1 = `<b>Step 1 · State H₀ and H₁</b>H₀: ${P0} ${h0} ${v0} &nbsp;&nbsp; H₁: ${P0} ${h1} ${v0} <span class="wi-muted">— a ${tname} test. H₁ holds the claim we want evidence for${ctxOK ? `: “${ctx}”` : ''}; H₀ always contains the “=”.</span>`;
        const s2 = `<b>Step 2 · Level of significance and sample size</b>α = ${tr(a)} &nbsp;(a ${pctA(a)} risk of rejecting H₀ when it is true); n = ${n}.`;
        let s3;
        if (pf) {
          const a1 = n * q.p0, a2 = n * (1 - q.p0), ok = a1 >= 5 && a2 >= 5;
          s3 = `<b>Step 3 · Test statistic</b>Use the <b>z test for a proportion</b>: ${eq('z', frac('p̂ − p₀', rt('p₀(1 − p₀) / n')))} <span class="wi-muted">— standard normal if H₀ is true. Check: np₀ = ${tr(a1, 2)} and n(1 − p₀) = ${tr(a2, 2)} ${ok ? 'are both ≥ 5, so the normal approximation is fine.' : '— at least one is below 5, so the normal approximation is unreliable (use the binomial distribution).'}</span>`;
        } else if (t === 't') {
          s3 = `<b>Step 3 · Test statistic</b>σ is unknown, so use the <b>t test</b>: ${eq('t', frac('x̄ − μ₀', 's / ' + rt('n')))} <span class="wi-muted">with df = n − 1 = ${df}. ${n >= 30 ? `n = ${n} ≥ 30, so the t test is safe even if the population is not quite normal.` : `n = ${n} < 30, so we assume the population is roughly normal.`}</span>`;
        } else {
          s3 = `<b>Step 3 · Test statistic</b>σ is known, so use the <b>z test</b>: ${eq('z', frac('x̄ − μ₀', 'σ / ' + rt('n')))} <span class="wi-muted">— standard normal if H₀ is true. ${n >= 30 ? `n = ${n} ≥ 30, so by the Central Limit Theorem x̄ is approximately normal.` : `n = ${n} < 30, so we assume the population is normally distributed.`}</span>`;
        }
        // step 4
        const cpos = Math.abs(r.crit[r.crit.length - 1]), cS = tail === 'two' ? `±${fx(cpos, 3)}` : fx(r.crit[0], 3);
        let tab, xc, xcv;
        if (sym === 'z') {
          const zt = mi(String(zTable(tail === 'two' ? 1 - a / 2 : 1 - a)));
          tab = tail === 'left' ? `z table: area ${fx(a, 4)} in the lower tail → −${zt}` : tail === 'right' ? `z table: area ${fx(1 - a, 4)} to the left → ${zt}` : `z table: area ${fx(1 - a / 2, 4)} to the left → ${zt}`;
          xc = tail === 'left' ? `=NORM.S.INV(${xn(a)})` : tail === 'right' ? `=NORM.S.INV(${xn(1 - a)})` : `=NORM.S.INV(${xn(1 - a / 2)})`;
          xcv = tail === 'left' ? r.crit[0] : cpos;
        } else {
          const area = tail === 'two' ? a / 2 : a, tt = tTable(df, area);
          tab = tt ? `t table: df = ${tt.row}${df > 100 ? ` (df = ${df} is not in the table — use the df = 100 row)` : ''}, upper-tail area ${tt.col} → ${tt.v.toFixed(3)}${tail === 'left' ? `, so −${tt.v.toFixed(3)}` : ''}` : `t table: an upper-tail area of ${tr(area)} is not a column of the table — use Excel`;
          xc = tail === 'left' ? `=T.INV(${xn(a)},${df})` : tail === 'right' ? `=T.INV(${xn(1 - a)},${df})` : `=T.INV.2T(${xn(a)},${df})`;
          xcv = tail === 'left' ? r.crit[0] : cpos;
        }
        const rule = tail === 'left' ? `reject H₀ if ${sym} ≤ ${fx(r.crit[0], 3)}` : tail === 'right' ? `reject H₀ if ${sym} ≥ ${fx(r.crit[0], 3)}` : `reject H₀ if ${sym} ≤ ${fx(-cpos, 3)} or ${sym} ≥ ${fx(cpos, 3)}`;
        const where = tail === 'two' ? `α/2 = ${tr(a / 2)} in each tail` : `α = ${tr(a)} in the ${tail === 'left' ? 'lower' : 'upper'} tail`;
        const s4 = `<b>Step 4 · Critical value and decision rule</b>${where}${df ? `, df = ${df}` : ''}: critical value <b>${cS}</b> <span class="wi-muted">(${tab}; Excel ${xl(xc)} → ${fx(xcv, 3)})</span>.<br>Decision rule: <b>${rule}</b>; otherwise do not reject H₀.`;
        // step 5
        let calcEq, xs;
        if (pf) { calcEq = eq('z', frac(`${tr(q.phat)} − ${par(q.p0)}`, rt(`${tr(q.p0)} × ${tr(1 - q.p0)} / ${n}`)), frac(tr(r.diff, 4), tr(r.se, 4)), `<b>${fx(s, 3)}</b>`); xs = `=(${xn(q.phat)}-${xp(q.p0)})/SQRT(${xn(q.p0)}*(1-${xn(q.p0)})/${n})`; }
        else { calcEq = eq(sym, frac(`${tr(m.xbar)} − ${par(m.mu0)}`, `${tr(m.sd)} / ${rt(n)}`), frac(tr(r.diff, 4), tr(r.se, 4)), `<b>${fx(s, 3)}</b>`); xs = `=(${xn(m.xbar)}-${xp(m.mu0)})/(${xn(m.sd)}/SQRT(${n}))`; }
        const ss = xn(s, 4), sa = xn(as, 4), dfs = df ? `, df = ${df}` : '';
        let pl, xpv, ptab;
        const Z = sym === 'z' ? 'Z' : 't';
        if (tail === 'left') { pl = `P(${Z} ≤ ${fx(s, 3)}${dfs})`; xpv = sym === 'z' ? `=NORM.S.DIST(${ss},TRUE)` : `=T.DIST(${ss},${df},TRUE)`; }
        else if (tail === 'right') { pl = `P(${Z} ≥ ${fx(s, 3)}${dfs})`; xpv = sym === 'z' ? `=1-NORM.S.DIST(${ss},TRUE)` : `=T.DIST.RT(${ss},${df})`; }
        else { pl = `2 × P(${Z} ≥ ${fx(as, 3)}${dfs})` + (r.p >= 0.0001 ? ` = 2 × ${fx(r.p / 2, 4)}` : ''); xpv = sym === 'z' ? `=2*(1-NORM.S.DIST(${sa},TRUE))` : `=T.DIST.2T(${sa},${df})`; }
        if (sym === 'z') {
          const zr = r2(s), azr = Math.abs(zr);
          if (azr > 3.49) ptab = `z table: |z| is beyond 3.49, so the ${tail === 'two' ? 'p-value is below 0.0005' : 'tail area is below 0.0002'}`;
          else { const Al = r4(S.normCdf(zr)), At = r4(S.normCdf(-azr)); ptab = `z table with z ≈ ${tr(zr, 2)}: ` + (tail === 'left' ? `area to the left = ${fx(Al, 4)}` : tail === 'right' ? `1 − ${fx(Al, 4)} = ${fx(1 - Al, 4)}` : `2 × ${fx(At, 4)} = ${fx(2 * At, 4)}`); }
        } else {
          const rowN = Math.min(100, df), vals = T_COLS.map(c => +S.tInv(1 - c, rowN).toFixed(3)), k = tail === 'two' ? 2 : 1, dirOK = tail === 'two' || (tail === 'left' ? s <= 0 : s >= 0);
          let br;
          if (!dirOK) br = 't is on the opposite side from H₁, so the p-value is above 0.50';
          else if (as < vals[0]) br = `|t| < ${vals[0].toFixed(3)}, so p-value > ${tr(0.2 * k)}`;
          else if (as >= vals[5]) br = `|t| ≥ ${vals[5].toFixed(3)}, so p-value < ${tr(0.005 * k)}`;
          else { let i = 0; while (i < 4 && !(as >= vals[i] && as < vals[i + 1])) i++; br = `${vals[i].toFixed(3)} ≤ |t| < ${vals[i + 1].toFixed(3)}, so ${tr(T_COLS[i + 1] * k)} < p-value < ${tr(T_COLS[i] * k)}`; }
          ptab = `t table, df = ${rowN} row: ${br}`;
        }
        const s5 = `<b>Step 5 · Compute the test statistic and p-value</b>${calcEq} <span class="wi-muted">(Excel ${xl(xs)})</span><br>p-value = ${pl} <b>${pEq(r.p)}</b> <span class="wi-muted">(Excel ${xl(xpv)}; ${ptab})</span>`;
        // step 6
        const c = r.crit, cs = fx(s, 3); let cmp;
        if (tail === 'left') cmp = r.reject ? `${sym} = ${cs} ≤ ${fx(c[0], 3)}` : `${sym} = ${cs} > ${fx(c[0], 3)}`;
        else if (tail === 'right') cmp = r.reject ? `${sym} = ${cs} ≥ ${fx(c[0], 3)}` : `${sym} = ${cs} < ${fx(c[0], 3)}`;
        else cmp = r.reject ? (s < 0 ? `${sym} = ${cs} ≤ ${fx(-cpos, 3)}` : `${sym} = ${cs} ≥ ${fx(cpos, 3)}`) : `${fx(-cpos, 3)} < ${sym} = ${cs} < ${fx(cpos, 3)}`;
        const pc = r.reject ? `p-value ${r.p < 0.0001 ? '< 0.0001' : '= ' + fP(r.p)} ≤ α = ${tr(a)}` : `p-value = ${fP(r.p)} > α = ${tr(a)}`;
        const concl = r.reject ? `At the ${pctA(a)} level of significance there is <b>sufficient evidence</b> to conclude that ${claim()}.`
          : `At the ${pctA(a)} level of significance there is <b>not sufficient evidence</b> to conclude that ${claim()}. <span class="wi-muted">(This does not prove H₀ true — the sample simply isn't strong enough evidence against it.)</span>`;
        const s6 = `<b>Step 6 · Decision and conclusion</b>${cmp}, so the test statistic ${r.reject ? 'falls in the rejection region' : 'is not in the rejection region'}; equivalently, ${pc}. &nbsp;<span class="wi-dec ${r.reject ? 'rej' : 'keep'}">${r.reject ? 'Reject H₀' : 'Do not reject H₀'}</span><br><b>Conclusion:</b> ${concl}`;
        ol.innerHTML = [s1, s2, s3, s4, s5, s6].map(x => `<li>${x}</li>`).join('');
        roX.set(xpv);
      }
      function update() {
        const r = calc(); Rz = r;
        if (r.err) {
          warn.textContent = r.err; warn.style.display = ''; ol.style.display = 'none';
          [gP, gRej, gCrit, gAx].forEach(W.clear); kb.show(false); legend.innerHTML = '';
          if (!dragging) rng = 3.8; const sx = W.scale(-rng, rng, L, R), sy = W.scale(0, S.normPdf(0) * 1.12, B, T);
          curve.setAttribute('d', curvePath(sx, sy, x => S.normPdf(x), -rng, rng)); W.s('line', { x1: L, x2: R, y1: B, y2: B, style: 'stroke:var(--line-2)' }, gAx);
          halo(W.text(gCrit, (L + R) / 2, B - 40, 'Fix the inputs below to run the test', 'font-size:14px;font-weight:700;fill:var(--muted)'));
          [roS, roC, roPv, roD, roX].forEach(x => x.set('—')); note.innerHTML = 'Fix the inputs above to run the test.'; return;
        }
        warn.style.display = 'none'; ol.style.display = '';
        draw(r); steps(r);
        const sym = r.df ? 't' : 'z', pf = fam() === 'p', s = r.stat;
        roS.lab(`${sym} statistic`); roS.set(fx(s, 3)); roC.set(st.tail === 'two' ? `±${fx(r.crit[1], 3)}` : fx(r.crit[0], 3)); roPv.set(fP(r.p)); roD.set(r.reject ? 'Reject H₀' : 'Do not reject H₀');
        const what = pf ? `sample proportion ${tr(q.phat)}` : `sample mean ${U(m.xbar)}`, base = pf ? tr(q.p0) : U(m.mu0);
        const wrongSide = st.tail !== 'two' && (st.tail === 'left' ? s > 0 : s < 0);
        let txt = `The ${what} is <b>${f2(Math.abs(s))} standard errors</b> ${s < 0 ? 'below' : 'above'} ${base}. If H₀ were true, a result at least this extreme would turn up ${freq(r.p)} (p ${r.p < 0.0001 ? '< 0.0001' : '= ' + fP(r.p)}). `;
        txt += r.reject ? `That is rare enough at α = ${tr(st.alpha)}, so we <b>reject H₀</b>: the data support the claim that ${claim()}.`
          : `That is not rare enough at α = ${tr(st.alpha)}, so we <b>do not reject H₀</b>: the evidence is too weak to claim that ${claim()}.`;
        if (wrongSide) txt += ' (The sample points the opposite way from H₁, so it can never support H₁.)';
        note.innerHTML = txt;
      }
      layout(); update();
    }
  });

  // =================================================================== error-tradeoff
  W.register('error-tradeoff', {
    title: 'Type I and Type II errors: the trade-off',
    init(api, P, el) {
      setup(el); P = P || {}; const noP = !Object.keys(P).length;
      let tail = normTail(P.tail !== undefined ? P.tail : 'right'), mu0 = num(P.mu0, 30), sd = Math.abs(num(P.sd, 6)) || 1, n = clamp(Math.round(num(P.n, 36)), 2, 5000), alpha = normProb(P.alpha, 0.05, 0.005, 0.3);
      const U = ufmt(P.unit !== undefined ? P.unit : (noP ? 'min' : '')), se0 = sd / Math.sqrt(n);
      let mu1 = num(P.mu1, mu0 + (tail === 'left' ? -2 : 2) * se0);
      const D = Math.max(2 * Math.abs(mu1 - mu0), 4 * se0), xlo = mu0 - D - 3.2 * se0, xhi = mu0 + D + 3.2 * se0;
      const stepM = Math.pow(10, Math.floor(Math.log10(D / 100))), dM = clamp(-Math.floor(Math.log10(stepM)), 0, 6), fU = v => U(v, dM + 1);
      const NAR = narrow(api), Wd = NAR ? 400 : 640, H = 286, L = NAR ? 16 : 24, R = Wd - L, T = 46, B = 236, sx = W.scale(xlo, xhi, L, R);
      const svg = api.svg(Wd, H, 'Sampling distributions of the sample mean if H0 is true and if H1 is true, with alpha and beta shaded');
      const cid = 'wi-clip-' + (++UID), cp = W.s('clipPath', { id: cid }, W.s('defs', null, svg)); W.s('rect', { x: L, y: 0, width: R - L, height: B }, cp);
      const gA = W.s('g', { 'clip-path': `url(#${cid})` }, svg), gC = W.s('g', { 'clip-path': `url(#${cid})` }, svg), gL = W.s('g', null, svg);
      W.axisX(svg, sx, B, nice(xlo, xhi, NAR ? 4 : 7), t => U(+t.toFixed(6), 4), { x0: L, x1: R });
      W.text(svg, R, B + 38, 'sample mean x̄', 'font-size:12px;font-weight:700;fill:var(--muted)', 'end');
      const r1 = row(api);
      const gT = seg(api, r1, 'H₁', [{ v: 'left', label: '< left-tailed' }, { v: 'two', label: '≠ two-tailed' }, { v: 'right', label: '> right-tailed' }], tail, v => { tail = v; draw(); });
      const sA = api.slider({ label: 'α (risk of a Type I error)', min: 0.005, max: Math.max(0.2, alpha), step: 0.005, value: alpha, fmt: v => String(+v.toFixed(3)), onInput: v => { alpha = v; draw(); } });
      const sN = api.slider({ label: 'Sample size n', min: 2, max: Math.max(200, n * 2), step: 1, value: n, onInput: v => { n = v; draw(); } });
      const sM = api.slider({ label: 'True mean μ₁ (if H₁ is true)', min: +(mu0 - D).toFixed(dM), max: +(mu0 + D).toFixed(dM), step: stepM, value: +mu1.toFixed(dM), fmt: v => fU(v), onInput: v => { mu1 = v; draw(); } });
      const roA = ro(api, 'α = P(Type I)'), roB = ro(api, 'β = P(Type II)'), roPw = ro(api, 'Power 1 − β'), roCv = ro(api, 'Reject H₀ if x̄'), roN = ro(api, 'n for 80% power');
      const tbl = W.el('table', { class: 'wi-dt' }); api.foot.appendChild(tbl);
      const xlb = W.el('div', { class: 'wi-box' }, '<header>Excel <span>critical value, β and power</span></header><div class="wi-lines"></div>'); api.foot.appendChild(xlb);
      const xlines = xlb.querySelector('.wi-lines'); const note = api.note('');
      let sel = null;
      const COL = { a: 'var(--bad)', ok0: 'var(--muted)', pow: 'var(--ok)', b: 'var(--warn)' };
      tbl.addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; sel = sel === b.dataset.k ? null : b.dataset.k; draw(); });
      function draw() {
        const r = power({ mu0, mu1, sd, n, alpha, tail }), se = r.se, pk = 1 / (se * Math.sqrt(2 * Math.PI)), sy = W.scale(0, pk * 1.2, B, T);
        const f0 = x => S.normPdf(x, mu0, se), f1 = x => S.normPdf(x, mu1, se);
        const rej = tail === 'right' ? [[r.cU, xhi]] : tail === 'left' ? [[xlo, r.cL]] : [[xlo, r.cL], [r.cU, xhi]], acc = tail === 'right' ? [[xlo, r.cU]] : tail === 'left' ? [[r.cL, xhi]] : [[r.cL, r.cU]];
        W.clear(gA); W.clear(gC); W.clear(gL);
        const op = k => (sel === null ? (k === 'a' || k === 'b' ? 0.5 : 0) : sel === k ? 0.62 : (k === 'a' || k === 'b' ? 0.12 : 0));
        const shade = (k, f, ivs) => { const o = op(k); if (!o) return; ivs.forEach(iv => { const d = areaPath(sx, sy, f, iv[0], iv[1], xlo, xhi, B); if (d) W.s('path', { d, style: `fill:${COL[k]};opacity:${o}` }, gA); }); };
        shade('ok0', f0, acc); shade('pow', f1, rej); shade('a', f0, rej); shade('b', f1, acc);
        W.s('path', { d: curvePath(sx, sy, f0, xlo, xhi), style: 'fill:none;stroke:var(--ink);stroke-width:2.2' }, gC);
        W.s('path', { d: curvePath(sx, sy, f1, xlo, xhi), style: 'fill:none;stroke:var(--acc-deep);stroke-width:2.4;stroke-dasharray:7 4' }, gC);
        const cs = [r.cL, r.cU].filter(c => c !== null);
        cs.forEach(c => { if (c < xlo || c > xhi) return; const x = sx(c); W.s('line', { x1: x, x2: x, y1: T - 14, y2: B, style: 'stroke:var(--ink-2);stroke-width:1.8;stroke-dasharray:4 3' }, gL); halo(W.text(gL, x, T - 20, `c = ${fU(c)}`, 'font-size:12.5px;font-weight:700;fill:var(--ink-2)')); });
        const x0 = sx(mu0), x1 = sx(mu1), yP = sy(pk) - 8, close = Math.abs(x1 - x0) < 150;
        plate(W.text(gL, clamp(x0, L + 60, R - 60), yP, `if H₀ true: μ = ${fU(mu0)}`, 'font-size:12px;font-weight:700;fill:var(--ink)', close ? (x1 >= x0 ? 'end' : 'start') : 'middle'));
        plate(W.text(gL, clamp(x1, L + 60, R - 60), yP + (close ? 16 : 0), `if H₁ true: μ = ${fU(mu1)}`, 'font-size:12px;font-weight:700;fill:var(--acc-fg)', close ? (x1 >= x0 ? 'start' : 'end') : 'middle'));
        const tag = (k, x, y, t, anc) => halo(W.text(gL, x, y, t, `font-size:12.5px;font-weight:700;fill:${COL[k]}`, anc));
        if (sel === null || sel === 'a' || sel === 'b') {
          const ca = tail === 'left' ? r.cL : r.cU, sideA = tail === 'left' ? -1 : 1;
          if (ca >= xlo && ca <= xhi) { tag('a', sx(ca) + sideA * 8, B - 8, `α = ${tr(alpha, 3)}`, sideA > 0 ? 'start' : 'end'); tag('b', sx(ca) - sideA * 8, B - 8, `β = ${fx(r.beta, 3)}`, sideA > 0 ? 'end' : 'start'); }
        }
        // decision table
        const cell = (k, title, val) => `<button type="button" data-k="${k}" aria-pressed="${sel === k}" style="--c:${COL[k]}">${title}<br><b>${val}</b></button>`;
        tbl.innerHTML = `<thead><tr><th>Reality ↓ · Decision →</th><th>Reject H₀</th><th>Do not reject H₀</th></tr></thead><tbody>` +
          `<tr><th>H₀ true (μ = ${fU(mu0)})</th><td>${cell('a', 'Type I error', 'α = ' + fx(alpha, 3))}</td><td>${cell('ok0', 'Correct decision', '1 − α = ' + fx(1 - alpha, 3))}</td></tr>` +
          `<tr><th>H₁ true (μ = ${fU(mu1)})</th><td>${cell('pow', 'Correct — power', '1 − β = ' + fx(r.power, 3))}</td><td>${cell('b', 'Type II error', 'β = ' + fx(r.beta, 3))}</td></tr></tbody>`;
        roA.set(fx(alpha, 3)); roB.set(fx(r.beta, 4)); roPw.set(fx(r.power, 4));
        roCv.set(tail === 'right' ? `≥ ${fU(r.cU)}` : tail === 'left' ? `≤ ${fU(r.cL)}` : `≤ ${fU(r.cL)} or ≥ ${fU(r.cU)}`);
        roN.set(r.n80 ? String(r.n80) : '— (μ₁ not on the H₁ side)');
        const SEx = `${xn(sd)}/SQRT(${n})`;
        let xb;
        if (tail === 'right') xb = `<div><b>Critical value</b>${xl(`=NORM.INV(${xn(1 - alpha)},${xn(mu0)},${SEx})`)} → ${tr(r.cU, 4)}</div><div><b>β</b>${xl(`=NORM.DIST(${xn(r.cU)},${xn(mu1)},${SEx},TRUE)`)} → ${fx(r.beta, 4)}</div>`;
        else if (tail === 'left') xb = `<div><b>Critical value</b>${xl(`=NORM.INV(${xn(alpha)},${xn(mu0)},${SEx})`)} → ${tr(r.cL, 4)}</div><div><b>β</b>${xl(`=1-NORM.DIST(${xn(r.cL)},${xn(mu1)},${SEx},TRUE)`)} → ${fx(r.beta, 4)}</div>`;
        else xb = `<div><b>Critical values</b>${xl(`=NORM.INV(${xn(alpha / 2)},${xn(mu0)},${SEx})`)} → ${tr(r.cL, 4)} and ${xl(`=NORM.INV(${xn(1 - alpha / 2)},${xn(mu0)},${SEx})`)} → ${tr(r.cU, 4)}</div><div><b>β</b>${xl(`=NORM.DIST(${xn(r.cU)},${xn(mu1)},${SEx},TRUE)-NORM.DIST(${xn(r.cL)},${xn(mu1)},${SEx},TRUE)`)} → ${fx(r.beta, 4)}</div>`;
        xlines.innerHTML = xb + `<div><b>Power</b>1 − β = ${fx(r.power, 4)} <span class="wi-muted">· standard error σ/√n = ${tr(sd)}/√${n} = ${tr(se, 4)}</span></div>`;
        const same = Math.abs(mu1 - mu0) < 1e-12, wrong = !same && ((tail === 'right' && mu1 < mu0) || (tail === 'left' && mu1 > mu0));
        let t;
        if (same) t = `μ₁ equals μ₀, so H₀ is actually true: the test rejects ${pct1(alpha)} of the time — that is just α, the Type I error rate.`;
        else if (wrong) t = `The true mean ${fU(mu1)} is on the opposite side from H₁, so this ${tail}-tailed test almost never rejects (power ${pct1(r.power)} is even below α). Choose the direction of H₁ before seeing the data.`;
        else t = `If the true mean is really <b>${fU(mu1)}</b>, a test with α = ${tr(alpha, 3)} and n = ${n} detects it <b>${pct1(r.power)}</b> of the time (power) and misses it <b>${pct1(r.beta)}</b> of the time (β, a Type II error). Cutting α moves the cut-off outward and <b>raises β</b> — unless you increase n, which narrows both curves and cuts both errors.` + (r.n80 ? (r.power < 0.8 ? ` To reach 80% power you would need n ≈ ${r.n80}.` : ` Power is already above 80% (n ≈ ${r.n80} would be enough).`) : '');
        note.innerHTML = t;
      }
      draw();
    }
  });

  // =================================================================== pvalue
  W.register('pvalue', {
    title: 'p-value explorer',
    init(api, P, el) {
      setup(el); P = P || {};
      let dist = String(P.dist || 'z').toLowerCase().trim() === 't' ? 't' : 'z', df = clamp(Math.round(num(P.df, 20)), 1, 1000), tail = normTail(P.tail !== undefined ? P.tail : 'two'), stat = clamp(num(P.stat, 1.9), -8, 8);
      const RG = clamp(Math.max(4, Math.abs(stat) + 0.6), 4, 8);
      const NAR = narrow(api), Wd = NAR ? 400 : 640, H = 248, L = NAR ? 18 : 30, R = Wd - L, T = 42, B = 214, sx = W.scale(-RG, RG, L, R);
      const svg = api.svg(Wd, H, 'Distribution of the test statistic if H0 is true with the p-value shaded');
      const gP = W.s('g', null, svg), curve = W.s('path', { style: 'fill:none;stroke:var(--ink);stroke-width:2.2' }, svg), gT = W.s('g', null, svg);
      const ticks = []; for (let k = -Math.floor(RG); k <= RG + 1e-9; k++) ticks.push(k);
      const ax = W.axisX(svg, sx, B, ticks, t => mi(t), { x0: L, x1: R });
      const kb = knob(svg, T, B, 'Test statistic: drag, or use the arrow keys', pt => setStat(sx.inv(pt.x)), d => setStat(stat + d * 0.01 * 5), null);
      const r1 = row(api);
      const gD = seg(api, r1, 'Distribution', [{ v: 'z', label: 'z (normal)' }, { v: 't', label: 't' }], dist, v => { dist = v; sd.el.style.display = dist === 't' ? '' : 'none'; draw(); });
      seg(api, r1, 'H₁', [{ v: 'left', label: '< left' }, { v: 'two', label: '≠ two-tailed' }, { v: 'right', label: '> right' }], tail, v => { tail = v; draw(); });
      const ss = api.slider({ label: 'Test statistic', min: -RG, max: RG, step: 0.01, value: stat, fmt: v => fx(v, 2), onInput: v => { stat = v; draw(); } });
      const sd = api.slider({ label: 'Degrees of freedom (df)', min: 1, max: Math.max(100, df), step: 1, value: df, onInput: v => { df = v; draw(); } });
      sd.el.style.display = dist === 't' ? '' : 'none';
      const roP = ro(api, 'p-value'), roX = ro(api, 'Excel');
      const verd = W.el('div', { class: 'wi-verd' }); api.foot.appendChild(verd);
      const note = api.note('');
      function setStat(v) { stat = Math.round(clamp(v, -RG, RG) * 100) / 100; ss.set(stat); draw(); }
      function draw() {
        const t = dist === 't', pdf = x => (t ? S.tPdf(x, df) : S.normPdf(x)), cdf = x => (t ? S.tCdf(x, df) : S.normCdf(x)), sy = W.scale(0, pdf(0) * 1.12, B, T);
        curve.setAttribute('d', curvePath(sx, sy, pdf, -RG, RG)); W.clear(gP); W.clear(gT);
        const s = stat, as = Math.abs(s), PS = 'fill:var(--acc-deep);opacity:.48';
        const A = (a, b) => { const d = areaPath(sx, sy, pdf, a, b, -RG, RG, B); if (d) W.s('path', { d, style: PS }, gP); };
        let p;
        if (tail === 'left') { A(-RG, s); p = cdf(s); } else if (tail === 'right') { A(s, RG); p = cdf(-s); } else { A(-RG, -as); A(as, RG); p = Math.min(1, 2 * cdf(-as)); }
        if (tail === 'two' && as > 0.05) { W.s('line', { x1: sx(-as), x2: sx(-as), y1: T + 10, y2: B, style: 'stroke:var(--acc-deep);stroke-width:1.6;stroke-dasharray:3 3' }, gT); halo(W.text(gT, sx(-as), T + 4, fx(-as, 2), 'font-size:12px;fill:var(--acc-fg)')); }
        const sym = t ? 't' : 'z';
        kb.place(sx(s), `${sym} = ${fx(s, 2)}`, L + 40, R - 40);
        halo(W.text(gT, sx(0), B - 12, `shaded area = p-value = ${fP(p)}`, 'font-size:13px;font-weight:700;fill:var(--ink)'));
        roP.set(fP(p));
        const s4 = xn(s, 2), a4 = xn(as, 2);
        roX.set(t ? (tail === 'left' ? `=T.DIST(${s4},${df},TRUE)` : tail === 'right' ? `=T.DIST.RT(${s4},${df})` : `=T.DIST.2T(${a4},${df})`) : (tail === 'left' ? `=NORM.S.DIST(${s4},TRUE)` : tail === 'right' ? `=1-NORM.S.DIST(${s4},TRUE)` : `=2*(1-NORM.S.DIST(${a4},TRUE))`));
        verd.innerHTML = [0.10, 0.05, 0.01].map(a => { const rj = p <= a; return `<div class="${rj ? 'rej' : ''}"><span class="wi-muted">at α = ${a.toFixed(2)}</span><b>${rj ? 'Reject H₀' : 'Do not reject H₀'}</b><span class="wi-muted">p ${rj ? '≤' : '>'} ${a.toFixed(2)}</span></div>`; }).join('');
        const dir = tail === 'two' ? 'in either direction' : tail === 'left' ? 'or lower' : 'or higher';
        const lvl = p <= 0.01 ? 'Strong evidence against H₀: significant even at the 1% level.' : p <= 0.05 ? 'Significant at 5% (and 10%) but not at 1%.' : p <= 0.10 ? 'Significant only at the 10% level — weak evidence against H₀.' : 'Not significant at any of the usual levels: the data are quite consistent with H₀.';
        note.innerHTML = `If H₀ were true, a ${sym} statistic of ${fx(s, 2)} ${dir} would happen with probability <b>${p < 0.0001 ? 'below 0.0001' : fP(p)}</b> — ${freq(p)}. ${lvl} The smaller the p-value, the stronger the evidence against H₀.` + (tail !== 'two' && (tail === 'left' ? s > 0 : s < 0) ? ' (The statistic is on the opposite side from H₁, so the p-value is above 0.5.)' : '');
        void gD; void ax;
      }
      draw();
    }
  });
})();
