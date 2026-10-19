/* Statistics for Managers — widget pack "describe"
   mean-median · spread · skew-shape · histogram-bins · boxplot · zscore
   Uses SFMW (widgets.js) and Stats (stats.js). Vanilla JS, no libraries. */
(function () {
  'use strict';
  const W = window.SFMW, S = window.Stats;
  if (!W || !S) return;

  // ------------------------------------------------------------------ shared helpers
  const CSS = `
.wx .w-readout .ro{max-width:100%;overflow-wrap:anywhere}
.wx .w-readout b,.wx code,.wx .wx-t .fx,.wx .wx-t small,.wx output{font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0}
.wx code.xl{white-space:normal;overflow-wrap:anywhere}
.wx .wx-msg{margin:.6rem 0 0;padding:.45rem .7rem;border-radius:9px;background:var(--warn-bg);color:var(--warn);font-size:.88rem}
.wx .wx-msg[hidden]{display:none}
.wx .wx-cap{font-size:.82rem;color:var(--muted);margin:.35rem 0 0;line-height:1.4}
.wx .wx-sw{display:inline-block;width:.8em;height:.8em;border-radius:3px;vertical-align:-.05em;margin-right:.3em}
.wx .wx-tw{width:0;min-width:100%;overflow-x:auto;margin:.2rem 0 0;border:1px solid var(--line);border-radius:10px;background:var(--surface)}
.wx table.wx-t{width:100%;border-collapse:collapse;font-size:.86rem;font-variant-numeric:tabular-nums}
.wx table.wx-t th,.wx table.wx-t td{padding:.32rem .5rem;border-bottom:1px solid var(--line);text-align:right;vertical-align:top}
.wx table.wx-t th:first-child,.wx table.wx-t td:first-child{text-align:left}
.wx table.wx-t thead th{background:var(--surface-2);font-size:.76rem;letter-spacing:.03em;color:var(--ink-2)}
.wx table.wx-t tbody tr:last-child td,.wx table.wx-t tbody tr:last-child th{border-bottom:0}
.wx table.wx-t tr.tot td{font-weight:700;background:var(--surface-2)}
.wx table.wx-t tr.sel td,.wx table.wx-t td.sel,.wx table.wx-t th.sel{background:var(--acc-bg);color:var(--acc-fg);font-weight:700}
.wx table.wx-t tr.pick{cursor:pointer}
.wx table.wx-t tr.pick:hover td{background:var(--surface-2)}
.wx table.wx-t .fx{font-family:var(--mono);font-size:.76rem;color:var(--excel);overflow-wrap:anywhere;text-align:left}
.wx table.wx-t small{display:block;font-family:var(--mono);font-size:.72rem;color:var(--excel);font-weight:400;overflow-wrap:anywhere}
.wx details.wx-edit{margin:.7rem 0 0;border:1px dashed var(--line-2);border-radius:10px;padding:.35rem .7rem}
.wx details.wx-edit>summary{cursor:pointer;font-size:.88rem;font-weight:700;color:var(--acc-fg)}
.wx details.wx-edit[open]{padding-bottom:.7rem}
.wx details.wx-edit textarea{margin-top:.5rem;min-height:5rem}
.wx .wx-segl{font-size:.88rem;color:var(--ink-2);align-self:center;margin-right:.1rem}
.wx .wx-hint{font-size:.8rem;color:var(--muted);margin:.3rem 0 0}
.wx svg .wx-dot{cursor:grab;outline:none}
.wx svg .wx-dot:focus-visible .wx-ring{stroke:var(--focus);stroke-width:3}
.wx svg .wx-hit{fill:transparent}
.wx svg .wx-pick{cursor:pointer;outline:none}
.wx svg .wx-pick:focus-visible{outline:none}
.wx svg .wx-pick:focus-visible .wx-fb{stroke:var(--focus);stroke-width:2.5}
`;
  function style() { if (document.getElementById('wx-describe-css')) return; const s = document.createElement('style'); s.id = 'wx-describe-css'; s.textContent = CSS; document.head.appendChild(s); }
  const nv = (v, d) => (v === undefined || v === null || v === '' || typeof v === 'boolean' || !isFinite(+v)) ? d : +v;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = t => String(t).replace(/[₹$€£%]/g, '').trim();
  function parseNums(txt) {
    const toks = String(txt == null ? '' : txt).split(/[\s,;]+/).filter(Boolean), vals = [], bad = [];
    toks.forEach(t => { const c = clean(t), v = Number(c); if (c !== '' && isFinite(v)) vals.push(v); else bad.push(t); });
    return { vals, bad };
  }
  function nums(a) {
    if (typeof a === 'string') return parseNums(a).vals;
    if (!Array.isArray(a)) return [];
    const out = []; a.forEach(v => { if (typeof v === 'number' && isFinite(v)) out.push(v); else if (typeof v === 'string' && clean(v) !== '' && isFinite(+clean(v))) out.push(+clean(v)); });
    return out;
  }
  const decOf = v => { const s = String(v); if (/e/i.test(s)) return 0; const i = s.indexOf('.'); return i < 0 ? 0 : Math.min(4, s.length - i - 1); };
  const minOf = a => a.reduce((m, v) => v < m ? v : m, Infinity), maxOf = a => a.reduce((m, v) => v > m ? v : m, -Infinity);
  function niceStep(v) { if (!(v > 0)) return 1; const e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e); return +((m >= 5 ? 5 : m >= 2 ? 2 : 1) * Math.pow(10, e)).toPrecision(6); }
  function loc(v, d, fixed) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    const a = Math.abs(v); if (a >= 1e12) return v.toExponential(2).replace('-', '−');
    const s = a.toLocaleString('en-IN', { minimumFractionDigits: fixed ? d : 0, maximumFractionDigits: d });
    return (v < 0 && +a.toFixed(d) !== 0 ? '−' : '') + s;
  }
  function fu(v, unit, d, fixed) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    if (!unit) return loc(v, d, fixed);
    const m = /^([$₹€£])\s*(.*)$/.exec(unit);
    if (m) return (v < 0 && +Math.abs(v).toFixed(d) !== 0 ? '−' : '') + m[1] + loc(Math.abs(v), d, fixed) + (m[2] ? ' ' + m[2] : '');
    if (unit === '%') return loc(v, d, fixed) + '%';
    return loc(v, d, fixed) + ' ' + unit;
  }
  const pl = s => { s = String(s); return /[^aeiou]y$/i.test(s) ? s.slice(0, -1) + 'ies' : /(s|x|z|ch|sh)$/i.test(s) ? s + 'es' : s + 's'; };
  const brk = f => esc(f).replace(/([,(])/g, '$1<wbr>').replace(/([-/*+]|&lt;|&gt;)/g, '<wbr>$1');
  const mf = (v, d) => v.toFixed(d).replace('-', '−');
  const xn = v => String(+(+v).toFixed(6));
  const rg = (col, n) => `${col}2:${col}${n + 1}`;
  function pal(el) {
    const host = el.closest('.c-descriptive,.c-probability,.c-inferential,.c-relationships') || document.body;
    const m = /(?:pillar|c)-(descriptive|probability|inferential|relationships)/.exec(host.className || '');
    const cur = m ? m[1][0] : 'n', o = ['p', 'r', 'i', 'd'].filter(x => x !== cur);
    return { c2: `var(--${o[0]}-deep)`, c2f: `var(--${o[0]}-fg)`, c3: `var(--${o[1]}-deep)`, c3f: `var(--${o[1]}-fg)`, c4: `var(--${o[2]}-deep)`, c4f: `var(--${o[2]}-fg)` };
  }
  // responsive SVG: a wide (640) or narrow (360) viewBox chosen from the real stage width
  function frame(api, label, dims, onChange) {
    const svg = api.svg(640, 300, label), st = { svg, narrow: false, w: 640, h: 300 };
    const apply = n => { st.narrow = n; const d = dims(n); st.w = d[0]; st.h = d[1]; svg.setAttribute('viewBox', `0 0 ${st.w} ${st.h}`); };
    const isN = () => { const cw = api.stage.clientWidth; return cw > 0 && cw < 540; };
    apply(isN());
    st.setH = h => { st.h = h; svg.setAttribute('viewBox', `0 0 ${st.w} ${h}`); };
    if (window.ResizeObserver) new ResizeObserver(() => { const n = isN(); if (n !== st.narrow) { apply(n); if (onChange) onChange(); } }).observe(api.stage);
    return st;
  }
  function msgEl(parent) { const m = W.el('p', { class: 'wx-msg', role: 'status' }); m.hidden = true; parent.appendChild(m); return t => { m.hidden = !t; m.innerHTML = t || ''; }; }
  function roH(api, label) { const r = W.el('span', { class: 'ro' }, `${label} <b></b>`); api.readout.appendChild(r); const b = r.querySelector('b'); const f = h => { b.innerHTML = h; }; f.el = r; return f; }
  // "use your own numbers" panel
  function editor(api, summary, hint, getText, apply) {
    const d = W.el('details', { class: 'wx-edit' }); const s = W.el('summary', null, summary);
    const ta = W.el('textarea', { class: 'w-input', rows: 4, spellcheck: 'false', 'aria-label': summary });
    const h = W.el('p', { class: 'wx-hint' }, hint); const bw = W.el('div', { class: 'w-btns' });
    const b = W.el('button', { type: 'button', class: 'btn small primary' }, 'Apply');
    bw.appendChild(b); d.append(s, ta, h, bw); api.foot.appendChild(d); const msg = msgEl(d);
    d.addEventListener('toggle', () => { if (d.open) { ta.value = getText(); msg(''); } });
    b.onclick = () => { try { msg(apply(ta.value) || ''); } catch (e) { msg('Could not use those numbers. Please check them.'); } };
    return { d, ta, msg };
  }
  // assign label rows so that labels centred at x do not overlap; clamp inside [L,R]
  function placeLabels(items, rows, L, R, cw) {
    const ends = new Array(rows).fill(-1e9);
    items.slice().sort((a, b) => a.x - b.x).forEach(it => {
      const w = it.text.length * (cw || 6.6) + 10; it.tx = Math.max(L + w / 2, Math.min(R - w / 2, it.x));
      let r = 0; while (r < rows - 1 && ends[r] > it.tx - w / 2) r++; it.row = r; ends[r] = Math.max(ends[r], it.tx + w / 2);
    });
    return items;
  }
  // stack dots so they don't overlap (sorted greedy); returns level per index
  function stackLevels(xs, r) {
    const idx = xs.map((x, i) => i).sort((a, b) => xs[a] - xs[b]), placed = [], lev = new Array(xs.length);
    idx.forEach(i => { let L = 0; const x = xs[i]; while (placed.some(p => p.l === L && Math.abs(p.x - x) < 2 * r - 0.3)) L++; placed.push({ x, l: L }); lev[i] = L; });
    return lev;
  }
  function swarm(xs, r) { // centred swarm: levels 0, +1, -1, +2, -2 ...
    const idx = xs.map((x, i) => i).sort((a, b) => xs[a] - xs[b]), placed = [], off = new Array(xs.length), seq = [0];
    for (let k = 1; k < 60; k++) seq.push(k, -k);
    idx.forEach(i => { const x = xs[i]; for (const L of seq) { if (!placed.some(p => p.l === L && Math.abs(p.x - x) < 2 * r - 0.3)) { placed.push({ x, l: L }); off[i] = L; break; } } });
    return off;
  }
  function vline(g, x, y1, y2, st) { return W.s('line', { x1: x, x2: x, y1, y2, style: st }, g); }
  function setSeg(g, i) { g.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', j === i)); }

  // ======================= mean-median =======================
  // params: data (array), unit, label, trim (TRIMMEAN percent 0–0.4, default 0.2)
  W.register('mean-median', {
    title: 'Mean, median and mode explorer',
    init(api, P, el) {
      P = P && typeof P === 'object' && !Array.isArray(P) ? P : {};
      style(); el.classList.add('wx'); const C = pal(el);
      const given = P.data !== undefined && P.data !== null; let base = nums(P.data), warnTxt = '';
      if (base.length > 400) base = base.slice(0, 400);
      if (base.length < 2) { if (given) warnTxt = 'The data for this explorer could not be read (it needs at least two numbers), so an example is shown.'; base = [4.5, 5, 5, 5.5, 6, 6.2, 6.5, 7, 7.5, 8, 9]; }
      const useDef = !given || !!warnTxt;
      const unit = P.unit !== undefined ? String(P.unit) : (useDef ? '₹ lakh' : '');
      const label = P.label ? String(P.label) : (useDef ? 'CTC offer' : 'value');
      let dec = 0, step = 1, dd = 2; const setDec = a => { dec = Math.min(3, Math.max(0, ...a.map(decOf))); step = Math.pow(10, -dec); dd = Math.min(4, dec + 2); };
      setDec(base);
      let vals = base.slice(), added = 0, d0 = 0, d1 = 1, sx, dots = [];
      let trim = Math.round(Math.max(0, Math.min(0.4, nv(P.trim, 0.2))) * 10) * 10;
      const st = frame(api, `Dot plot of ${pl(label)} with mean, median and mode`, n => [n ? 360 : 640, 214], () => rebuild());
      const gAx = W.s('g', null, st.svg), gLines = W.s('g', null, st.svg), gDots = W.s('g', null, st.svg), gLab = W.s('g', null, st.svg);
      const R0 = 7, T = 62, B = 166;
      const snap = v => +(Math.round(v / step) * step).toFixed(dec);
      const clampSnap = v => snap(Math.max(d0, Math.min(d1, v)));
      function domain() { const lo = minOf(vals), hi = maxOf(vals); let span = hi - lo; if (!(span > 0)) span = Math.max(1, Math.abs(hi) * 0.2); d0 = lo - 0.08 * span; d1 = hi + 0.08 * span; }
      function needRescale() { const lo = minOf(vals), hi = maxOf(vals), span = d1 - d0; return lo - d0 < 0.02 * span || d1 - hi < 0.02 * span || (hi - lo) < 0.5 * span; }
      const kstep = () => Math.max(step, snap(niceStep((d1 - d0) / 120)) || step);
      const tseg = api.seg([{ v: 0, label: 'off' }, { v: 10, label: '10%' }, { v: 20, label: '20%' }, { v: 40, label: '40%' }], trim, v => { trim = v; draw(); }); tseg.setAttribute('aria-label', 'Trimmed mean'); tseg.parentNode.insertBefore(W.el('span', { class: 'wx-segl' }, 'Trimmed mean:'), tseg);
      const bOut = api.button('Add an outlier', () => { if (added >= 3) return; const lo = minOf(vals), hi = maxOf(vals); vals.push(snap(hi + 2 * Math.max(hi - lo, step))); added++; if (added >= 3) bOut.disabled = true; rebuild(); }, true, api.controls);
      api.button('Reset', () => { vals = base.slice(); added = 0; bOut.disabled = false; rebuild(); }, false, api.controls);
      const roN = api.ro('n', 'n'), roM = api.ro('m', 'Mean'), roMd = api.ro('md', 'Median'), roMo = api.ro('mo', 'Mode'), roT = api.ro('t', 'Trimmed mean'), roX = api.ro('x', 'Excel');
      const cap = W.el('p', { class: 'wx-cap' }, `Drag any dot sideways (or Tab to it and use the arrow keys) to change one ${esc(label)}. Faded dots are the ones the trimmed mean leaves out.`); api.stage.appendChild(cap);
      const note = api.note(''); const warn = msgEl(api.foot); warn(warnTxt);
      editor(api, 'Use your own numbers', 'Type or paste numbers separated by commas, spaces or new lines (up to 400).', () => vals.join(', '), txt => {
        const r = parseNums(txt); if (r.vals.length < 2) return 'Please enter at least two numbers.';
        base = r.vals.slice(0, 400); setDec(base); vals = base.slice(); added = 0; bOut.disabled = false; rebuild();
        return (r.bad.length ? `Ignored ${r.bad.length} entr${r.bad.length > 1 ? 'ies' : 'y'} that ${r.bad.length > 1 ? 'are' : 'is'} not a number: ${r.bad.slice(0, 5).map(esc).join(', ')}.` : '') + (r.vals.length > 400 ? ' Only the first 400 values are used.' : '');
      });
      function rebuild(focusIdx) {
        domain(); W.clear(gAx); W.clear(gDots); const L = 20, R = st.w - 20; sx = W.scale(d0, d1, L, R);
        const ticks = W.nice(d0, d1, st.narrow ? 4 : 7).filter(t => t >= d0 && t <= d1);
        W.axisX(gAx, sx, B + 6, ticks, t => loc(t, 3), { x0: L, x1: R, label: unit ? `${label} (${unit})` : label });
        const r = vals.length > 120 ? 4.5 : R0;
        dots = vals.map((v, i) => {
          const g = W.s('g', { class: 'wx-dot', tabindex: 0, role: 'slider', 'aria-label': `${label} number ${i + 1}` }, gDots);
          const hit = W.s('circle', { r: Math.max(13, r + 6), class: 'wx-hit' }, g);
          const c = W.s('circle', { r, class: 'wx-ring', style: 'fill:var(--acc-deep);stroke:var(--surface);stroke-width:1.5' }, g);
          W.drag(st.svg, g, pt => { vals[i] = clampSnap(sx.inv(pt.x)); draw(); }, () => { if (needRescale()) rebuild(); });
          g.addEventListener('keydown', e => {
            let s = 0; if (e.key === 'ArrowRight' || e.key === 'ArrowUp') s = 1; else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') s = -1; else return;
            e.preventDefault(); vals[i] = clampSnap(vals[i] + s * kstep() * (e.shiftKey ? 10 : 1)); if (needRescale()) rebuild(i); else draw();
          });
          return { g, hit, c, r };
        });
        draw();
        if (focusIdx !== undefined && dots[focusIdx]) dots[focusIdx].g.focus();
      }
      function modeSngl(a) {
        const cnt = new Map(); a.forEach(v => cnt.set(v, (cnt.get(v) || 0) + 1)); let best = 1; cnt.forEach(c => { if (c > best) best = c; });
        if (best < 2) return { v: NaN, all: [], c: 1 }; const all = []; cnt.forEach((c, v) => { if (c === best) all.push(v); });
        return { v: a.find(v => cnt.get(v) === best), all: all.sort((x, y) => x - y), c: best };
      }
      function draw() {
        const n = vals.length, L = 20, R = st.w - 20; if (!n) return;
        const xs = vals.map(v => sx(v)), r = dots.length ? dots[0].r : R0, lev = stackLevels(xs, r), maxL = Math.max(...lev);
        const avail = B - T - 2 * r - 4; let sp = 2 * r + 1; if (maxL * sp > avail) sp = avail / Math.max(1, maxL);
        const order = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]), k = Math.floor(n * trim / 100 / 2 + 1e-9), out = new Set();
        if (trim) { order.slice(0, k).forEach(i => out.add(i)); order.slice(n - k).forEach(i => out.add(i)); }
        dots.forEach((d, i) => {
          const cy = B - r - 2 - lev[i] * sp; d.c.setAttribute('cx', xs[i]); d.c.setAttribute('cy', cy); d.hit.setAttribute('cx', xs[i]); d.hit.setAttribute('cy', cy);
          d.c.style.cssText = out.has(i) ? 'fill:var(--surface);stroke:var(--acc-deep);stroke-width:2;stroke-dasharray:2 2' : 'fill:var(--acc-deep);stroke:var(--surface);stroke-width:1.5';
          d.g.setAttribute('aria-valuenow', vals[i]); d.g.setAttribute('aria-valuetext', fu(vals[i], unit, dec + 1)); d.g.setAttribute('aria-valuemin', +d0.toFixed(4)); d.g.setAttribute('aria-valuemax', +d1.toFixed(4));
        });
        const mean = S.mean(vals), med = S.median(vals), mo = modeSngl(vals), tm = S.mean(vals.filter((v, i) => !out.has(i)));
        W.clear(gLines); W.clear(gLab);
        const items = [{ x: sx(mean), text: `mean ${loc(mean, dd)}`, col: C.c2, colf: C.c2f, dash: '', w: 2.6 }, { x: sx(med), text: `median ${loc(med, dd)}`, col: 'var(--acc-deep)', colf: 'var(--acc-fg)', dash: '7 4', w: 2.6 }];
        mo.all.slice(0, 3).forEach(m => items.push({ x: sx(m), text: `mode ${loc(m, dd)}`, col: C.c3, colf: C.c3f, dash: '2 3', w: 2.2 }));
        if (trim && k > 0) items.push({ x: sx(tm), text: `trimmed ${loc(tm, dd)}`, col: 'var(--muted)', colf: 'var(--muted)', dash: '9 3 2 3', w: 2 });
        placeLabels(items, 4, L, R, 6.4);
        items.forEach(it => { const y = 13 + it.row * 15; vline(gLines, it.x, y + 4, B + 2, `stroke:${it.col};stroke-width:${it.w};${it.dash ? 'stroke-dasharray:' + it.dash : ''}`); W.text(gLab, it.tx, y, it.text, `font-size:12px;font-weight:700;fill:${it.colf};paint-order:stroke;stroke:var(--surface);stroke-width:3px`); });
        const rgS = rg('A', n);
        roN(String(n)); roM(fu(mean, unit, dd)); roMd(fu(med, unit, dd));
        roMo(mo.all.length === 0 ? 'none (no value repeats) · Excel #N/A' : mo.all.length === 1 ? `${fu(mo.v, unit, dd)} (×${mo.c})` : `${mo.all.length} modes: ${mo.all.slice(0, 4).map(v => loc(v, dd)).join(', ')} · MODE.SNGL gives ${loc(mo.v, dd)}`);
        roT(trim ? (k > 0 ? `${fu(tm, unit, dd)} (drops ${k} at each end)` : `${fu(tm, unit, dd)} (n too small: nothing dropped at ${trim}%)`) : 'off');
        roX(`=AVERAGE(${rgS})  =MEDIAN(${rgS})  =MODE.SNGL(${rgS})` + (trim ? `  =TRIMMEAN(${rgS},${trim / 100})` : ''));
        const sd = n > 1 ? S.sdS(vals) : 0, rel = sd > 0 ? (mean - med) / sd : 0, L1 = esc(label);
        let h;
        if (Math.abs(rel) < 0.12) h = `Mean (${fu(mean, unit, dd)}) and median (${fu(med, unit, dd)}) almost agree: the ${pl(L1)} are roughly balanced, so the mean is an honest “average”.`;
        else if (rel > 0) h = `The mean (<b>${fu(mean, unit, dd)}</b>) sits above the median (<b>${fu(med, unit, dd)}</b>): a few high ${pl(L1)} pull it up. Half the values are at or below ${fu(med, unit, dd)}, so the <b>median</b> is the more honest “typical ${L1}”.`;
        else h = `The mean (<b>${fu(mean, unit, dd)}</b>) sits below the median (<b>${fu(med, unit, dd)}</b>): a few low ${pl(L1)} drag it down. The <b>median</b> is the more honest “typical ${L1}” here.`;
        if (trim && k > 0 && Math.abs(rel) >= 0.12) h += ` The ${trim}% trimmed mean (${fu(tm, unit, dd)}) ignores the extremes and lands in between.`;
        if (mo.all.length === 1 && mo.c >= 2) h += ` The most common value (mode) is ${fu(mo.v, unit, dd)}.`;
        note.innerHTML = h;
      }
      rebuild();
    }
  });

  // ======================= spread =======================
  // params: mean (default 30), unit ("minutes"), sdA (supplier A's SD, default mean/10), sdB (start value), labelA, labelB
  W.register('spread', {
    title: 'Same average, different spread',
    init(api, P, el) {
      P = P && typeof P === 'object' && !Array.isArray(P) ? P : {};
      style(); el.classList.add('wx'); const C = pal(el);
      let mean = nv(P.mean, 30); if (!(mean > 0)) mean = 30;
      const unit = P.unit !== undefined ? String(P.unit) : 'minutes', n = 40;
      const nmA = P.labelA ? String(P.labelA) : 'Supplier A', nmB = P.labelB ? String(P.labelB) : 'Supplier B';
      const stp = niceStep(mean / 300), dd = Math.min(3, decOf(stp) + 1);
      let sdA = nv(P.sdA, +(mean / 10).toPrecision(2)); if (!(sdA > 0)) sdA = +(mean / 10).toPrecision(2);
      const thr = +((mean * 4) / 3).toPrecision(2);
      let seed = 11, zA, zB, maxSD, sdB, d0, d1;
      function gen() {
        const r = S.rng(seed); const mk = () => { const z = []; for (let i = 0; i < n; i++) z.push(S.randn(r)); const m = S.mean(z), s = S.sdS(z); return z.map(v => (v - m) / s); };
        zA = mk(); zB = mk();
        maxSD = Math.max(stp * 5, Math.floor(0.92 * mean / Math.abs(minOf(zB)) / stp) * stp);
        sdA = Math.min(sdA, Math.floor(0.92 * mean / Math.abs(minOf(zA)) / stp) * stp || sdA);
        const lo = Math.min(mean + minOf(zB) * maxSD, mean + minOf(zA) * sdA), hi = Math.max(mean + maxOf(zB) * maxSD, mean + maxOf(zA) * sdA, thr);
        const pad = (hi - lo) * 0.04; d0 = Math.max(0, lo - pad); d1 = hi + pad;
      }
      gen(); sdB = Math.min(maxSD, nv(P.sdB, +(mean * 0.3).toPrecision(2)));
      const st = frame(api, 'Delivery times of two suppliers with the same mean', n2 => [n2 ? 360 : 640, 300], () => draw());
      const g = W.s('g', null, st.svg);
      const sl = api.slider({ label: `${esc(nmB)}’s standard deviation`, min: stp * 5, max: maxSD, step: stp, value: sdB, fmt: v => fu(v, unit, dd), onInput: v => { sdB = v; draw(); } });
      api.button('New sample', () => { seed = (seed * 7 + 13) % 99991; gen(); sl.input.max = maxSD; if (sdB > maxSD) sdB = maxSD; sl.set(sdB); draw(); }, false, api.controls);
      const cap = W.el('p', { class: 'wx-cap' }, `Each dot is one of ${n} deliveries; red rings missed the promise. Shaded band = mean ± 1 SD · thin line = range (min to max) · thick bar = IQR (middle 50%).`); api.stage.appendChild(cap);
      const tw = W.el('div', { class: 'wx-tw' }); api.readout.appendChild(tw); tw.style.flexBasis = '100%';
      const uu = unit ? ` (${esc(unit)})` : '', u2 = unit ? ` (${esc(unit)}²)` : '';
      const rows = [['Mean' + uu], ['Range' + uu], ['IQR, Q3 − Q1' + uu], ['Variance' + u2], ['Standard deviation' + uu], ['Coefficient of variation'], [`Late (over ${loc(thr, 2)})`]];
      const fx = [r => `=AVERAGE(${r})`, r => `=MAX(${r})-MIN(${r})`, r => `=QUARTILE.EXC(${r},3)-QUARTILE.EXC(${r},1)`, r => `=VAR.S(${r})`, r => `=STDEV.S(${r})`, r => `=STDEV.S(${r})/AVERAGE(${r})`, r => `=COUNTIF(${r},">${xn(thr)}")`];
      tw.innerHTML = `<table class="wx-t"><thead><tr><th>Measure <span style="font-weight:400">· Excel for column A</span></th><th style="width:22%">${esc(nmA)}</th><th style="width:22%">${esc(nmB)}</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${r[0]}<small>${brk(fx[i](rg('A', n)))}</small></td><td data-a="${i}"></td><td data-b="${i}"></td></tr>`).join('')}</tbody></table>`;
      const cellA = [...tw.querySelectorAll('[data-a]')], cellB = [...tw.querySelectorAll('[data-b]')];
      const note = api.note('');
      function stats(v) { return { mean: S.mean(v), range: S.range(v), iqr: S.quartileExc(v, 3) - S.quartileExc(v, 1), v: S.varS(v), sd: S.sdS(v), cv: S.sdS(v) / S.mean(v), late: v.filter(x => x > thr).length, min: minOf(v), max: maxOf(v), q1: S.quartileExc(v, 1), q3: S.quartileExc(v, 3) }; }
      function draw() {
        W.clear(g); const L = 16, R = st.w - 16, sx = W.scale(d0, d1, L, R), A = zA.map(z => mean + sdA * z), Bv = zB.map(z => mean + sdB * z);
        const sa = stats(A), sb = stats(Bv), axY = 262; el.wxData = { A, B: Bv };
        const ticks = W.nice(d0, d1, st.narrow ? 5 : 8).filter(t => t >= d0 && t <= d1);
        W.axisX(g, sx, axY, ticks, t => loc(t, 2), { x0: L, x1: R, label: unit });
        // mean and promise markers
        vline(g, sx(mean), 26, axY, 'stroke:var(--ink);stroke-width:1.6;stroke-dasharray:5 4');
        vline(g, sx(thr), 26, axY, 'stroke:var(--bad);stroke-width:1.6;stroke-dasharray:2 3');
        W.text(g, sx(mean), 18, `mean ${fu(mean, unit, dd)}`, 'font-size:12px;font-weight:700;fill:var(--ink)', 'end');
        W.text(g, sx(thr) + 4, 18, `promise ${loc(thr, 2)}`, 'font-size:12px;font-weight:700;fill:var(--bad)', 'start');
        [[A, sa, 'var(--acc-deep)', 'var(--acc-fg)', 34, nmA], [Bv, sb, C.c2, C.c2f, 148, nmB]].forEach(([v, s, col, colf, top, nm]) => {
          W.s('rect', { x: sx(s.mean - s.sd), y: top + 14, width: Math.max(1, sx(s.mean + s.sd) - sx(s.mean - s.sd)), height: 62, rx: 6, style: `fill:${col};opacity:.13` }, g);
          W.text(g, L, top + 8, `${nm} · SD ${fu(s.sd, unit, dd)}`, `font-size:13px;font-weight:700;fill:${colf}`, 'start');
          const r = st.narrow ? 4.2 : 3.8, xs = v.map(x => sx(x)), off = swarm(xs, r), mo = Math.max(1, ...off.map(Math.abs)); let sp = 2 * r + 0.3; if (mo * sp > 27) sp = 27 / mo;
          xs.forEach((x, i) => W.s('circle', { cx: x, cy: top + 42 + off[i] * sp, r, style: `fill:${col};stroke:var(--surface);stroke-width:1;${v[i] > thr ? 'stroke:var(--bad);stroke-width:2' : ''}` }, g));
          const yb = top + 86; W.s('line', { x1: sx(s.min), x2: sx(s.max), y1: yb, y2: yb, style: `stroke:${col};stroke-width:2` }, g);
          [s.min, s.max].forEach(x => vline(g, sx(x), yb - 5, yb + 5, `stroke:${col};stroke-width:2`));
          W.s('rect', { x: sx(s.q1), y: yb - 5, width: Math.max(2, sx(s.q3) - sx(s.q1)), height: 10, rx: 3, style: `fill:${col}` }, g);
        });
        const show = [s => loc(s.mean, dd), s => loc(s.range, dd), s => loc(s.iqr, dd), s => loc(s.v, dd + 1), s => loc(s.sd, dd), s => (s.cv * 100).toFixed(1) + '%', s => `${s.late} of ${n}`];
        show.forEach((f, i) => { cellA[i].textContent = f(sa); cellB[i].textContent = f(sb); });
        const ratio = sb.sd / sa.sd, b2 = (s) => `${fu(s.mean - 2 * s.sd, unit, 1)} to ${fu(s.mean + 2 * s.sd, unit, 1)}`;
        let h = `Both average <b>${fu(mean, unit, dd)}</b>. `;
        if (ratio > 1.1) h += `But ${esc(nmB)}’s SD is <b>${ratio.toFixed(1)}×</b> ${esc(nmA)}’s. For bell-shaped data about 95% of deliveries fall within mean ± 2 SD: ${b2(sa)} for ${esc(nmA)} versus <b>${b2(sb)}</b> for ${esc(nmB)}. ${esc(nmB)} missed the ${loc(thr, 2)} promise ${sb.late} time${sb.late === 1 ? '' : 's'} out of ${n}; ${esc(nmA)} ${sa.late}. Same average, very different reliability — plan around the spread, not just the mean.`;
        else if (ratio < 0.9) h += `Now ${esc(nmB)} is the <b>more consistent</b> supplier (SD ${fu(sb.sd, unit, dd)} vs ${fu(sa.sd, unit, dd)}; CV ${(sb.cv * 100).toFixed(1)}% vs ${(sa.cv * 100).toFixed(1)}%). Lower spread means fewer surprises when you plan.`;
        else h += `Their spreads are also about the same (SD ${fu(sa.sd, unit, dd)} vs ${fu(sb.sd, unit, dd)}), so on this evidence the two suppliers are equally reliable.`;
        note.innerHTML = h;
      }
      draw();
    }
  });

  // ======================= skew-shape =======================
  // params (optional): skew (−1…1 start), tails (−1 light … 1 heavy start)
  // A seeded symmetric normal sample is reshaped by a sinh-arcsinh tail transform (δ) and an exponential skew transform (g);
  // the tails slider sets δ directly; g is solved so that the sample's SKEW ≈ 1.3 × the skew slider.
  W.register('skew-shape', {
    title: 'Shape explorer: skewness and kurtosis',
    init(api, P, el) {
      P = P && typeof P === 'object' && !Array.isArray(P) ? P : {};
      style(); el.classList.add('wx'); const C = pal(el); const N = 2000, SC = 8;
      let s = Math.max(-1, Math.min(1, nv(P.skew, 0.6))), t = Math.max(-1, Math.min(1, nv(P.tails, 0))), seed = 5, AZ = [];
      function genZ() { const r = S.rng(seed); const Z = []; for (let i = 0; i < N / 2; i++) { const z = S.randn(r); Z.push(z, -z); } AZ = Z.map(Math.asinh); }
      genZ();
      function gen(g, d) { const n = AZ.length, b = new Array(n); let ss = 0; for (let i = 0; i < n; i++) { b[i] = Math.sinh(AZ[i] / d); ss += b[i] * b[i]; } const c = Math.sqrt(ss / (n - 1)); for (let i = 0; i < n; i++) { const x = b[i] / c; b[i] = g === 0 ? x : (Math.exp(g * x) - 1) / g; } return { Y: b, c }; }
      function mom(a) { const n = a.length; let m = 0; for (let i = 0; i < n; i++) m += a[i]; m /= n; let s2 = 0; for (let i = 0; i < n; i++) s2 += (a[i] - m) ** 2; const sd = Math.sqrt(s2 / (n - 1)); let s3 = 0, s4 = 0; for (let i = 0; i < n; i++) { const z = (a[i] - m) / sd; s3 += z * z * z; s4 += z * z * z * z; } return { s: n / ((n - 1) * (n - 2)) * s3, k: n * (n + 1) / ((n - 1) * (n - 2) * (n - 3)) * s4 - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3)) }; }
      function bis(f, lo, hi) { let flo = f(lo); for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2, fm = f(m); if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m; } return (lo + hi) / 2; }
      const delta = tt => tt <= 0 ? 1 + 1.4 * -tt : 1 / (1 + 0.5 * tt);
      function solve() { const sT = 1.3 * s, d = delta(t); return { d, g: Math.abs(sT) > 1e-9 ? bis(gg => mom(gen(gg, d).Y).s - sT, -0.9, 0.9) : 0 }; }
      const st = frame(api, 'Histogram of 2,000 generated values with mean, median and mode', n => [n ? 360 : 640, 290], () => draw());
      const g = W.s('g', null, st.svg);
      const words = v => Math.abs(v) < 0.05 ? 'none' : (v < 0 ? 'left ' : 'right ') + Math.abs(v).toFixed(2);
      const ss = api.slider({ label: 'Skew (← left · right →)', min: -1, max: 1, step: 0.05, value: s, fmt: words, onInput: v => { s = v; draw(); } });
      const stl = api.slider({ label: 'Tails (light ↔ heavy)', min: -1, max: 1, step: 0.05, value: t, fmt: v => v < -0.15 ? 'light' : v > 0.15 ? 'heavy' : 'normal-like', onInput: v => { t = v; draw(); } });
      const presets = [['Bell-shaped', 0, 0], ['Incomes (right tail)', 0.8, 0.2], ['Easy exam (left tail)', -0.6, -0.3], ['Flat, light tails', 0, -1], ['Fat tails (daily returns)', 0, 1]];
      presets.forEach(p => api.button(p[0], () => { s = p[1]; t = p[2]; ss.set(s); stl.set(t); draw(); }, false, api.controls));
      api.button('New sample', () => { seed = (seed * 31 + 7) % 99991; genZ(); draw(); }, false, api.controls);
      const roM = api.ro('m', 'Mean'), roMd = api.ro('md', 'Median'), roMo = api.ro('mo', 'Mode (peak)'), roS = api.ro('s', 'SKEW ≈'), roK = api.ro('k', 'KURT ≈'), roX = api.ro('x', 'Excel');
      const cap = W.el('p', { class: 'wx-cap' }, 'Bars: 2,000 generated values. Solid curve: their smooth shape. Dashed curve: a normal curve with the same mean and SD, for comparison.'); api.stage.appendChild(cap);
      const note = api.note('');
      function dens(dv, d, gg, c) {
        const y = (dv - 50) / SC; let x, jac; if (gg === 0) { x = y; jac = 1; } else { const u = 1 + gg * y; if (u <= 0) return 0; x = Math.log(u) / gg; jac = 1 / u; }
        const b = c * x, ab = Math.asinh(b), z = Math.sinh(d * ab); return S.normPdf(z) * d * Math.cosh(d * ab) / Math.sqrt(1 + b * b) * c * jac / SC;
      }
      function draw() {
        W.clear(g); const sol = solve(), d = sol.d, gg = Math.abs(sol.g) < 1e-6 ? 0 : sol.g, gn = gen(gg, d), c = gn.c, D = Array.from(gn.Y, y => 50 + SC * y);
        const L = 40, R = st.w - 14, T = 62, B = 240, lo = 0, hi = 100, nb = st.narrow ? 40 : 50, bw = (hi - lo) / nb;
        const cnt = new Array(nb).fill(0); let off = 0; D.forEach(v => { const k = Math.floor((v - lo) / bw); if (k >= 0 && k < nb) cnt[k]++; else off++; });
        const mean = S.mean(D), med = S.median(D), sd = S.sdS(D), sk = S.skew(D), ku = S.kurt(D); el.wxData = D;
        let mode = 50, best = -1; const curve = [];
        for (let i = 0; i <= 500; i++) { const x = lo + (hi - lo) * i / 500, f = dens(x, d, gg, c); curve.push([x, f]); if (f > best) { best = f; mode = x; } }
        const npk = S.normPdf(mean, mean, sd), ymax = Math.max(maxOf(cnt), N * bw * best, N * bw * npk) * 1.08;
        const sx = W.scale(lo, hi, L, R), sy = W.scale(0, ymax, B, T);
        W.axisY(g, sy, L, W.nice(0, ymax, 4).filter(v => v <= ymax), v => String(Math.round(v)), { grid: true, x1: R });
        cnt.forEach((v, k) => { if (v) W.s('rect', { x: sx(lo + k * bw) + 0.5, y: sy(v), width: Math.max(0.5, sx(lo + bw) - sx(lo) - 1), height: B - sy(v), style: 'fill:var(--acc-deep);opacity:.42' }, g); });
        let pd = '', pn = ''; curve.forEach(([x, f], i) => { pd += (i ? 'L' : 'M') + sx(x).toFixed(1) + ',' + sy(N * bw * f).toFixed(1); pn += (i ? 'L' : 'M') + sx(x).toFixed(1) + ',' + sy(N * bw * S.normPdf(x, mean, sd)).toFixed(1); });
        W.s('path', { d: pn, style: 'fill:none;stroke:var(--muted);stroke-width:1.6;stroke-dasharray:5 4' }, g);
        W.s('path', { d: pd, style: 'fill:none;stroke:var(--ink);stroke-width:2.2' }, g);
        W.axisX(g, sx, B, [0, 20, 40, 60, 80, 100], v => String(v), { x0: L, x1: R, label: 'value →' });
        const items = placeLabels([{ x: sx(mean), text: `mean ${mean.toFixed(1)}`, col: C.c2, colf: C.c2f, dash: '' }, { x: sx(med), text: `median ${med.toFixed(1)}`, col: 'var(--acc-deep)', colf: 'var(--acc-fg)', dash: '7 4' }, { x: sx(mode), text: `mode ${mode.toFixed(1)}`, col: C.c3, colf: C.c3f, dash: '2 3' }], 3, L, R, 6.4);
        items.forEach(it => { const y = 13 + it.row * 15; vline(g, it.x, y + 4, B, `stroke:${it.col};stroke-width:2.4;${it.dash ? 'stroke-dasharray:' + it.dash : ''}`); W.text(g, it.tx, y, it.text, `font-size:12px;font-weight:700;fill:${it.colf};paint-order:stroke;stroke:var(--surface);stroke-width:3px`); });
        if (off) W.text(g, R, T - 4, `${off} value${off > 1 ? 's' : ''} beyond the chart`, 'font-size:11px;fill:var(--muted)', 'end');
        roM(mean.toFixed(2)); roMd(med.toFixed(2)); roMo(mode.toFixed(1)); roS(mf(sk, 2)); roK(mf(ku, 2)); roX(`=SKEW(${rg('A', N)})  =KURT(${rg('A', N)})`);
        const a = Math.abs(sk), mag = a < 0.5 ? 'approximately symmetric' : a < 1 ? `moderately ${sk > 0 ? 'right' : 'left'}-skewed` : `highly ${sk > 0 ? 'right' : 'left'}-skewed`;
        let h = `Skewness <b>${mf(sk, 2)}</b>: ${mag}. `;
        if (a < 0.5) h += `Mean (${mean.toFixed(1)}) and median (${med.toFixed(1)}) nearly coincide, so the mean is a fair summary. `;
        else if (sk > 0) h += `The long right tail pulls the <b>mean (${mean.toFixed(1)}) above the median (${med.toFixed(1)})</b>, which sits above the peak (mode ${mode.toFixed(1)}) — like incomes or delivery delays. Report the median. `;
        else h += `The long left tail drags the <b>mean (${mean.toFixed(1)}) below the median (${med.toFixed(1)})</b>, which sits below the peak (mode ${mode.toFixed(1)}) — like scores on an easy exam. Report the median. `;
        h += ku < -0.5 ? `Kurtosis ${mf(ku, 2)} (below 0): light tails — flatter than a normal curve, few extremes.` : ku <= 0.5 ? `Kurtosis ${mf(ku, 2)}: tails about as heavy as a normal curve.` : `Kurtosis <b>${ku.toFixed(2)}</b> (above 0): heavy tails — more extreme values than a normal curve predicts${ku > 3 ? ', so “rare” shocks are not so rare' : ''}.`;
        if (ku > 0.5 && t <= 0.15 && a >= 0.5) h += ' (A skewed shape has one long tail, and that alone raises kurtosis.)';
        note.innerHTML = h;
      }
      draw();
    }
  });

  // ======================= histogram-bins =======================
  // params: data (array, required — falls back to the DJIA example), label, unit, start, width
  const DJIA = [61, 11, 25, 24, 12, 52, 38, 69, 20, 49, 27, 72, 14, 37, 24, 107, 16, 35, 56, 27, 59, 26, 22, 14, 53, 43, 56, 29, 51, 25];
  W.register('histogram-bins', {
    title: 'Histogram: choose the classes',
    init(api, P, el) {
      P = P && typeof P === 'object' && !Array.isArray(P) ? P : {};
      style(); el.classList.add('wx');
      const given = P.data !== undefined && P.data !== null; let data = nums(P.data), warnTxt = '';
      if (data.length < 2) { if (given) warnTxt = 'The data for this histogram could not be read, so the DJIA share-price example is shown.'; data = DJIA.slice(); }
      const useDef = !given || !!warnTxt;
      const unit = P.unit !== undefined ? String(P.unit) : (useDef ? '$' : ''), label = P.label ? String(P.label) : (useDef ? 'share price' : 'value');
      let mn, mx, isInt, opts, w, start, autoStart = P.start === undefined || P.start === null || !isFinite(+P.start), sel = -1, dd;
      function setup(keepW) {
        mn = minOf(data); mx = maxOf(data); isInt = data.every(Number.isInteger); dd = Math.min(3, Math.max(...data.map(decOf)));
        const span = (mx - mn) || Math.max(1, Math.abs(mx) * 0.2); opts = [];
        for (let e = Math.floor(Math.log10(span / 40)) - 1; e <= Math.ceil(Math.log10(span)) + 1; e++) [1, 2, 2.5, 5].forEach(m => { const v = +(m * Math.pow(10, e)).toPrecision(6); if (v >= span / 20 - 1e-9 && v <= span / 1.5 + 1e-9 && (!isInt || Number.isInteger(v))) opts.push(v); });
        const pw = keepW || nv(P.width, NaN); if (pw > 0 && !opts.includes(pw)) opts.push(pw);
        opts = [...new Set(opts)].sort((a, b) => a - b); if (!opts.length) opts = [isInt ? Math.max(1, Math.ceil(span / 5)) : span / 5];
        if (pw > 0) w = pw; else { const k = Math.max(2, Math.ceil(Math.log2(data.length))), w0 = span / k; w = opts.find(o => o >= w0 - 1e-9) || opts[opts.length - 1]; }
      }
      setup();
      const sstep = () => (!isInt || Number.isInteger(w / 10)) ? w / 10 : Number.isInteger(w / 5) ? w / 5 : Number.isInteger(w / 2) ? w / 2 : w;
      const autoS = () => +(Math.floor(mn / w + 1e-9) * w).toFixed(10);
      function validStart(s0) { return s0 <= mn + 1e-9 && s0 > mn - w + 1e-9; }
      start = autoStart ? autoS() : +P.start; if (!validStart(start)) { start = autoS(); autoStart = true; }
      const st = frame(api, `Histogram of ${label}`, n => [n ? 360 : 640, 262], () => draw());
      const g = W.s('g', null, st.svg);
      const sw = api.slider({ label: 'Class width', min: 0, max: opts.length - 1, step: 1, value: Math.max(0, opts.indexOf(w)), fmt: i => fu(opts[i] !== undefined ? opts[i] : w, unit, 4), onInput: i => { w = opts[i]; if (autoStart || !validStart(start)) { start = autoS(); autoStart = true; } syncStart(); sel = -1; draw(); } });
      const ss = api.slider({ label: 'Start of first class', min: 0, max: 1, step: 1, value: 0, fmt: v => fu(v, unit, 4), onInput: v => { start = +v.toFixed(10); autoStart = false; sel = -1; draw(); } });
      function syncStart() { const sp = sstep(); let first = Math.ceil((mn - w) / sp - 1e-9) * sp; if (first <= mn - w + 1e-9) first += sp; const last = Math.floor(mn / sp + 1e-9) * sp; ss.input.min = +first.toFixed(10); ss.input.max = +Math.max(first, last).toFixed(10); ss.input.step = +sp.toFixed(10); ss.set(start); ss.el.querySelector('output').textContent = fu(start, unit, 4); }
      syncStart();
      const roK = api.ro('k', 'Classes'), roRule = roH(api, 'Rule 2<sup>k</sup> ≥ n'), roX = api.ro('x', 'Excel'), roBins = roH(api, 'Histogram-tool bins (upper limits)');
      const cap = W.el('p', { class: 'wx-cap' }, 'Tap a bar (or a table row) to see its Excel formula. Each class includes its lower limit and stops just below the next class.'); api.stage.appendChild(cap);
      const tw = W.el('div', { class: 'wx-tw', style: 'margin-top:.7rem' }); api.foot.appendChild(tw);
      const note = api.note(''); const warn = msgEl(api.foot); warn(warnTxt);
      editor(api, 'Use your own numbers', 'Type or paste numbers separated by commas, spaces or new lines (up to 2,000).', () => data.join(', '), txt => {
        const r = parseNums(txt); if (r.vals.length < 2) return 'Please enter at least two numbers.';
        data = r.vals.slice(0, 2000); setup(); sw.input.max = opts.length - 1; sw.set(opts.indexOf(w)); start = autoS(); autoStart = true; syncStart(); sel = -1; draw();
        return r.bad.length ? `Ignored ${r.bad.length} entr${r.bad.length > 1 ? 'ies' : 'y'} that ${r.bad.length > 1 ? 'are' : 'is'} not a number: ${r.bad.slice(0, 5).map(esc).join(', ')}.` : '';
      });
      const intMode = () => isInt && Number.isInteger(w) && Number.isInteger(start);
      const clsLabel = (lo, hi) => intMode() ? (w === 1 ? String(lo) : `${loc(lo, 0)}–${loc(hi - 1, 0)}`) : `${loc(lo, 4)} to <${loc(hi, 4)}`;
      function draw() {
        W.clear(g); const n = data.length, k = Math.floor((mx - start) / w + 1e-9) + 1, cls = [];
        for (let i = 0; i < k; i++) { const lo = +(start + i * w).toFixed(10), hi = +(start + (i + 1) * w).toFixed(10); cls.push({ lo, hi, f: data.filter(v => v >= lo - 1e-9 && v < hi - 1e-9).length }); }
        let cum = 0; cls.forEach(c => { cum += c.f; c.cum = cum; });
        const fmax = Math.max(1, ...cls.map(c => c.f)); if (sel >= k) sel = -1; const shown = sel >= 0 ? sel : cls.findIndex(c => c.f === fmax);
        const L = 40, R = st.w - 12, T = 18, B = 206, sx = W.scale(start, start + k * w, L, R), sy = W.scale(0, fmax * 1.12, B, T), bwpx = (R - L) / k;
        W.axisY(g, sy, L, W.nice(0, fmax * 1.08, 4).filter(v => Number.isInteger(v) && v <= fmax * 1.12), v => String(v), { grid: true, x1: R, label: 'frequency', y0: T + 2 });
        cls.forEach((c, i) => {
          const gg = W.s('g', { class: 'wx-pick', tabindex: 0, role: 'button', 'aria-label': `Class ${clsLabel(c.lo, c.hi)}: frequency ${c.f}` }, g);
          W.s('rect', { x: sx(c.lo), y: T, width: bwpx, height: B - T, style: 'fill:transparent' }, gg);
          if (c.f) W.s('rect', { class: 'wx-fb', x: sx(c.lo) + 0.5, y: sy(c.f), width: Math.max(1, bwpx - 1), height: B - sy(c.f), style: `fill:var(--acc-deep);opacity:${i === shown ? 1 : 0.62};stroke:var(--surface);stroke-width:1` }, gg);
          if (bwpx > 13) W.text(gg, sx(c.lo) + bwpx / 2, sy(c.f) - 5, String(c.f), `font-size:12px;font-weight:${i === shown ? 700 : 400};fill:var(--ink-2)`);
          const pick = () => { sel = i; draw(); }; gg.addEventListener('click', pick); gg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
        });
        W.s('line', { x1: L, x2: R, y1: B, y2: B, style: 'stroke:var(--line-2);stroke-width:1.2' }, g);
        const lbls = cls.map(c => clsLabel(c.lo, c.hi)), fitC = lbls.every(s => s.length * 6.4 + 6 < bwpx);
        if (fitC) lbls.forEach((s, i) => W.text(g, sx(cls[i].lo) + bwpx / 2, B + 16, s, 'font-size:11.5px;fill:var(--muted)'));
        else { const every = Math.ceil((k + 1) / Math.max(2, Math.floor((R - L) / 44))); for (let i = 0; i <= k; i += every) { const x = sx(start + i * w); vline(g, x, B, B + 4, 'stroke:var(--line-2)'); W.text(g, x, B + 16, loc(start + i * w, 4), 'font-size:11.5px;fill:var(--muted)'); } }
        W.text(g, R, B + 34, unit ? `${label} (${unit})` : label, 'font-size:12px;fill:var(--muted);font-weight:700', 'end');
        // table
        tw.innerHTML = `<table class="wx-t"><thead><tr><th>Class${unit ? ` (${esc(unit)})` : ''}</th><th>Frequency</th><th>Relative freq.</th><th>Cumulative freq.</th></tr></thead><tbody>${cls.map((c, i) => `<tr class="pick${i === shown ? ' sel' : ''}" tabindex="0" data-i="${i}"><td>${clsLabel(c.lo, c.hi)}</td><td>${c.f}</td><td>${(c.f / n).toFixed(3)}</td><td>${c.cum}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td>${n}</td><td>1.000</td><td></td></tr></tbody></table>`;
        tw.querySelectorAll('tr.pick').forEach(tr => { const f = () => { sel = +tr.dataset.i; draw(); const t2 = tw.querySelector(`tr[data-i="${sel}"]`); if (t2) t2.focus(); }; tr.addEventListener('click', f); tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }); });
        const ks = Math.max(1, Math.ceil(Math.log2(n) - 1e-9)), c0 = cls[shown], r = rg('A', n);
        roK(`${k} (width ${fu(w, unit, 4)})`);
        roRule(`k = ${ks} classes for n = ${n} → width ≈ ${loc((mx - mn) / ks, 2)}`);
        roX(`=COUNTIFS(${r},">=${xn(c0.lo)}",${r},"<${xn(c0.hi)}")  → ${c0.f}`);
        if (intMode()) { roBins.el.hidden = false; const ub = cls.map(c => c.hi - 1); roBins(ub.slice(0, 8).join(', ') + (ub.length > 8 ? ', …' : '')); } else roBins.el.hidden = true;
        const sk = n > 2 ? S.skew(data) : 0, L1 = esc(label);
        let h = `The tallest class is <b>${clsLabel(c0.lo, c0.hi)}</b> with ${c0.f} of ${n} ${pl(L1)} (${(c0.f / n * 100).toFixed(0)}%). `;
        if (sel >= 0 && c0.f !== fmax) h = `Class <b>${clsLabel(c0.lo, c0.hi)}</b> holds ${c0.f} of ${n} ${pl(L1)} (${(c0.f / n * 100).toFixed(0)}%); ${c0.cum} (${(c0.cum / n * 100).toFixed(0)}%) are below ${fu(c0.hi, unit, 4)}. `;
        h += Math.abs(sk) < 0.5 ? 'The shape is roughly symmetric. ' : sk > 0 ? `The shape is <b>right-skewed</b> (skewness ${sk.toFixed(2)}): most values are low, with a long tail of high ones${useDef ? ' (IBM at $107)' : ''}. ` : `The shape is <b>left-skewed</b> (skewness ${mf(sk, 2)}): a tail of low values. `;
        const empty = cls.filter(c => !c.f).length;
        h += k < 4 ? 'With so few classes the shape is hidden — try a narrower width.' : (k > 12 || empty > k / 3) ? `With ${k} classes${empty ? ` (${empty} empty)` : ''} the picture gets jagged — try a wider width.` : `${k} classes is a sensible choice (aim for about 5–15; the 2<sup>k</sup> ≥ n rule suggests ${ks}).`;
        note.innerHTML = h;
      }
      draw();
    }
  });

  // ======================= boxplot =======================
  // params: data (array) or groups ({"NE":[…],…}), label, unit, method ("exc"/"inc")
  W.register('boxplot', {
    title: 'Box plot and five-number summary',
    init(api, P, el) {
      P = P && typeof P === 'object' && !Array.isArray(P) ? P : {};
      style(); el.classList.add('wx'); const C = pal(el);
      let groups = [], warnTxt = '';
      const skipped = []; if (P.groups && typeof P.groups === 'object' && !Array.isArray(P.groups)) Object.keys(P.groups).slice(0, 8).forEach(k => { const v = nums(P.groups[k]); if (v.length) groups.push({ name: String(k), vals: v }); else skipped.push(esc(k)); });
      if (skipped.length && groups.length) warnTxt = `Group${skipped.length > 1 ? 's' : ''} ${skipped.join(', ')} had no numbers and ${skipped.length > 1 ? 'were' : 'was'} left out.`;
      if (!groups.length && P.data !== undefined) { const v = nums(P.data); if (v.length) groups.push({ name: '', vals: v }); }
      const given = P.groups !== undefined || P.data !== undefined;
      let fell = false; if (!groups.length) { fell = true; if (given) warnTxt = 'The data for this box plot could not be read, so an example is shown.'; groups = [{ name: '', vals: [2.5, 3, 3.5, 4, 4, 4.5, 5, 5.5, 6, 6, 7, 7.5, 8, 9, 21] }]; }
      const useDef = !given || fell;
      const unit = P.unit !== undefined ? String(P.unit) : (useDef ? 'hours' : ''), label = P.label ? String(P.label) : (useDef ? 'complaint resolution time' : 'value');
      let method = P.method === 'inc' ? 'inc' : 'exc', fences = false, sel = 0, dd = 2;
      const st = frame(api, `Box plot of ${label}`, n => [n ? 360 : 640, 200], () => draw());
      const g = W.s('g', null, st.svg);
      api.seg([{ v: 'exc', label: 'QUARTILE.EXC (default)' }, { v: 'inc', label: 'QUARTILE.INC' }], method, v => { method = v; draw(); });
      const bF = api.button('Show fences', () => { fences = !fences; bF.setAttribute('aria-pressed', fences); bF.textContent = fences ? 'Hide fences' : 'Show fences'; draw(); }, false, api.controls); bF.setAttribute('aria-pressed', 'false');
      const ta = W.el('textarea', { class: 'w-input', rows: 3, spellcheck: 'false', 'aria-label': 'Data values' });
      const lab = W.el('label', { class: 'ctl', style: 'grid-column:1/-1;display:block' }, `<span>Data — edit freely (one group per line as <code>Name: 1, 2, 3</code>)</span>`); lab.appendChild(ta); api.controls.appendChild(lab);
      const toText = () => groups.map(gr => (gr.name ? gr.name + ': ' : '') + gr.vals.join(', ')).join('\n');
      ta.value = toText(); ta.rows = Math.min(8, Math.max(2, groups.length + 1));
      const cap = W.el('p', { class: 'wx-cap' }, `Box = middle 50% (Q1 to Q3), thick line = median, <span style="color:${C.c2f};font-weight:700">×</span> = mean, whiskers reach the furthest values inside the fences (Q1 − 1.5·IQR, Q3 + 1.5·IQR); red dots are outliers.`); api.stage.appendChild(cap);
      const tw = W.el('div', { class: 'wx-tw' }); tw.style.flexBasis = '100%'; api.readout.appendChild(tw);
      const roX = roH(api, 'Excel'); const note = api.note(''); const warn = msgEl(api.foot); warn(warnTxt);
      let tmr; ta.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(parseTA, 350); });
      function parseTA() {
        const lines = ta.value.split(/\n/).map(s => s.trim()).filter(Boolean), hasColon = lines.some(l => l.includes(':')), out = [], bad = [];
        if (hasColon) lines.forEach((l, i) => { const j = l.indexOf(':'), nm = j >= 0 ? l.slice(0, j).trim() || `Group ${i + 1}` : `Group ${i + 1}`, r = parseNums(j >= 0 ? l.slice(j + 1) : l); bad.push(...r.bad); if (r.vals.length) out.push({ name: nm.slice(0, 24), vals: r.vals.slice(0, 2000) }); });
        else { const r = parseNums(lines.join(' ')); bad.push(...r.bad); if (r.vals.length) out.push({ name: '', vals: r.vals.slice(0, 2000) }); }
        if (!out.length) { warn('Enter at least one number to draw a box plot.'); return; }
        let m = bad.length ? `Ignored ${bad.length} entr${bad.length > 1 ? 'ies' : 'y'} that ${bad.length > 1 ? 'are' : 'is'} not a number: ${bad.slice(0, 5).map(esc).join(', ')}.` : '';
        if (out.length > 8) { m += ' Only the first 8 groups are shown.'; out.length = 8; }
        warn(m); groups = out; if (sel >= groups.length) sel = 0; draw();
      }
      function summ(v) {
        const s = S.sorted(v), n = s.length, q = method === 'exc' ? S.quartileExc : S.quartileInc, q1 = q(s, 1), q3 = q(s, 3), med = S.median(s), mean = S.mean(s);
        const ok = isFinite(q1) && isFinite(q3), iqr = q3 - q1, lf = q1 - 1.5 * iqr, uf = q3 + 1.5 * iqr;
        const inside = ok ? s.filter(x => x >= lf - 1e-12 && x <= uf + 1e-12) : s, outl = ok ? s.filter(x => x < lf - 1e-12 || x > uf + 1e-12) : [];
        return { s, n, min: s[0], max: s[n - 1], q1, q3, med, mean, ok, iqr, lf, uf, wlo: inside.length ? inside[0] : s[0], whi: inside.length ? inside[inside.length - 1] : s[n - 1], outl };
      }
      function draw() {
        W.clear(g); const single = groups.length === 1 && !groups[0].name, sm = groups.map(gr => summ(gr.vals));
        dd = Math.min(4, Math.max(...groups.map(gr => Math.max(...gr.vals.map(decOf)))) + 3);
        const nameW = single ? 0 : Math.min(st.narrow ? 70 : 110, 10 + Math.max(...groups.map(gr => gr.name.length)) * 7.2);
        const L = 14 + nameW, R = st.w - 18, rowH = single ? 104 : 54, T = 10, axY = T + groups.length * rowH + 4;
        let lo = Math.min(...sm.map(x => x.min)), hi = Math.max(...sm.map(x => x.max));
        if (fences) sm.forEach(x => { if (x.ok) { lo = Math.min(lo, x.lf); hi = Math.max(hi, x.uf); } });
        let span = hi - lo; if (!(span > 0)) span = Math.max(1, Math.abs(hi) * 0.2); const d0 = lo - span * 0.05, d1 = hi + span * 0.05, sx = W.scale(d0, d1, L, R);
        st.setH(axY + 42);
        W.axisX(g, sx, axY, W.nice(d0, d1, st.narrow ? 4 : 7).filter(t => t >= d0 && t <= d1), t => loc(t, 3), { x0: L, x1: R, label: unit ? `${label} (${unit})` : label });
        sm.forEach((m, i) => {
          const mid = T + i * rowH + (single ? 40 : rowH / 2), bh = single ? 22 : 14, gr = groups[i];
          const gg = W.s('g', single ? null : { class: 'wx-pick', tabindex: 0, role: 'button', 'aria-label': `Select ${gr.name}`, 'aria-pressed': i === sel }, g);
          if (!single) { W.s('rect', { x: 4, y: mid - rowH / 2 + 2, width: st.w - 8, height: rowH - 4, rx: 8, style: i === sel ? 'fill:var(--acc-bg)' : 'fill:transparent' }, gg); W.text(gg, 10, mid + 4, gr.name, `font-size:13px;font-weight:700;fill:${i === sel ? 'var(--acc-fg)' : 'var(--ink-2)'}`, 'start'); const pick = () => { sel = i; draw(); }; gg.addEventListener('click', pick); gg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }); }
          if (!m.ok) { m.s.forEach(x => W.s('circle', { cx: sx(x), cy: mid, r: 4.5, style: 'fill:var(--acc-deep)' }, gg)); W.text(gg, single ? (L + R) / 2 : L + 6, mid - bh - 4, 'QUARTILE.EXC needs at least 3 values (#NUM!)', 'font-size:11.5px;fill:var(--bad)', single ? 'middle' : 'start'); return; }
          const col = 'var(--acc-deep)';
          W.s('line', { x1: sx(m.wlo), x2: sx(m.q1), y1: mid, y2: mid, style: `stroke:${col};stroke-width:2` }, gg); W.s('line', { x1: sx(m.q3), x2: sx(m.whi), y1: mid, y2: mid, style: `stroke:${col};stroke-width:2` }, gg);
          [m.wlo, m.whi].forEach(x => vline(gg, sx(x), mid - bh * 0.6, mid + bh * 0.6, `stroke:${col};stroke-width:2`));
          W.s('rect', { class: 'wx-fb', x: sx(m.q1), y: mid - bh, width: Math.max(1.5, sx(m.q3) - sx(m.q1)), height: 2 * bh, rx: 3, style: `fill:${col};fill-opacity:.2;stroke:${col};stroke-width:${i === sel && !single ? 2.6 : 2}` }, gg);
          vline(gg, sx(m.med), mid - bh, mid + bh, 'stroke:var(--ink);stroke-width:3.2');
          const mx0 = sx(m.mean); W.s('path', { d: `M${mx0 - 5},${mid - 5}L${mx0 + 5},${mid + 5}M${mx0 - 5},${mid + 5}L${mx0 + 5},${mid - 5}`, style: `stroke:${C.c2};stroke-width:2.4` }, gg);
          if (fences) [m.lf, m.uf].forEach(x => { vline(gg, sx(x), mid - bh - 6, mid + bh + 6, 'stroke:var(--bad);stroke-width:1.5;stroke-dasharray:3 3;opacity:.8'); });
          m.outl.forEach((x, j) => { W.s('circle', { cx: sx(x), cy: mid, r: 5, style: 'fill:var(--bad);stroke:var(--surface);stroke-width:1.2' }, gg); W.text(gg, sx(x), j % 2 ? mid + bh + 12 : mid - bh - 5, loc(x, dd), 'font-size:11px;font-weight:700;fill:var(--bad)'); });
          if (single) {
            const its = placeLabels([['min', m.min], ['Q1', m.q1], ['median', m.med], ['Q3', m.q3], ['max', m.max]].map(([nm, v]) => ({ x: sx(v), text: `${nm} ${loc(v, dd)}` })), 3, L, R, 6.2);
            its.forEach(it => { const y = mid + bh + 20 + it.row * 14; W.text(gg, it.tx, y, it.text, 'font-size:11.5px;fill:var(--ink-2)'); });
            if (fences) { W.text(gg, sx(m.lf), mid - bh - 10, 'lower fence', 'font-size:10.5px;fill:var(--bad)'); W.text(gg, sx(m.uf), mid - bh - 10, 'upper fence', 'font-size:10.5px;fill:var(--bad)'); }
          }
        });
        // table: statistics × groups
        const fn = method === 'exc' ? 'QUARTILE.EXC' : 'QUARTILE.INC', r0 = sm[sel] || sm[0], rr = rg('A', r0.n), u = v => loc(v, dd);
        const rowsT = [['n', m => String(m.n), r => `=COUNT(${r})`], ['Minimum', m => u(m.min), r => `=MIN(${r})`], ['Q1', m => m.ok ? u(m.q1) : '#NUM!', r => `=${fn}(${r},1)`], ['Median', m => u(m.med), r => `=MEDIAN(${r})`], ['Q3', m => m.ok ? u(m.q3) : '#NUM!', r => `=${fn}(${r},3)`], ['Maximum', m => u(m.max), r => `=MAX(${r})`], ['IQR', m => m.ok ? u(m.iqr) : '—', () => 'Q3 − Q1'], ['Lower fence', m => m.ok ? u(m.lf) : '—', () => 'Q1 − 1.5×IQR'], ['Upper fence', m => m.ok ? u(m.uf) : '—', () => 'Q3 + 1.5×IQR'], ['Outliers', m => m.outl.length ? m.outl.map(u).join(', ') : 'none', () => 'beyond the fences'], ['Mean', m => u(m.mean), r => `=AVERAGE(${r})`]];
        if (single) tw.innerHTML = `<table class="wx-t"><thead><tr><th>Statistic</th><th>Value${unit ? ` (${esc(unit)})` : ''}</th><th style="text-align:left">Excel (data in ${rr})</th></tr></thead><tbody>${rowsT.map(rw => `<tr><td>${rw[0]}</td><td>${rw[1](sm[0])}</td><td class="fx">${brk(rw[2](rr))}</td></tr>`).join('')}</tbody></table>`;
        else tw.innerHTML = `<table class="wx-t"><thead><tr><th>Statistic</th>${groups.map((gr, i) => `<th class="${i === sel ? 'sel' : ''}">${esc(gr.name)}</th>`).join('')}</tr></thead><tbody>${rowsT.map(rw => `<tr><td>${rw[0]}</td>${sm.map((m, i) => `<td class="${i === sel ? 'sel' : ''}">${rw[1](m)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        roX.el.hidden = single; roX(single ? '' : `${esc(groups[sel].name)} in ${rr}: <code class="xl">=${fn}(${rr},1)</code> <code class="xl">=MEDIAN(${rr})</code> <code class="xl">=${fn}(${rr},3)</code>`);
        // note
        const L1 = esc(label); let h;
        if (single) {
          const m = sm[0];
          if (!m.ok) h = `QUARTILE.EXC cannot find quartiles for fewer than 3 values (Excel shows #NUM!). Add more data or switch to QUARTILE.INC.`;
          else {
            h = `The middle 50% of ${pl(L1)} lie between <b>${fu(m.q1, unit, dd)}</b> and <b>${fu(m.q3, unit, dd)}</b> (IQR ${fu(m.iqr, unit, dd)}); the median is ${fu(m.med, unit, dd)}. `;
            h += m.outl.length ? `<b>${m.outl.length} outlier${m.outl.length > 1 ? 's' : ''}</b> beyond the fences (${fu(m.lf, unit, dd)} to ${fu(m.uf, unit, dd)}): ${m.outl.map(v => fu(v, unit, dd)).join(', ')}. Check ${m.outl.length > 1 ? 'them' : 'it'} — data error, or a genuine case that needs attention?` : `No value lies beyond the fences (${fu(m.lf, unit, dd)} to ${fu(m.uf, unit, dd)}), so there are no outliers. `;
            const q = method === 'exc' ? S.quartileInc : S.quartileExc, a1 = q(m.s, 1), a3 = q(m.s, 3);
            if (isFinite(a1) && (Math.abs(a1 - m.q1) > 1e-9 || Math.abs(a3 - m.q3) > 1e-9)) h += ` (With ${method === 'exc' ? 'QUARTILE.INC' : 'QUARTILE.EXC'}: Q1 = ${loc(a1, dd)}, Q3 = ${loc(a3, dd)} — the two methods differ a little for small samples.)`;
          }
        } else {
          const okm = sm.map((m, i) => ({ m, i })).filter(o => o.m.n);
          const hiM = okm.reduce((a, b) => b.m.med > a.m.med ? b : a), loM = okm.reduce((a, b) => b.m.med < a.m.med ? b : a), wide = okm.filter(o => o.m.ok).reduce((a, b) => (b.m.iqr > a.m.iqr ? b : a), okm[0]);
          h = `Highest median: <b>${esc(groups[hiM.i].name)}</b> (${fu(hiM.m.med, unit, dd)}); lowest: <b>${esc(groups[loM.i].name)}</b> (${fu(loM.m.med, unit, dd)}). `;
          if (hiM.m.ok && loM.m.ok && hiM.i !== loM.i) h += hiM.m.q1 > loM.m.q3 ? `${esc(groups[hiM.i].name)}’s whole box sits above ${esc(groups[loM.i].name)}’s — a clear difference between the groups. ` : `Their boxes overlap, so the difference is less clear-cut. `;
          if (wide.m.ok) h += `Most spread out (largest IQR): ${esc(groups[wide.i].name)} (${fu(wide.m.iqr, unit, dd)}). `;
          const allO = []; sm.forEach((m, i) => m.outl.forEach(v => allO.push(`${esc(groups[i].name)} ${loc(v, dd)}`)));
          h += allO.length ? `Outliers: ${allO.join('; ')}.` : 'No outliers in any group.';
        }
        note.innerHTML = h;
      }
      draw();
    }
  });

  // ======================= zscore =======================
  // params: mean, sd, x, unit, label
  W.register('zscore', {
    title: 'z-score and the empirical rule',
    init(api, P, el) {
      P = P && typeof P === 'object' && !Array.isArray(P) ? P : {};
      style(); el.classList.add('wx'); const C = pal(el);
      const useDef = P.mean === undefined && P.sd === undefined;
      let mean = nv(P.mean, 12), sd = nv(P.sd, 2.5), warnTxt = '';
      if (P.mean !== undefined && nv(P.mean, NaN) !== nv(P.mean, NaN)) warnTxt += 'The mean given is not a number, so 12 is used. ';
      if (!(sd > 0)) { warnTxt += 'The standard deviation must be greater than 0, so a placeholder is used — type your own below. '; sd = useDef ? 2.5 : +Math.max(1, Math.abs(mean) * 0.1).toPrecision(3); }
      let x = nv(P.x, useDef ? 17 : mean + 1.5 * sd);
      const unit = P.unit !== undefined ? String(P.unit) : (useDef ? '₹ lakh' : ''), label = P.label ? String(P.label) : (useDef ? 'monthly sales of an executive' : 'value');
      const st = frame(api, 'Number line with mean and standard-deviation bands', n => [n ? 360 : 640, 254], () => draw());
      const gB = W.s('g', null, st.svg), gH = W.s('g', null, st.svg);
      const hLine = W.s('line', { style: 'stroke:var(--ink);stroke-width:2.4' }, gH);
      const hG = W.s('g', { class: 'wx-dot', tabindex: 0, role: 'slider', 'aria-label': `x (${label})` }, gH);
      const hHit = W.s('circle', { r: 20, class: 'wx-hit' }, hG), hC = W.s('circle', { r: 10, class: 'wx-ring', style: 'fill:var(--ink);stroke:var(--surface);stroke-width:2.5' }, hG);
      const hT = W.s('text', { 'text-anchor': 'middle', style: 'font-size:13px;font-weight:700;fill:var(--ink);paint-order:stroke;stroke:var(--surface);stroke-width:4px' }, gH);
      let sx = W.scale(0, 1, 0, 1);
      const dec = Math.min(3, Math.max(decOf(mean), decOf(sd), decOf(x), sd < 1 ? 2 : 1)), stepX = +(Math.pow(10, -dec)).toFixed(dec);
      const nm = api.number({ label: 'Mean', value: mean, onInput: v => { mean = v; resetX(); draw(); } }), ns = api.number({ label: 'Standard deviation', value: sd, min: 0, onInput: v => { if (v > 0) { warn(''); sd = v; resetX(); draw(); } else warn('The standard deviation must be greater than 0.'); } });
      const sl = api.slider({ label: `x (${esc(label)})`, min: mean - 4 * sd, max: mean + 4 * sd, step: stepX, value: x, fmt: v => fu(v, unit, dec), onInput: v => { x = v; draw(); } });
      function resetX() { sl.input.min = mean - 4 * sd; sl.input.max = mean + 4 * sd; x = Math.max(mean - 4 * sd, Math.min(mean + 4 * sd, x)); sl.set(x); }
      W.drag(st.svg, hG, pt => { x = +(Math.round(Math.max(mean - 4 * sd, Math.min(mean + 4 * sd, sx.inv(pt.x))) / stepX) * stepX).toFixed(dec); sl.set(x); draw(); });
      hG.addEventListener('keydown', e => { let s = 0; if (e.key === 'ArrowRight' || e.key === 'ArrowUp') s = 1; else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') s = -1; else return; e.preventDefault(); x = Math.max(mean - 4 * sd, Math.min(mean + 4 * sd, +(x + s * (e.shiftKey ? sd / 2 : sd / 20)).toFixed(dec + 1))); sl.set(x); draw(); });
      const roZ = api.ro('z', 'z'), roX = api.ro('x', 'Excel'), roE = api.ro('e', 'Within ±|z| SD if bell-shaped'), roC = api.ro('c', 'Chebyshev (any shape)'), roP = api.ro('p', 'Percentile if bell-shaped');
      const note = api.note(''); const warn = msgEl(api.foot); warn(warnTxt.trim());
      function draw() {
        W.clear(gB); const L = 18, R = st.w - 18, AY = 170, top = 30; sx = W.scale(mean - 4 * sd, mean + 4 * sd, L, R);
        // bands ±3, ±2, ±1
        [[3, 0.12, '99.7%'], [2, 0.2, '95%'], [1, 0.32, '68%']].forEach(([k, o, t]) => { W.s('rect', { x: sx(mean - k * sd), y: AY + 40, width: sx(mean + k * sd) - sx(mean - k * sd), height: 16, style: `fill:var(--acc-deep);opacity:${o}` }, gB); W.text(gB, sx(mean + (k - 0.5) * sd), AY + 52, t, 'font-size:10.5px;font-weight:700;fill:var(--acc-fg)'); });
        // bell curve with the ±|z| area shaded
        const z = (x - mean) / sd, zs = z.toFixed(2).replace('-', '−'), az = Math.min(4, Math.abs(z)), pk = S.normPdf(0), sy = v => AY - 4 - (v / pk) * (AY - top - 22);
        let d = '', a = ''; for (let i = 0; i <= 160; i++) { const t = -4 + 8 * i / 160, X = sx(mean + t * sd), Y = sy(S.normPdf(t)); d += (i ? 'L' : 'M') + X.toFixed(1) + ',' + Y.toFixed(1); }
        for (let i = 0; i <= 80; i++) { const t = -az + 2 * az * i / 80; a += (i ? 'L' : 'M') + sx(mean + t * sd).toFixed(1) + ',' + sy(S.normPdf(t)).toFixed(1); }
        if (az > 0.01) W.s('path', { d: a + `L${sx(mean + az * sd).toFixed(1)},${AY}L${sx(mean - az * sd).toFixed(1)},${AY}Z`, style: 'fill:var(--acc-deep);opacity:.32' }, gB);
        W.s('path', { d, style: 'fill:none;stroke:var(--acc-deep);stroke-width:1.8' }, gB);
        W.s('line', { x1: L, x2: R, y1: AY, y2: AY, style: 'stroke:var(--line-2);stroke-width:1.4' }, gB);
        for (let k = -3; k <= 3; k++) { const X = sx(mean + k * sd); vline(gB, X, AY, AY + 6, 'stroke:var(--line-2)'); W.text(gB, X, AY + 20, loc(mean + k * sd, dec), `font-size:${st.narrow ? 11 : 12}px;fill:var(--ink-2)`); W.text(gB, X, AY + 36, k === 0 ? 'mean' : `${k > 0 ? '+' : '−'}${Math.abs(k)} SD`, `font-size:11px;fill:${k === 0 ? 'var(--acc-fg)' : 'var(--muted)'};font-weight:${k === 0 ? 700 : 400}`); }
        W.text(gB, R, AY + 74, unit ? `${label} (${unit})` : label, 'font-size:11.5px;fill:var(--muted);font-weight:700', 'end');
        const hx = sx(x); hLine.setAttribute('x1', hx); hLine.setAttribute('x2', hx); hLine.setAttribute('y1', top + 8); hLine.setAttribute('y2', AY);
        hC.setAttribute('cx', hx); hC.setAttribute('cy', AY); hHit.setAttribute('cx', hx); hHit.setAttribute('cy', AY);
        hT.setAttribute('x', Math.max(L + 60, Math.min(R - 60, hx))); hT.setAttribute('y', top); hT.textContent = `x = ${loc(x, dec)} · z = ${zs}`;
        hG.setAttribute('aria-valuenow', x); hG.setAttribute('aria-valuetext', `${fu(x, unit, dec)}, z = ${zs}`);
        const emp = 2 * S.normCdf(Math.abs(z)) - 1, cheb = Math.abs(z) > 1 ? 1 - 1 / (z * z) : 0, pct = S.normCdf(z);
        roZ(`(${loc(x, dec)} − ${loc(mean, dec)}) ÷ ${loc(sd, dec)} = ${zs}`); roX(`=STANDARDIZE(${xn(x)},${xn(mean)},${xn(sd)})  =NORM.S.DIST(${z.toFixed(2)},TRUE)`);
        roE(`${(emp * 100).toFixed(1)}%`); roC(Math.abs(z) > 1 ? `at least ${(cheb * 100).toFixed(1)}% (1 − 1/z²)` : 'no guarantee for |z| ≤ 1'); roP(`${(pct * 100).toFixed(1)}%`);
        const az2 = Math.abs(z), side = z >= 0 ? 'above' : 'below', L1 = esc(label);
        let h = az2 < 0.005 ? `x equals the mean, so z = 0. ` : `z = <b>${zs}</b>: ${fu(x, unit, dec)} is ${az2.toFixed(2)} standard deviations ${side} the mean of ${fu(mean, unit, dec)}. `;
        if (az2 >= 0.005) h += `If the data are bell-shaped, about <b>${((z >= 0 ? 1 - pct : pct) * 100).toFixed(1)}%</b> of values are further ${side} the mean than this (empirical rule: 68% within ±1 SD, 95% within ±2, 99.7% within ±3). `;
        h += az2 > 1 ? `Whatever the shape, Chebyshev guarantees at least ${(cheb * 100).toFixed(0)}% of values lie within ±${az2.toFixed(2)} SD. ` : '';
        if (az2 > 3) h += `<b>|z| > 3 — treat it as an outlier</b> and check it.`; else if (az2 > 2) h += 'Unusual, but not an outlier by the |z| > 3 rule.';
        note.innerHTML = h;
      }
      draw();
    }
  });
})();
