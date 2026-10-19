/* Statistics for Managers — interactive widget framework + reference widgets.
   Usage in a page:
     <div class="widget" data-widget="normal-area" data-title="Optional title" data-params='{"mu":100,"sd":15}'></div>
   Widgets live in widgets.js (core) and widgets-*.js (packs). Each pack calls SFMW.register(name, {title, init}).
   init(api, params) receives an api object:
     api.stage            <div class="w-stage"> for the SVG / canvas
     api.controls         <div class="w-controls"> for sliders / inputs
     api.readout          <div class="w-readout"> for live numbers
     api.foot             <div> after readout for notes / buttons
     api.svg(w,h)         create a responsive <svg viewBox="0 0 w h"> inside stage and return it
     api.slider({...})    labelled range input (returns {el,input,get,set})
     api.ro(key,label)    readout pill; returns setter fn(valueString)
     api.note(html)       highlighted explanatory line (returns element; update .innerHTML later)
     api.seg(opts,v,fn)   segmented buttons;  api.button(label,fn,primary)
   Helpers on SFMW: el, s (svg element), scale, axis, path, fmt, color(name)
*/
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const W = { reg: {} };
  W.register = (name, def) => { W.reg[name] = def; };
  W.el = function (tag, attrs, html) { const e = document.createElement(tag); if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else if (k === 'style') e.style.cssText = attrs[k]; else e.setAttribute(k, attrs[k]); } if (html !== undefined) e.innerHTML = html; return e; };
  W.s = function (tag, attrs, parent) { const e = document.createElementNS(NS, tag); if (attrs) for (const k in attrs) { if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]); } if (parent) parent.appendChild(e); return e; };
  W.scale = (d0, d1, r0, r1) => { const f = v => r0 + (v - d0) * (r1 - r0) / (d1 - d0); f.inv = p => d0 + (p - r0) * (d1 - d0) / (r1 - r0); return f; };
  W.fmt = (v, d = 4) => (window.Stats ? Stats.fmt(v, d) : String(v));
  W.color = name => getComputedStyle(document.body).getPropertyValue(name).trim();
  W.nice = function (lo, hi, n = 5) { const span = hi - lo, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0))), r = step0 / mag, step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag; const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10)); return out; };
  // draw an x axis with ticks; returns group
  W.axisX = function (svg, sx, y, ticks, fmt, opts = {}) {
    const g = W.s('g', { class: 'axis' }, svg); const [a, b] = [sx(ticks[0]), sx(ticks[ticks.length - 1])];
    W.s('line', { x1: opts.x0 !== undefined ? opts.x0 : a, x2: opts.x1 !== undefined ? opts.x1 : b, y1: y, y2: y, style: 'stroke:var(--line-2);stroke-width:1.2' }, g);
    ticks.forEach(t => { const x = sx(t); W.s('line', { x1: x, x2: x, y1: y, y2: y + 5, style: 'stroke:var(--line-2)' }, g); const tx = W.s('text', { x, y: y + 19, 'text-anchor': 'middle', style: 'font-size:12px;fill:var(--muted)' }, g); tx.textContent = fmt ? fmt(t) : t; });
    if (opts.label) { const l = W.s('text', { x: (opts.x1 || b), y: y + 36, 'text-anchor': 'end', style: 'font-size:12px;fill:var(--muted);font-weight:700' }, g); l.textContent = opts.label; }
    return g;
  };
  W.axisY = function (svg, sy, x, ticks, fmt, opts = {}) {
    const g = W.s('g', { class: 'axis' }, svg);
    ticks.forEach(t => { const y = sy(t); W.s('line', { x1: x, x2: opts.x1 || x + 4, y1: y, y2: y, style: opts.grid ? 'stroke:var(--line);stroke-dasharray:2 3' : 'stroke:var(--line-2)' }, g); const tx = W.s('text', { x: x - 6, y: y + 4, 'text-anchor': 'end', style: 'font-size:12px;fill:var(--muted)' }, g); tx.textContent = fmt ? fmt(t) : t; });
    if (opts.label) { const l = W.s('text', { x: x - 6, y: (opts.y0 || 14) - 4, 'text-anchor': 'start', style: 'font-size:12px;fill:var(--muted);font-weight:700' }, g); l.textContent = opts.label; }
    return g;
  };
  W.text = function (svg, x, y, str, style, anchor) { const t = W.s('text', { x, y, 'text-anchor': anchor || 'middle', style: style || 'font-size:12px;fill:var(--ink-2)' }, svg); t.textContent = str; return t; };
  W.clear = node => { while (node.firstChild) node.removeChild(node.firstChild); };
  // pointer drag helper on an SVG (returns svg-coordinate points)
  W.svgPoint = function (svg, evt) { const pt = svg.createSVGPoint(); const e = evt.touches ? evt.touches[0] : evt; pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  W.drag = function (svg, target, onMove, onEnd) {
    target.style.cursor = 'grab';
    target.addEventListener('pointerdown', e => { e.preventDefault(); target.setPointerCapture(e.pointerId); target.style.cursor = 'grabbing';
      const mv = ev => onMove(W.svgPoint(svg, ev)); const up = () => { target.removeEventListener('pointermove', mv); target.removeEventListener('pointerup', up); target.style.cursor = 'grab'; if (onEnd) onEnd(); };
      target.addEventListener('pointermove', mv); target.addEventListener('pointerup', up); });
  };

  function makeApi(body) {
    const stage = W.el('div', { class: 'w-stage' }), controls = W.el('div', { class: 'w-controls' }), readout = W.el('div', { class: 'w-readout', 'aria-live': 'polite' }), foot = W.el('div');
    body.append(stage, controls, readout, foot);
    const api = { stage, controls, readout, foot, body };
    api.svg = (w, h, label) => { const s = W.s('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': label || 'Interactive chart', preserveAspectRatio: 'xMidYMid meet' }); stage.appendChild(s); return s; };
    api.slider = function (o) {
      const lab = W.el('label', { class: 'ctl' }); const span = W.el('span', null, o.label); const out = W.el('output'); const inp = W.el('input', { type: 'range', min: o.min, max: o.max, step: o.step || 1, value: o.value });
      const fmt = o.fmt || (v => v); lab.append(span, out, inp); (o.parent || controls).appendChild(lab);
      const upd = () => { out.textContent = fmt(+inp.value); }; inp.addEventListener('input', () => { upd(); if (o.onInput) o.onInput(+inp.value); }); upd();
      return { el: lab, input: inp, get: () => +inp.value, set: v => { inp.value = v; upd(); } };
    };
    api.number = function (o) { const lab = W.el('label', { class: 'ctl' }); lab.style.gridTemplateColumns = '1fr auto'; const span = W.el('span', null, o.label); const inp = W.el('input', { type: 'number', class: 'w-input', step: o.step || 'any', value: o.value }); if (o.min !== undefined) inp.min = o.min; if (o.max !== undefined) inp.max = o.max; lab.append(span, inp); (o.parent || controls).appendChild(lab); inp.addEventListener('input', () => { if (inp.value !== '' && o.onInput) o.onInput(+inp.value); }); return { el: lab, input: inp, get: () => +inp.value, set: v => { inp.value = v; } }; };
    api.ro = function (key, label) { const r = W.el('span', { class: 'ro' }, `${label} <b></b>`); readout.appendChild(r); const b = r.querySelector('b'); return v => { b.textContent = v; }; };
    api.note = function (html) { const n = W.el('p', { class: 'w-note' }, html || ''); foot.appendChild(n); return n; };
    api.seg = function (opts, value, fn, parent) { const g = W.el('div', { class: 'seg', role: 'group' }); opts.forEach(o => { const b = W.el('button', { type: 'button', 'aria-pressed': o.v === value }, o.label); b.onclick = () => { g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); fn(o.v); }; g.appendChild(b); }); const wrap = W.el('div', { class: 'w-btns' }); wrap.appendChild(g); (parent || controls).appendChild(wrap); return g; };
    api.button = function (label, fn, primary, parent) { let wrap = (parent || foot).querySelector(':scope > .w-btns'); if (!wrap) { wrap = W.el('div', { class: 'w-btns' }); (parent || foot).appendChild(wrap); } const b = W.el('button', { type: 'button', class: 'btn small' + (primary ? ' primary' : '') }, label); b.onclick = fn; wrap.appendChild(b); return b; };
    return api;
  }

  W.boot = function () {
    document.querySelectorAll('.widget[data-widget]').forEach(el => {
      if (el.dataset.ready) return; const name = el.dataset.widget, def = W.reg[name];
      let params = {}; try { params = el.dataset.params ? JSON.parse(el.dataset.params) : {}; } catch (e) { console.warn('Bad widget params', name, e); }
      const caption = el.innerHTML.trim(); el.innerHTML = '';
      const head = W.el('div', { class: 'w-head' }, `<b>${el.dataset.title || (def && def.title) || 'Explorer'}</b><span>Try it</span>`); const body = W.el('div', { class: 'w-body' }); el.append(head, body);
      if (!def) { body.innerHTML = `<p class="w-fallback">This explorer (${name}) is not available.</p>`; return; }
      if (caption) { const c = W.el('p', { class: 'small muted', style: 'margin:0 0 .6rem' }, caption); body.appendChild(c); }
      try { def.init(makeApi(body), params, el); el.dataset.ready = '1'; } catch (e) { console.error(name, e); body.innerHTML = `<p class="w-fallback">Explorer failed to load (${name}).</p>`; }
    });
  };

  // ======================= reference widget: normal-area =======================
  // params: mu, sd, a, b, mode: "below"|"above"|"between"|"outside", unit, label, inverse:true (adds "find the cut-off" mode)
  W.register('normal-area', {
    title: 'Normal curve explorer',
    init(api, P) {
      const S = window.Stats; let mu = +(P.mu ?? 0), sd = +(P.sd ?? 1), mode = P.mode || 'below', a = +(P.a ?? (mu - sd)), b = +(P.b ?? (mu + sd)); const unit = P.unit || '';
      const Wd = 640, H = 300, L = 30, R = 610, T = 24, B = 240; const svg = api.svg(Wd, H, 'Normal distribution with shaded probability');
      const lo = mu - 4 * sd, hi = mu + 4 * sd, sx = W.scale(lo, hi, L, R), ymax = S.normPdf(mu, mu, sd) * 1.12, sy = W.scale(0, ymax, B, T);
      const gShade = W.s('g', null, svg), curve = W.s('path', { style: 'fill:none;stroke:var(--ink);stroke-width:2.2' }, svg), gMark = W.s('g', null, svg);
      let d = ''; for (let i = 0; i <= 200; i++) { const x = lo + (hi - lo) * i / 200; d += (i ? 'L' : 'M') + sx(x).toFixed(1) + ',' + sy(S.normPdf(x, mu, sd)).toFixed(1); } curve.setAttribute('d', d);
      const ticks = [-3, -2, -1, 0, 1, 2, 3].map(k => mu + k * sd); W.axisX(svg, sx, B, ticks, t => +t.toFixed(2) + '');
      ticks.forEach((t, i) => W.text(svg, sx(t), B + 34, `z=${i - 3}`, 'font-size:11px;fill:var(--muted)'));
      const pre = /^[$₹€£]$/.test(unit); const fmtx = v => (pre ? unit : '') + (+v.toFixed(Math.abs(sd) < 1 ? 3 : 2)).toLocaleString('en-IN') + (unit && !pre ? ' ' + unit : '');
      const segOpts = [{ v: 'below', label: 'P(X < a)' }, { v: 'above', label: 'P(X > a)' }, { v: 'between', label: 'P(a < X < b)' }, { v: 'outside', label: 'Outside a–b' }];
      if (P.inverse) segOpts.push({ v: 'inverse', label: 'Find cut-off' });
      api.seg(segOpts, mode, v => { mode = v; layout(); draw(); });
      const step = +(P.step || (sd / 20).toPrecision(1));
      const sa = api.slider({ label: 'a', min: lo, max: hi, step, value: a, fmt: fmtx, onInput: v => { a = v; draw(); } });
      const sb = api.slider({ label: 'b', min: lo, max: hi, step, value: b, fmt: fmtx, onInput: v => { b = v; draw(); } });
      const sp = api.slider({ label: 'Top / bottom area p', min: 0.01, max: 0.99, step: 0.01, value: P.p || 0.10, fmt: v => v.toFixed(2), onInput: () => draw() });
      const roP = api.ro('p', 'Probability'), roZ = api.ro('z', 'z'), roX = api.ro('x', 'Excel');
      const note = api.note('');
      function layout() { sb.el.style.display = (mode === 'between' || mode === 'outside') ? '' : 'none'; sa.el.style.display = mode === 'inverse' ? 'none' : ''; sp.el.style.display = mode === 'inverse' ? '' : 'none'; }
      function area(x1, x2, cls) { let p = ''; const n = 120; for (let i = 0; i <= n; i++) { const x = x1 + (x2 - x1) * i / n; p += (i ? 'L' : 'M') + sx(x).toFixed(1) + ',' + sy(S.normPdf(x, mu, sd)).toFixed(1); } p += `L${sx(x2).toFixed(1)},${B}L${sx(x1).toFixed(1)},${B}Z`; W.s('path', { d: p, style: 'fill:var(--acc-deep);opacity:.38' }, gShade); }
      function marker(x, lbl) { W.s('line', { x1: sx(x), x2: sx(x), y1: T - 4, y2: B, style: 'stroke:var(--acc-deep);stroke-width:2;stroke-dasharray:4 3' }, gMark); W.text(gMark, sx(x), T - 8, lbl, 'font-size:12px;font-weight:700;fill:var(--acc-fg)'); }
      function draw() {
        W.clear(gShade); W.clear(gMark); let x1 = Math.min(a, b), x2 = Math.max(a, b), p, z, xl;
        const za = (a - mu) / sd, zb = (b - mu) / sd;
        if (mode === 'below') { area(lo, a, 1); marker(a, 'a'); p = S.normCdf(a, mu, sd); z = S.fmt(za, 2); xl = `=NORM.DIST(${+a.toFixed(4)},${mu},${sd},TRUE)`; note.innerHTML = `About <b>${(p * 100).toFixed(1)}%</b> of values fall below ${fmtx(a)}.`; }
        else if (mode === 'above') { area(a, hi); marker(a, 'a'); p = 1 - S.normCdf(a, mu, sd); z = S.fmt(za, 2); xl = `=1-NORM.DIST(${+a.toFixed(4)},${mu},${sd},TRUE)`; note.innerHTML = `About <b>${(p * 100).toFixed(1)}%</b> of values are above ${fmtx(a)}.`; }
        else if (mode === 'between') { area(x1, x2); marker(x1, 'a'); marker(x2, 'b'); p = S.normCdf(x2, mu, sd) - S.normCdf(x1, mu, sd); z = `${S.fmt((x1 - mu) / sd, 2)} to ${S.fmt((x2 - mu) / sd, 2)}`; xl = `=NORM.DIST(${+x2.toFixed(4)},${mu},${sd},TRUE)-NORM.DIST(${+x1.toFixed(4)},${mu},${sd},TRUE)`; note.innerHTML = `About <b>${(p * 100).toFixed(1)}%</b> of values lie between ${fmtx(x1)} and ${fmtx(x2)}.`; }
        else if (mode === 'outside') { area(lo, x1); area(x2, hi); marker(x1, 'a'); marker(x2, 'b'); p = 1 - (S.normCdf(x2, mu, sd) - S.normCdf(x1, mu, sd)); z = `${S.fmt((x1 - mu) / sd, 2)} and ${S.fmt((x2 - mu) / sd, 2)}`; xl = `=1-(NORM.DIST(${+x2.toFixed(4)},…)-NORM.DIST(${+x1.toFixed(4)},…))`; note.innerHTML = `About <b>${(p * 100).toFixed(1)}%</b> of values fall outside the band.`; }
        else { const pp = sp.get(), cut = S.normInv(1 - pp, mu, sd), cutL = S.normInv(pp, mu, sd); area(cut, hi); area(lo, cutL); marker(cut, 'top ' + Math.round(pp * 100) + '%'); marker(cutL, 'bottom ' + Math.round(pp * 100) + '%'); p = pp; z = `±${S.fmt(S.normInv(1 - pp), 3)}`; xl = `=NORM.INV(${(1 - pp).toFixed(2)},${mu},${sd})`; note.innerHTML = `To be in the <b>top ${Math.round(pp * 100)}%</b> you need more than <b>${fmtx(cut)}</b>; the bottom ${Math.round(pp * 100)}% is below <b>${fmtx(cutL)}</b>.`; }
        roP(p.toFixed(4)); roZ(z); roX(xl);
      }
      layout(); draw();
    }
  });

  // ======================= reference widget: binomial =======================
  // params: n, p, k, mode: "eq"|"le"|"ge"|"lt"|"gt", label (what a success is)
  W.register('binomial', {
    title: 'Binomial distribution explorer',
    init(api, P) {
      const S = window.Stats; let n = +(P.n ?? 10), p = +(P.p ?? 0.3), k = +(P.k ?? 3), mode = P.mode || 'eq'; const what = P.label || 'successes';
      const Wd = 640, H = 290, L = 46, R = 620, T = 20, B = 236; const svg = api.svg(Wd, H, 'Binomial probability bars');
      const g = W.s('g', null, svg);
      api.seg([{ v: 'eq', label: 'P(X = k)' }, { v: 'le', label: 'P(X ≤ k)' }, { v: 'ge', label: 'P(X ≥ k)' }, { v: 'gt', label: 'P(X > k)' }], mode, v => { mode = v; draw(); });
      const sn = api.slider({ label: 'n (trials)', min: 1, max: +(P.nMax || 30), value: n, onInput: v => { n = v; if (k > n) { k = n; sk.set(k); } sk.input.max = n; draw(); } });
      const sp = api.slider({ label: 'p (chance of success)', min: 0.01, max: 0.99, step: 0.01, value: p, fmt: v => v.toFixed(2), onInput: v => { p = v; draw(); } });
      const sk = api.slider({ label: 'k', min: 0, max: n, value: k, onInput: v => { k = v; draw(); } });
      const roP = api.ro('p', 'Probability'), roM = api.ro('m', 'Mean np'), roS = api.ro('s', 'SD √(np(1−p))'), roX = api.ro('x', 'Excel');
      const note = api.note('');
      function inSel(x) { return mode === 'eq' ? x === k : mode === 'le' ? x <= k : mode === 'ge' ? x >= k : x > k; }
      function draw() {
        W.clear(g); const pm = []; let mx = 0; for (let x = 0; x <= n; x++) { const v = S.binomPmf(x, n, p); pm.push(v); if (v > mx) mx = v; }
        const sx = W.scale(-0.5, n + 0.5, L, R), sy = W.scale(0, mx * 1.15, B, T), bw = Math.max(2, (R - L) / (n + 1) * 0.78);
        W.axisY(g, sy, L, W.nice(0, mx * 1.1, 4), t => t.toFixed(2), { grid: true, x1: R });
        let tot = 0; pm.forEach((v, x) => { const sel = inSel(x); if (sel) tot += v; W.s('rect', { x: sx(x) - bw / 2, y: sy(v), width: bw, height: B - sy(v), rx: 2, style: sel ? 'fill:var(--acc-deep)' : 'fill:var(--line-2)' }, g); if (n <= 20 || x % Math.ceil(n / 20) === 0) W.text(g, sx(x), B + 16, String(x), 'font-size:11px;fill:var(--muted)'); });
        W.s('line', { x1: L, x2: R, y1: B, y2: B, style: 'stroke:var(--line-2)' }, g); W.text(g, R, B + 34, `number of ${what}`, 'font-size:12px;fill:var(--muted);font-weight:700', 'end');
        const sym = { eq: '=', le: '≤', ge: '≥', gt: '>' }[mode];
        roP(tot.toFixed(4)); roM((n * p).toFixed(2)); roS(Math.sqrt(n * p * (1 - p)).toFixed(3));
        roX(mode === 'eq' ? `=BINOM.DIST(${k},${n},${p},FALSE)` : mode === 'le' ? `=BINOM.DIST(${k},${n},${p},TRUE)` : mode === 'ge' ? `=1-BINOM.DIST(${k - 1},${n},${p},TRUE)` : `=1-BINOM.DIST(${k},${n},${p},TRUE)`);
        note.innerHTML = `With ${n} trials and a ${(p * 100).toFixed(0)}% chance each, P(X ${sym} ${k}) = <b>${tot.toFixed(4)}</b> — roughly ${tot < 0.001 ? 'less than 1 in 1,000' : `${Math.round(tot * 100)} times in 100`}.`;
      }
      draw();
    }
  });

  window.SFMW = W;
})();
