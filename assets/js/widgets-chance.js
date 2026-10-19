/* Statistics for Managers — widget pack "chance"
   venn · contingency · bayes · expected-value · poisson
   Uses SFMW (widgets.js) and Stats (stats.js). Vanilla JS, no libraries. */
(function () {
  'use strict';
  const W = window.SFMW, S = window.Stats;
  if (!W || !S) return;

  // ------------------------------------------------------------------ shared helpers (self-contained copy)
  const CSS = `
.wc .w-readout .ro{max-width:100%;overflow-wrap:anywhere}
.wc .w-readout b,.wc code,.wc .wc-t input,.wc output,.wc .wc-fx{font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0}
.wc code.xl{white-space:normal;overflow-wrap:anywhere}
.wc .wc-msg{margin:.6rem 0 0;padding:.45rem .7rem;border-radius:9px;background:var(--warn-bg);color:var(--warn);font-size:.88rem}
.wc .wc-msg[hidden]{display:none}
.wc .wc-cap{font-size:.82rem;color:var(--muted);margin:.35rem 0 0;line-height:1.45}
.wc .wc-sw{display:inline-block;width:.85em;height:.85em;border-radius:3px;vertical-align:-.08em;margin-right:.3em}
.wc .wc-legend{display:flex;flex-wrap:wrap;gap:.3rem 1rem;font-size:.84rem;color:var(--ink-2);margin:.45rem 0 0}
.wc .wc-tw{width:100%;max-width:100%;overflow-x:auto;margin:.2rem 0 0;border:1px solid var(--line);border-radius:10px;background:var(--surface)}
.wc .wc-o{width:0;min-width:100%}
.wc .wc-tw.fit{display:inline-block;width:auto;vertical-align:top}
.wc .wc-w{font-family:var(--sans);font-weight:400;color:var(--muted)}
.wc table.wc-t{width:100%;border-collapse:collapse;font-size:.88rem;font-variant-numeric:tabular-nums}
.wc table.wc-t caption{caption-side:top;text-align:left;font-size:.84rem;color:var(--muted);padding:.45rem .6rem 0;font-weight:700}
.wc table.wc-t th,.wc table.wc-t td{padding:.3rem .45rem;border-bottom:1px solid var(--line);text-align:right;vertical-align:middle}
.wc table.wc-t th:first-child,.wc table.wc-t td:first-child{text-align:left}
.wc table.wc-t thead th{background:var(--surface-2);font-size:.78rem;color:var(--ink-2)}
.wc table.wc-t tr.tot td,.wc table.wc-t tr.tot th,.wc table.wc-t td.tot{background:var(--surface-2);font-weight:700}
.wc table.wc-t tbody tr:last-child td,.wc table.wc-t tbody tr:last-child th{border-bottom:0}
.wc table.wc-t input{font:inherit;font-size:.88rem;width:4.6rem;max-width:100%;padding:.25rem .35rem;border:1px solid var(--line-2);border-radius:7px;background:var(--surface);color:var(--ink);text-align:right}
.wc table.wc-t input[aria-invalid="true"]{border-color:var(--bad);background:var(--bad-bg)}
.wc table.wc-t .wc-hb{all:unset;cursor:pointer;font-weight:700;color:var(--acc-fg);border-bottom:1px dashed var(--acc-bd);line-height:1.3}
.wc table.wc-t .wc-hb:focus-visible{outline:3px solid var(--focus);outline-offset:2px;border-radius:3px}
.wc table.wc-t .wc-cell{all:unset;cursor:pointer;display:inline-block;min-width:3.2rem;padding:.12rem .25rem;border-radius:6px}
.wc table.wc-t .wc-cell:focus-visible{outline:3px solid var(--focus)}
.wc table.wc-t .on{background:var(--acc-deep)!important;color:#fff!important}
.wc table.wc-t .on input{border-color:var(--acc-deep);font-weight:700}
.wc table.wc-t .hl{background:var(--acc-bg)}
.wc table.wc-t .den{box-shadow:inset 0 0 0 2px var(--acc-bd)}
.wc table.wc-t .fx{font-family:var(--mono);font-size:.76rem;color:var(--excel)}
.wc .wc-frm{flex-basis:100%;background:var(--surface-2);border-radius:10px;padding:.55rem .75rem;font-size:.92rem;line-height:1.9;overflow-wrap:anywhere}
.wc .wc-frac{display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;line-height:1.25;margin:0 .15em}
.wc .wc-frac>span:first-child{border-bottom:1.5px solid currentColor;padding:0 .2em .1em}
.wc .wc-frac>span:last-child{padding:.1em .2em 0}
.wc .wc-frm b{color:var(--acc-fg);font-family:var(--mono);font-weight:500}
@media (max-width:440px){.wc table.wc-t .wc-hide-sm{display:none}.wc table.wc-t input{width:3.7rem}.wc table.wc-t th,.wc table.wc-t td{padding:.28rem .3rem}}
.wc svg .wc-pick{cursor:pointer}
`;
  function style() { if (document.getElementById('wx-chance-css')) return; const s = document.createElement('style'); s.id = 'wx-chance-css'; s.textContent = CSS; document.head.appendChild(s); }
  const nv = (v, d) => (v === undefined || v === null || v === '' || typeof v === 'boolean' || !isFinite(+v)) ? d : +v;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r2 = v => Math.round(v * 100) / 100;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
  const p3 = v => isFinite(v) ? v.toFixed(3) : '—';
  const xn = v => String(+(+v).toFixed(6));
  const minOf = a => a.reduce((m, v) => v < m ? v : m, Infinity), maxOf = a => a.reduce((m, v) => v > m ? v : m, -Infinity);
  function pal(el) {
    const host = el.closest('.c-descriptive,.c-probability,.c-inferential,.c-relationships') || document.body;
    const m = /(?:pillar|c)-(descriptive|probability|inferential|relationships)/.exec(host.className || '');
    const cur = m ? m[1][0] : 'n', o = ['r', 'i', 'd', 'p'].filter(x => x !== cur);
    return { c2: `var(--${o[0]}-deep)`, c2f: `var(--${o[0]}-fg)`, c3: `var(--${o[1]}-deep)`, c3f: `var(--${o[1]}-fg)` };
  }
  function frame(api, label, dims, onChange) {
    const svg = api.svg(640, 300, label), st = { svg, narrow: false, w: 640, h: 300 };
    const apply = n => { st.narrow = n; const d = dims(n); st.w = d[0]; st.h = d[1]; svg.setAttribute('viewBox', `0 0 ${st.w} ${st.h}`); };
    const isN = () => { const cw = api.stage.clientWidth; return cw > 0 && cw < 540; };
    apply(isN());
    st.setH = h => { st.h = h; svg.setAttribute('viewBox', `0 0 ${st.w} ${h}`); };
    if (window.ResizeObserver) new ResizeObserver(() => { const n = isN(); if (n !== st.narrow) { apply(n); if (onChange) onChange(); } }).observe(api.stage);
    return st;
  }
  function msgEl(parent) { const m = W.el('p', { class: 'wc-msg', role: 'status' }); m.hidden = true; parent.appendChild(m); return t => { m.hidden = !t; m.innerHTML = t || ''; }; }
  function roH(api, label) { const r = W.el('span', { class: 'ro' }, `${label} <b></b>`); api.readout.appendChild(r); const b = r.querySelector('b'); const f = h => { b.innerHTML = h; }; f.el = r; return f; }
  const frac = (a, b) => `<span class="wc-frac"><span>${a}</span><span>${b}</span></span>`;
  const circ = (cx, cy, r) => `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
  let UID = 0;

  // ======================= venn =======================
  // params: pa, pb, pab, labelA, labelB, exclusive (bool), shade ("and"/"or"/"aonly"/"a|b"/"b|a"/"ac")
  W.register('venn', {
    title: 'Venn diagram: two events',
    init(api, P, el) {
      P = P && typeof P === 'object' && !Array.isArray(P) ? P : {};
      style(); el.classList.add('wc'); const C = pal(el), id = 'wcv' + (++UID);
      const useDef = P.pa === undefined && P.pb === undefined;
      const A = P.labelA ? String(P.labelA) : 'orders online', B = P.labelB ? String(P.labelB) : 'visits the store';
      let pa = r2(clamp(nv(P.pa, 0.45), 0.01, 0.99)), pb = r2(clamp(nv(P.pb, 0.35), 0.01, 0.99)), pab = r2(nv(P.pab, useDef ? 0.12 : pa * pb)), excl = P.exclusive === true, shade = ['and', 'or', 'aonly', 'a|b', 'b|a', 'ac'].includes(P.shade) ? P.shade : 'and', warnTxt = '';
      const lo0 = r2(Math.max(0, pa + pb - 1)), hi0 = Math.min(pa, pb);
      if (pab < lo0 - 1e-9 || pab > hi0 + 1e-9) { warnTxt = `P(A∩B) must lie between ${lo0.toFixed(2)} and ${hi0.toFixed(2)} for these P(A) and P(B), so it was adjusted.`; pab = r2(clamp(pab, lo0, hi0)); }
      if (excl) { pab = 0; if (pa + pb > 1) pb = r2(1 - pa); }
      const st = frame(api, `Venn diagram of A (${A}) and B (${B})`, n => [n ? 360 : 640, 280], () => draw());
      const defs = W.s('defs', null, st.svg), gS = W.s('g', null, st.svg), gC = W.s('g', null, st.svg), gT = W.s('g', null, st.svg);
      api.seg([{ v: 'and', label: 'A ∩ B' }, { v: 'or', label: 'A ∪ B' }, { v: 'aonly', label: 'A only' }, { v: 'a|b', label: 'A | B' }, { v: 'b|a', label: 'B | A' }, { v: 'ac', label: 'Aᶜ' }], shade, v => { shade = v; draw(); });
      const sA = api.slider({ label: `P(A) — ${esc(A)}`, min: 0.01, max: 0.99, step: 0.01, value: pa, fmt: v => v.toFixed(2), onInput: v => { pa = r2(v); fix(); draw(); } });
      const sB = api.slider({ label: `P(B) — ${esc(B)}`, min: 0.01, max: 0.99, step: 0.01, value: pb, fmt: v => v.toFixed(2), onInput: v => { pb = r2(v); fix(); draw(); } });
      const sAB = api.slider({ label: 'P(A ∩ B) — both', min: 0, max: 0.99, step: 0.01, value: pab, fmt: v => v.toFixed(2), onInput: v => { pab = r2(v); fix(); draw(); } });
      const bX = api.button('Mutually exclusive', () => { excl = !excl; bX.setAttribute('aria-pressed', excl); if (excl) { pab = 0; if (pa + pb > 1) { pb = r2(1 - pa); sB.set(pb); } } fix(); draw(); }, false, api.controls); bX.setAttribute('aria-pressed', excl);
      function fix() {
        if (excl) { sA.input.max = r2(Math.min(0.99, 1 - pb)); sB.input.max = r2(Math.min(0.99, 1 - pa)); pa = Math.min(pa, r2(1 - pb)); pb = Math.min(pb, r2(1 - pa)); pab = 0; sAB.input.disabled = true; }
        else { sA.input.max = 0.99; sB.input.max = 0.99; sAB.input.disabled = false; }
        const lo = r2(Math.max(0, pa + pb - 1)), hi = r2(Math.min(pa, pb)); sAB.input.min = lo; sAB.input.max = Math.max(lo, hi); pab = r2(clamp(pab, lo, hi));
        sA.set(pa); sB.set(pb); sAB.set(pab);
      }
      fix();
      const roU = api.ro('u', 'P(A ∪ B)'), roAB = api.ro('ab', 'P(A | B)'), roBA = api.ro('ba', 'P(B | A)'), roAc = api.ro('ac', 'P(Aᶜ)'), roI = roH(api, 'Independent?'), roS = api.ro('s', 'Shaded');
      const leg = W.el('p', { class: 'wc-cap' }); api.stage.appendChild(leg);
      const note = api.note(''); const warn = msgEl(api.foot); warn(warnTxt);
      function lensArea(r1, r3, d) { if (d >= r1 + r3) return 0; if (d <= Math.abs(r1 - r3)) return Math.PI * Math.min(r1, r3) ** 2; const a1 = Math.acos(clamp((d * d + r1 * r1 - r3 * r3) / (2 * d * r1), -1, 1)), a2 = Math.acos(clamp((d * d + r3 * r3 - r1 * r1) / (2 * d * r3), -1, 1)); return r1 * r1 * a1 + r3 * r3 * a2 - 0.5 * Math.sqrt(Math.max(0, (-d + r1 + r3) * (d + r1 - r3) * (d - r1 + r3) * (d + r1 + r3))); }
      function draw() {
        W.clear(defs); W.clear(gS); W.clear(gC); W.clear(gT);
        const Wd = st.w, H = st.h, ux = 8, uy = 8, uw = Wd - 16, uh = H - 16, cy = H / 2 + 4, Rm = (uh - 58) / 2;
        const ra = Rm * Math.sqrt(pa), rb = Rm * Math.sqrt(pb), target = Math.PI * Rm * Rm * pab; let d;
        if (pab <= 1e-9) d = ra + rb + 16; else if (pab >= Math.min(pa, pb) - 1e-9) d = Math.abs(ra - rb) * 0.999; else { let lo = Math.abs(ra - rb), hi = ra + rb; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (lensArea(ra, rb, m) > target) lo = m; else hi = m; } d = (lo + hi) / 2; }
        const left = Math.min(-ra, d - rb), right = Math.max(ra, d + rb), off = Wd / 2 - (left + right) / 2, xa = off, xb = off + d;
        const U = `M${ux},${uy}h${uw}v${uh}h${-uw}Z`;
        W.s('clipPath', { id: id + 'a' }, defs).appendChild(W.s('circle', { cx: xa, cy, r: ra }));
        W.s('clipPath', { id: id + 'b' }, defs).appendChild(W.s('circle', { cx: xb, cy, r: rb }));
        const nb = W.s('clipPath', { id: id + 'nb' }, defs); W.s('path', { d: U + circ(xb, cy, rb), 'clip-rule': 'evenodd' }, nb);
        W.s('rect', { x: ux, y: uy, width: uw, height: uh, rx: 12, style: 'fill:var(--surface-2);stroke:var(--line-2);stroke-width:1.2' }, gS);
        const F = 'fill:var(--acc-deep);opacity:.45', dim = (cx, r) => W.s('path', { d: U + circ(cx, cy, r), 'fill-rule': 'evenodd', style: 'fill:var(--surface);opacity:.72' }, gS);
        if (shade === 'and') W.s('circle', { cx: xb, cy, r: rb, 'clip-path': `url(#${id}a)`, style: F }, gS);
        else if (shade === 'or') { const gg = W.s('g', { style: 'opacity:.45' }, gS); W.s('circle', { cx: xa, cy, r: ra, style: 'fill:var(--acc-deep)' }, gg); W.s('circle', { cx: xb, cy, r: rb, style: 'fill:var(--acc-deep)' }, gg); }
        else if (shade === 'aonly') W.s('circle', { cx: xa, cy, r: ra, 'clip-path': `url(#${id}nb)`, style: F }, gS);
        else if (shade === 'ac') W.s('path', { d: U + circ(xa, cy, ra), 'fill-rule': 'evenodd', style: F }, gS);
        else if (shade === 'a|b') { dim(xb, rb); W.s('circle', { cx: xa, cy, r: ra, 'clip-path': `url(#${id}b)`, style: F }, gS); }
        else if (shade === 'b|a') { dim(xa, ra); W.s('circle', { cx: xb, cy, r: rb, 'clip-path': `url(#${id}a)`, style: F }, gS); }
        const wA = shade === 'b|a' ? 3.5 : 2, wB = shade === 'a|b' ? 3.5 : 2;
        W.s('circle', { cx: xa, cy, r: ra, style: `fill:none;stroke:var(--acc-deep);stroke-width:${wA}` }, gC);
        W.s('circle', { cx: xb, cy, r: rb, style: `fill:none;stroke:${C.c2};stroke-width:${wB}` }, gC);
        // event names
        const nmA = st.narrow ? 'A' : `A: ${A}`, nmB = st.narrow ? 'B' : `B: ${B}`;
        W.text(gT, ux + 12, uy + 20, nmA.length > 34 ? nmA.slice(0, 33) + '…' : nmA, 'font-size:13px;font-weight:700;fill:var(--acc-fg)', 'start');
        W.text(gT, ux + uw - 12, uy + 20, nmB.length > 34 ? nmB.slice(0, 33) + '…' : nmB, `font-size:13px;font-weight:700;fill:${C.c2f}`, 'end');
        W.text(gT, ux + 12, uy + uh - 10, 'everyone (S) = 1', 'font-size:11.5px;fill:var(--muted)', 'start');
        const none = Math.max(0, r2(1 - pa - pb + pab)); W.text(gT, ux + uw - 12, uy + uh - 10, `neither ${none.toFixed(2)}`, 'font-size:12.5px;font-weight:700;fill:var(--ink-2)', 'end');
        // region values
        const lab = (x, y, v) => W.text(gT, x, y + 5, v.toFixed(2), 'font-size:15px;font-weight:700;fill:var(--ink);paint-order:stroke;stroke:var(--surface-2);stroke-width:4px');
        const aO = Math.max(0, r2(pa - pab)), bO = Math.max(0, r2(pb - pab));
        if (d >= ra + rb - 1e-6) { lab(xa, cy, aO); lab(xb, cy, bO); }
        else if (d <= Math.abs(ra - rb) + 1e-6) {
          const big = ra >= rb ? { x: xa, r: ra, v: aO } : { x: xb, r: rb, v: bO }, sm = ra >= rb ? { x: xb, r: rb } : { x: xa, r: ra };
          lab(sm.x, cy, pab); const gl = (sm.x - sm.r) - (big.x - big.r), gr = (big.x + big.r) - (sm.x + sm.r);
          if (Math.max(gl, gr) > 34) lab(gl > gr ? (big.x - big.r + sm.x - sm.r) / 2 : (sm.x + sm.r + big.x + big.r) / 2, cy, big.v); else if (big.v > 0.004) lab(big.x, cy - big.r + 16, big.v);
        } else { const lL = xb - rb, lR = xa + ra; lab((xa - ra + lL) / 2, cy, aO); lab((lR + xb + rb) / 2, cy, bO); lab((Math.max(lL, xa - ra) + Math.min(lR, xb + rb)) / 2, cy, pab); }
        // readouts
        const pu = pa + pb - pab, aGb = pab / pb, bGa = pab / pa, prod = pa * pb, indep = Math.abs(pab - prod) < 0.005;
        roU(`${pa.toFixed(2)} + ${pb.toFixed(2)} − ${pab.toFixed(2)} = ${pu.toFixed(2)}`); roAB(`${pab.toFixed(2)} ÷ ${pb.toFixed(2)} = ${p3(aGb)}`); roBA(`${pab.toFixed(2)} ÷ ${pa.toFixed(2)} = ${p3(bGa)}`); roAc(`1 − ${pa.toFixed(2)} = ${(1 - pa).toFixed(2)}`);
        roI(`P(A)·P(B) = ${prod.toFixed(4)} ${indep ? '≈' : 'vs'} P(A∩B) = ${pab.toFixed(2)} → <span style="color:${indep ? 'var(--ok)' : 'var(--bad)'}">${indep ? 'yes' : 'no'}</span>`);
        const shv = { and: ['P(A ∩ B)', pab], or: ['P(A ∪ B)', pu], aonly: ['P(A only) = P(A) − P(A∩B)', aO], 'a|b': ['share of B that is also A', aGb], 'b|a': ['share of A that is also B', bGa], ac: ['P(Aᶜ)', 1 - pa] }[shade];
        roS(`${shv[0]} = ${p3(shv[1])}`);
        leg.innerHTML = `<b style="color:var(--acc-fg)">A</b> = ${esc(A)} · <b style="color:${C.c2f}">B</b> = ${esc(B)}. Circle areas are drawn in proportion to the probabilities. ${shade === 'a|b' ? 'For A | B, B becomes the whole world: the shaded part of B is the answer.' : shade === 'b|a' ? 'For B | A, A becomes the whole world: the shaded part of A is the answer.' : ''}`;
        let h;
        if (excl || pab === 0) h = `A and B <b>cannot happen together</b> (mutually exclusive), so P(A ∪ B) = P(A) + P(B) = ${pu.toFixed(2)}. They are <b>not independent</b>: knowing B happened tells you for certain that A did not (P(A | B) = 0, not ${pa.toFixed(2)}).`;
        else if (indep) h = `P(A ∩ B) = P(A) × P(B), so A and B are <b>independent</b>: learning that someone is in B (${esc(B)}) leaves the chance of A (${esc(A)}) at ${pa.toFixed(2)} — P(A | B) = ${p3(aGb)}.`;
        else h = `P(A | B) = <b>${p3(aGb)}</b> but P(A) = ${pa.toFixed(2)}: among those in B (${esc(B)}), A (${esc(A)}) is <b>${aGb > pa ? 'more' : 'less'} common</b> than overall. The events are dependent (${aGb > pa ? 'positively' : 'negatively'} associated), because P(A ∩ B) = ${pab.toFixed(2)} ≠ P(A)·P(B) = ${prod.toFixed(4)}.`;
        if (pab >= Math.min(pa, pb) - 1e-9 && pab > 0) h += ` Here ${pa <= pb ? 'A sits entirely inside B' : 'B sits entirely inside A'}.`;
        note.innerHTML = h;
      }
      draw();
    }
  });

  // ======================= contingency =======================
  // params: rows (labels), cols (labels), table (2D counts, required — falls back to an example), title, view ("counts"/"joint"/"row"/"col")
  W.register('contingency', {
    title: 'Contingency table: joint, marginal and conditional probability',
    init(api, P, el) {
      P = P && typeof P === 'object' && !Array.isArray(P) ? P : {};
      style(); el.classList.add('wc');
      let T = null, warnTxt = '';
      const okT = t => Array.isArray(t) && t.length >= 2 && t.length <= 6 && t.every(r => Array.isArray(r) && r.length === t[0].length) && t[0].length >= 2 && t[0].length <= 6 && t.every(r => r.every(v => isFinite(+v) && +v >= 0 && v !== null && v !== ''));
      if (P.table !== undefined) { if (okT(P.table)) T = P.table.map(r => r.map(Number)); else warnTxt = 'The table could not be used (it needs 2–6 rows of equal length with counts ≥ 0), so an example is shown.'; }
      const useDef = !T;
      if (!T) T = [[18, 482], [32, 268]];
      const R = T.length, K = T[0].length;
      const lbl = (arr, i, pre) => Array.isArray(arr) && arr[i] !== undefined && arr[i] !== null && String(arr[i]).trim() ? String(arr[i]).slice(0, 28) : pre + ' ' + (i + 1);
      const rows = useDef ? ['Day shift', 'Night shift'] : T.map((_, i) => lbl(P.rows, i, 'Row')), cols = useDef ? ['Defective', 'OK'] : T[0].map((_, j) => lbl(P.cols, j, 'Column'));
      const title = P.title ? String(P.title) : (useDef ? 'Items inspected last week, by shift and quality' : '');
      let view = ['counts', 'joint', 'row', 'col'].includes(P.view) ? P.view : 'counts', sel = { t: 'cell', i: 0, j: 0 };
      api.seg([{ v: 'counts', label: 'Counts (editable)' }, { v: 'joint', label: 'Joint probabilities' }, { v: 'row', label: 'Within each row' }, { v: 'col', label: 'Within each column' }], view, v => { view = v; build(); });
      const tw = W.el('div', { class: 'wc-tw fit' }), two = W.el('div', { class: 'wc-o' }); two.appendChild(tw); api.stage.appendChild(two);
      const cap = W.el('p', { class: 'wc-cap' }, 'Click a cell, a row name or a column name (or a total). Outlined cells are the denominators used.'); api.stage.appendChild(cap);
      const frm = W.el('div', { class: 'wc-frm' }); api.readout.appendChild(frm);
      const roX = roH(api, 'Excel');
      const note = api.note(''); const warn = msgEl(api.foot); warn(warnTxt);
      const L = j => String.fromCharCode(66 + j), rowN = i => i + 2, TL = L(K), TR = R + 2;
      const tot = () => { const rt = T.map(r => r.reduce((s, v) => s + v, 0)), ct = T[0].map((_, j) => T.reduce((s, r) => s + r[j], 0)); return { rt, ct, N: rt.reduce((s, v) => s + v, 0) }; };
      let inputs = [];
      function build() {
        const t = tot(); inputs = [];
        const h = (s, attr) => `<button type="button" class="wc-hb" ${attr}>${esc(s)}</button>`;
        let html = `<table class="wc-t">${title ? `<caption>${esc(title)}</caption>` : ''}<thead><tr><th></th>${cols.map((c, j) => `<th data-c="${j}">${h(c, `data-sc="${j}" aria-label="Select column ${esc(c)}"`)}</th>`).join('')}<th data-tc>${h('Total', 'data-sall aria-label="Select grand total"')}</th></tr></thead><tbody>`;
        rows.forEach((r, i) => { html += `<tr><th data-r="${i}" style="text-align:left">${h(r, `data-sr="${i}" aria-label="Select row ${esc(r)}"`)}</th>${cols.map((c, j) => `<td data-i="${i}" data-j="${j}">${view === 'counts' ? `<input type="number" min="0" step="1" inputmode="numeric" value="${T[i][j]}" data-i="${i}" data-j="${j}" aria-label="Count for ${esc(r)} and ${esc(c)}">` : `<button type="button" class="wc-cell" data-ci="${i}" data-cj="${j}"></button>`}</td>`).join('')}<td class="tot" data-rt="${i}"><button type="button" class="wc-cell" data-sr="${i}"></button></td></tr>`; });
        html += `<tr class="tot"><th style="text-align:left">${h('Total', 'data-sall')}</th>${cols.map((c, j) => `<td data-ct="${j}"><button type="button" class="wc-cell" data-sc="${j}"></button></td>`).join('')}<td data-gt><button type="button" class="wc-cell" data-sall></button></td></tr></tbody></table>`;
        tw.innerHTML = html;
        tw.querySelectorAll('input').forEach(inp => { inputs.push(inp); const i = +inp.dataset.i, j = +inp.dataset.j;
          inp.addEventListener('focus', () => { sel = { t: 'cell', i, j }; update(); });
          inp.addEventListener('input', () => { const v = inp.value.trim(), x = +v; if (v === '' || !isFinite(x) || x < 0) { inp.setAttribute('aria-invalid', 'true'); warn('Counts must be whole numbers of 0 or more — that cell is ignored until fixed.'); return; } inp.removeAttribute('aria-invalid'); if (!tw.querySelector('input[aria-invalid="true"]')) warn(''); T[i][j] = x; update(); }); });
        tw.querySelectorAll('[data-ci]').forEach(b => b.addEventListener('click', () => { sel = { t: 'cell', i: +b.dataset.ci, j: +b.dataset.cj }; update(); }));
        tw.querySelectorAll('[data-sr]').forEach(b => b.addEventListener('click', () => { sel = { t: 'row', i: +b.dataset.sr }; update(); }));
        tw.querySelectorAll('[data-sc]').forEach(b => b.addEventListener('click', () => { sel = { t: 'col', j: +b.dataset.sc }; update(); }));
        tw.querySelectorAll('[data-sall]').forEach(b => b.addEventListener('click', () => { sel = { t: 'all' }; update(); }));
        update();
      }
      function update() {
        const { rt, ct, N } = tot(), q = (a, b) => b > 0 ? a / b : NaN;
        const cellTxt = (i, j) => view === 'joint' ? p3(q(T[i][j], N)) : view === 'row' ? p3(q(T[i][j], rt[i])) : view === 'col' ? p3(q(T[i][j], ct[j])) : String(T[i][j]);
        const rtTxt = i => view === 'counts' ? String(rt[i]) : view === 'joint' ? p3(q(rt[i], N)) : view === 'row' ? '1.000' : p3(q(rt[i], N));
        const ctTxt = j => view === 'counts' ? String(ct[j]) : view === 'joint' ? p3(q(ct[j], N)) : view === 'row' ? p3(q(ct[j], N)) : '1.000';
        tw.querySelectorAll('[data-ci]').forEach(b => { b.textContent = cellTxt(+b.dataset.ci, +b.dataset.cj); });
        rows.forEach((_, i) => { tw.querySelector(`[data-rt="${i}"] button`).textContent = rtTxt(i); });
        cols.forEach((_, j) => { tw.querySelector(`[data-ct="${j}"] button`).textContent = ctTxt(j); });
        tw.querySelector('[data-gt] button').textContent = view === 'counts' ? String(N) : view === 'joint' ? '1.000' : '';
        // highlight
        tw.querySelectorAll('.on,.hl,.den').forEach(x => x.classList.remove('on', 'hl', 'den'));
        const cell = (i, j) => tw.querySelector(`td[data-i="${i}"][data-j="${j}"]`), rT = i => tw.querySelector(`[data-rt="${i}"]`), cT = j => tw.querySelector(`[data-ct="${j}"]`), gT = tw.querySelector('[data-gt]');
        if (sel.t === 'cell') { cell(sel.i, sel.j).classList.add('on'); rT(sel.i).classList.add('den'); cT(sel.j).classList.add('den'); gT.classList.add('den'); }
        else if (sel.t === 'row') { cols.forEach((_, j) => cell(sel.i, j).classList.add('hl')); rT(sel.i).classList.add('on'); gT.classList.add('den'); }
        else if (sel.t === 'col') { rows.forEach((_, i) => cell(i, sel.j).classList.add('hl')); cT(sel.j).classList.add('on'); gT.classList.add('den'); }
        else gT.classList.add('on');
        if (N <= 0) { frm.innerHTML = 'All counts are zero — enter some counts to see probabilities.'; roX(''); note.innerHTML = 'Nothing to analyse yet.'; return; }
        const f = (a, b) => `${a}/${b} = <b>${p3(q(a, b))}</b>`, P_ = s => `P(${esc(s)})`;
        if (sel.t === 'cell') {
          const i = sel.i, j = sel.j, n = T[i][j], ri = rows[i], cj = cols[j], ref = `${L(j)}${rowN(i)}`;
          const cR = q(n, rt[i]), mC = q(ct[j], N), cC = q(n, ct[j]), mR = q(rt[i], N);
          frm.innerHTML = `Joint ${P_(ri + ' and ' + cj)} = ${f(n, N)}<br>Conditional ${P_(cj + ' | ' + ri)} = ${f(n, rt[i])} &nbsp;·&nbsp; ${P_(ri + ' | ' + cj)} = ${f(n, ct[j])}<br>Marginal ${P_(ri)} = ${f(rt[i], N)} &nbsp;·&nbsp; ${P_(cj)} = ${f(ct[j], N)}`;
          roX(`<code class="xl">=${ref}/$${TL}$${TR}</code> <span class="wc-w">joint ·</span> <code class="xl">=${ref}/$${TL}${rowN(i)}</code> <span class="wc-w">given row ·</span> <code class="xl">=${ref}/${L(j)}$${TR}</code> <span class="wc-w">given column (table in A1:${TL}${TR})</span>`);
          const tol = Math.max(0.005, 0.03 * mC), indep = Math.abs(cR - mC) < tol;
          note.innerHTML = `Of the ${rt[i]} in <b>${esc(ri)}</b>, ${n} (${(cR * 100).toFixed(1)}%) are <b>${esc(cj)}</b>, compared with ${(mC * 100).toFixed(1)}% of all ${N}. ` + (indep ? `${P_(cj + ' | ' + ri)} ≈ ${P_(cj)}, so on this evidence the row and column variables look <b>independent</b> (a chi-square test would confirm).` : `Because ${P_(cj + ' | ' + ri)} = ${p3(cR)} ≠ ${P_(cj)} = ${p3(mC)}, the two variables are <b>not independent</b>: knowing the row changes the chance of ${esc(cj)}. (Check: ${P_(ri + ' and ' + cj)} = ${p3(q(n, N))} vs ${P_(ri)}·${P_(cj)} = ${p3(mR * mC)}.)`);
        } else if (sel.t === 'row') {
          const i = sel.i; frm.innerHTML = `Marginal ${P_(rows[i])} = ${f(rt[i], N)}<br>` + cols.map((c, j) => `${P_(c + ' | ' + rows[i])} = ${f(T[i][j], rt[i])}`).join(' &nbsp;·&nbsp; ');
          roX(`<code class="xl">=${TL}${rowN(i)}/$${TL}$${TR}</code> <span class="wc-w">marginal ·</span> <code class="xl">=B${rowN(i)}/$${TL}${rowN(i)}</code> <span class="wc-w">within row</span>`);
          note.innerHTML = `<b>${esc(rows[i])}</b> accounts for ${(q(rt[i], N) * 100).toFixed(1)}% of all ${N} — a <b>marginal</b> probability, read from the row total. The “within row” figures are conditional probabilities and add to 1.`;
        } else if (sel.t === 'col') {
          const j = sel.j; frm.innerHTML = `Marginal ${P_(cols[j])} = ${f(ct[j], N)}<br>` + rows.map((r, i) => `${P_(r + ' | ' + cols[j])} = ${f(T[i][j], ct[j])}`).join(' &nbsp;·&nbsp; ');
          roX(`<code class="xl">=${L(j)}${TR}/$${TL}$${TR}</code> <span class="wc-w">marginal ·</span> <code class="xl">=${L(j)}2/${L(j)}$${TR}</code> <span class="wc-w">within column</span>`);
          note.innerHTML = `<b>${esc(cols[j])}</b> accounts for ${(q(ct[j], N) * 100).toFixed(1)}% of all ${N} — a <b>marginal</b> probability, read from the column total. The “within column” figures are conditional probabilities and add to 1.`;
        } else {
          frm.innerHTML = `Grand total N = <b>${N}</b>. Joint and marginal probabilities divide by N; conditional probabilities divide by a row or column total instead.`;
          roX(`<code class="xl">=SUM(B2:${L(K - 1)}${R + 1})</code>`);
          note.innerHTML = 'Pick a cell to see joint, marginal and conditional probabilities side by side.';
        }
      }
      build();
    }
  });

  // ======================= bayes =======================
  // params: prior, sens (P(E|H)), fpr (P(E|not H)), hLabel, eLabel, n (frequency grid size, default 1000), view ("grid"/"tree")
  W.register('bayes', {
    title: "Bayes' theorem: update a probability with evidence",
    init(api, P, el) {
      P = P && typeof P === 'object' && !Array.isArray(P) ? P : {};
      style(); el.classList.add('wc'); const C = pal(el);
      let warnTxt = ''; const chk = (v, d, nm) => { const x = nv(v, d); if (v !== undefined && (x !== +v || x < 0 || x > 1)) warnTxt += `${nm} must be a probability between 0 and 1. `; return r2(clamp(x, 0, 1)); };
      let prior = chk(P.prior, 0.5, 'prior'), sens = chk(P.sens, 0.75, 'sens'), fpr = chk(P.fpr, 0.4, 'fpr'); prior = clamp(prior, 0.01, 0.99);
      const hL = P.hLabel ? String(P.hLabel) : 'bid is successful', eL = P.eLabel ? String(P.eLabel) : 'agency asks for more information';
      let n = Math.round(nv(P.n, 1000)); if (!(n >= 20 && n <= 2500)) { if (P.n !== undefined) warnTxt += 'n (grid size) should be between 20 and 2,500. '; n = clamp(n || 1000, 20, 2500); }
      let view = P.view === 'tree' ? 'tree' : 'grid', onlyE = false;
      const g1 = frame(api, `Frequency grid of ${n} cases`, nn => [nn ? 360 : 640, 260], () => draw()), gg = W.s('g', null, g1.svg);
      const g2 = frame(api, 'Probability tree', nn => [nn ? 360 : 640, 260], () => draw()), gt = W.s('g', null, g2.svg);
      api.seg([{ v: 'grid', label: `Frequency grid (${n.toLocaleString('en-IN')})` }, { v: 'tree', label: 'Probability tree' }], view, v => { view = v; draw(); });
      const bE = api.button('Show only cases with E', () => { onlyE = !onlyE; bE.setAttribute('aria-pressed', onlyE); draw(); }, false, api.controls); bE.setAttribute('aria-pressed', 'false');
      const sp = api.slider({ label: 'Prior P(H)', min: 0.01, max: 0.99, step: 0.01, value: prior, fmt: v => v.toFixed(2), onInput: v => { prior = r2(v); draw(); } });
      const ss = api.slider({ label: 'P(E | H) — E when H is true', min: 0, max: 1, step: 0.01, value: sens, fmt: v => v.toFixed(2), onInput: v => { sens = r2(v); draw(); } });
      const sf = api.slider({ label: 'P(E | Hᶜ) — E when H is false', min: 0, max: 1, step: 0.01, value: fpr, fmt: v => v.toFixed(2), onInput: v => { fpr = r2(v); draw(); } });
      const leg = W.el('div', { class: 'wc-legend' }); api.stage.appendChild(leg);
      const key = W.el('p', { class: 'wc-cap' }, `<b>H</b> = ${esc(hL)} · <b>E</b> (the evidence) = ${esc(eL)}`); api.stage.appendChild(key);
      const frm = W.el('div', { class: 'wc-frm' }); api.readout.appendChild(frm);
      const roE = api.ro('e', 'P(E)'), roPo = api.ro('po', 'Posterior P(H | E)'), roNE = api.ro('ne', 'P(H | no E)'), roX = api.ro('x', 'Excel');
      const note = api.note(''); const warn = msgEl(api.foot); warn(warnTxt.trim());
      const COL = [['var(--acc-deep)', 1], ['var(--acc-deep)', 0.3], [C.c2, 1], [C.c2, 0.26]];
      let rects = [], gridKey = '';
      function layoutGrid() {
        const aw = g1.w - 16, ah = g1.narrow ? 250 : 236; let best = { s: 0 };
        for (let c = 1; c <= Math.min(n, 200); c++) { const rr = Math.ceil(n / c), s = Math.min(aw / c, ah / rr); if (s > best.s) best = { s, c, rr }; }
        const s = Math.floor(best.s * 10) / 10, gw = s * best.c, x0 = (g1.w - gw) / 2; g1.setH(best.rr * s + 12);
        W.clear(gg); rects = []; const gap = s > 9 ? 1.6 : s > 5 ? 1 : 0.5;
        for (let k = 0; k < n; k++) { const c = Math.floor(k / best.rr), r = k % best.rr; rects.push(W.s('rect', { x: x0 + c * s, y: 6 + r * s, width: s - gap, height: s - gap, rx: s > 8 ? 2 : 0.5 }, gg)); }
        gridKey = `${g1.w}|${n}`;
      }
      function draw() {
        const pE = prior * sens + (1 - prior) * fpr, post = pE > 0 ? prior * sens / pE : NaN, pNE = 1 - pE, postN = pNE > 0 ? prior * (1 - sens) / pNE : NaN;
        const nH = Math.round(n * prior), nHE = Math.round(nH * sens), nN = n - nH, nNE = Math.round(nN * fpr), grp = [nHE, nH - nHE, nNE, nN - nNE];
        g1.svg.style.display = view === 'grid' ? '' : 'none'; g2.svg.style.display = view === 'tree' ? '' : 'none'; bE.style.display = view === 'grid' ? '' : 'none';
        if (view === 'grid') {
          if (gridKey !== `${g1.w}|${n}`) layoutGrid();
          let k = 0; grp.forEach((cnt, gi) => { for (let t = 0; t < cnt; t++, k++) { const [c, o] = COL[gi], faded = onlyE && (gi === 1 || gi === 3); rects[k].setAttribute('style', `fill:${c};opacity:${faded ? 0.07 : o}`); } });
        } else drawTree(pE);
        const sw = (gi) => `<span class="wc-sw" style="background:${COL[gi][0]};opacity:${COL[gi][1]}"></span>`;
        leg.style.display = view === 'grid' ? '' : 'none';
        leg.innerHTML = `<span>${sw(0)}H and E: <b>${grp[0]}</b></span><span>${sw(1)}H, no E: <b>${grp[1]}</b></span><span>${sw(2)}not H, but E: <b>${grp[2]}</b></span><span>${sw(3)}not H, no E: <b>${grp[3]}</b></span>`;
        const a = prior.toFixed(2), b = sens.toFixed(2), c = (1 - prior).toFixed(2), d = fpr.toFixed(2), num = prior * sens;
        frm.innerHTML = `P(H | E) = ${frac('P(H)·P(E | H)', 'P(H)·P(E | H) + P(Hᶜ)·P(E | Hᶜ)')} = ${frac(`${a} × ${b}`, `${a} × ${b} + ${c} × ${d}`)} = ${frac(num.toFixed(4), pE.toFixed(4))} = <b>${p3(post)}</b><br><span style="color:var(--muted);font-size:.86rem">In counts: of ${grp[0] + grp[2]} cases with E, ${grp[0]} have H → ${grp[0]}/${grp[0] + grp[2]} = ${p3(grp[0] / Math.max(1, grp[0] + grp[2]))}${n < 1000 ? ' (rounded counts)' : ''}</span>`;
        roE(`${a}×${b} + ${c}×${d} = ${pE.toFixed(4)}`); roPo(p3(post)); roNE(p3(postN)); roX(`=(${xn(prior)}*${xn(sens)})/(${xn(prior)}*${xn(sens)}+${xn(1 - prior)}*${xn(fpr)})`);
        let h;
        if (!(pE > 0)) h = 'With these numbers E never happens, so P(H | E) is undefined — raise P(E | H) or P(E | Hᶜ).';
        else {
          const lr = fpr > 0 ? sens / fpr : Infinity, up = post > prior + 0.0005, dn = post < prior - 0.0005;
          h = `Before the evidence, P(H) = <b>${(prior * 100).toFixed(1)}%</b> (H: ${esc(hL)}). After E (${esc(eL)}), it ${up ? 'rises' : dn ? 'falls' : 'stays'} ${up || dn ? 'to' : 'at'} <b>${(post * 100).toFixed(1)}%</b>. `;
          h += !isFinite(lr) ? 'E never happens without H, so seeing E makes H certain.' : lr > 1.02 ? `E is ${lr.toFixed(1)}× as likely when H is true (${(sens * 100).toFixed(0)}% vs ${(fpr * 100).toFixed(0)}%), so it is good news for H — but not proof: ${((1 - post) * 100).toFixed(1)}% of cases with E still have H false.` : lr < 0.98 ? `E is less likely when H is true (${(sens * 100).toFixed(0)}% vs ${(fpr * 100).toFixed(0)}%), so seeing it is bad news for H.` : 'E is equally likely either way, so it tells you nothing about H.';
          if (prior < 0.2 && post < 0.5 && lr > 1.02) h += ' A low starting chance (prior) keeps the posterior modest even with fairly good evidence — the classic “base-rate” trap.';
        }
        note.innerHTML = h;
      }
      function drawTree(pE) {
        W.clear(gt); const Wd = g2.w, H = 260, nr = g2.narrow, x0 = 18, x1 = Wd * (nr ? 0.3 : 0.3), x2 = Wd * (nr ? 0.58 : 0.6), ys = [0.13, 0.37, 0.63, 0.87].map(v => v * (H - 10) + 5), yH = (ys[0] + ys[1]) / 2, yN = (ys[2] + ys[3]) / 2, ym = H / 2;
        const br = (xa, ya, xb, yb, t, hot) => { W.s('line', { x1: xa, y1: ya, x2: xb, y2: yb, style: `stroke:${hot ? 'var(--acc-deep)' : 'var(--line-2)'};stroke-width:${hot ? 2.6 : 1.8}` }, gt); W.text(gt, (xa + xb) / 2, (ya + yb) / 2 - 6, t, `font-size:${nr ? 11 : 12}px;font-weight:700;fill:${hot ? 'var(--acc-fg)' : 'var(--ink-2)'};paint-order:stroke;stroke:var(--surface);stroke-width:4px`); };
        const node = (x, y, t, fill, ink) => { W.s('rect', { x: x - 20, y: y - 12, width: 40, height: 24, rx: 12, style: `fill:${fill};stroke:var(--line-2)` }, gt); W.text(gt, x, y + 4.5, t, `font-size:13px;font-weight:700;fill:${ink}`); };
        br(x0 + 6, ym, x1 - 20, yH, `${nr ? '' : 'P(H) = '}${prior.toFixed(2)}`); br(x0 + 6, ym, x1 - 20, yN, `${nr ? '' : 'P(Hᶜ) = '}${(1 - prior).toFixed(2)}`);
        br(x1 + 20, yH, x2 - 20, ys[0], `${nr ? '' : 'P(E|H) = '}${sens.toFixed(2)}`, true); br(x1 + 20, yH, x2 - 20, ys[1], (1 - sens).toFixed(2));
        br(x1 + 20, yN, x2 - 20, ys[2], `${nr ? '' : 'P(E|Hᶜ) = '}${fpr.toFixed(2)}`, true); br(x1 + 20, yN, x2 - 20, ys[3], (1 - fpr).toFixed(2));
        W.s('circle', { cx: x0, cy: ym, r: 6, style: 'fill:var(--ink)' }, gt);
        node(x1, yH, 'H', 'var(--acc-bg)', 'var(--acc-fg)'); node(x1, yN, 'Hᶜ', 'var(--surface-2)', 'var(--ink-2)');
        const leaf = [['E', prior * sens, 'P(H∩E)', true], ['Eᶜ', prior * (1 - sens), 'P(H∩Eᶜ)', false], ['E', (1 - prior) * fpr, 'P(Hᶜ∩E)', true], ['Eᶜ', (1 - prior) * (1 - fpr), 'P(Hᶜ∩Eᶜ)', false]];
        leaf.forEach(([t, v, nm, hot], i) => { node(x2, ys[i], t, hot ? 'var(--acc-deep)' : 'var(--surface-2)', hot ? '#fff' : 'var(--ink-2)'); W.text(gt, x2 + 28, ys[i] + 4.5, nr ? `${nm.slice(2, -1)} ${v.toFixed(3)}` : `${nm} = ${v.toFixed(4)}`, `font-size:${nr ? 12 : 13}px;font-weight:${hot ? 700 : 400};fill:${hot ? 'var(--acc-fg)' : 'var(--ink-2)'}`, 'start'); });
        if (nr) return;
        const bx = Wd - 10; W.s('path', { d: `M${bx - 6},${ys[0]}h6V${ys[2]}h-6`, style: 'fill:none;stroke:var(--acc-bd);stroke-width:1.5;stroke-dasharray:3 3' }, gt);
        W.text(gt, bx - 4, (ys[1] + ys[2]) / 2 + 4, `P(E) = ${pE.toFixed(4)}`, `font-size:${nr ? 10.5 : 11.5}px;font-weight:700;fill:var(--acc-fg)`, 'end');
      }
      draw();
    }
  });

  // ======================= expected-value =======================
  // params: x (array of outcomes), p (array of probabilities), label (what X is), unit
  W.register('expected-value', {
    title: 'Expected value of a discrete random variable',
    init(api, P, el) {
      P = P && typeof P === 'object' && !Array.isArray(P) ? P : {};
      style(); el.classList.add('wc'); const C = pal(el);
      let warnTxt = '', rows = [];
      const xs = Array.isArray(P.x) ? P.x : null, ps = Array.isArray(P.p) ? P.p : null;
      if (xs && ps && xs.length === ps.length && xs.length >= 1 && xs.length <= 15) rows = xs.map((x, i) => ({ x: String(x), p: String(ps[i]) }));
      else if (P.x !== undefined || P.p !== undefined) warnTxt = 'x and p must be lists of the same length (1–15 outcomes) — showing the example instead.';
      const useDef = !rows.length;
      if (useDef) rows = [{ x: '5000', p: '0.95' }, { x: '-45000', p: '0.04' }, { x: '-195000', p: '0.01' }];
      const unit = P.unit !== undefined ? String(P.unit) : (useDef ? '₹' : ''), label = P.label ? String(P.label) : (useDef ? 'profit per policy' : 'value of X');
      const st = frame(api, `Probability distribution of ${label}`, n => [n ? 360 : 640, 248], () => draw());
      const g = W.s('g', null, st.svg);
      const tw = W.el('div', { class: 'wc-tw fit' }), two = W.el('div', { class: 'wc-o' }); two.appendChild(tw); api.controls.appendChild(two); two.style.gridColumn = '1/-1';
      api.button('Add outcome', () => { if (rows.length >= 15) return; rows.push({ x: '', p: '0' }); build(); const ins = tw.querySelectorAll('input[data-k="x"]'); ins[ins.length - 1].focus(); }, false, api.controls);
      api.button('Remove last', () => { if (rows.length > 1) { rows.pop(); build(); } }, false, api.controls);
      const roE = api.ro('e', 'E(X) = Σ x·P(x)'), roV = api.ro('v', 'Var(X)'), roS = api.ro('s', 'SD'), roX = roH(api, 'Excel');
      if (useDef) { const cap = W.el('p', { class: 'wc-cap' }, 'An insurer charges a ₹5,000 premium. A minor claim costs ₹50,000 (4% of policies), a major one ₹2,00,000 (1%). Profit per policy is the premium minus any claim.'); api.stage.appendChild(cap); }
      const note = api.note(''); const warn = msgEl(api.foot); warn(warnTxt);
      const dOf = s => { const i = String(s).indexOf('.'); return i < 0 ? 0 : Math.min(4, String(s).length - i - 1); };
      function build() {
        tw.innerHTML = `<table class="wc-t"><thead><tr><th>x (${esc(label)}${unit ? ', ' + esc(unit) : ''})</th><th>P(x)</th><th>x·P(x)</th><th class="wc-hide-sm">(x − μ)²·P(x)</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td><input type="text" inputmode="decimal" data-k="x" data-i="${i}" value="${esc(r.x)}" aria-label="Outcome ${i + 1}" style="width:6.4rem;text-align:left"></td><td><input type="text" inputmode="decimal" data-k="p" data-i="${i}" value="${esc(r.p)}" aria-label="Probability of outcome ${i + 1}"></td><td data-xp="${i}"></td><td class="wc-hide-sm" data-vp="${i}"></td></tr>`).join('')}<tr class="tot"><td>Total</td><td data-sp></td><td data-se></td><td class="wc-hide-sm" data-sv></td></tr></tbody></table>`;
        tw.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { rows[+inp.dataset.i][inp.dataset.k] = inp.value; draw(); }));
        draw();
      }
      function draw() {
        const clean = s => String(s).replace(/[,₹$€£\s]/g, '');
        const vals = rows.map(r => ({ x: clean(r.x) === '' ? NaN : +clean(r.x), p: clean(r.p) === '' ? NaN : +clean(r.p) }));
        let bad = []; vals.forEach((v, i) => { const ix = tw.querySelector(`input[data-k="x"][data-i="${i}"]`), ip = tw.querySelector(`input[data-k="p"][data-i="${i}"]`); const bx = !isFinite(v.x), bp = !isFinite(v.p) || v.p < 0 || v.p > 1; if (ix) ix.setAttribute('aria-invalid', bx); if (ip) ip.setAttribute('aria-invalid', bp); if (bx) bad.push(`outcome ${i + 1} is not a number`); if (bp) bad.push(`P(x) in row ${i + 1} must be between 0 and 1`); });
        const ok = vals.filter(v => isFinite(v.x) && isFinite(v.p) && v.p >= 0 && v.p <= 1), sp = ok.reduce((s, v) => s + v.p, 0);
        const mu = ok.reduce((s, v) => s + v.x * v.p, 0), vr = ok.reduce((s, v) => s + (v.x - mu) ** 2 * v.p, 0), sd = Math.sqrt(vr), sumOK = Math.abs(sp - 1) < 0.0005;
        const dx = Math.min(4, Math.max(0, ...rows.map(r => dOf(clean(r.x))))), dd = Math.min(4, dx + 2);
        vals.forEach((v, i) => { const okr = isFinite(v.x) && isFinite(v.p) && v.p >= 0 && v.p <= 1; const a = tw.querySelector(`[data-xp="${i}"]`), b = tw.querySelector(`[data-vp="${i}"]`); if (a) a.textContent = okr ? loc(v.x * v.p, dd) : '—'; if (b) b.textContent = okr ? loc((v.x - mu) ** 2 * v.p, dd) : '—'; });
        const tS = tw.querySelector('[data-sp]'); tS.innerHTML = `<span style="color:${sumOK ? 'var(--ok)' : 'var(--bad)'}">${loc(sp, 4)} ${sumOK ? '✓' : '✗'}</span>`; tw.querySelector('[data-se]').textContent = loc(mu, dd); tw.querySelector('[data-sv]').textContent = loc(vr, dd);
        let m = bad.length ? `Check the table: ${bad.slice(0, 3).join('; ')}.` : '';
        if (!sumOK && ok.length) m += ` The probabilities add to ${loc(sp, 4)}, but they must add to exactly 1${sp < 1 ? ` (${loc(1 - sp, 4)} is missing)` : ''}.`;
        warn(m.trim() || warnTxt);
        // chart
        W.clear(g); const L = 42, R = st.w - 18, T = 26, B = 176;
        if (ok.length) {
          const xv = ok.map(v => v.x), lo = minOf(xv), hi = maxOf(xv), srt = [...new Set(xv)].sort((a, b) => a - b); let gapMin = Infinity; for (let i = 1; i < srt.length; i++) gapMin = Math.min(gapMin, srt[i] - srt[i - 1]);
          let span = hi - lo; if (!(span > 0)) span = Math.max(1, Math.abs(hi) * 0.5); const pad = Math.max(span * 0.08, isFinite(gapMin) ? gapMin * 0.6 : span * 0.3);
          const d0 = Math.min(lo - pad, mu - sd), d1 = Math.max(hi + pad, mu + sd), sx = W.scale(d0, d1, L, R), pm = Math.max(0.01, ...ok.map(v => v.p)), sy = W.scale(0, pm * 1.18, B, T);
          const bw = Math.max(4, Math.min(42, isFinite(gapMin) ? (sx(d0 + gapMin) - sx(d0)) * 0.6 : 42));
          W.axisY(g, sy, L, W.nice(0, pm * 1.1, 4).filter(v => v <= pm * 1.18), v => (+v.toFixed(3)).toString(), { grid: true, x1: R, label: 'P(x)', y0: T });
          W.s('rect', { x: sx(mu - sd), y: B + 40, width: Math.max(1, sx(mu + sd) - sx(mu - sd)), height: 7, rx: 3.5, style: `fill:${C.c2};opacity:.35` }, g);
          ok.forEach(v => { W.s('rect', { x: sx(v.x) - bw / 2, y: sy(v.p), width: bw, height: B - sy(v.p), rx: 2, style: 'fill:var(--acc-deep)' }, g); });
          const fitLab = srt.every((x, i) => i === 0 || sx(x) - sx(srt[i - 1]) > 46);
          ok.forEach(v => { if (fitLab || ok.length <= 8) W.text(g, sx(v.x), sy(v.p) - 5, (+v.p.toFixed(4)).toString(), 'font-size:11.5px;fill:var(--ink-2)'); });
          W.s('line', { x1: L, x2: R, y1: B, y2: B, style: 'stroke:var(--line-2);stroke-width:1.2' }, g);
          if (fitLab) srt.forEach(x => W.text(g, sx(x), B + 16, fu(x, unit, dx), 'font-size:11.5px;fill:var(--muted)'));
          else W.nice(d0, d1, st.narrow ? 4 : 6).filter(t => t >= d0 && t <= d1).forEach(t => { vline(g, sx(t), B, B + 4); W.text(g, sx(t), B + 16, loc(t, 3), 'font-size:11.5px;fill:var(--muted)'); });
          const mx = sx(mu); W.s('path', { d: `M${mx},${B + 22}l-8,14h16Z`, style: `fill:${C.c2}` }, g);
          W.text(g, Math.max(L + 80, Math.min(R - 80, mx)), B + 64, `E(X) = ${fu(mu, unit, dd)} · the balance point`, `font-size:12.5px;font-weight:700;fill:${C.c2f}`);
          const sdx = sx(mu + sd) + 6; W.text(g, Math.min(sdx, R - 40), B + 47, '±1 SD', `font-size:10.5px;fill:${C.c2f}`, 'start');
        } else W.text(g, st.w / 2, (T + B) / 2, 'Enter outcomes and probabilities in the table', 'font-size:13px;fill:var(--muted)');
        const n = rows.length, A = `A2:A${n + 1}`, Bp = `B2:B${n + 1}`;
        roE(fu(mu, unit, dd)); roV(loc(vr, dd)); roS(fu(sd, unit, dd));
        roX(`<code class="xl">=SUMPRODUCT(${A},${Bp})</code> <span class="wc-w">E(X) ·</span> <code class="xl">=SUMPRODUCT((${A}-${xn(mu)})^2,${Bp})</code> <span class="wc-w">Var(X) ·</span> <code class="xl">=SQRT(…)</code> <span class="wc-w">SD ·</span> <code class="xl">=SUM(${Bp})</code> <span class="wc-w">must be 1</span>`);
        const L1 = esc(label);
        let h = `If this situation repeats many times, the long-run average of ${L1} is <b>E(X) = ${fu(mu, unit, dd)}</b>. `;
        if (ok.length > 1) h += useDef ? `No single policy earns ₹1,000 — each one earns ₹5,000 or loses ₹45,000 or ₹1,95,000 — but across thousands of policies the insurer averages ${fu(mu, unit, dd)} profit per policy. The SD of ${fu(sd, unit, dd)} shows how risky any one policy is.` : `The SD of ${fu(sd, unit, dd)} measures how far a single outcome typically lands from that average.`;
        if (!sumOK) h = `<b>Not a valid probability distribution yet</b> — the probabilities must add to 1. ` + h;
        note.innerHTML = h;
      }
      const vline = (gg, x, y1, y2) => W.s('line', { x1: x, x2: x, y1, y2, style: 'stroke:var(--line-2)' }, gg);
      build();
    }
  });

  // ======================= poisson =======================
  // params: lambda, k, label (what is counted), mode ("eq"/"le"/"ge"/"gt")
  W.register('poisson', {
    title: 'Poisson distribution explorer',
    init(api, P, el) {
      P = P && typeof P === 'object' && !Array.isArray(P) ? P : {};
      style(); el.classList.add('wc');
      let warnTxt = '', lam = nv(P.lambda, 4); if (!(lam > 0 && lam <= 60)) { if (P.lambda !== undefined) warnTxt = 'λ must be a positive average (up to 60), so the example value 4 is used. '; lam = 4; }
      lam = Math.round(lam * 10) / 10 || 0.1;
      let k = Math.round(nv(P.k, Math.round(lam) + 2)); if (k < 0) k = 0;
      let mode = ['eq', 'le', 'ge', 'gt'].includes(P.mode) ? P.mode : 'eq';
      const what = P.label ? String(P.label) : 'customers arriving per 10 minutes';
      const xMax = l => Math.min(80, Math.max(10, Math.ceil(l + 4 * Math.sqrt(l) + 4)));
      if (k > xMax(lam)) { if (P.k !== undefined && k > 80) warnTxt += 'k was larger than the chart allows, so it was reduced.'; k = Math.min(k, 80); }
      const st = frame(api, 'Poisson probability bars', n => [n ? 360 : 640, 270], () => draw());
      const g = W.s('g', null, st.svg);
      api.seg([{ v: 'eq', label: 'P(X = k)' }, { v: 'le', label: 'P(X ≤ k)' }, { v: 'ge', label: 'P(X ≥ k)' }, { v: 'gt', label: 'P(X > k)' }], mode, v => { mode = v; draw(); });
      const sl = api.slider({ label: 'λ (average count per interval)', min: 0.1, max: Math.max(20, Math.ceil(lam)), step: 0.1, value: lam, fmt: v => v.toFixed(1), onInput: v => { lam = Math.round(v * 10) / 10; sk.input.max = Math.max(xMax(lam), k); draw(); } });
      const sk = api.slider({ label: 'k', min: 0, max: Math.max(xMax(lam), k), step: 1, value: k, onInput: v => { k = v; draw(); } });
      const roEq = api.ro('eq', 'P(X = k)'), roLe = api.ro('le', 'P(X ≤ k)'), roSel = api.ro('sel', 'Selected'), roM = api.ro('m', 'Mean = variance = λ'), roS = api.ro('s', 'SD √λ'), roX = api.ro('x', 'Excel');
      const note = api.note(''); const warn = msgEl(api.foot); warn(warnTxt.trim());
      const inSel = x => mode === 'eq' ? x === k : mode === 'le' ? x <= k : mode === 'ge' ? x >= k : x > k;
      function draw() {
        W.clear(g); const xm = Math.max(xMax(lam), k + 1), pm = []; let mx = 0; for (let x = 0; x <= xm; x++) { const v = S.poissonPmf(x, lam); pm.push(v); if (v > mx) mx = v; }
        const L = 46, R = st.w - 14, T = 20, B = 214, sx = W.scale(-0.5, xm + 0.5, L, R), sy = W.scale(0, mx * 1.15, B, T), bw = Math.max(2, (R - L) / (xm + 1) * 0.78);
        W.axisY(g, sy, L, W.nice(0, mx * 1.1, 4), t => t.toFixed(2), { grid: true, x1: R });
        let tot = 0; const every = Math.ceil((xm + 1) / (st.narrow ? 14 : 24));
        pm.forEach((v, x) => { const s = inSel(x); if (s) tot += v; W.s('rect', { x: sx(x) - bw / 2, y: sy(v), width: bw, height: Math.max(0, B - sy(v)), rx: 2, style: s ? 'fill:var(--acc-deep)' : 'fill:var(--line-2)' }, g); if (x % every === 0 || x === k) W.text(g, sx(x), B + 16, String(x), `font-size:11px;fill:${x === k ? 'var(--acc-fg)' : 'var(--muted)'};font-weight:${x === k ? 700 : 400}`); });
        if (mode === 'ge' || mode === 'gt') tot = 1 - S.poissonCdf(mode === 'ge' ? k - 1 : k, lam);
        W.s('line', { x1: L, x2: R, y1: B, y2: B, style: 'stroke:var(--line-2)' }, g);
        W.s('path', { d: `M${sx(lam)},${B + 22}l-6,10h12Z`, style: 'fill:var(--ink-2)' }, g); W.text(g, sx(lam) + 10, B + 32, `mean λ = ${lam.toFixed(1)}`, 'font-size:11px;fill:var(--ink-2)', 'start');
        W.text(g, R, B + 50, `number of ${what}`, 'font-size:12px;fill:var(--muted);font-weight:700', 'end');
        const pe = S.poissonPmf(k, lam), pl = S.poissonCdf(k, lam), sym = { eq: '=', le: '≤', ge: '≥', gt: '>' }[mode];
        roEq(pe.toFixed(4)); roLe(pl.toFixed(4)); roSel(`P(X ${sym} ${k}) = ${tot.toFixed(4)}`); roM(lam.toFixed(1)); roS(Math.sqrt(lam).toFixed(3));
        roX(mode === 'eq' ? `=POISSON.DIST(${k},${lam},FALSE)` : mode === 'le' ? `=POISSON.DIST(${k},${lam},TRUE)` : mode === 'ge' ? (k === 0 ? '=1 (X ≥ 0 always)' : `=1-POISSON.DIST(${k - 1},${lam},TRUE)`) : `=1-POISSON.DIST(${k},${lam},TRUE)`);
        note.innerHTML = `If on average there are ${lam.toFixed(1)} ${esc(what)}, the chance of ${{ eq: 'exactly', le: 'at most', ge: 'at least', gt: 'more than' }[mode]} ${k} is <b>${tot.toFixed(4)}</b> — ${tot < 0.001 ? 'less than 1 in 1,000' : tot > 0.999 ? 'practically certain' : `about ${Math.round(tot * 100)} times in 100`}. For a Poisson count the mean and the variance are both λ.`;
      }
      draw();
    }
  });
})();
