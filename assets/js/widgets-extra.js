/* Statistics for Managers — widget pack "extra"
   forecast · control-chart · kmeans · index-number · scales
   Uses SFMW (widgets.js) and Stats (stats.js). Vanilla JS, no libraries. */
(function () {
  'use strict';
  const W = window.SFMW, S = window.Stats;
  if (!W || !S) return;

  // ------------------------------------------------------------------ shared helpers
  const CSS = `
.wz .w-readout .ro{max-width:100%;overflow-wrap:anywhere}
.wz .w-readout b,.wz code,.wz output,.wz .wz-t td,.wz .wz-frm{font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0}
.wz code.xl{white-space:normal;overflow-wrap:anywhere}
.wz .wz-msg{margin:.6rem 0 0;padding:.45rem .7rem;border-radius:9px;background:var(--warn-bg);color:var(--warn);font-size:.88rem}
.wz .wz-msg[hidden]{display:none}
.wz .wz-cap{font-size:.84rem;color:var(--muted);margin:.4rem 0 0;line-height:1.45}
.wz .wz-legend{display:flex;flex-wrap:wrap;gap:.25rem 1.1rem;font-size:.86rem;color:var(--ink-2);margin:.45rem 0 0;line-height:1.4}
.wz .wz-legend span{display:inline-flex;align-items:center;gap:.35rem}
.wz .wz-legend svg{width:22px;height:14px;flex:none;display:inline-block}
.wz .wz-tw{width:100%;max-width:100%;overflow:auto;margin:.7rem 0 0;border:1px solid var(--line);border-radius:10px;background:var(--surface);-webkit-overflow-scrolling:touch}
.wz .wz-tw.scroll{max-height:19rem}
.wz .wz-tw.fit{width:fit-content}
.wz table.wz-t{width:100%;border-collapse:separate;border-spacing:0;font-size:.88rem;font-variant-numeric:tabular-nums}
.wz table.wz-t caption{caption-side:top;text-align:left;font-size:.84rem;color:var(--muted);padding:.45rem .6rem .2rem;font-weight:700}
.wz table.wz-t th,.wz table.wz-t td{padding:.32rem .5rem;border-bottom:1px solid var(--line);text-align:right;vertical-align:middle;white-space:nowrap}
.wz table.wz-t th:first-child,.wz table.wz-t td:first-child{text-align:left}
.wz table.wz-t thead th{background:var(--surface-2);font-size:.78rem;color:var(--ink-2);position:sticky;top:0;z-index:1}
.wz table.wz-t tr.tot td{background:var(--surface-2);font-weight:700}
.wz table.wz-t tr.tot.stick td{position:sticky;bottom:0;box-shadow:0 -1px 0 var(--line)}
.wz table.wz-t tbody tr:last-child td{border-bottom:0}
.wz table.wz-t tr.sel td{background:var(--acc-bg);color:var(--acc-fg);font-weight:700}
.wz table.wz-t tr.nx td{font-style:italic}
.wz table.wz-t tr.pick{cursor:pointer}
.wz table.wz-t tr.pick:hover td{background:var(--surface-2)}
.wz table.wz-t tr.pick.sel:hover td{background:var(--acc-bg)}
.wz table.wz-t tr.pick:focus-visible{outline:3px solid var(--focus);outline-offset:-3px}
.wz table.wz-t .lab{color:var(--muted);font-weight:400;font-size:.76rem;margin-right:.25rem}
.wz table.wz-t td.hl,.wz table.wz-t th.hl{background:var(--acc-bg);color:var(--acc-fg);font-weight:700}
.wz table.wz-t input{font:inherit;font-size:.88rem;width:4.8rem;max-width:100%;padding:.25rem .35rem;border:1px solid var(--line-2);border-radius:7px;background:var(--surface);color:var(--ink);text-align:right}
.wz table.wz-t input.nm{width:7.2rem;text-align:left}
.wz table.wz-t input[aria-invalid="true"]{border-color:var(--bad);background:var(--bad-bg)}
.wz .wz-frm{flex-basis:100%;background:var(--surface-2);border-radius:10px;padding:.55rem .75rem;font-size:.92rem;line-height:1.8;overflow-wrap:anywhere;min-width:0}
.wz .wz-frm b{color:var(--acc-fg)}
.wz .wz-frm .m{color:var(--muted);font-size:.86rem}
.wz .wz-xl{border:1px solid color-mix(in srgb,var(--excel) 30%,transparent);background:var(--surface);border-radius:10px;padding:.5rem .75rem;font-size:.88rem;line-height:1.75;overflow-wrap:anywhere;min-width:0;margin:.7rem 0 0}
.wz .wz-xl .h{display:inline-block;font-weight:700;color:var(--excel);margin-right:.35rem}
.wz .wz-xl .menu-path{white-space:normal}
.wz .wz-mut{color:var(--muted)}
.wz details.wz-d{margin:.7rem 0 0;border:1px dashed var(--line-2);border-radius:10px;padding:.35rem .7rem}
.wz details.wz-d>summary{cursor:pointer;font-size:.88rem;font-weight:700;color:var(--acc-fg)}
.wz details.wz-d[open]{padding-bottom:.6rem}
.wz .wz-sw{display:inline-block;width:.85em;height:.85em;border-radius:3px;vertical-align:-.08em;margin-right:.3em}
.wz .wz-ix{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:.55rem;flex-basis:100%;min-width:0}
.wz .wz-ix>div{background:var(--surface-2);border-radius:10px;padding:.5rem .7rem;min-width:0;overflow-wrap:anywhere;font-size:.9rem;line-height:1.5}
.wz .wz-ix>div.on{background:var(--acc-bg);box-shadow:inset 0 0 0 1.5px var(--acc-bd)}
.wz .wz-ix .nm{font-weight:700;display:flex;justify-content:space-between;gap:.5rem;align-items:baseline}
.wz .wz-ix .nm b{font-family:var(--mono);font-weight:500;color:var(--acc-fg);font-size:1.02rem}
.wz .wz-ix .f{color:var(--ink-2);font-size:.86rem}
.wz .wz-ix .f code{font-size:.8rem}
.wz .wz-panel{border:1px solid var(--line);border-radius:12px;padding:.6rem .8rem;margin:.7rem 0 0;background:var(--surface)}
.wz .wz-panel[hidden]{display:none}
.wz .wz-panel .row{display:flex;flex-wrap:wrap;gap:.5rem 1.2rem;align-items:center}
.wz .wz-panel label{display:flex;gap:.5rem;align-items:center;font-size:.9rem}
.wz .wz-panel .w-input{width:7.5rem}
@media (max-width:440px){.wz .wz-hide-sm{display:none}}
.wz .wz-sm-only{display:none}
@media (max-width:600px){.wz .wz-sm-only{display:inline}.wz p.wz-sm-only{display:block}}
.wz .sc-cur{border:2px solid var(--acc-bd);border-radius:14px;padding:.7rem .9rem;background:var(--acc-bg);display:flex;flex-direction:column;gap:.15rem}
.wz .sc-cur small{font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--acc-fg)}
.wz .sc-cur b{font-size:1.08rem;line-height:1.35;color:var(--ink)}
.wz .sc-bins{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.55rem;margin-top:.7rem}
@media (max-width:620px){.wz .sc-bins{grid-template-columns:repeat(2,minmax(0,1fr))}}
.wz .sc-bin{border:1.5px dashed var(--line-2);border-radius:12px;padding:.45rem;background:var(--surface-2);min-width:0;display:flex;flex-direction:column;gap:.35rem}
.wz .sc-bin.flash-ok{border-color:var(--ok);border-style:solid}
.wz .sc-bin.flash-no{border-color:var(--bad);border-style:solid}
.wz .sc-bb{font:inherit;cursor:pointer;border:1px solid var(--line-2);border-radius:10px;background:var(--surface);color:var(--ink);padding:.5rem .55rem;text-align:left;display:flex;flex-direction:column;gap:.1rem;min-height:3.6rem}
.wz .sc-bb:hover{border-color:var(--acc-bd)}
.wz .sc-bb b{font-size:.98rem;display:flex;justify-content:space-between;gap:.3rem;align-items:center}
.wz .sc-bb kbd{font-size:.72rem;font-weight:400;color:var(--muted)}
.wz .sc-bb small{font-size:.78rem;color:var(--muted);line-height:1.3}
.wz .sc-bb[disabled]{cursor:default;opacity:.7}
.wz .sc-list{display:flex;flex-direction:column;gap:.25rem}
.wz .sc-pl{all:unset;box-sizing:border-box;cursor:pointer;font-size:.8rem;line-height:1.3;padding:.22rem .45rem;border-radius:7px;overflow-wrap:anywhere}
.wz .sc-pl.ok{background:var(--ok-bg);color:var(--ok)}
.wz .sc-pl.no{background:var(--bad-bg);color:var(--bad)}
.wz .sc-pl:focus-visible{outline:3px solid var(--focus)}
.wz .sc-pl i{font-style:normal;display:block;font-size:.72rem;opacity:.9}
.wz .sc-fb{margin:.65rem 0 0;padding:.5rem .75rem;border-radius:10px;font-size:.92rem;background:var(--surface-2);min-height:2.4rem}
.wz .sc-fb.ok{background:var(--ok-bg)}
.wz .sc-fb.no{background:var(--bad-bg)}
.wz .sc-fb .v-ok{color:var(--ok);font-weight:700}
.wz .sc-fb .v-no{color:var(--bad);font-weight:700}
.wz .sc-pool{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.35rem}
.wz .sc-chip{font:inherit;font-size:.84rem;padding:.28rem .62rem;border-radius:999px;border:1px solid var(--line-2);background:var(--surface);color:var(--ink);cursor:pointer;text-align:left;line-height:1.3;max-width:100%}
.wz .sc-chip:hover{border-color:var(--acc-bd)}
.wz .sc-chip[aria-pressed="true"]{background:var(--acc-deep);border-color:var(--acc-deep);color:#fff}
.wz .sc-h{font-size:.84rem;color:var(--muted);margin:.7rem 0 0;font-weight:700}
.wz table.wz-t td.y{color:var(--ok);font-weight:700;text-align:center}
.wz table.wz-t td.n{color:var(--muted);text-align:center}
.wz table.sc-t td,.wz table.sc-t th{white-space:normal}
.wz table.sc-t tr.sel td{color:var(--ink)}
.wz svg .wz-hit{fill:transparent}
`;
  function style() { if (document.getElementById('wx-extra-css')) return; const s = document.createElement('style'); s.id = 'wx-extra-css'; s.textContent = CSS; document.head.appendChild(s); }
  const nv = (v, d) => (v === undefined || v === null || v === '' || typeof v === 'boolean' || !isFinite(+v)) ? d : +v;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toNum = v => { if (typeof v === 'number') return v; if (typeof v === 'string') { const c = v.replace(/[,₹$€£%\s]/g, ''); return c === '' ? NaN : +c; } return NaN; };
  const decOf = v => { const s = String(v); if (/e/i.test(s)) return 0; const i = s.indexOf('.'); return i < 0 ? 0 : Math.min(4, s.length - i - 1); };
  const minOf = a => a.reduce((m, v) => v < m ? v : m, Infinity), maxOf = a => a.reduce((m, v) => v > m ? v : m, -Infinity);
  const sum = a => a.reduce((s, v) => s + v, 0);
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
  const xn = v => String(+(+v).toFixed(6));
  const pct = (v, d = 1) => isFinite(v) ? (v > 0 ? '+' : '') + loc(v, d, true) + '%' : '—';
  function pal(el) {
    const host = el.closest('.c-descriptive,.c-probability,.c-inferential,.c-relationships') || document.body;
    const m = /(?:pillar|c)-(descriptive|probability|inferential|relationships)/.exec(host.className || '');
    const cur = m ? m[1][0] : 'n', o = ['p', 'i', 'd', 'r'].filter(x => x !== cur);
    return { cur, c2: `var(--${o[0]}-deep)`, c2f: `var(--${o[0]}-fg)`, c3: `var(--${o[1]}-deep)`, c3f: `var(--${o[1]}-fg)`, c4: `var(--${o[2]}-deep)`, c4f: `var(--${o[2]}-fg)` };
  }
  // responsive SVG: wide (640) or narrow viewBox chosen from the real stage width so text stays legible on phones
  function frame(api, label, dims, onChange) {
    const svg = api.svg(640, 300, label), st = { svg, narrow: false, w: 640, h: 300 };
    const apply = n => { st.narrow = n; const d = dims(n); st.w = d[0]; st.h = d[1]; svg.setAttribute('viewBox', `0 0 ${st.w} ${st.h}`); };
    const isN = () => { const cw = api.stage.clientWidth; return cw > 0 && cw < 540; };
    apply(isN());
    if (window.ResizeObserver) new ResizeObserver(() => { const n = isN(); if (n !== st.narrow) { apply(n); if (onChange) onChange(); } }).observe(api.stage);
    return st;
  }
  function msgEl(parent) { const m = W.el('p', { class: 'wz-msg', role: 'status' }); m.hidden = true; parent.appendChild(m); return t => { m.hidden = !t; m.innerHTML = t || ''; }; }
  function roH(api, label) { const r = W.el('span', { class: 'ro' }, `${label} <b></b>`); api.readout.appendChild(r); const b = r.querySelector('b'); const f = h => { b.innerHTML = h; }; f.el = r; return f; }
  function tx(g, x, y, s, size, fill, anchor, weight, extra) {
    const t = W.s('text', { x: +(+x).toFixed(1), y: +(+y).toFixed(1), 'text-anchor': anchor || 'middle', style: `font-size:${size || 13}px;fill:${fill || 'var(--ink-2)'};${weight ? 'font-weight:' + weight + ';' : ''}${extra || ''}` }, g);
    t.textContent = s; return t;
  }
  const HALO = 'paint-order:stroke;stroke:var(--surface);stroke-width:4px;stroke-linejoin:round;';
  const tickDec = ticks => { const st = ticks.length > 1 ? ticks[1] - ticks[0] : 1; return Math.max(0, Math.min(4, -Math.floor(Math.log10(st) + 1e-9))); };
  function yGrid(g, sy, L, R, ticks, f) { ticks.forEach(t => { const y = sy(t); W.s('line', { x1: L, x2: R, y1: y, y2: y, style: 'stroke:var(--line);stroke-dasharray:2 3' }, g); tx(g, L - 6, y + 4.5, f(t), 13, 'var(--muted)', 'end'); }); }
  function setSeg(g, i) { g.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', j === i)); }
  // marker shapes (so clusters never rely on colour alone)
  function shape(g, kind, x, y, r, st) {
    if (kind === 1) return W.s('rect', { x: x - r * 0.88, y: y - r * 0.88, width: r * 1.76, height: r * 1.76, rx: r * 0.2, style: st }, g);
    if (kind === 2) return W.s('path', { d: `M${x},${y - r * 1.15}L${x + r * 1.05},${y + r * 0.8}L${x - r * 1.05},${y + r * 0.8}Z`, style: st }, g);
    if (kind === 3) return W.s('path', { d: `M${x},${y - r * 1.2}L${x + r * 1.1},${y}L${x},${y + r * 1.2}L${x - r * 1.1},${y}Z`, style: st }, g);
    if (kind === 4) return W.s('path', { d: `M${x},${y + r * 1.15}L${x + r * 1.05},${y - r * 0.8}L${x - r * 1.05},${y - r * 0.8}Z`, style: st }, g);
    return W.s('circle', { cx: x, cy: y, r, style: st }, g);
  }
  const swSvg = (kind, col) => { const g = W.s('svg', { viewBox: '0 0 22 14', 'aria-hidden': 'true' }); shape(g, kind, 11, 7, 5, `fill:${col};stroke:var(--surface);stroke-width:1`); return g.outerHTML; };
  const lineSw = (col, dash, w) => `<svg viewBox="0 0 22 14" aria-hidden="true"><line x1="1" x2="21" y1="7" y2="7" style="stroke:${col};stroke-width:${w || 2.5};${dash ? 'stroke-dasharray:' + dash : ''}"/></svg>`;
  const sub = i => `<sub>${i}</sub>`;

  // =====================================================================================
  // forecast — params: series (array), labels (array), method ("ma"/"es"/"trend"), k, alpha, unit, label, next
  // =====================================================================================
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONL = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  function nextLabel(s) {
    s = String(s == null ? '' : s).trim(); if (!s) return 'next';
    const m = /^([A-Za-z]+)(\.?)([\s\-'’]*)(\d{2}|\d{4})?$/.exec(s);
    if (m) {
      const w = m[1].toLowerCase(); let i = MON.findIndex(x => x.toLowerCase() === w), full = false;
      if (i < 0) { i = MONL.indexOf(w); full = i >= 0; } if (i < 0 && w === 'sept') i = 8;
      if (i >= 0) {
        const j = (i + 1) % 12; let nm = full ? MONL[j][0].toUpperCase() + MONL[j].slice(1) : MON[j];
        if (m[1].length > 1 && m[1] === m[1].toUpperCase()) nm = nm.toUpperCase(); else if (m[1] === w) nm = nm.toLowerCase();
        let yr = m[4] || ''; if (yr && j === 0) yr = String(+yr + 1).padStart(yr.length, '0');
        return nm + m[2] + (yr ? (m[3] || ' ') + yr : '');
      }
      const d = DOW.findIndex(x => x.toLowerCase() === w.slice(0, 3)); if (d >= 0 && !m[4] && w.length <= 9) return DOW[(d + 1) % 7];
    }
    if (/(^|[^A-Za-z])Q[1-4](?!\d)/i.test(s)) { const q = /Q([1-4])/i.exec(s), qi = +q[1], nq = qi % 4 + 1; let out = s.replace(/Q[1-4]/i, '\u0001'); if (qi === 4) out = out.replace(/\d+/, d => String(+d + 1).padStart(d.length, '0')); return out.replace('\u0001', q[0][0] + nq); }
    const e = /^(.*?)(\d+)(\D*)$/.exec(s);
    if (e) return e[1] + String(+e[2] + 1).padStart(e[2].length, '0') + e[3];
    return 'next';
  }
  function seasonLag(es) { // lag (2…12) at which the errors repeat, from their autocorrelation; 0 if none
    const m = es.length; if (m < 8) return 0; const mu = sum(es) / m; let den = 0; es.forEach(e => { den += (e - mu) ** 2; }); if (!(den > 0)) return 0;
    let best = 0, bl = 0; for (let L = 2; L <= Math.min(12, Math.floor(m / 2)); L++) { let num = 0; for (let i = L; i < m; i++) num += (es[i] - mu) * (es[i - L] - mu); const r = num / den; if (r > best + 0.02) { best = r; bl = L; } }
    return best > 0.45 ? bl : 0;
  }

  W.register('forecast', {
    title: 'Forecasting: moving average, exponential smoothing, trend',
    init(api, P, el) {
      style(); el.classList.add('wz');
      let warnTxt = '', Y = [], Lb = [], userLabels = false;
      if (Array.isArray(P.series)) {
        const labs = Array.isArray(P.labels) ? P.labels : []; let dropped = 0; userLabels = labs.length > 0;
        P.series.forEach((v, i) => { const x = toNum(v); if (isFinite(x)) { Y.push(x); const l = labs[i]; Lb.push(l !== undefined && l !== null && String(l).trim() !== '' ? String(l).trim().slice(0, 14) : ''); } else dropped++; });
        if (Y.length < 3) { warnTxt = 'The series needs at least 3 numbers — showing the example instead.'; Y = []; Lb = []; }
        else if (dropped) warnTxt = `${dropped} non-numeric value${dropped > 1 ? 's were' : ' was'} skipped.`;
        if (Y.length > 60) { Y = Y.slice(-60); Lb = Lb.slice(-60); warnTxt += ' Only the last 60 periods are used.'; }
      } else if (P.series !== undefined) warnTxt = 'series must be a list of numbers — showing the example instead.';
      Lb = Lb.map((l, i) => l || String(i + 1));
      const useDef = !Y.length;
      if (useDef) { Y = [14.2, 13.8, 15.1, 15.6, 16.4, 15.9, 16.8, 17.5, 17.2, 19.0, 18.4, 20.6]; Lb = MON.slice(); }
      const n = Y.length, unit = P.unit !== undefined ? String(P.unit) : (useDef ? '₹ lakh' : ''), what = P.label ? String(P.label) : (useDef ? 'sales' : 'value');
      const nextLb = P.next ? String(P.next).slice(0, 14) : nextLabel(Lb[n - 1]), allL = Lb.concat([nextLb]);
      const dD = Math.min(3, Math.max(...Y.map(decOf))), dF = Math.min(4, Math.max(2, dD + 1));
      const kMax = Math.max(2, Math.min(6, n - 1));
      let method = ['ma', 'es', 'trend'].includes(P.method) ? P.method : 'ma';
      let k = clamp(Math.round(nv(P.k, 3)), 2, kMax), alpha = clamp(nv(P.alpha, 0.3), 0.05, 0.95), sel = n, showErr = true;
      const aStep = Math.abs(alpha * 20 - Math.round(alpha * 20)) < 1e-9 ? 0.05 : 0.01;
      const st = frame(api, `Line chart of ${what}: actual values and forecasts`, nr => [nr ? 360 : 640, 300], () => draw());
      const g = W.s('g', null, st.svg); let sxCur = null;
      const leg = W.el('div', { class: 'wz-legend' }); api.stage.appendChild(leg);
      if (useDef) api.stage.appendChild(W.el('p', { class: 'wz-cap' }, 'Hypothetical monthly sales (₹ lakh) of a bakery chain in Dehradun. Tap the chart or a table row to see how that forecast is worked out.'));
      else api.stage.appendChild(W.el('p', { class: 'wz-cap' }, 'Tap the chart or a table row to see how that forecast is worked out.'));
      const segM = api.seg([{ v: 'ma', label: 'Moving average' }, { v: 'es', label: 'Exponential smoothing' }, { v: 'trend', label: 'Linear trend' }], method, v => { method = v; layout(); draw(); });
      const bE = api.button('Hide errors', () => { showErr = !showErr; bE.textContent = showErr ? 'Hide errors' : 'Show errors'; bE.setAttribute('aria-pressed', !showErr); draw(); }, false, api.controls);
      const sK = api.slider({ label: 'k — periods in each average', min: 2, max: kMax, step: 1, value: k, onInput: v => { k = v; draw(); } });
      const sA = api.slider({ label: 'α — smoothing constant', min: 0.05, max: 0.95, step: aStep, value: alpha, fmt: v => v.toFixed(2), onInput: v => { alpha = v; draw(); } });
      const roN = roH(api, `Forecast for ${esc(nextLb)}`), roMAD = api.ro('mad', 'MAD'), roMSE = api.ro('mse', 'MSE'), roMAPE = api.ro('mape', 'MAPE'), roOver = api.ro('ov', 'Errors over'), roEq = roH(api, 'Trend line');
      const frm = W.el('div', { class: 'wz-frm' }); api.readout.appendChild(frm);
      const tcap = W.el('p', { class: 'wz-cap', style: 'margin-top:.7rem' }); api.foot.appendChild(tcap);
      const tw = W.el('div', { class: 'wz-tw scroll', tabindex: '0', role: 'region', 'aria-label': 'Forecast error table' }); tw.style.marginTop = '.3rem'; api.foot.appendChild(tw);
      const xl = W.el('div', { class: 'wz-xl' }); api.foot.appendChild(xl);
      const note = api.note(''); const warn = msgEl(api.foot); warn(warnTxt.trim());
      function layout() { sK.el.style.display = method === 'ma' ? '' : 'none'; sA.el.style.display = method === 'es' ? '' : 'none'; roEq.el.style.display = method === 'trend' ? '' : 'none'; }
      function fc(meth, kk, al) {
        const F = new Array(n + 1).fill(null); let lr = null;
        if (meth === 'ma') { for (let t = kk; t <= n; t++) { let s = 0; for (let j = t - kk; j < t; j++) s += Y[j]; F[t] = s / kk; } }
        else if (meth === 'es') { F[1] = Y[0]; for (let t = 2; t <= n; t++) F[t] = al * Y[t - 1] + (1 - al) * F[t - 1]; }
        else { lr = S.linreg(Y.map((_, i) => i + 1), Y); if (!isFinite(lr.b1)) lr = { b0: S.mean(Y), b1: 0, r2: NaN }; for (let t = 0; t <= n; t++) F[t] = lr.b0 + lr.b1 * (t + 1); }
        return { F, lr };
      }
      function errs(F, from) { const r = []; for (let t = from || 0; t < n; t++) if (F[t] !== null && isFinite(F[t])) { const e = Y[t] - F[t]; r.push({ t, e, ae: Math.abs(e), e2: e * e, pe: Y[t] !== 0 ? Math.abs(e / Y[t]) * 100 : NaN }); } return r; }
      function acc(r) { const m = r.length; if (!m) return { mad: NaN, mse: NaN, mape: NaN, me: NaN, m: 0, z: 0 }; const pes = r.filter(x => isFinite(x.pe)); return { mad: sum(r.map(x => x.ae)) / m, mse: sum(r.map(x => x.e2)) / m, mape: pes.length ? sum(pes.map(x => x.pe)) / pes.length : NaN, me: sum(r.map(x => x.e)) / m, m, z: m - pes.length, sae: sum(r.map(x => x.ae)), se2: sum(r.map(x => x.e2)), se: sum(r.map(x => x.e)), spe: sum(pes.map(x => x.pe)) }; }
      const num = v => loc(v, dD, true), fnum = v => loc(v, dF, true);
      function explain(t, F, lr) {
        const p = t + 1; let s = '';
        if (method === 'ma') {
          if (t < k) s = `No forecast for period ${p} (${esc(allL[t])}): a ${k}-period moving average needs ${k} earlier values.`;
          else { const w = Y.slice(t - k, t), terms = k <= 3 ? w.map((_, i) => 'Y' + sub(t - k + 1 + i)).join(' + ') : `Y${sub(t - k + 1)} + … + Y${sub(t)}`; s = `F${sub(p)} = (${terms}) ÷ ${k} = (${w.map(num).join(' + ')}) ÷ ${k} = <b>${fnum(F[t])}</b>`; }
        } else if (method === 'es') {
          if (t === 0) s = 'No forecast for period 1: exponential smoothing needs an earlier value to start from.';
          else if (t === 1) s = `F${sub(2)} = Y${sub(1)} = <b>${fnum(F[1])}</b> <span class="m">(start-up rule used by Anderson et al. and Excel's ToolPak: the first forecast equals the first actual)</span>`;
          else s = `F${sub(p)} = α·Y${sub(t)} + (1 − α)·F${sub(t)} = ${alpha.toFixed(2)} × ${num(Y[t - 1])} + ${(1 - alpha).toFixed(2)} × ${fnum(F[t - 1])} = <b>${fnum(F[t])}</b> <span class="m">(same as last forecast + α × last error)</span>`;
        } else {
          const tb = (n + 1) / 2, yb = S.mean(Y), sxx = n * (n * n - 1) / 12, sxy = lr.b1 * sxx;
          s = `Least squares on t = 1 … ${n}: b${sub(1)} = Σ(t − t̄)(Y − Ȳ) ÷ Σ(t − t̄)² = ${loc(sxy, 3, true)} ÷ ${loc(sxx, 2)} = ${loc(lr.b1, 4, true)}; b${sub(0)} = Ȳ − b${sub(1)}t̄ = ${loc(yb, 3, true)} − ${loc(lr.b1, 4, true)} × ${xn(tb)} = ${loc(lr.b0, 4, true)}.<br>Period ${p}: ŷ${sub(p)} = ${loc(lr.b0, 4, true)} + ${loc(lr.b1, 4, true)} × ${p} = <b>${fnum(F[t])}</b>`;
        }
        if (t < n && F[t] !== null) { const e = Y[t] - F[t]; s += `<br>Error e${sub(p)} = Y${sub(p)} − F${sub(p)} = ${num(Y[t])} − ${fnum(F[t])} = <b>${fnum(e)}</b>${Y[t] !== 0 ? `; |e| ÷ Y = ${loc(Math.abs(e / Y[t]) * 100, 2, true)}%` : ''}`; }
        if (t === n) s += ` <span class="m">← the forecast for the next period (${esc(nextLb)})</span>`;
        return s;
      }
      function setSel(t, fromChart) {
        t = clamp(t, 0, n); if (t === sel) return; sel = t; draw();
        if (fromChart) { const row = tw.querySelector(`tr[data-t="${t}"]`); if (row) { const top = row.offsetTop, h = tw.clientHeight; if (top < tw.scrollTop + 30 || top > tw.scrollTop + h - 70) tw.scrollTop = Math.max(0, top - h / 2); } }
      }
      let dragging = false;
      const pick = e => { if (!sxCur) return; const p = W.svgPoint(st.svg, e); setSel(Math.round(sxCur.inv(p.x)) - 1, true); };
      st.svg.addEventListener('pointerdown', e => { dragging = true; try { st.svg.setPointerCapture(e.pointerId); } catch (_) { } pick(e); });
      st.svg.addEventListener('pointermove', e => { if (dragging) pick(e); });
      ['pointerup', 'pointercancel'].forEach(ev => st.svg.addEventListener(ev, () => { dragging = false; }));
      tw.addEventListener('click', e => { const tr = e.target.closest('tr[data-t]'); if (tr) setSel(+tr.dataset.t); });
      tw.addEventListener('keydown', e => { const tr = e.target.closest('tr[data-t]'); if (!tr) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(+tr.dataset.t); const r2 = tw.querySelector(`tr[data-t="${tr.dataset.t}"]`); if (r2) r2.focus(); } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const t2 = clamp(+tr.dataset.t + (e.key === 'ArrowDown' ? 1 : -1), 0, n); setSel(t2); const r2 = tw.querySelector(`tr[data-t="${t2}"]`); if (r2) r2.focus(); } });

      function draw() {
        const { F, lr } = fc(method, k, alpha), R = errs(F), A = acc(R);
        W.clear(g);
        const nar = st.narrow, Wd = st.w, L = nar ? 46 : 60, Rx = Wd - 8, T = 34, B = st.h - 46;
        const sx = W.scale(0.5, n + 1.5, L, Rx), slot = sx(2) - sx(1); sxCur = sx;
        const vals = Y.slice(); F.forEach(v => { if (v !== null && isFinite(v)) vals.push(v); });
        let lo = minOf(vals), hi = maxOf(vals); if (!(hi > lo)) { const d = Math.abs(hi) * 0.1 || 1; lo -= d; hi += d; }
        const pad = (hi - lo) * 0.1; lo -= pad; hi += pad;
        const ticks = W.nice(lo, hi, nar ? 4 : 5).filter(t => t >= lo - 1e-9 && t <= hi + 1e-9), sy = W.scale(lo, hi, B, T), td = tickDec(ticks);
        // next-period band
        W.s('rect', { x: sx(n + 0.5), y: T - 10, width: slot, height: B - T + 10, style: 'fill:var(--acc-bg)' }, g);
        tx(g, Math.min(sx(n + 1), Wd - 18), T - 16, 'next', 13, 'var(--acc-fg)', 'middle', 700);
        yGrid(g, sy, L, Rx, ticks, t => loc(t, td));
        tx(g, 4, 17, unit ? `${what} (${unit})` : what, 13, 'var(--muted)', 'start', 700);
        W.s('line', { x1: L, x2: Rx, y1: B, y2: B, style: 'stroke:var(--line-2);stroke-width:1.2' }, g);
        const maxLen = Math.max(...allL.map(s => s.length)), need = maxLen * 7 + 10; let stp = 1; while (stp * slot < need && stp < n + 1) stp++;
        const show = new Set(); for (let i = 0; i <= n; i += stp) show.add(i); show.add(n); [...show].forEach(i => { if (i !== n && n - i < stp) show.delete(i); });
        show.forEach(i => { const x = sx(i + 1), w = allL[i].length * 7; W.s('line', { x1: x, x2: x, y1: B, y2: B + 5, style: 'stroke:var(--line-2)' }, g); tx(g, clamp(x, w / 2 + 2, Wd - w / 2 - 2), B + 20, allL[i], 13, i === n ? 'var(--acc-fg)' : i === sel ? 'var(--ink)' : 'var(--muted)', 'middle', i === n || i === sel ? 700 : 400); });
        if (!userLabels && !useDef) tx(g, Rx, B + 40, 'period', 13, 'var(--muted)', 'end', 700);
        // selected period guide
        W.s('line', { x1: sx(sel + 1), x2: sx(sel + 1), y1: T - 10, y2: B, style: 'stroke:var(--acc-bd);stroke-width:1.5;stroke-dasharray:3 3' }, g);
        // error segments
        if (showErr) R.forEach(r => W.s('line', { x1: sx(r.t + 1), x2: sx(r.t + 1), y1: sy(Y[r.t]), y2: sy(F[r.t]), style: `stroke:var(--bad);stroke-width:${r.t === sel ? 3.2 : 2};opacity:${r.t === sel ? 0.95 : 0.55}` }, g));
        // actual series
        W.s('path', { d: Y.map((v, i) => (i ? 'L' : 'M') + sx(i + 1).toFixed(1) + ',' + sy(v).toFixed(1)).join(''), style: 'fill:none;stroke:var(--ink);stroke-width:2.2;stroke-linejoin:round' }, g);
        // forecast / fitted line
        const fi = []; for (let t = 0; t <= n; t++) if (F[t] !== null && isFinite(F[t])) fi.push(t);
        const ptsF = fi.map(t => [sx(t + 1), sy(F[t])]), pth = a => a.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
        const inS = ptsF.slice(0, -1), last2 = ptsF.slice(-2);
        if (inS.length > 1) W.s('path', { d: pth(inS), style: 'fill:none;stroke:var(--acc-deep);stroke-width:2.6;stroke-linejoin:round' }, g);
        if (last2.length === 2) W.s('path', { d: pth(last2), style: 'fill:none;stroke:var(--acc-deep);stroke-width:2.6;stroke-dasharray:5 4' }, g);
        Y.forEach((v, i) => W.s('circle', { cx: sx(i + 1), cy: sy(v), r: i === sel ? 5.5 : 3.6, style: 'fill:var(--ink);stroke:var(--surface);stroke-width:1.2' }, g));
        if (method !== 'trend' || n <= 30) fi.forEach(t => { if (t < n) W.s('circle', { cx: sx(t + 1), cy: sy(F[t]), r: t === sel ? 5.5 : 3.8, style: `fill:var(--surface);stroke:var(--acc-deep);stroke-width:${t === sel ? 2.6 : 2}` }, g); });
        const nx = sx(n + 1), ny = sy(F[n]);
        shape(g, 3, nx, ny, sel === n ? 8.5 : 7, 'fill:var(--acc-deep);stroke:var(--surface);stroke-width:2');
        const lab = fnum(F[n]), lw = lab.length * 7.4, up = ny - T > 26;
        tx(g, clamp(nx, L + lw / 2, Wd - lw / 2 - 2), up ? ny - 14 : ny + 24, lab, 13, 'var(--acc-fg)', 'middle', 700, HALO);
        // legend
        const fName = method === 'ma' ? `${k}-period moving average forecast` : method === 'es' ? `exponential smoothing forecast (α = ${alpha.toFixed(2)})` : 'trend line (fitted values)';
        leg.innerHTML = `<span>${lineSw('var(--ink)', '', 2.2)}actual ${esc(what)}</span><span>${lineSw('var(--acc-deep)', '', 2.6)}${fName}</span><span>${swSvg(3, 'var(--acc-deep)')}next-period forecast</span>${showErr ? `<span>${lineSw('var(--bad)', '', 2)}error = actual − forecast</span>` : ''}`;
        // readouts
        const p1 = A.m ? R[0].t + 1 : 0, p2 = A.m ? R[A.m - 1].t + 1 : 0;
        roN(fu(F[n], unit, dF, true)); roMAD(fu(A.mad, unit, dF, true)); roMSE(loc(A.mse, dF, true)); roMAPE(isFinite(A.mape) ? loc(A.mape, 2, true) + '%' : '—');
        roOver(A.m ? `${p1 === p2 ? 'period ' + p1 : `periods ${p1}–${p2}`} (${A.m} ${method === 'trend' ? 'fitted value' : 'forecast'}${A.m === 1 ? '' : 's'})` : '—');
        if (lr) roEq(`ŷ = ${loc(lr.b0, 3, true)} ${lr.b1 < 0 ? '−' : '+'} ${loc(Math.abs(lr.b1), 4, true)}·t${isFinite(lr.r2) ? ` · R² = ${lr.r2.toFixed(3)}` : ''}`);
        frm.innerHTML = explain(sel, F, lr);
        // table
        let h = `<table class="wz-t"><thead><tr><th>Period</th><th>Actual Y</th><th>Forecast F</th><th>Error Y − F</th><th>|error|</th><th>error²</th><th>|% error|</th></tr></thead><tbody>`;
        for (let t = 0; t <= n; t++) {
          const has = t < n && F[t] !== null, e = has ? Y[t] - F[t] : NaN;
          h += `<tr class="pick${t === sel ? ' sel' : ''}${t === n ? ' nx' : ''}" tabindex="0" data-t="${t}" aria-label="Period ${t + 1}"><td>${t + 1}. ${esc(allL[t])}${t === n ? ' (next)' : ''}</td><td>${t < n ? num(Y[t]) : '—'}</td><td>${F[t] !== null ? fnum(F[t]) : '—'}</td><td>${has ? fnum(e) : '—'}</td><td>${has ? fnum(Math.abs(e)) : '—'}</td><td>${has ? fnum(e * e) : '—'}</td><td>${has && Y[t] !== 0 ? loc(Math.abs(e / Y[t]) * 100, 2, true) + '%' : '—'}</td></tr>`;
        }
        h += `</tbody><tfoot><tr class="tot"><td>Sum (${A.m})</td><td></td><td></td><td>${fnum(A.se)}</td><td>${fnum(A.sae)}</td><td>${fnum(A.se2)}</td><td>${isFinite(A.spe) ? loc(A.spe, 2, true) + '%' : '—'}</td></tr>`;
        h += `<tr class="tot stick"><td>Mean</td><td></td><td></td><td><span class="lab">bias</span>${fnum(A.me)}</td><td><span class="lab">MAD</span>${fnum(A.mad)}</td><td><span class="lab">MSE</span>${fnum(A.mse)}</td><td><span class="lab">MAPE</span>${isFinite(A.mape) ? loc(A.mape, 2, true) + '%' : '—'}</td></tr></tfoot></table>`;
        const keepTop = tw.scrollTop; tw.innerHTML = h; tw.scrollTop = keepTop;
        tcap.innerHTML = `<b>Error table.</b> Errors are measured only where a forecast exists${method === 'trend' ? ' — for a trend line that is every period (fitted values)' : ''}.<span class="wz-sm-only"> Swipe the table sideways for all columns.</span>`;
        // Excel
        const r1 = p1 + 1, r2 = p2 + 1, D = `D${r1}:D${r2}`, Bc = `B${r1}:B${r2}`;
        let x = `<span class="h">Excel</span> Periods t = 1…${n} in A2:A${n + 1}, ${esc(what)} in B2:B${n + 1}, forecasts in column C, errors <code class="xl">=B−C</code> in column D. `;
        if (method === 'ma') x += `In C${k + 2} type <code class="xl">=AVERAGE(B2:B${k + 1})</code> and fill down to C${n + 2}; the next-period forecast is <code class="xl">=AVERAGE(B${n - k + 2}:B${n + 1})</code>. ToolPak: <span class="menu-path">Data ▸ Data Analysis ▸ Moving Average</span>, Interval = ${k} — it writes each average beside the <i>last</i> period of its window, so move it down one row to use it as a forecast. `;
        else if (method === 'es') x += `In C3 type <code class="xl">=B2</code> (F${sub(2)} = Y${sub(1)}); in C4 type <code class="xl">=${xn(alpha)}*B3+${xn(1 - alpha)}*C3</code> and fill down to C${n + 2}. ToolPak: <span class="menu-path">Data ▸ Data Analysis ▸ Exponential Smoothing</span> with <b>Damping factor = 1 − α = ${(1 - alpha).toFixed(2)}</b> (not α). `;
        else x += `Next period: <code class="xl">=FORECAST.LINEAR(${n + 1},B2:B${n + 1},A2:A${n + 1})</code> or <code class="xl">=TREND(B2:B${n + 1},A2:A${n + 1},${n + 1})</code> → ${fnum(F[n])}. Fitted values: <code class="xl">=TREND($B$2:$B$${n + 1},$A$2:$A$${n + 1},A2)</code>; slope <code class="xl">=SLOPE(B2:B${n + 1},A2:A${n + 1})</code>, intercept <code class="xl">=INTERCEPT(B2:B${n + 1},A2:A${n + 1})</code>. `;
        if (A.m) x += `Accuracy over rows ${r1}–${r2}: MAD <code class="xl">=AVERAGE(ABS(${D}))</code>, MSE <code class="xl">=SUMSQ(${D})/COUNT(${D})</code>, MAPE <code class="xl">=AVERAGE(ABS(${D})/${Bc})</code> <span class="wz-mut">(Excel 365; in older Excel confirm the last two with Ctrl+Shift+Enter)</span>.`;
        xl.innerHTML = x;
        // note
        const mname = method === 'ma' ? `${k}-period moving average` : method === 'es' ? `exponential smoothing with α = ${alpha.toFixed(2)}` : 'linear trend line';
        let nt = `With ${method === 'es' ? '' : 'a '}<b>${mname}</b>, the forecast for <b>${esc(nextLb)}</b> is <b>${fu(F[n], unit, dF, true)}</b>. `;
        if (A.m) nt += `${method === 'trend' ? 'Fitted to' : 'Over'} ${p1 === p2 ? 'period ' + p1 : `periods ${p1}–${p2}`}, it misses by <b>${fu(A.mad, unit, dF, true)}</b> on average (MAD)${isFinite(A.mape) ? `, about <b>${loc(A.mape, 1, true)}%</b> of the actual value (MAPE)` : ''}. `;
        const lag = seasonLag(R.map(r => r.e)), pos = R.filter(r => r.e > 0).length;
        if (lag) nt += `The errors repeat roughly every <b>${lag} periods</b> — a sign of <b>seasonality</b>, which none of these three methods captures; use seasonal indexes. `;
        else if (method !== 'trend' && A.m >= 4 && pos >= 0.75 * A.m && A.me > 0) nt += `Most errors are positive: the forecasts run <b>below</b> the actuals because the series keeps rising and this method lags behind — ${method === 'ma' ? 'a smaller k' : 'a larger α'} or a trend line reacts faster. `;
        else if (method !== 'trend' && A.m >= 4 && pos <= 0.25 * A.m && A.me < 0) nt += `Most errors are negative: the forecasts run <b>above</b> the actuals because the series keeps falling and this method lags behind. `;
        if (method === 'es' && n >= 4) {
          let best = null; for (let a = 0.05; a <= 0.951; a += 0.05) { const ac = acc(errs(fc('es', 0, a).F)); if (!best || ac.mse < best.mse - 1e-12) best = { a, mse: ac.mse }; }
          nt += Math.abs(best.a - alpha) < 0.026 ? `This α gives the lowest MSE of any α in 0.05 steps.` : `Try α ≈ <b>${best.a.toFixed(2)}</b>: it gives the lowest MSE here (${loc(best.mse, dF, true)} vs ${loc(A.mse, dF, true)}). Small α = smooth and slow; large α = chases the latest value.`;
        } else if (method === 'ma') {
          const km = Math.min(6, n - 2);
          if (km > 2) { let best = null; for (let kk = 2; kk <= km; kk++) { const ac = acc(errs(fc('ma', kk).F, km)); if (!best || ac.mse < best.mse - 1e-12) best = { k: kk, mse: ac.mse }; } nt += `Compared on the same periods (${km + 1}–${n}), k = <b>${best.k}</b> has the lowest MSE. A larger k smooths out noise but reacts more slowly.`; }
        } else if (lr) nt += `The line ${lr.b1 >= 0 ? 'rises' : 'falls'} by <b>${fu(Math.abs(lr.b1), unit, Math.max(2, dF))}</b> per period. A trend line projects the long-run direction but ignores short-term swings.`;
        note.innerHTML = nt;
      }
      layout(); draw();
    }
  });

  // =====================================================================================
  // control-chart — params: samples (array of subgroups) or xbar + rbar + n (+ m), label, unit
  // =====================================================================================
  const A2 = { 2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308 };
  const D3 = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0.076, 8: 0.136, 9: 0.184, 10: 0.223 };
  const D4 = { 2: 3.267, 3: 2.574, 4: 2.282, 5: 2.114, 6: 2.004, 7: 1.924, 8: 1.864, 9: 1.816, 10: 1.777 };
  const D2 = { 2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078 };
  const colL = i => { let s = ''; i++; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };

  W.register('control-chart', {
    title: 'Control charts: x̄ chart and R chart',
    init(api, P, el) {
      style(); el.classList.add('wz');
      let warnTxt = '', groups = null, given = null, n = 5;
      if (P.samples !== undefined) {
        const gs = Array.isArray(P.samples) ? P.samples.filter(Array.isArray).map(a => a.map(toNum).filter(isFinite)) : [];
        const cnt = {}; gs.forEach(a => { if (a.length >= 2) cnt[a.length] = (cnt[a.length] || 0) + 1; });
        let best = 0, bn = 0; Object.keys(cnt).forEach(kk => { if (cnt[kk] > best || (cnt[kk] === best && +kk > bn)) { best = cnt[kk]; bn = +kk; } });
        const keep = gs.filter(a => a.length === bn).slice(0, 60);
        if (bn >= 2 && bn <= 10 && keep.length >= 2) { groups = keep; n = bn; if (keep.length < gs.length) warnTxt = `${gs.length - keep.length} subgroup(s) of a different size were left out — every subgroup must have the same n.`; }
        else warnTxt = 'samples must be at least 2 subgroups of the same size n = 2 … 10 — showing the example instead.';
      } else if (P.xbar !== undefined || P.rbar !== undefined || P.n !== undefined) {
        const xb = nv(P.xbar, NaN), rb = nv(P.rbar, NaN), nn = Math.round(nv(P.n, NaN));
        if (isFinite(xb) && rb > 0 && nn >= 2 && nn <= 10) { given = { xbb: xb, rbar: rb }; n = nn; }
        else warnTxt = 'xbar, rbar (greater than 0) and n (2 … 10) are all needed — showing the example instead.';
      }
      const useDef = !groups && !given;
      const label = P.label ? String(P.label) : (useDef ? 'packet weight' : 'measurement'), unit = P.unit !== undefined ? String(P.unit) : (useDef ? 'g' : '');
      const M = groups ? groups.length : given ? clamp(Math.round(nv(P.m, 20)), 5, 40) : 20;
      const dG = given ? Math.min(3, Math.max(decOf(P.xbar), decOf(P.rbar))) : 0, dD = groups ? Math.min(3, Math.max(...groups.flat().map(decOf))) : given ? dG + 1 : 1, dL = Math.min(4, (given ? dG : dD) + 2);
      let seed = 2026, base = groups;
      function gen() {
        if (groups) return; const r = S.rng(seed), mu = given ? given.xbb : 200, sg = given ? given.rbar / D2[n] : 1.0; base = [];
        for (let i = 0; i < M; i++) { const a = []; for (let j = 0; j < n; j++) a.push(+(mu + sg * S.randn(r)).toFixed(dD)); base.push(a); }
      }
      gen();
      const rangeOf = a => maxOf(a) - minOf(a);
      let smode = 'mean', delta = clamp(nv(P.shift, 0), -3, 3), fac = 1, start = clamp(Math.round(nv(P.shiftAt, Math.round(M * 0.6) + 1)), 2, M), sel = -1;
      const st = frame(api, `x-bar chart and R chart for ${label}`, nr => [nr ? 360 : 640, nr ? 480 : 450], () => draw());
      const g = W.s('g', null, st.svg); let sxCur = null;
      const leg = W.el('div', { class: 'wz-legend' }); api.stage.appendChild(leg);
      leg.innerHTML = `<span>${swSvg(0, 'var(--acc-deep)')}in control</span><span>${swSvg(0, 'var(--bad)')}outside the limits (signal)</span><span><svg viewBox="0 0 22 14" aria-hidden="true"><circle cx="11" cy="7" r="5" style="fill:none;stroke:var(--warn);stroke-width:2;stroke-dasharray:2 2"/></svg>8 in a row on one side</span><span>${lineSw('var(--bad)', '6 4', 1.6)}UCL / LCL</span><span>${lineSw('var(--ink-2)', '', 1.6)}centre line</span>`;
      const cap = W.el('p', { class: 'wz-cap' }); api.stage.appendChild(cap);
      cap.innerHTML = useDef ? 'Hypothetical: 20 hourly subgroups of 5 namkeen packets (target 200 g) from a Dehradun packing line. Tap a point to see its subgroup.'
        : given ? `Limits come from the given x̿ = ${xn(given.xbb)}, R̄ = ${xn(given.rbar)} and n = ${n}; the ${M} points are <b>simulated</b> new subgroups from that process. Tap a point to see its subgroup.`
          : `${M} subgroups of n = ${n}. Tap a point to see its subgroup.`;
      const segS = api.seg([{ v: 'mean', label: 'Shift the mean' }, { v: 'spread', label: 'Add variation' }], smode, v => { smode = v; layout(); draw(); });
      if (!groups) api.button('New data', () => { seed++; gen(); draw(); }, false, api.controls);
      api.button('Remove the change', () => { delta = 0; fac = 1; sD.set(0); sF.set(1); draw(); }, false, api.controls);
      let sig0 = 1;
      const sD = api.slider({ label: 'Shift in the mean', min: -3, max: 3, step: 0.25, value: delta, fmt: v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}σ`, onInput: v => { delta = v; draw(); } });
      const sF = api.slider({ label: 'Increase the spread', min: 1, max: 3, step: 0.1, value: 1, fmt: v => v <= 1.0001 ? 'none' : `×${v.toFixed(1)} σ`, onInput: v => { fac = v; draw(); } });
      const sS = api.slider({ label: 'Change starts at subgroup', min: 2, max: M, step: 1, value: start, onInput: v => { start = v; draw(); } });
      const roN = api.ro('n', 'Subgroup size n'), roX = roH(api, 'x̿ (centre line)'), roR = roH(api, 'R̄'), roSg = roH(api, 'Estimated σ = R̄ ÷ d₂'), roSig = roH(api, 'Signals'), roSel = roH(api, 'Subgroup');
      const frm = W.el('div', { class: 'wz-frm' }); api.readout.appendChild(frm);
      const xl = W.el('div', { class: 'wz-xl' }); api.foot.appendChild(xl);
      const det = W.el('details', { class: 'wz-d' }); det.innerHTML = '<summary>Table of control-chart constants (n = 2 … 10)</summary>'; const ct = W.el('div', { class: 'wz-tw' }); det.appendChild(ct); api.foot.appendChild(det);
      ct.innerHTML = `<table class="wz-t"><thead><tr><th>n</th>${[2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `<th class="${i === n ? 'hl' : ''}">${i}</th>`).join('')}</tr></thead><tbody>${[['A₂', A2], ['D₃', D3], ['D₄', D4], ['d₂', D2]].map(([nm, o]) => `<tr><td><b>${nm}</b></td>${[2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `<td class="${i === n ? 'hl' : ''}">${o[i].toFixed(3)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      det.appendChild(W.el('p', { class: 'wz-cap' }, 'd₂ converts the average range into an estimate of the process standard deviation: σ̂ = R̄ ÷ d₂. A₂ = 3 ÷ (d₂√n).'));
      const note = api.note(''); const warn = msgEl(api.foot); warn(warnTxt);
      function layout() { sD.el.style.display = smode === 'mean' ? '' : 'none'; sF.el.style.display = smode === 'spread' ? '' : 'none'; }
      let dragging = false;
      const pick = e => { if (!sxCur) return; const p = W.svgPoint(st.svg, e), i = Math.round(sxCur.inv(p.x)) - 1; if (i >= 0 && i < M && i !== sel) { sel = i; draw(); } };
      st.svg.addEventListener('pointerdown', e => { dragging = true; try { st.svg.setPointerCapture(e.pointerId); } catch (_) { } pick(e); });
      st.svg.addEventListener('pointermove', e => { if (dragging) pick(e); });
      ['pointerup', 'pointercancel'].forEach(ev => st.svg.addEventListener(ev, () => { dragging = false; }));
      function draw() {
        const xb0 = base.map(a => S.mean(a)), rr0 = base.map(rangeOf);
        const xbb = given ? given.xbb : S.mean(xb0), rbar = given ? given.rbar : S.mean(rr0), sig = rbar / D2[n]; sig0 = sig;
        const UX = xbb + A2[n] * rbar, LX = xbb - A2[n] * rbar, UR = D4[n] * rbar, LR = D3[n] * rbar;
        const changed = (smode === 'mean' && delta !== 0) || (smode === 'spread' && fac > 1.0001);
        const data = base.map((a, i) => (!changed || i < start - 1) ? a : smode === 'mean' ? a.map(v => v + delta * sig) : a.map(v => xbb + fac * (v - xbb)));
        const xb = data.map(a => S.mean(a)), rr = data.map(rangeOf), eps = 1e-9 * (Math.abs(xbb) + rbar + 1);
        const outX = xb.map(v => v > UX + eps || v < LX - eps), outR = rr.map(v => v > UR + eps || v < LR - eps);
        const run = new Array(M).fill(false); let cnt = 0, side = 0;
        xb.forEach((v, i) => { const s = Math.abs(v - xbb) < eps ? 0 : Math.sign(v - xbb); if (s !== 0 && s === side) cnt++; else { side = s; cnt = s ? 1 : 0; } if (cnt >= 8) for (let j = i - cnt + 1; j <= i; j++) run[j] = true; });
        sD.el.querySelector('output').textContent = delta === 0 ? 'none' : `${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(2)}σ = ${delta < 0 ? '−' : '+'}${fu(Math.abs(delta * sig), unit, dL - 1, true)}`;
        // ---- chart
        W.clear(g); const nar = st.narrow, Wd = st.w, L = nar ? 50 : 62, Rx = Wd - (nar ? 56 : 76);
        const sx = W.scale(0.5, M + 0.5, L, Rx), slot = sx(2) - sx(1); sxCur = sx;
        const P1 = { T: 44, B: nar ? 212 : 202 }, P2 = { T: nar ? 276 : 264, B: st.h - 44 };
        if (changed) { const x0 = sx(start - 0.5); [P1, P2].forEach(p => W.s('rect', { x: x0, y: p.T - 6, width: Rx - x0, height: p.B - p.T + 6, style: 'fill:var(--warn-bg)' }, g)); tx(g, Math.min(x0 + 4, Rx - 120), P1.T - 12, `change from #${start}`, 13, 'var(--warn)', 'start', 700); }
        const panel = (p, vals, U, Lw, C0, title, isR, out) => {
          let lo = Math.min(Lw, minOf(vals)), hi = Math.max(U, maxOf(vals)); if (isR) lo = Math.min(0, lo); const pd = (hi - lo) * 0.1 || 1; if (!isR || lo < 0) lo -= pd; hi += pd; if (isR && lo > 0) lo = 0;
          const sy = W.scale(lo, hi, p.B, p.T), ticks = W.nice(lo, hi, 4).filter(t => t >= lo - 1e-9 && t <= hi + 1e-9), td = tickDec(ticks);
          yGrid(g, sy, L, Rx, ticks, t => loc(t, td));
          tx(g, 4, p.T - 24, title, 13, 'var(--ink-2)', 'start', 700);
          W.s('line', { x1: L, x2: Rx, y1: p.B, y2: p.B, style: 'stroke:var(--line-2)' }, g);
          const lims = [[U, 'UCL', 'var(--bad)', '6 4'], [C0, 'CL', 'var(--ink-2)', ''], [Lw, 'LCL', 'var(--bad)', '6 4']];
          const ys = lims.map(l => sy(l[0])); // keep labels apart
          const ly = ys.slice(); if (ly[1] - ly[0] < 30) { const mid = (ly[0] + ly[1]) / 2; ly[0] = mid - 15; ly[1] = mid + 15; } if (ly[2] - ly[1] < 30) { ly[2] = ly[1] + 30; }
          lims.forEach((l, i) => { W.s('line', { x1: L, x2: Rx, y1: ys[i], y2: ys[i], style: `stroke:${l[2]};stroke-width:1.6;${l[3] ? 'stroke-dasharray:' + l[3] : ''}` }, g); tx(g, Rx + 5, ly[i] - 1, l[1], 13, l[2], 'start', 700); tx(g, Rx + 5, ly[i] + 13, loc(l[0], dL - 1, true), 13, 'var(--ink-2)', 'start'); });
          W.s('path', { d: vals.map((v, i) => (i ? 'L' : 'M') + sx(i + 1).toFixed(1) + ',' + sy(v).toFixed(1)).join(''), style: 'fill:none;stroke:var(--acc-deep);stroke-width:1.6;opacity:.75' }, g);
          vals.forEach((v, i) => {
            const x = sx(i + 1), y = sy(v), o = out[i];
            if (!isR && run[i] && !o) W.s('circle', { cx: x, cy: y, r: 8.5, style: 'fill:none;stroke:var(--warn);stroke-width:2;stroke-dasharray:2 2' }, g);
            if (o) W.s('circle', { cx: x, cy: y, r: 10, style: 'fill:none;stroke:var(--bad);stroke-width:1.6' }, g);
            W.s('circle', { cx: x, cy: y, r: i === sel ? 6.5 : o ? 5.5 : 4.2, style: `fill:${o ? 'var(--bad)' : 'var(--acc-deep)'};stroke:var(--surface);stroke-width:1.5` }, g);
          });
        };
        if (sel >= 0) W.s('line', { x1: sx(sel + 1), x2: sx(sel + 1), y1: P1.T - 6, y2: P2.B, style: 'stroke:var(--acc-bd);stroke-width:1.5;stroke-dasharray:3 3' }, g);
        panel(P1, xb, UX, LX, xbb, `x̄ chart — mean of each subgroup${unit ? ' (' + unit + ')' : ''}`, false, outX);
        panel(P2, rr, UR, LR, rbar, `R chart — range of each subgroup${unit ? ' (' + unit + ')' : ''}`, true, outR);
        let stp = 1; while (stp * slot < 24) stp++;
        for (let i = 0; i < M; i++) if (i === 0 || ((i + 1) % stp === 0 && i + 1 >= 1 + stp * 0.75)) tx(g, sx(i + 1), P2.B + 19, String(i + 1), 13, i === sel ? 'var(--ink)' : 'var(--muted)', 'middle', i === sel ? 700 : 400);
        tx(g, Rx, P2.B + 38, 'subgroup (sample) number', 13, 'var(--muted)', 'end', 700);
        // ---- readouts
        const fL = v => loc(v, dL, true);
        roN(String(n)); roX(fu(xbb, unit, dL, true)); roR(fu(rbar, unit, dL, true)); roSg(fu(sig, unit, dL, true));
        const sx_ = outX.map((o, i) => o ? i + 1 : 0).filter(Boolean), sr_ = outR.map((o, i) => o ? i + 1 : 0).filter(Boolean), runI = run.map((o, i) => o ? i + 1 : 0).filter(Boolean);
        roSig(sx_.length + sr_.length ? `<span style="font-family:var(--sans)">means</span> ${sx_.length ? '#' + sx_.join(', #') : 'none'} · <span style="font-family:var(--sans)">ranges</span> ${sr_.length ? '#' + sr_.join(', #') : 'none'}` : 'none');
        roSel.el.style.display = sel >= 0 ? '' : 'none';
        if (sel >= 0) roSel(`#${sel + 1}: ${data[sel].map(v => loc(v, dL - 1)).join(', ')} → x̄ = ${fL(xb[sel])}, R = ${fL(rr[sel])}`);
        frm.innerHTML = `<b style="color:var(--ink)">x̄ chart</b> UCL = x̿ + A${sub(2)}R̄ = ${fL(xbb)} + ${A2[n].toFixed(3)} × ${fL(rbar)} = <b>${fL(UX)}</b> · CL = x̿ = <b>${fL(xbb)}</b> · LCL = x̿ − A${sub(2)}R̄ = <b>${fL(LX)}</b><br><b style="color:var(--ink)">R chart</b> UCL = D${sub(4)}R̄ = ${D4[n].toFixed(3)} × ${fL(rbar)} = <b>${fL(UR)}</b> · CL = R̄ = <b>${fL(rbar)}</b> · LCL = D${sub(3)}R̄ = ${D3[n].toFixed(3)} × ${fL(rbar)} = <b>${fL(LR)}</b>${changed ? '<br><span class="m">The limits stay where the original data put them; the change is applied to later subgroups, as if the process shifted after the chart was set up.</span>' : ''}`;
        const c1 = colL(1), cn = colL(n), cX = colL(n + 1), cR = colL(n + 2), lr_ = M + 1;
        xl.innerHTML = `<span class="h">Excel</span> One subgroup per row, values in ${c1}2:${cn}2 … ${c1}${lr_}:${cn}${lr_}. Subgroup mean <code class="xl">=AVERAGE(${c1}2:${cn}2)</code> in ${cX}2 and range <code class="xl">=MAX(${c1}2:${cn}2)-MIN(${c1}2:${cn}2)</code> in ${cR}2, filled down. ${given ? 'Here x̿ and R̄ are given.' : `x̿ <code class="xl">=AVERAGE(${cX}2:${cX}${lr_})</code>, R̄ <code class="xl">=AVERAGE(${cR}2:${cR}${lr_})</code>.`} If x̿ is in ${cX}${lr_ + 1} and R̄ in ${cR}${lr_ + 1}: UCL<sub>x̄</sub> <code class="xl">=${cX}${lr_ + 1}+${A2[n].toFixed(3)}*${cR}${lr_ + 1}</code>, LCL<sub>x̄</sub> <code class="xl">=${cX}${lr_ + 1}-${A2[n].toFixed(3)}*${cR}${lr_ + 1}</code>, UCL<sub>R</sub> <code class="xl">=${D4[n].toFixed(3)}*${cR}${lr_ + 1}</code>. Draw them as a line chart with the limits as extra constant series.`;
        // ---- note
        let nt = '';
        if (!changed) {
          if (!sx_.length && !sr_.length && !runI.length) nt = `All ${M} subgroup means and ranges sit inside their limits with no long runs: the process is <b>in statistical control</b>. The ups and downs are ordinary common-cause variation, so <b>don't adjust</b> the process — that would only add variation.`;
          else { const all = [...new Set(sx_.concat(sr_))].sort((a, b) => a - b); nt = all.length ? `Subgroup${all.length > 1 ? 's' : ''} <b>#${all.join(', #')}</b> fall${all.length > 1 ? '' : 's'} outside the limits — a signal of a <b>special cause</b> (a new operator, a material batch, a machine setting…). Investigate what happened at ${all.length > 1 ? 'those times' : 'that time'} before trusting the limits. ` : ''; if (runI.length) nt += `There is also a run of 8 or more means on one side of the centre line (#${runI[0]}–#${runI[runI.length - 1]}) — a sign the process mean has drifted.`; }
          nt += ` <span class="wz-mut">Use the sliders to inject a change and see whether the chart catches it.</span>`;
        } else {
          const after = []; for (let i = start - 1; i < M; i++) after.push(i);
          const hitX = after.filter(i => outX[i]), hitR = after.filter(i => outR[i]), hitRun = after.filter(i => run[i]);
          const first = after.find(i => outX[i] || outR[i]), cnt2 = after.length, what = smode === 'mean' ? `a ${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(2)}σ shift in the mean (${delta > 0 ? '+' : '−'}${fu(Math.abs(delta * sig), unit, dL - 1, true)})` : `${fac.toFixed(1)}× the normal spread`;
          if (first !== undefined) nt = `With ${what} from subgroup ${start}, the chart signals at <b>subgroup ${first + 1}</b> — ${first + 1 === start ? 'immediately' : `${first + 2 - start} subgroups after the change`}. ${hitX.length} of the ${cnt2} changed means ${hitX.length === 1 ? 'is' : 'are'} outside the x̄ limits${hitR.length ? ` and ${hitR.length} range${hitR.length === 1 ? ' is' : 's are'} outside the R limits` : ''}. `;
          else nt = `With ${what} from subgroup ${start}, <b>no point crosses a limit</b> in the ${cnt2} changed subgroups. ${hitRun.length ? 'Only the run rule (8 in a row on one side of the centre line) hints at the change.' : 'Small shifts often slip under 3-sigma limits — you need more subgroups, larger n, or run rules (8 in a row on one side).'} `;
          if (smode === 'spread') nt += `Extra variation shows up mainly on the <b>R chart</b> (wider ranges) and as means scattering wider on both sides — a mean shift would instead push the x̄ points to one side.`;
          else nt += `A shift in the mean moves the <b>x̄ chart</b>; the R chart barely changes because the spread within each subgroup is the same.`;
        }
        if (!(rbar > 0)) nt = `<b>R̄ = 0</b>: every subgroup has identical values, so the limits collapse onto the centre line. Measure more precisely (more decimal places) before using a control chart.`;
        note.innerHTML = nt;
      }
      layout(); draw();
    }
  });

  // =====================================================================================
  // kmeans — params: k (2–5), standardize (bool, default true)
  // =====================================================================================
  const SEGN = {
    'hi-hi': ['Loyal big spenders', 'reward and retain them (VIP programme)'], 'hi-mid': ['High-value regulars', 'premium offers, keep them loyal'], 'hi-lo': ['Occasional big-ticket buyers', 'remind them to come back more often'],
    'mid-hi': ['Frequent regulars', 'upsell bigger baskets'], 'mid-mid': ['Steady mid-value customers', 'cross-sell and loyalty points'], 'mid-lo': ['Infrequent mid spenders', 're-engagement messages'],
    'lo-hi': ['Frequent small-basket shoppers', 'bundles to raise basket size'], 'lo-mid': ['Light regulars', 'targeted discounts'], 'lo-lo': ['Occasional low spenders', 'low-cost digital nudges only']
  };
  W.register('kmeans', {
    title: 'k-means clustering: customer segments',
    init(api, P, el) {
      style(); el.classList.add('wz'); const C = pal(el);
      const COLS = ['var(--acc-deep)', C.c2, C.c3, C.c4, 'var(--ink)'];
      let K = clamp(Math.round(nv(P.k, 3)), 2, 5); const warnTxt = (P.k !== undefined && (!isFinite(+P.k) || +P.k < 2 || +P.k > 5)) ? 'k must be between 2 and 5.' : '';
      let stdz = !(P.standardize === false || P.standardise === false);
      // ~60 seeded customers in 3 latent segments
      const rnd = S.rng(4242), LAT = [{ v: 2.0, s: 14, sv: 0.8, ss: 4.5 }, { v: 9.5, s: 32, sv: 1.3, ss: 5.5 }, { v: 4.0, s: 62, sv: 1.2, ss: 7 }], pts = [];
      LAT.forEach((q, gi) => { for (let i = 0; i < 20; i++) pts.push({ v: Math.round(clamp(q.v + q.sv * S.randn(rnd), 0.3, 13.5) * 10) / 10, s: Math.round(clamp(q.s + q.ss * S.randn(rnd), 3, 88)), seg: gi }); });
      const N = pts.length, mv = S.mean(pts.map(p => p.v)), sv = S.sdS(pts.map(p => p.v)), ms = S.mean(pts.map(p => p.s)), ss = S.sdS(pts.map(p => p.s));
      let X = [];
      const toX = () => { X = pts.map(p => stdz ? [(p.v - mv) / sv, (p.s - ms) / ss] : [p.v, p.s]); };
      const toO = c => stdz ? [c[0] * sv + mv, c[1] * ss + ms] : [c[0], c[1]], fromO = o => stdz ? [(o[0] - mv) / sv, (o[1] - ms) / ss] : [o[0], o[1]];
      const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
      const nearest = (x, cs) => { let b = 0, bd = Infinity; cs.forEach((c, j) => { const d = d2(x, c); if (d < bd - 1e-12) { bd = d; b = j; } }); return b; };
      const pickK = (k, r) => { const idx = []; let guard = 0; while (idx.length < k && guard++ < 1000) { const i = Math.floor(r() * N); if (!idx.includes(i) && !idx.some(j => d2(X[i], X[j]) < 1e-12)) idx.push(i); } return idx; };
      const means = (a, k, cs) => cs.map((c, j) => { let sx = 0, sy = 0, m = 0; X.forEach((x, i) => { if (a[i] === j) { sx += x[0]; sy += x[1]; m++; } }); return m ? [sx / m, sy / m] : c.slice(); });
      const wcss = (a, cs) => X.reduce((s, x, i) => s + (a[i] >= 0 ? d2(x, cs[a[i]]) : 0), 0);
      const elbowCache = {};
      function elbow() {
        const key = stdz ? 'z' : 'raw'; if (elbowCache[key]) return elbowCache[key];
        const out = []; for (let k = 1; k <= 6; k++) { let best = Infinity; const r = S.rng(99 + 31 * k); for (let s = 0; s < 15; s++) { let cs = pickK(k, r).map(i => X[i].slice()), a = new Array(N).fill(-1); for (let it = 0; it < 100; it++) { let ch = 0; X.forEach((x, i) => { const j = nearest(x, cs); if (j !== a[i]) { a[i] = j; ch++; } }); if (!ch) break; cs = means(a, k, cs); } best = Math.min(best, wcss(a, cs)); } out.push(best); }
        elbowCache[key] = out; return out;
      }
      // state
      const goodCache = {};
      function simulate(sd) { const r = S.rng(sd * 7919 + K * 13); let cs = pickK(K, r).map(i => X[i].slice()), a = new Array(N).fill(-1), it = 0; for (; it < 100; it++) { let ch = 0; X.forEach((x, i) => { const j = nearest(x, cs); if (j !== a[i]) { a[i] = j; ch++; } }); if (!ch) break; cs = means(a, K, cs); } return { w: wcss(a, cs), it }; }
      function goodSeed() { // a start that reaches the best solution in a few visible iterations
        const key = K + (stdz ? 'z' : 'r'); if (goodCache[key]) return goodCache[key]; const best = elbow()[K - 1]; let pick = 0, fb = 0;
        for (let sd = 1; sd <= 120 && !pick; sd++) { const o = simulate(sd); if (o.w <= best * 1.005 + 1e-9) { if (o.it >= 3) pick = sd; else if (!fb) fb = sd; } }
        return (goodCache[key] = pick || fb || 1);
      }
      let seedOff = 0, seed = 1, cents = [], assign = [], phase = 'assign', iter = 0, trails = [], done = false, lastCh = 0, timer = null, dragI = -1;
      function reset() { stop(); toX(); seed = goodSeed() + seedOff; const r = S.rng(seed * 7919 + K * 13); cents = pickK(K, r).map(i => X[i].slice()); assign = new Array(N).fill(-1); phase = 'assign'; iter = 0; done = false; lastCh = 0; trails = cents.map(c => [toO(c)]); }
      function stepCore() {
        if (done) return;
        if (phase === 'assign') { let ch = 0; X.forEach((x, i) => { const j = nearest(x, cents); if (j !== assign[i]) { assign[i] = j; ch++; } }); lastCh = ch; phase = 'update'; if (ch === 0) done = true; }
        else { cents = means(assign, K, cents); cents.forEach((c, j) => { const o = toO(c), t = trails[j], l = t[t.length - 1]; if (!l || Math.abs(l[0] - o[0]) + Math.abs(l[1] - o[1]) > 1e-9) t.push(o); }); phase = 'assign'; iter++; }
      }
      function stop() { if (timer) { clearInterval(timer); timer = null; } if (bRun) bRun.textContent = 'Run'; }
      function run() {
        if (timer) { stop(); return; } if (done) { reset(); }
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) { let gd = 0; while (!done && gd++ < 400) stepCore(); draw(); return; }
        bRun.textContent = 'Pause'; timer = setInterval(() => { stepCore(); draw(); if (done) stop(); }, 520);
      }
      const st = frame(api, 'Scatter plot of customers: visits per month against annual spend, coloured by cluster', nr => [nr ? 360 : 640, nr ? 370 : 360], () => draw());
      const g = W.s('g', null, st.svg); let SC = null;
      const leg = W.el('div', { class: 'wz-legend' }); api.stage.appendChild(leg);
      const st2 = frame(api, 'Elbow chart: within-cluster sum of squares for k = 1 to 6', nr => [nr ? 360 : 640, nr ? 190 : 176], () => draw());
      const g2 = W.s('g', null, st2.svg);
      api.stage.appendChild(W.el('p', { class: 'wz-cap' }, `Hypothetical: ${N} customers of a Dehradun café chain — annual spend (₹ thousand) and average visits per month. Drag a centroid to choose your own starting point.`));
      const sK = api.slider({ label: 'k — number of clusters', min: 2, max: 5, step: 1, value: K, onInput: v => { K = v; seedOff = 0; reset(); draw(); } });
      const segZ = api.seg([{ v: true, label: 'Standardised (z-scores)' }, { v: false, label: 'Raw units' }], stdz, v => { stdz = v; seedOff = 0; reset(); draw(); });
      const bStep = api.button('Step', () => { stop(); stepCore(); draw(); }, true, api.controls);
      const bRun = api.button('Run', () => run(), false, api.controls);
      api.button('Reset', () => { reset(); draw(); }, false, api.controls);
      api.button('New starting centroids', () => { seedOff++; reset(); draw(); }, false, api.controls);
      const roIt = api.ro('it', 'Iteration'), roNx = roH(api, 'Next step'), roW = roH(api, 'Within-cluster SS'), roMv = api.ro('mv', 'Customers that switched');
      const frm = W.el('div', { class: 'wz-frm' }); api.readout.appendChild(frm);
      const tw = W.el('div', { class: 'wz-tw' }); api.foot.appendChild(tw);
      const xl = W.el('div', { class: 'wz-xl' }); api.foot.appendChild(xl);
      xl.innerHTML = `<span class="h">Excel</span> There is no k-means button, but each step is a formula. Standardise: <code class="xl">=STANDARDIZE(B2,AVERAGE(B$2:B$${N + 1}),STDEV.S(B$2:B$${N + 1}))</code>. Distance to centroid 1 (in H2:I2): <code class="xl">=SQRT((D2-$H$2)^2+(E2-$I$2)^2)</code>. Nearest centroid: <code class="xl">=MATCH(MIN(F2:G2),F2:G2,0)</code>. New centroid: <code class="xl">=AVERAGEIF(J$2:J$${N + 1},1,D$2:D$${N + 1})</code>. Repeat until no customer switches (or use Solver / Python's scikit-learn).`;
      const note = api.note(''); const warn = msgEl(api.foot); warn(warnTxt);
      // drag a centroid (pointer on the svg so the capture survives redraws)
      st.svg.addEventListener('pointerdown', e => { if (!SC) return; const p = W.svgPoint(st.svg, e); let bi = -1, bd = 22 * 22; cents.forEach((c, j) => { const o = toO(c), dx = SC.x(o[0]) - p.x, dy = SC.y(o[1]) - p.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = j; } }); if (bi < 0) return; e.preventDefault(); stop(); dragI = bi; try { st.svg.setPointerCapture(e.pointerId); } catch (_) { } });
      st.svg.addEventListener('pointermove', e => { if (dragI < 0 || !SC) return; const p = W.svgPoint(st.svg, e), o = [clamp(SC.x.inv(p.x), SC.x0, SC.x1), clamp(SC.y.inv(p.y), SC.y0, SC.y1)]; cents[dragI] = fromO(o); trails[dragI] = [o]; phase = 'assign'; done = false; draw(); });
      ['pointerup', 'pointercancel'].forEach(ev => st.svg.addEventListener(ev, () => { dragI = -1; }));
      const level = z => z > 0.45 ? 'hi' : z < -0.45 ? 'lo' : 'mid';
      function draw() {
        const nar = st.narrow, Wd = st.w, H = st.h, L = nar ? 44 : 56, Rx = Wd - 14, T = 32, B = H - 48;
        const xMax = Math.ceil(maxOf(pts.map(p => p.v)) + 1), yMax = Math.ceil((maxOf(pts.map(p => p.s)) + 6) / 10) * 10;
        const sx = W.scale(0, xMax, L, Rx), sy = W.scale(0, yMax, B, T); SC = { x: sx, y: sy, x0: 0, x1: xMax, y0: 0, y1: yMax };
        W.clear(g);
        yGrid(g, sy, L, Rx, W.nice(0, yMax, nar ? 4 : 5), t => loc(t, 0));
        W.s('line', { x1: L, x2: Rx, y1: B, y2: B, style: 'stroke:var(--line-2);stroke-width:1.2' }, g);
        W.nice(0, xMax, nar ? 5 : 7).forEach(t => { W.s('line', { x1: sx(t), x2: sx(t), y1: B, y2: B + 5, style: 'stroke:var(--line-2)' }, g); tx(g, sx(t), B + 20, loc(t, 1), 13, 'var(--muted)'); });
        tx(g, Rx, B + 40, 'visits per month', 13, 'var(--muted)', 'end', 700); tx(g, 4, 18, 'annual spend (₹ thousand)', 13, 'var(--muted)', 'start', 700);
        const has = assign.some(a => a >= 0);
        if (has) pts.forEach((p, i) => { const a = assign[i]; if (a < 0) return; const o = toO(cents[a]); W.s('line', { x1: sx(p.v), y1: sy(p.s), x2: sx(o[0]), y2: sy(o[1]), style: `stroke:${COLS[a]};stroke-width:1;opacity:.28` }, g); });
        trails.forEach((t, j) => { if (t.length > 1) { W.s('path', { d: t.map((o, i) => (i ? 'L' : 'M') + sx(o[0]).toFixed(1) + ',' + sy(o[1]).toFixed(1)).join(''), style: `fill:none;stroke:${COLS[j]};stroke-width:2;stroke-dasharray:4 3;opacity:.9` }, g); t.slice(0, -1).forEach(o => W.s('circle', { cx: sx(o[0]), cy: sy(o[1]), r: 3, style: `fill:var(--surface);stroke:${COLS[j]};stroke-width:1.5` }, g)); } });
        pts.forEach((p, i) => { const a = assign[i]; if (a < 0) W.s('circle', { cx: sx(p.v), cy: sy(p.s), r: 4.4, style: 'fill:var(--surface);stroke:var(--muted);stroke-width:1.6' }, g); else shape(g, a, sx(p.v), sy(p.s), 4.6, `fill:${COLS[a]};stroke:var(--surface);stroke-width:1;opacity:.9`); });
        cents.forEach((c, j) => { const o = toO(c), x = sx(clamp(o[0], 0, xMax)), y = sy(clamp(o[1], 0, yMax)); shape(g, j, x, y, 12, 'fill:var(--surface);stroke:var(--surface);stroke-width:5'); shape(g, j, x, y, 11, `fill:${COLS[j]};stroke:var(--ink);stroke-width:2;cursor:grab`); W.s('path', { d: `M${x - 4},${y - 4}L${x + 4},${y + 4}M${x + 4},${y - 4}L${x - 4},${y + 4}`, style: 'stroke:var(--surface);stroke-width:2.2;stroke-linecap:round;pointer-events:none' }, g); });
        leg.innerHTML = cents.map((_, j) => `<span>${swSvg(j, COLS[j])}cluster ${j + 1}</span>`).join('') + `<span><svg viewBox="0 0 22 14" aria-hidden="true"><circle cx="11" cy="7" r="6" style="fill:var(--line-2);stroke:var(--ink);stroke-width:1.6"/><path d="M8,4L14,10M14,4L8,10" style="stroke:var(--surface);stroke-width:1.8"/></svg>centroid (big marker)</span><span>${lineSw('var(--muted)', '4 3', 2)}centroid's path</span>`;
        // elbow
        const E = elbow(), cur = has ? wcss(assign, cents) : NaN;
        W.clear(g2); const W2 = st2.w, H2 = st2.h, L2 = nar ? 44 : 56, R2 = W2 - 18, T2 = 38, B2 = H2 - 40;
        const ex = W.scale(0.6, 6.4, L2, R2), emax = Math.max(E[0], isFinite(cur) ? cur : 0) * 1.08, ey = W.scale(0, emax, B2, T2), et = W.nice(0, emax, 3).filter(t => t <= emax);
        yGrid(g2, ey, L2, R2, et, t => loc(t, tickDec(et)));
        tx(g2, 4, 18, `Elbow chart — best within-cluster SS for k = 1…6${stdz ? ' (z-units)' : ' (raw units)'}`, 13, 'var(--ink-2)', 'start', 700);
        W.s('line', { x1: L2, x2: R2, y1: B2, y2: B2, style: 'stroke:var(--line-2)' }, g2);
        W.s('path', { d: E.map((v, i) => (i ? 'L' : 'M') + ex(i + 1).toFixed(1) + ',' + ey(v).toFixed(1)).join(''), style: 'fill:none;stroke:var(--ink-2);stroke-width:2' }, g2);
        E.forEach((v, i) => { const on = i + 1 === K; W.s('circle', { cx: ex(i + 1), cy: ey(v), r: on ? 6.5 : 4, style: `fill:${on ? 'var(--acc-deep)' : 'var(--ink-2)'};stroke:var(--surface);stroke-width:1.5` }, g2); tx(g2, ex(i + 1), B2 + 19, `k=${i + 1}`, 13, on ? 'var(--acc-fg)' : 'var(--muted)', 'middle', on ? 700 : 400); if (on) tx(g2, ex(i + 1) + 10, ey(v) - 8, loc(v, 1, true), 13, 'var(--acc-fg)', 'start', 700, HALO); });
        if (isFinite(cur) && cur > E[K - 1] * 1.01) { W.s('circle', { cx: ex(K), cy: ey(cur), r: 6, style: 'fill:none;stroke:var(--bad);stroke-width:2' }, g2); tx(g2, ex(K) + 10, ey(cur) + 4, 'this run', 13, 'var(--bad)', 'start', 700, HALO); }
        // readouts
        roIt(String(iter)); roNx(`<span style="font-family:var(--sans);font-weight:700">${done ? '<span style="color:var(--ok)">converged ✓</span>' : phase === 'assign' ? 'assign customers' : 'move centroids'}</span>`);
        bStep.textContent = done ? 'Step (done)' : phase === 'assign' ? 'Step: assign' : 'Step: move centroids';
        roW(isFinite(cur) ? `${loc(cur, 2, true)} <span class="wz-mut" style="font-family:var(--sans)">${stdz ? 'z-units' : 'raw units'}</span>` : '—'); roMv(has ? String(lastCh) : '—');
        const per = cents.map((c, j) => X.reduce((s, x, i) => s + (assign[i] === j ? d2(x, c) : 0), 0));
        frm.innerHTML = has ? `WCSS = Σ over clusters of Σ (distance from each customer to its centroid)² = ${per.map(v => loc(v, 2, true)).join(' + ')} = <b>${loc(cur, 2, true)}</b>${stdz ? ' <span class="m">— distances measured in standard deviations, so spend and visits count equally</span>' : ' <span class="m">— distances in raw units: ₹ thousand of spend swamp visits per month</span>'}` : `Distance between two customers = √((Δ visits)² + (Δ spend)²)${stdz ? ' after converting both to z-scores' : ' in raw units'}. Each customer joins the centroid it is closest to.`;
        // segment table
        const cl = cents.map((c, j) => { const mem = pts.filter((_, i) => assign[i] === j); const v = mem.length ? S.mean(mem.map(p => p.v)) : NaN, s = mem.length ? S.mean(mem.map(p => p.s)) : NaN; const key = `${level((s - ms) / ss)}-${level((v - mv) / sv)}`; return { j, m: mem.length, v, s, nm: SEGN[key] || ['—', ''] }; });
        const byName = {}; cl.forEach(c => { if (c.m) (byName[c.nm[0]] = byName[c.nm[0]] || []).push(c); });
        Object.values(byName).forEach(gr => { if (gr.length < 2) return; gr.sort((a, b) => b.s - a.s); const tags = gr.length === 2 ? ['higher spend', 'lower spend'] : gr.length === 3 ? ['top spend', 'middle spend', 'lowest spend'] : gr.map((_, i) => 'group ' + (i + 1)); gr.forEach((c, i) => { c.nm = [`${c.nm[0]}, ${tags[i]}`, c.nm[1]]; }); });
        tw.style.display = has ? '' : 'none';
        if (has) tw.innerHTML = `<table class="wz-t"><thead><tr><th>Cluster</th><th>Customers</th><th>Avg spend (₹000)</th><th>Avg visits / month</th><th class="wz-hide-sm" style="text-align:left">Business name</th></tr></thead><tbody>${cl.map(c => `<tr><td>${swSvg(c.j, COLS[c.j]).replace('<svg ', '<svg style="width:20px;height:13px;vertical-align:-1px;margin-right:4px" ')}${c.j + 1}</td><td>${c.m}</td><td>${loc(c.s, 1, true)}</td><td>${loc(c.v, 1, true)}</td><td class="wz-hide-sm" style="text-align:left;white-space:normal">${c.m ? `<b>${c.nm[0]}</b><br><span class="wz-mut">${c.nm[1]}</span>` : '<span class="wz-mut">empty cluster</span>'}</td></tr>`).join('')}</tbody></table>`;
        // note
        let nt = '';
        if (!has) nt = `Press <b>Step</b> to assign every customer to its nearest centroid (the big markers), then <b>Step</b> again to move each centroid to the middle of its customers. Repeat — or press <b>Run</b> — until no customer switches.`;
        else if (!done) nt = phase === 'update' ? `Iteration ${iter + 1}: ${lastCh} customer${lastCh === 1 ? '' : 's'} ${lastCh === 1 ? 'is' : 'are'} now in a different cluster. Next, each centroid moves to the average of its customers.` : `The centroids have moved to the middle of their clusters. Next, customers are re-assigned to whichever centroid is now nearest.`;
        else {
          const segs = cl.filter(c => c.m).sort((a, b) => b.s - a.s).map(c => `<b>${c.nm[0]}</b> (${c.m}: ≈₹${loc(c.s, 0)}k a year, ${loc(c.v, 1)} visits a month)`);
          nt = `Converged after ${iter} iteration${iter === 1 ? '' : 's'}: no customer switches any more. In business terms the ${segs.length} segments are ${segs.join('; ')}. `;
          const dr = [1, 2, 3, 4, 5].map(i => E[i - 1] - E[i]), elb = dr.findIndex((d, i) => i > 0 && d < 0.15 * dr[0]);
          if (elb > 0) nt += `The elbow chart bends at <b>k = ${elb + 1}</b>: beyond that, extra clusters barely reduce the within-cluster SS${K !== elb + 1 ? ` — try k = ${elb + 1}` : ''}.`;
          if (cur > E[K - 1] * 1.01) nt += ` This run stopped at a worse solution (WCSS ${loc(cur, 1, true)} vs the best ${loc(E[K - 1], 1, true)}) — k-means can get stuck, so analysts run it from several random starts.`;
        }
        if (!stdz) nt += ` <span class="wz-mut">Raw units: spend ranges over about ${loc(maxOf(pts.map(p => p.s)) - minOf(pts.map(p => p.s)), 0)} (₹000) but visits only about ${loc(maxOf(pts.map(p => p.v)) - minOf(pts.map(p => p.v)), 0)}, so spend dominates the distances and clusters are cut almost purely by spend. Standardise first.</span>`;
        note.innerHTML = nt;
      }
      reset(); draw();
    }
  });

  // =====================================================================================
  // index-number — params: items [{name,p0,p1,q0,q1}], base, current, unit, salary0, salary1, deflate (bool)
  // =====================================================================================
  W.register('index-number', {
    title: 'Price index numbers: Laspeyres, Paasche, Fisher',
    init(api, P, el) {
      style(); el.classList.add('wz');
      const DEF = [{ name: 'Rice (kg)', p0: 42, p1: 50, q0: 25, q1: 24 }, { name: 'Milk (litre)', p0: 54, p1: 62, q0: 30, q1: 28 }, { name: 'Petrol (litre)', p0: 97, p1: 105, q0: 40, q1: 32 }, { name: 'LPG (cylinder)', p0: 1100, p1: 950, q0: 1, q1: 1 }];
      let warnTxt = '', src = null;
      if (Array.isArray(P.items)) { const ok = P.items.filter(o => o && typeof o === 'object').slice(0, 10); if (ok.length) src = ok.map((o, i) => ({ name: o.name !== undefined ? String(o.name) : `Item ${i + 1}`, p0: o.p0, p1: o.p1, q0: o.q0, q1: o.q1 })); else warnTxt = 'items must be a list like [{"name":"Rice","p0":40,"p1":48,"q0":20,"q1":18}] — showing the example instead.'; }
      else if (P.items !== undefined) warnTxt = 'items must be a list of {name, p0, p1, q0, q1} — showing the example instead.';
      const useDef = !src, start = () => (src || DEF).map(o => ({ name: String(o.name), p0: o.p0 === undefined || o.p0 === null ? '' : String(o.p0), p1: o.p1 === undefined || o.p1 === null ? '' : String(o.p1), q0: o.q0 === undefined || o.q0 === null ? '' : String(o.q0), q1: o.q1 === undefined || o.q1 === null ? '' : String(o.q1) }));
      let rows = start();
      const hasY = useDef || P.base !== undefined, y0 = P.base !== undefined ? String(P.base) : (useDef ? '2023' : 'the base period'), y1 = P.current !== undefined ? String(P.current) : (useDef ? '2026' : 'the current period');
      const unit = P.unit !== undefined ? String(P.unit) : '₹';
      let defl = !!P.deflate, dIdx = 'L', sal0 = nv(P.salary0, 50000), sal1 = nv(P.salary1, 56000);
      const st = frame(api, 'Bar chart of the four price indexes compared with the base of 100', nr => [nr ? 360 : 640, nr ? 212 : 196], () => draw());
      const g = W.s('g', null, st.svg);
      api.stage.appendChild(W.el('p', { class: 'wz-cap' }, useDef ? `Hypothetical monthly household basket in Dehradun: prices p (₹ per unit) and quantities q bought per month, base year ${esc(y0)} (subscript 0) and current year ${esc(y1)} (subscript 1). Edit any cell.<span class="wz-sm-only"> Swipe the table sideways for all columns.</span>` : `${hasY ? `Base period ${esc(y0)}` : 'Base period'} (subscript 0) and ${P.current !== undefined ? `current period ${esc(y1)}` : 'current period'} (subscript 1). Edit any cell.<span class="wz-sm-only"> Swipe the table sideways for all columns.</span>`));
      const tw = W.el('div', { class: 'wz-tw' }); api.controls.appendChild(tw); tw.style.gridColumn = '1/-1';
      api.button('Add item', () => { if (rows.length >= 10) return; rows.push({ name: `Item ${rows.length + 1}`, p0: '', p1: '', q0: '', q1: '' }); build(); const ins = tw.querySelectorAll('input[data-k="p0"]'); if (ins.length) ins[ins.length - 1].focus(); }, false, api.controls);
      api.button('Remove last', () => { if (rows.length > 1) { rows.pop(); build(); } }, false, api.controls);
      api.button('Reset', () => { rows = start(); build(); }, false, api.controls);
      const bD = api.button('Deflate a salary', () => { defl = !defl; bD.setAttribute('aria-pressed', defl); pan.hidden = !defl; draw(); }, false, api.controls); bD.setAttribute('aria-pressed', defl);
      const ix = W.el('div', { class: 'wz-ix' }); api.readout.appendChild(ix);
      const pan = W.el('div', { class: 'wz-panel' }); pan.hidden = !defl; api.foot.appendChild(pan);
      pan.innerHTML = `<div class="row"><label>Salary in ${esc(y0)} <input type="text" inputmode="decimal" class="w-input" data-s="0" value="${sal0}" aria-label="Salary in the base year"></label><label>Salary in ${esc(y1)} (nominal) <input type="text" inputmode="decimal" class="w-input" data-s="1" value="${sal1}" aria-label="Salary in the current year"></label></div><div class="row" style="margin-top:.5rem"><span style="font-size:.9rem">Deflate by</span></div><div class="wz-frm" style="margin-top:.5rem" data-out></div>`;
      const dSeg = api.seg([{ v: 'L', label: 'Laspeyres' }, { v: 'P', label: 'Paasche' }, { v: 'F', label: 'Fisher' }], dIdx, v => { dIdx = v; draw(); }, pan.querySelectorAll('.row')[1]);
      pan.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { const v = toNum(inp.value); if (inp.dataset.s === '0') sal0 = v; else sal1 = v; inp.setAttribute('aria-invalid', !(v > 0)); draw(); }));
      const xl = W.el('div', { class: 'wz-xl' }); api.foot.appendChild(xl);
      const note = api.note(''); const warn = msgEl(api.foot);
      const K5 = ['p0', 'p1', 'q0', 'q1'];
      function build() {
        tw.innerHTML = `<table class="wz-t"><thead><tr><th>Item</th><th>p${sub(0)}</th><th>p${sub(1)}</th><th>q${sub(0)}</th><th>q${sub(1)}</th><th title="price relative">p${sub(1)}/p${sub(0)}×100</th><th>p${sub(0)}q${sub(0)}</th><th>p${sub(1)}q${sub(0)}</th><th>p${sub(0)}q${sub(1)}</th><th>p${sub(1)}q${sub(1)}</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td><input type="text" class="nm" data-k="name" data-i="${i}" value="${esc(r.name)}" aria-label="Item ${i + 1} name"></td>${K5.map(k => `<td><input type="text" inputmode="decimal" data-k="${k}" data-i="${i}" value="${esc(r[k])}" aria-label="${k} for item ${i + 1}"></td>`).join('')}<td data-c="rel${i}"></td><td data-c="a${i}"></td><td data-c="b${i}"></td><td data-c="c${i}"></td><td data-c="d${i}"></td></tr>`).join('')}<tr class="tot"><td>Total Σ</td><td data-c="sp0"></td><td data-c="sp1"></td><td></td><td></td><td></td><td data-c="sa"></td><td data-c="sb"></td><td data-c="sc"></td><td data-c="sd"></td></tr></tbody></table>`;
        tw.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { rows[+inp.dataset.i][inp.dataset.k] = inp.value; draw(); }));
        draw();
      }
      const cell = (k, v) => { const c = tw.querySelector(`[data-c="${k}"]`); if (c) c.textContent = v; };
      function draw() {
        const vals = rows.map(r => { const o = {}; K5.forEach(k => { o[k] = toNum(r[k]); }); return o; });
        const bad = []; vals.forEach((v, i) => K5.forEach(k => { const inp = tw.querySelector(`input[data-k="${k}"][data-i="${i}"]`), okv = isFinite(v[k]) && v[k] >= 0 && !(k === 'p0' && v[k] === 0); if (inp) inp.setAttribute('aria-invalid', !okv); if (!okv) bad.push(i); }));
        const good = vals.map((v, i) => ({ v, i })).filter(o => !bad.includes(o.i)), dd = Math.min(2, Math.max(0, ...rows.map(r => Math.max(decOf(r.p0), decOf(r.p1))))), dq = Math.min(2, Math.max(0, ...rows.map(r => Math.max(decOf(r.p0), decOf(r.p1)) + Math.max(decOf(r.q0), decOf(r.q1)))));
        vals.forEach((v, i) => { const ok = !bad.includes(i); cell('rel' + i, ok ? loc(v.p1 / v.p0 * 100, 1, true) : '—'); cell('a' + i, ok ? loc(v.p0 * v.q0, dq) : '—'); cell('b' + i, ok ? loc(v.p1 * v.q0, dq) : '—'); cell('c' + i, ok ? loc(v.p0 * v.q1, dq) : '—'); cell('d' + i, ok ? loc(v.p1 * v.q1, dq) : '—'); });
        const Sg = f => sum(good.map(o => f(o.v))), sp0 = Sg(v => v.p0), sp1 = Sg(v => v.p1), sa = Sg(v => v.p0 * v.q0), sb = Sg(v => v.p1 * v.q0), sc = Sg(v => v.p0 * v.q1), sd = Sg(v => v.p1 * v.q1);
        cell('sp0', loc(sp0, dd)); cell('sp1', loc(sp1, dd)); cell('sa', loc(sa, dq)); cell('sb', loc(sb, dq)); cell('sc', loc(sc, dq)); cell('sd', loc(sd, dq));
        const SA = sp0 > 0 ? sp1 / sp0 * 100 : NaN, LI = sa > 0 ? sb / sa * 100 : NaN, PI = sc > 0 ? sd / sc * 100 : NaN, FI = LI > 0 && PI > 0 ? Math.sqrt(LI * PI) : NaN;
        const ub = [...new Set(bad)], empty = ub.filter(i => K5.every(k => String(rows[i][k]).trim() === '')), wrong = ub.filter(i => !empty.includes(i));
        warn(wrong.length ? `Row${wrong.length > 1 ? 's' : ''} ${wrong.map(i => i + 1).join(', ')} ${wrong.length > 1 ? 'are' : 'is'} left out: prices and quantities must be numbers ≥ 0, and p${sub(0)} must be above 0.` : empty.length ? `Fill in row ${empty.map(i => i + 1).join(', ')} — it is ignored until it has prices and quantities.` : warnTxt);
        const n2 = v => loc(v, 2, true), big = v => loc(v, dd), bq = v => loc(v, dq);
        const IX = [
          { k: 'SA', nm: 'Simple aggregate', v: SA, f: `Σp${sub(1)} ÷ Σp${sub(0)} × 100 = ${big(sp1)} ÷ ${big(sp0)} × 100`, w: 'ignores quantities' },
          { k: 'L', nm: 'Laspeyres', v: LI, f: `Σp${sub(1)}q${sub(0)} ÷ Σp${sub(0)}q${sub(0)} × 100 = ${bq(sb)} ÷ ${bq(sa)} × 100`, w: hasY ? `base-year (${esc(y0)}) basket` : 'base-period basket' },
          { k: 'P', nm: 'Paasche', v: PI, f: `Σp${sub(1)}q${sub(1)} ÷ Σp${sub(0)}q${sub(1)} × 100 = ${bq(sd)} ÷ ${bq(sc)} × 100`, w: P.current !== undefined || useDef ? `current-year (${esc(y1)}) basket` : 'current-period basket' },
          { k: 'F', nm: 'Fisher (ideal)', v: FI, f: `√(Laspeyres × Paasche) = √(${n2(LI)} × ${n2(PI)})`, w: 'geometric mean of the two' }];
        ix.innerHTML = IX.map(o => `<div class="${defl && o.k === dIdx ? 'on' : ''}"><div class="nm"><span>${o.nm}</span><b>${isFinite(o.v) ? n2(o.v) : '—'}</b></div><div class="f">${o.f}</div><div class="f wz-mut">${o.w}${isFinite(o.v) ? ` · prices ${o.v >= 100 ? 'up' : 'down'} ${loc(Math.abs(o.v - 100), 1, true)}%` : ''}</div></div>`).join('');
        // chart: bars from the base of 100
        W.clear(g); const nar = st.narrow, Wd = st.w, Lb = nar ? 112 : 150, Rx = Wd - (nar ? 54 : 64), T = 30, rowH = nar ? 40 : 36;
        const fin = IX.map(o => o.v).filter(isFinite); let lo = Math.min(95, ...fin.map(v => v - 4)), hi = Math.max(105, ...fin.map(v => v + 4)); const ticks = W.nice(lo, hi, nar ? 4 : 6); lo = Math.min(lo, ticks[0]); hi = Math.max(hi, ticks[ticks.length - 1]);
        const sx = W.scale(lo, hi, Lb, Rx), Bt = T + rowH * 4 + 4;
        ticks.forEach(t => { W.s('line', { x1: sx(t), x2: sx(t), y1: T - 4, y2: Bt, style: 'stroke:var(--line);stroke-dasharray:2 3' }, g); tx(g, sx(t), Bt + 18, loc(t, 0), 13, 'var(--muted)'); });
        W.s('line', { x1: sx(100), x2: sx(100), y1: T - 10, y2: Bt, style: 'stroke:var(--ink-2);stroke-width:2' }, g); tx(g, sx(100), T - 14, hasY ? `base ${y0} = 100` : 'base = 100', 13, 'var(--ink-2)', 'middle', 700);
        IX.forEach((o, i) => { const y = T + i * rowH + rowH / 2; tx(g, Lb - 8, y + 4.5, nar ? o.nm.replace(' (ideal)', '') : o.nm, 13, 'var(--ink-2)', 'end', 700); if (!isFinite(o.v)) { tx(g, sx(100) + 8, y + 4.5, '—', 13, 'var(--muted)', 'start'); return; } const x0 = sx(100), x1 = sx(o.v), on = defl && o.k === dIdx; W.s('rect', { x: Math.min(x0, x1), y: y - rowH * 0.32, width: Math.max(1.5, Math.abs(x1 - x0)), height: rowH * 0.64, rx: 3, style: `fill:${o.k === 'SA' ? 'var(--line-2)' : 'var(--acc-deep)'};opacity:${o.k === 'SA' ? 1 : on ? 1 : 0.78}${on ? ';stroke:var(--ink);stroke-width:1.5' : ''}` }, g); const lw = n2(o.v).length * 7.6, left = o.v < 100 && x1 - 6 - lw > Lb + 2, rightX = o.v >= 100 ? x1 + 6 : x0 + 6; tx(g, left ? x1 - 6 : Math.min(rightX, Wd - lw - 2), y + 4.5, n2(o.v), 13, 'var(--ink)', left ? 'end' : 'start', 700, HALO); });
        // deflate
        const DI = { L: LI, P: PI, F: FI }[dIdx], dn = { L: 'Laspeyres', P: 'Paasche', F: 'Fisher' }[dIdx];
        const real = DI > 0 && sal1 > 0 ? sal1 / DI * 100 : NaN, gN = sal0 > 0 && sal1 > 0 ? (sal1 / sal0 - 1) * 100 : NaN, gR = isFinite(real) && sal0 > 0 ? (real / sal0 - 1) * 100 : NaN;
        const out = pan.querySelector('[data-out]');
        if (out) out.innerHTML = `Real salary = nominal ÷ index × 100 = ${fu(sal1, unit, 0)} ÷ ${n2(DI)} × 100 = <b>${fu(real, unit, 0)}</b> <span class="m">in ${esc(y0)} prices</span><br>Nominal change ${pct(gN)} · price change ${pct(DI - 100)} · <b>real change ${pct(gR)}</b>`;
        // Excel
        const m = rows.length, rg = c => `${c}2:${c}${m + 1}`;
        xl.innerHTML = `<span class="h">Excel</span> Items in A, p${sub(0)} in B, p${sub(1)} in C, q${sub(0)} in D, q${sub(1)} in E (rows 2–${m + 1}). Simple aggregate <code class="xl">=SUM(${rg('C')})/SUM(${rg('B')})*100</code> · Laspeyres <code class="xl">=SUMPRODUCT(${rg('C')},${rg('D')})/SUMPRODUCT(${rg('B')},${rg('D')})*100</code> · Paasche <code class="xl">=SUMPRODUCT(${rg('C')},${rg('E')})/SUMPRODUCT(${rg('B')},${rg('E')})*100</code> · Fisher <code class="xl">=SQRT(H3*H4)</code> (with Laspeyres in H3, Paasche in H4)${defl ? ` · real salary <code class="xl">=${xn(sal1)}/${xn(+DI.toFixed(4))}*100</code>` : ''}.`;
        // note
        let nt = '';
        if (isFinite(LI)) {
          nt = `Bought in the same quantities as in ${esc(y0)}, this basket costs <b>${loc(Math.abs(LI - 100), 1, true)}% ${LI >= 100 ? 'more' : 'less'}</b> in ${esc(y1)} (Laspeyres ${n2(LI)}). `;
          if (isFinite(SA) && Math.abs(SA - LI) > 3) { let top = good[0]; good.forEach(o => { if (o.v.p0 > top.v.p0) top = o; }); nt += `The simple aggregate (${n2(SA)}) ${Math.sign(SA - 100) !== Math.sign(LI - 100) ? 'even points the other way' : 'is misleading'}: it just adds unit prices, so <b>${esc(rows[top.i].name)}</b>, at ${fu(top.v.p0, unit, dd)} a unit, swamps everything else however little of it is bought. Weighting by quantities fixes this. `; }
          if (isFinite(PI) && Math.abs(PI - LI) > 0.05) nt += PI < LI ? `Paasche (${n2(PI)}) is lower: by ${esc(y1)} households buy relatively less of the items whose prices rose most (substitution), so the fixed ${esc(y0)} basket of Laspeyres <b>overstates</b> the rise in living costs. Fisher (${n2(FI)}) sits between the two.` : `Paasche (${n2(PI)}) is higher: households now buy relatively more of the items whose prices rose most, so Laspeyres understates the rise. Fisher (${n2(FI)}) sits between the two.`;
          else if (isFinite(PI)) nt += `Paasche and Laspeyres agree (${n2(PI)}) because the quantity pattern hardly changed.`;
          if (defl && isFinite(gR)) nt += Math.abs(gR) < 0.05 ? ` <b>Salary:</b> it changed ${pct(gN)} in rupees — exactly in line with prices (${dn} index), so its <b>real value is unchanged</b>: the pay rise only kept up with inflation.` : ` <b>Salary:</b> it changed ${pct(gN)} in rupees, but deflated by the ${dn} index it ${gR >= 0 ? 'rose' : 'fell'} <b>${loc(Math.abs(gR), 1, true)}%</b> in real terms — ${gR >= 0 ? (gN >= 0 ? 'the pay rise beat inflation' : 'falling prices more than made up for the pay cut') : gN > 0 ? 'inflation ate more than the whole pay rise' : 'the pay cut hurts even more once prices are counted'}.`;
        } else nt = 'Enter base-year prices and quantities (all numbers, p₀ above 0) to compute the indexes.';
        note.innerHTML = nt;
      }
      build();
    }
  });

  // =====================================================================================
  // scales — measurement-scales sorter game; optional param items [{text, scale, why}]
  // =====================================================================================
  const SC_NAMES = { N: 'Nominal', O: 'Ordinal', I: 'Interval', R: 'Ratio' };
  const SC_HINT = { N: 'labels only — no order', O: 'order, but unequal gaps', I: 'equal gaps, no true zero', R: 'equal gaps and a true zero' };
  const SC_ITEMS = [
    ['PIN code of a customer’s address (e.g. 248001)', 'N', 'the digits only label an area — an “average PIN code” is meaningless.'],
    ['Customer satisfaction rating (1★ to 5★)', 'O', 'stars are in order, but the step from 4★ to 5★ is not a measured equal amount — report the median or % rating 4★–5★.'],
    ['Temperature of a cold-storage room (°C)', 'I', 'the 1° steps are equal, but 0 °C is not “no temperature”, so 20 °C is not twice as warm as 10 °C.'],
    ['Monthly revenue (₹)', 'R', '₹0 means no revenue and ₹20 lakh really is twice ₹10 lakh — a true zero, so ratios work.'],
    ['Rank in class (1st, 2nd, 3rd …)', 'O', 'order only: 1st and 2nd may be 1 mark apart while 2nd and 3rd are 20 marks apart.'],
    ['Gender of an employee', 'N', 'categories with no natural order — count them and report percentages or the mode.'],
    ['Temperature of a furnace in kelvin (K)', 'R', '0 K is absolute zero (no heat at all), so 600 K really is twice 300 K — same temperature, different scale from °C.'],
    ['Likert item: “I would recommend this brand” (Strongly disagree … Strongly agree)', 'O', 'ordered agreement categories with no measured distance between them (averaging many Likert items as if interval is common, but say so).'],
    ['Employee ID number (e.g. E-10473)', 'N', 'a unique label — a bigger ID is not “more” of anything.'],
    ['Years of work experience', 'R', '0 years means none, and 10 years is twice 5 years.'],
    ['NPS category (Detractor / Passive / Promoter)', 'O', 'three groups in a clear order of loyalty, but no measured distance between them.'],
    ['Market share (%)', 'R', '0% means no sales and a 30% share is twice a 15% share.']];
  W.register('scales', {
    title: 'Measurement scales: sort the variables',
    init(api, P, el) {
      style(); el.classList.add('wz');
      let warnTxt = '', ITEMS = SC_ITEMS.map(a => ({ t: a[0], a: a[1], w: a[2] }));
      if (Array.isArray(P.items)) {
        const map = { n: 'N', nominal: 'N', o: 'O', ordinal: 'O', i: 'I', interval: 'I', r: 'R', ratio: 'R' };
        const it = P.items.filter(o => o && (o.text || o.name) && map[String(o.scale || o.answer || '').toLowerCase()]).slice(0, 20).map(o => ({ t: String(o.text || o.name), a: map[String(o.scale || o.answer).toLowerCase()], w: o.why ? String(o.why) : '' }));
        if (it.length >= 2) ITEMS = it; else warnTxt = 'items must be a list of {text, scale: "nominal"/"ordinal"/"interval"/"ratio", why} — showing the standard 12 variables.';
      }
      const NI = ITEMS.length; let seed = 7, order = [], placed = {}, cur = -1, last = null;
      function shuffle() { const r = S.rng(seed * 97 + 3), a = ITEMS.map((_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } order = a; }
      const box = W.el('div'); api.stage.appendChild(box);
      box.innerHTML = `<div class="sc-cur"><small data-curh>Where does this variable belong?</small><b data-cur></b></div><div class="sc-bins">${'NOIR'.split('').map(s => `<div class="sc-bin" data-bin="${s}"><button type="button" class="sc-bb" data-s="${s}" aria-label="${SC_NAMES[s]}: ${SC_HINT[s]}"><b>${SC_NAMES[s]} <kbd>${s}</kbd></b><small>${SC_HINT[s]}</small></button><div class="sc-list" data-list="${s}"></div></div>`).join('')}</div><div class="sc-fb" role="status" aria-live="polite" data-fb></div><p class="sc-h" data-ph>Still to sort — tap one to choose it:</p><div class="sc-pool" data-pool></div>`;
      const q = s => box.querySelector(s);
      const roS = roH(api, 'Score'), roL = roH(api, 'Sorted');
      api.button('Reset', () => { seed++; reset(); }, false, api.controls);
      api.controls.appendChild(W.el('p', { class: 'wz-cap', style: 'grid-column:1/-1;margin:0' }, 'Tap a scale to place the highlighted variable (keyboard: N, O, I or R). Ask in turn: is there an order? are the gaps equal? is there a true zero?'));
      const tw = W.el('div', { class: 'wz-tw' }); api.foot.appendChild(tw);
      const note = api.note(''); const warn = msgEl(api.foot); warn(warnTxt);
      const TAB = [['N', '✗', '✗', '✗', 'counts, %, mode, chi-square test', 'gender, PIN code, employee ID'], ['O', '✓', '✗', '✗', '+ median, quartiles, percentiles, rank correlation', 'class rank, star rating, NPS group'], ['I', '✓', '✓', '✗', '+ mean, SD, Pearson r; differences make sense, ratios don’t', '°C, calendar year'], ['R', '✓', '✓', '✓', '+ ratios (“twice as much”), % change, CV, geometric mean', 'revenue, kelvin, experience, market share']];
      function table() { const hl = last ? ITEMS[last.i].a : ''; tw.innerHTML = `<table class="wz-t sc-t"><caption>What you may calculate on each scale (each level allows everything above it)</caption><thead><tr><th>Scale</th><th>Order?</th><th>Equal gaps?</th><th>True zero?</th><th style="text-align:left">Permissible statistics</th><th class="wz-hide-sm" style="text-align:left">Examples</th></tr></thead><tbody>${TAB.map(r => `<tr class="${r[0] === hl ? 'sel' : ''}"><td><b>${SC_NAMES[r[0]]}</b></td>${[1, 2, 3].map(i => `<td class="${r[i] === '✓' ? 'y' : 'n'}">${r[i]}</td>`).join('')}<td style="text-align:left">${r[4]}</td><td class="wz-hide-sm" style="text-align:left">${r[5]}</td></tr>`).join('')}</tbody></table>`; }
      function reset() { shuffle(); placed = {}; last = null; cur = order[0]; q('[data-fb]').className = 'sc-fb'; q('[data-fb]').innerHTML = 'Pick the scale for the highlighted variable. You get instant feedback and a one-line reason.'; render(); }
      function nextCur() { const rest = order.filter(i => !(i in placed)); cur = rest.length ? rest[0] : -1; }
      function place(s) {
        if (cur < 0) return; const hadF = el.contains(document.activeElement), it = ITEMS[cur], ok = it.a === s; placed[cur] = s; last = { i: cur, s, ok };
        const fb = q('[data-fb]'); fb.className = 'sc-fb ' + (ok ? 'ok' : 'no');
        fb.innerHTML = ok ? `<span class="v-ok">✓ Correct.</span> ${esc(it.t)} is <b>${SC_NAMES[it.a].toLowerCase()}</b>${it.w ? ': ' + esc(it.w) : '.'}` : `<span class="v-no">✗ Not quite</span> — you chose ${SC_NAMES[s]}. ${esc(it.t)} is <b>${SC_NAMES[it.a].toLowerCase()}</b>${it.w ? ': ' + esc(it.w) : '.'}`;
        const bin = q(`[data-bin="${it.a}"]`); bin.classList.remove('flash-ok', 'flash-no'); void bin.offsetWidth; bin.classList.add(ok ? 'flash-ok' : 'flash-no'); setTimeout(() => bin.classList.remove('flash-ok', 'flash-no'), 900);
        nextCur(); render();
        if (hadF && !el.contains(document.activeElement)) { const f = q('.sc-chip[aria-pressed="true"]') || q(`.sc-bb[data-s="${s}"]`); if (f && !f.disabled) f.focus(); else { const rb = api.controls.querySelector('button'); if (rb) rb.focus(); } }
      }
      function render() {
        const done = Object.keys(placed).length, right = Object.keys(placed).filter(i => placed[i] === ITEMS[i].a).length;
        q('[data-curh]').textContent = cur >= 0 ? 'Where does this variable belong?' : 'Finished';
        q('[data-cur]').textContent = cur >= 0 ? ITEMS[cur].t : `All ${NI} sorted — ${right} of ${NI} correct${right === NI ? '. Perfect!' : '.'} Press Reset to play again.`;
        'NOIR'.split('').forEach(s => { q(`[data-list="${s}"]`).innerHTML = order.filter(i => (i in placed) && ITEMS[i].a === s).map(i => { const ok = placed[i] === s; return `<button type="button" class="sc-pl ${ok ? 'ok' : 'no'}" data-i="${i}">${ok ? '✓' : '✗'} ${esc(ITEMS[i].t)}${ok ? '' : `<i>you said ${SC_NAMES[placed[i]]}</i>`}</button>`; }).join(''); q(`.sc-bb[data-s="${s}"]`).disabled = cur < 0; });
        const rest = order.filter(i => !(i in placed));
        q('[data-pool]').innerHTML = rest.map(i => `<button type="button" class="sc-chip" data-i="${i}" aria-pressed="${i === cur}">${esc(ITEMS[i].t)}</button>`).join('');
        q('[data-ph]').style.display = rest.length ? '' : 'none';
        roS(done ? `${right} / ${done}` : '—'); roL(`${done} of ${NI}`);
        table();
        let nt;
        if (!done) nt = `Four questions sort any variable: <b>Is it just a label?</b> (nominal) <b>Is there an order?</b> (ordinal) <b>Are the gaps equal?</b> (interval) <b>Is zero a true “none”?</b> (ratio). The scale decides which statistics are allowed — the table below.`;
        else if (cur >= 0) nt = `${right} of ${done} right so far. ${last && !last.ok ? `Tip: ${SC_NAMES[ITEMS[last.i].a]} variables are “${SC_HINT[ITEMS[last.i].a]}”.` : 'Numbers can mislead: a PIN code or an employee ID is numeric but still nominal.'}`;
        else { const miss = Object.keys(placed).filter(i => placed[i] !== ITEMS[i].a).map(i => `${ITEMS[i].t} → ${SC_NAMES[ITEMS[i].a].toLowerCase()}`); nt = right === NI ? `Perfect score! You can now choose the right summary: mode for nominal, median for ordinal, mean and SD for interval and ratio — and “twice as much” only for ratio data.` : `You got <b>${right} of ${NI}</b>. Review: ${miss.map(esc).join('; ')}. Remember: only <b>ratio</b> data support “twice as much”, and a mean needs at least <b>interval</b> data.`; }
        note.innerHTML = nt;
      }
      box.addEventListener('click', e => {
        const b = e.target.closest('.sc-bb'); if (b) { place(b.dataset.s); return; }
        const c = e.target.closest('.sc-chip'); if (c) { cur = +c.dataset.i; render(); const nb = q(`.sc-chip[data-i="${cur}"]`); if (nb) nb.focus(); return; }
        const p = e.target.closest('.sc-pl'); if (p) { const i = +p.dataset.i, it = ITEMS[i], ok = placed[i] === it.a, fb = q('[data-fb]'); fb.className = 'sc-fb ' + (ok ? 'ok' : 'no'); fb.innerHTML = `${ok ? '<span class="v-ok">✓</span>' : `<span class="v-no">✗</span> You chose ${SC_NAMES[placed[i]]}.`} ${esc(it.t)} is <b>${SC_NAMES[it.a].toLowerCase()}</b>${it.w ? ': ' + esc(it.w) : '.'}`; }
      });
      el.addEventListener('keydown', e => { if (e.ctrlKey || e.metaKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return; const k = e.key.toUpperCase(); if ('NOIR'.includes(k) && k.length === 1) { e.preventDefault(); place(k); } });
      reset();
    }
  });
})();
