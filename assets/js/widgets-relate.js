/* Statistics for Managers — widget pack "relate" (Relationships pillar).
   correlation · regression-fit · mlr-3d · logistic · anova · chi-square
   Catalogue + params: notes/WIDGETS.md. Uses only SFMW (widgets.js) and Stats (stats.js). Vanilla JS, no libraries.
   SVG widgets draw on a "pixel-true" viewBox: 640 wide on desktop (like the core widgets), the real stage width on phones,
   so 13px chart text stays 13px on a 360px screen. mlr-3d draws on a devicePixelRatio-aware canvas and reads its theme
   colours with getComputedStyle at draw time (redrawn on the 'sfm:theme' event and on a system light/dark change). */
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
  const toNum = v => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') { const c = v.replace(/[−–]/g, '-').replace(/[,\s₹$€£%]/g, ''); return c === '' ? NaN : +c; }
    return NaN;
  };
  const nums = a => (Array.isArray(a) ? a.map(toNum).filter(v => isFinite(v)) : []);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mi = s => String(s).replace(/-/g, '−');
  function loc(v, d = 2, fixed, lc) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    const a = Math.abs(v); if (a >= 1e12) return mi(v.toExponential(2));
    const s = a.toLocaleString(lc || 'en-IN', { minimumFractionDigits: fixed ? d : 0, maximumFractionDigits: d });
    return (v < 0 && +a.toFixed(d) !== 0 ? '−' : '') + s;
  }
  const decFor = v => { const a = Math.abs(v); if (!isFinite(a) || a === 0) return 2; return clamp(2 - Math.floor(Math.log10(a)), 0, 5); };
  const sig = (v, extra = 0) => loc(v, clamp(decFor(v) + extra, 0, 6));      // about 3 (+extra) significant digits
  const fx = (v, d) => (isFinite(v) ? mi((+v).toFixed(d)) : '—');               // fixed decimals, typographic minus
  const xn = (v, d = 4) => String(+(+v).toFixed(d));                            // a number inside an Excel formula
  const xp = (v, d = 4) => (v < 0 ? '(' + xn(v, d) + ')' : xn(v, d));
  const fP = p => (!isFinite(p) ? '—' : p < 0.0001 ? '< 0.0001' : p.toFixed(4));
  const pct = (v, d = 0) => (isFinite(v) ? (v * 100).toFixed(d) + '%' : '—');
  const colL = i => String.fromCharCode(65 + i);
  function niceStep(v) { if (!(v > 0) || !isFinite(v)) return 1; const e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e); return +((m >= 5 ? 5 : m >= 2 ? 2 : 1) * Math.pow(10, e)).toPrecision(6); }
  function niceUp(v) { if (!(v > 0) || !isFinite(v)) return 1; const e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e); const k = [1, 2, 2.5, 5, 10].find(c => c >= m - 1e-9) || 10; return +(k * Math.pow(10, e)).toPrecision(6); }
  const snap = (v, st, lo) => +((lo || 0) + Math.round((v - (lo || 0)) / st) * st).toFixed(10);
  function niceDom(vals, k = 4, zeroFloor) {
    let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (!isFinite(lo) || !isFinite(hi)) { lo = 0; hi = 1; }
    if (hi - lo < 1e-9) { const d = Math.abs(hi) * 0.1 || 1; lo -= d; hi += d; }
    let step = niceStep((hi - lo) / k), a = Math.floor(lo / step + 1e-9) * step, b = Math.ceil(hi / step - 1e-9) * step;
    if ((b - a) / step > 6.5) { step = niceStep(step * 1.9); a = Math.floor(lo / step + 1e-9) * step; b = Math.ceil(hi / step - 1e-9) * step; }
    if (zeroFloor && lo >= 0 && a < 0) a = 0;
    const ticks = []; for (let t = a; t <= b + step * 1e-6; t += step) ticks.push(+t.toFixed(10));
    return { lo: +a.toFixed(10), hi: +b.toFixed(10), step, ticks };
  }
  const tickFmt = st => t => loc(t, clamp(-Math.floor(Math.log10(st) + 1e-9), 0, 4));
  // "Annual sales ($1000s)" -> {name:"Annual sales", unit:"$1000s"}
  function parseLabel(s) { s = String(s || '').trim(); const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(s); return m && m[1] ? { name: m[1], unit: m[2].trim(), full: s } : { name: s, unit: '', full: s }; }
  const lcFirst = s => (s.length > 1 && /[A-Z]/.test(s[0]) && s[1] === s[1].toLowerCase() && !/[0-9₀-₉]/.test(s[1]) ? s[0].toLowerCase() + s.slice(1) : s);
  // value with its unit: ₹ lakh -> ₹4.6 lakh, $1000s -> $4,600, % -> 4.6%, minutes -> 4.6 minutes
  function withUnit(v, unit, d) {
    if (!isFinite(v)) return '—';
    const sgn = v < 0 && Math.abs(v) >= 1e-12 ? '−' : '', a = Math.abs(v), f = x => (d === undefined ? sig(x) : loc(x, d));
    if (!unit) return sgn + f(a);
    const lcOf = sym => (sym === '₹' ? 'en-IN' : 'en-US');
    let m = /^([$₹€£])\s*(1,?000|'?000|k|thousands?)s?$/i.exec(unit); if (m) return sgn + m[1] + loc(a * 1000, d === undefined ? clamp(decFor(a * 1000), 0, 2) : Math.max(0, d - 3), false, lcOf(m[1]));
    m = /^([$₹€£])\s*([A-Za-z ]*)$/.exec(unit); if (m) return sgn + m[1] + (d === undefined ? loc(a, clamp(decFor(a), 0, 6), false, lcOf(m[1])) : loc(a, d, false, lcOf(m[1]))) + (m[2].trim() ? ' ' + m[2].trim() : '');
    if (unit === '%') return sgn + f(a) + '%';
    return sgn + f(a) + ' ' + unit;
  }
  // "each extra year of experience" / "each extra ₹1 lakh of ad spend" / "each 1-unit increase in sales reps"
  function perUnit(L) {
    const nm = lcFirst(L.name), u = L.unit;
    const m = /^(years?|months?|weeks?|days?|hours?|minutes?)\s+of\s+(.+)$/i.exec(L.name); if (m && !u) return `each extra ${m[1].toLowerCase().replace(/s$/, '')} of ${m[2]}`;
    if (!u) return `each 1-unit increase in ${nm}`;
    if (u === '%') return `each extra percentage point of ${nm}`;
    if (/^[$₹€£]/.test(u)) return `each extra ${withUnit(1, u, 0)} of ${nm}`;
    if (/^(years?|months?|weeks?|days?|hours?|minutes?|km|kg|units?)$/i.test(u)) return `each extra ${u.replace(/s$/i, '')} of ${nm}`;
    return `each 1-unit (${u}) increase in ${nm}`;
  }
  function deltaY(b, L) {
    const nm = lcFirst(L.name) || 'y', up = b >= 0 ? 'higher' : 'lower';
    if (L.unit === '%') return `${nm} about <b>${sig(Math.abs(b))} percentage points ${up}</b>`;
    return `${nm} about <b>${withUnit(Math.abs(b), L.unit)} ${up}</b>`;
  }
  // colours of the *other* pillars (for a second / third series)
  function pal(el) {
    const host = el.closest('.c-descriptive,.c-probability,.c-inferential,.c-relationships') || document.body;
    const m = /(?:pillar|c)-(descriptive|probability|inferential|relationships)/.exec(host.className || '');
    const cur = m ? m[1][0] : 'n', o = ['p', 'd', 'i', 'r'].filter(x => x !== cur);
    return { c2: `var(--${o[0]}-deep)`, c2f: `var(--${o[0]}-fg)`, c3: `var(--${o[1]}-deep)`, c3f: `var(--${o[1]}-fg)`, c4: `var(--${o[2]}-deep)`, c4f: `var(--${o[2]}-fg)`, n2: `--${o[0]}-deep`, n3: `--${o[1]}-deep` };
  }
  const CSS = `
.wr .w-readout .ro{max-width:100%;overflow-wrap:anywhere}
.wr .w-readout .ro.wide{flex-basis:100%}
.wr .w-readout b,.wr code,.wr output,.wr .wr-mono{font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0}
.wr code.xl{white-space:normal;overflow-wrap:anywhere}
.wr .wr-cap{font-size:.82rem;color:var(--muted);margin:.35rem 0 0;line-height:1.4}
.wr .wr-msg{margin:.6rem 0 0;padding:.45rem .7rem;border-radius:9px;background:var(--warn-bg);color:var(--warn);font-size:.88rem}
.wr .wr-msg[hidden]{display:none}
.wr .wr-legend{display:flex;flex-wrap:wrap;gap:.2rem 1rem;font-size:.84rem;color:var(--ink-2);margin:.4rem 0 0}
.wr .wr-legend i{display:inline-block;width:.8rem;height:.8rem;border-radius:50%;vertical-align:-.08rem;margin-right:.35rem}
.wr .wr-legend i.sq{border-radius:3px}
.wr .wr-legend i.ln{height:.22rem;width:1.15rem;border-radius:2px;vertical-align:.2rem}
.wr .wr-legend i.ring{background:var(--surface)!important;box-shadow:inset 0 0 0 2px var(--c)}
.wr .wr-tw{width:100%;overflow-x:auto;border:1px solid var(--line);border-radius:10px;background:var(--surface);margin:.6rem 0 0}
.wr table.wr-t{width:100%;border-collapse:collapse;font-size:.86rem;font-variant-numeric:tabular-nums}
.wr table.wr-t caption{caption-side:top;text-align:left;font-weight:700;font-size:.82rem;color:var(--ink-2);padding:.45rem .6rem .15rem}
.wr table.wr-t th,.wr table.wr-t td{padding:.3rem .55rem;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap;vertical-align:middle}
.wr table.wr-t th:first-child,.wr table.wr-t td:first-child{text-align:left}
.wr table.wr-t thead th{background:var(--surface-2);font-size:.76rem;letter-spacing:.02em;color:var(--ink-2);font-weight:700}
.wr table.wr-t tbody tr:last-child>*{border-bottom:0}
.wr table.wr-t tr.tot>*{font-weight:700;background:var(--surface-2)}
.wr table.wr-t tr.sub>*{font-size:.74rem;color:var(--muted);font-weight:700;letter-spacing:.05em;text-transform:uppercase;background:var(--surface-2)}
.wr table.wr-t th.rl{font-weight:700;color:var(--ink);max-width:11rem;overflow:hidden;text-overflow:ellipsis}
.wr table.wr-t td.small{font-size:.76rem;color:var(--muted)}
.wr table.wr-t .hm{font-weight:700}
.wr table.wr-t .hm small{display:block;font-size:.7rem;font-weight:400;opacity:.85}
.wr input.wr-cell{font:inherit;font-size:.9rem;width:4.8rem;padding:.25rem .4rem;text-align:right;border:1px solid var(--line-2);border-radius:7px;background:var(--surface);color:var(--ink);font-variant-numeric:tabular-nums;-moz-appearance:textfield}
.wr input.wr-cell::-webkit-inner-spin-button{opacity:.5}
.wr input.wr-cell[aria-invalid="true"]{border-color:var(--bad);background:var(--bad-bg)}
@media (max-width:480px){.wr input.wr-cell{width:3.7rem;padding:.2rem .3rem;font-size:.86rem}.wr table.wr-t th,.wr table.wr-t td{padding:.28rem .38rem}.wr table.wr-t th.rl{max-width:7.5rem}}
.wr .wr-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:0 .8rem}
.wr .wr-xl{flex-basis:100%;min-width:0;border:1px solid color-mix(in srgb,var(--excel) 30%,transparent);border-radius:10px;overflow:hidden;background:var(--surface)}
.wr .wr-xl>header{padding:.35rem .7rem;background:var(--excel-bg);color:var(--excel);font-weight:700;font-size:.84rem}
.wr .wr-xl>div{display:grid;grid-template-columns:minmax(7.5rem,11rem) minmax(0,1fr) auto;gap:.15rem .7rem;align-items:center;padding:.38rem .7rem;border-top:1px solid var(--line);font-size:.86rem}
.wr .wr-xl>div>span{color:var(--ink-2)}
.wr .wr-xl>div>b{font-family:var(--mono);font-weight:500;color:var(--acc-fg);text-align:right;font-size:.84rem;overflow-wrap:anywhere}
.wr .wr-xl>p{margin:0;padding:.38rem .7rem;border-top:1px solid var(--line);font-size:.8rem;color:var(--muted)}
@media (max-width:600px){.wr .wr-xl>div{grid-template-columns:minmax(0,1fr) auto}.wr .wr-xl>div>code{grid-column:1/-1;grid-row:2;justify-self:start}}
.wr .wr-sse{flex-basis:100%;display:grid;gap:.35rem;background:var(--surface-2);border-radius:10px;padding:.55rem .75rem}
.wr .wr-sse>p{margin:0;font-size:.8rem;font-weight:700;color:var(--muted);letter-spacing:.03em}
.wr .wr-bar{display:grid;grid-template-columns:minmax(6.5rem,11rem) minmax(0,1fr) auto;gap:.6rem;align-items:center;font-size:.86rem}
.wr .wr-bar i{display:block;height:.8rem;border-radius:4px;background:var(--c);min-width:2px}
.wr .wr-bar b{font-family:var(--mono);font-weight:500;color:var(--ink);font-size:.84rem;min-width:4.5rem;text-align:right}
@media (max-width:440px){.wr .wr-bar{grid-template-columns:minmax(0,1fr) auto}.wr .wr-bar i{grid-column:1/-1;grid-row:2}}
.wr .wr-knob{cursor:grab;outline:none}
.wr .wr-knob:focus-visible .wr-dot{stroke:var(--focus);stroke-width:4}
.wr .wr-halo{paint-order:stroke;stroke:var(--surface);stroke-width:4px;stroke-linejoin:round}
.wr label.ctl.wr-off{opacity:.45}
.wr .wr-segbox{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:.25rem .5rem;min-width:0}
.wr .wr-segbox>.w-btns{margin-top:0;min-width:0;max-width:100%}
.wr .wr-segbox .seg{max-width:100%}
.wr .wr-seglab{font-size:.8rem;font-weight:700;color:var(--muted);letter-spacing:.04em}
.wr .w-controls>.w-btns.wr-row{margin-top:0}
.wr canvas.wr-3d{cursor:grab;border-radius:12px;background:var(--surface)}
.wr canvas.wr-3d:active{cursor:grabbing}
.wr canvas.wr-3d:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
.wr .wr-dec{display:inline-block;font-weight:700;padding:0 .55rem;border-radius:999px;font-family:var(--sans)}
.wr .wr-dec.rej{background:var(--acc-deep);color:#fff}
.wr .wr-dec.keep{background:var(--surface);box-shadow:inset 0 0 0 1px var(--line-2);color:var(--ink)}
`;
  function setup(el) {
    if (!document.getElementById('sfmw-relate-css')) { const st = document.createElement('style'); st.id = 'sfmw-relate-css'; st.textContent = CSS; document.head.appendChild(st); }
    if (el && el.classList) el.classList.add('wr');
  }
  // responsive SVG: viewBox = 640 wide on wide stages (scaled up to 1.3x), the real pixel width on narrow ones
  function frame(api, label, hOf, redraw) {
    const svg = api.svg(640, 300, label), st = { svg, w: 640, h: 300, narrow: false };
    const measure = () => { const cw = api.stage.clientWidth; if (!(cw > 0)) return 640; const k = clamp(cw / 640, 1, 1.3); return Math.max(260, Math.round(cw / k / 2) * 2); };
    st.fit = () => { st.w = measure(); st.narrow = st.w < 520; st.h = Math.round(hOf(st.w, st.narrow)); svg.setAttribute('viewBox', `0 0 ${st.w} ${st.h}`); };
    st.setH = h => { st.h = Math.round(h); svg.setAttribute('viewBox', `0 0 ${st.w} ${st.h}`); };
    st.fit();
    if (window.ResizeObserver) { let raf = 0; new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (Math.abs(measure() - st.w) >= 4) { st.fit(); safe(redraw); } }); }).observe(api.stage); }
    return st;
  }
  function safe(fn) { try { fn(); } catch (e) { console.warn('relate widget:', e); } }
  function clipRect(svg) {
    const id = 'wrc' + (++UID), defs = W.s('defs', null, svg), cp = W.s('clipPath', { id }, defs), r = W.s('rect', { x: 0, y: 0, width: 10, height: 10 }, cp);
    return { url: `url(#${id})`, set(x, y, w, h) { r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', Math.max(0, w)); r.setAttribute('height', Math.max(0, h)); } };
  }
  const fitText = (s, px, cw = 7) => { s = String(s); const max = Math.max(3, Math.floor(px / cw)); return s.length > max ? s.slice(0, max - 1) + '…' : s; };
  function gridAxes(g, o) {
    const { sx, sy, L, R, T, B } = o, fs = 'font-size:13px;fill:var(--muted)';
    (o.yt || []).forEach(t => { const y = sy(t); if (y < T - 1 || y > B + 1) return; W.s('line', { x1: L, x2: R, y1: y, y2: y, style: 'stroke:var(--line);stroke-width:1' }, g); W.text(g, L - 7, y + 4.5, o.fy ? o.fy(t) : String(t), fs, 'end'); });
    (o.xt || []).forEach(t => { const x = sx(t); if (x < L - 1 || x > R + 1) return; if (o.xgrid) W.s('line', { x1: x, x2: x, y1: T, y2: B, style: 'stroke:var(--line);stroke-width:1' }, g); W.s('line', { x1: x, x2: x, y1: B, y2: B + 5, style: 'stroke:var(--line-2)' }, g); W.text(g, x, B + 19, o.fx ? o.fx(t) : String(t), fs); });
    W.s('line', { x1: L, x2: R, y1: B, y2: B, style: 'stroke:var(--line-2);stroke-width:1.3' }, g);
    if (!o.noY) W.s('line', { x1: L, x2: L, y1: T, y2: B, style: 'stroke:var(--line-2);stroke-width:1.3' }, g);
    if (o.xlab) W.text(g, R, B + 37, fitText(o.xlab, R - L, 7.2), 'font-size:13px;font-weight:700;fill:var(--ink-2)', 'end');
    if (o.ylab) W.text(g, 4, T - 13, fitText(o.ylab, R - 8, 7.2), 'font-size:13px;font-weight:700;fill:var(--ink-2)', 'start');
  }
  const lMargin = labels => clamp(16 + 7 * Math.max.apply(null, labels.map(s => String(s).length)), 38, 86);
  function ro(api, label, wide) {
    const r = W.el('span', { class: 'ro' + (wide ? ' wide' : '') }, `<span>${label}</span> <b></b>`); api.readout.appendChild(r);
    const b = r.querySelector('b'), l = r.querySelector('span');
    return { set: v => { b.textContent = v; }, html: v => { b.innerHTML = v; }, lab: v => { l.innerHTML = v; }, el: r, show: on => { r.style.display = on ? '' : 'none'; } };
  }
  function xlBox(parent, title) {
    const box = W.el('div', { class: 'wr-xl' }); parent.appendChild(box);
    return { el: box, set(rows, foot) { box.innerHTML = `<header>${title || 'In Excel'}</header>` + rows.map(r => `<div><span>${r.k}</span><code class="xl">${esc(r.f)}</code><b>${r.v === undefined ? '' : r.v}</b></div>`).join('') + (foot ? `<p>${foot}</p>` : ''); } };
  }
  function msgEl(parent) { const m = W.el('p', { class: 'wr-msg', role: 'status' }); m.hidden = true; parent.appendChild(m); return t => { m.hidden = !t; m.innerHTML = t || ''; }; }
  function btnRow(parent) { const r = W.el('div', { class: 'w-btns wr-row' }); parent.appendChild(r); return r; }
  function btn(parent, label, fn, primary) { const b = W.el('button', { type: 'button', class: 'btn small' + (primary ? ' primary' : '') }, label); b.onclick = fn; parent.appendChild(b); return b; }
  function tog(parent, label, on, fn) { const b = W.el('button', { type: 'button', class: 'btn small', 'aria-pressed': String(!!on) }, label); b.onclick = () => { const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); fn(v); }; b.setOn = v => b.setAttribute('aria-pressed', String(!!v)); parent.appendChild(b); return b; }
  function segBox(api, parent, label, opts, value, fn) {
    const box = W.el('div', { class: 'wr-segbox' }); if (label) box.appendChild(W.el('span', { class: 'wr-seglab' }, label));
    parent.appendChild(box); const g = api.seg(opts, value, fn, box);
    g.set = v => g.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(opts[i].v === v)));
    return g;
  }
  function legend(parent, items) { const d = W.el('div', { class: 'wr-legend' }); d.innerHTML = items.map(it => `<span><i class="${it.cls || ''}" style="background:${it.c};--c:${it.c}"></i>${it.t}</span>`).join(''); parent.appendChild(d); return d; }
  function normAlpha(v) { let a = num(v, 0.05); if (a >= 1 && a < 50) a /= 100; return a > 0 && a < 0.5 ? a : 0.05; }
  function alphaSeg(api, parent, alpha, fn) {
    const opts = [0.10, 0.05, 0.01]; if (!opts.some(o => Math.abs(o - alpha) < 1e-9)) { opts.push(alpha); opts.sort((a, b) => b - a); }
    return segBox(api, parent, 'Significance level α', opts.map(o => ({ v: o, label: String(+o.toFixed(4)) })), opts.find(o => Math.abs(o - alpha) < 1e-9), fn);
  }
  const strength = r => { const a = Math.abs(r); if (!isFinite(a)) return '—'; const d = r > 0 ? 'positive' : 'negative'; return a < 0.1 ? 'practically none' : a < 0.3 ? 'weak ' + d : a < 0.7 ? 'moderate ' + d : 'strong ' + d; };
  const signed = (v, f) => (v < 0 ? ' − ' : ' + ') + f(Math.abs(v));
  function onTheme(fn) {
    document.addEventListener('sfm:theme', fn);
    try { const mq = window.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); } catch (e) { /* old browser */ }
  }

  // =================================================================== correlation
  // params: r (target, −1…1, default 0.6), n (5–200, default 40), xlabel, ylabel, pattern ("line"/"curve"), seed
  W.register('correlation', {
    title: 'Correlation explorer',
    init(api, P, el) {
      setup(el); const C = pal(el);
      let target = Math.round(clamp(num(P.r, 0.6), -1, 1) * 100) / 100, n = Math.round(clamp(num(P.n, 40), 5, 200));
      const xlab = P.xlabel ? String(P.xlabel) : 'x', ylab = P.ylabel ? String(P.ylabel) : 'y', XN = lcFirst(parseLabel(xlab).name) || 'x', YN = lcFirst(parseLabel(ylab).name) || 'y';
      let seed = 1 + Math.abs(Math.round(num(P.seed, 4))) % 100000, pattern = /^curv/i.test(String(P.pattern || '')) ? 'curve' : 'line';
      let out = null, outMoved = false, showQ = false, showFit = false, zx = [], ze = [], zq = [], dom = null, L, R, T, B, sx, sy;
      const st = frame(api, 'Scatter plot of two variables with their correlation', (w, nar) => clamp(w * (nar ? 0.84 : 0.56), 260, 380), () => { layout(); draw(); });
      const svg = st.svg, clip = clipRect(svg);
      const gAx = W.s('g', null, svg), gQ = W.s('g', null, svg), gFit = W.s('g', { 'clip-path': clip.url }, svg), gPts = W.s('g', null, svg);
      const gOut = W.s('g', { class: 'wr-knob', tabindex: 0, role: 'slider', 'aria-label': 'Outlier: drag it, or use the arrow keys' }, svg);
      W.s('circle', { r: 22, style: 'fill:transparent' }, gOut);
      W.s('circle', { r: 8.5, class: 'wr-dot', style: 'fill:var(--bad);stroke:var(--surface);stroke-width:2.5' }, gOut);
      const outT = W.s('text', { y: -15, 'text-anchor': 'middle', class: 'wr-halo', style: 'font-size:13px;font-weight:700;fill:var(--bad)' }, gOut); outT.textContent = 'outlier · drag me';
      gOut.style.display = 'none';
      const sR = api.slider({ label: 'Target correlation r', min: -1, max: 1, step: 0.01, value: target, fmt: v => mi(v.toFixed(2)), onInput: v => { target = v; draw(); } });
      api.slider({ label: 'Number of points n', min: 5, max: 200, step: 1, value: n, onInput: v => { n = v; gen(); layout(); draw(); } });
      segBox(api, api.controls, 'Pattern', [{ v: 'line', label: 'Straight-line cloud' }, { v: 'curve', label: 'Curved pattern' }], pattern, v => { pattern = v; syncPattern(); domain(); layout(); draw(); });
      const row = btnRow(api.controls);
      const bOut = btn(row, 'Add outlier', () => { if (out) { out = null; bOut.textContent = 'Add outlier'; gOut.style.display = 'none'; } else { const xs = dom.x1 - dom.x0, ys = dom.y1 - dom.y0; out = { x: dom.x0 + 0.9 * xs, y: (pattern === 'line' && target < 0) ? dom.y0 + 0.88 * ys : dom.y0 + 0.1 * ys }; outMoved = false; bOut.textContent = 'Remove outlier'; gOut.style.display = ''; } draw(); }, true);
      tog(row, 'Show quadrants (x̄, ȳ)', false, v => { showQ = v; draw(); });
      tog(row, 'Trend line', false, v => { showFit = v; draw(); });
      btn(row, 'New sample', () => { seed = (seed * 48271 + 11) % 2147483647; gen(); layout(); draw(); });
      const roR = ro(api, 'Pearson r'), roS = ro(api, 'Spearman ρ'), roR2 = ro(api, 'r²'), roW = ro(api, 'Strength'), roN = ro(api, 'n');
      const xl = xlBox(api.readout); const note = api.note('');
      function stdz(a) { const m = S.mean(a), s = S.sdS(a) || 1; return a.map(v => (v - m) / s); }
      function orth(a, z) { const m = S.mean(a), c = a.map(v => v - m); let nu = 0, de = 0; for (let i = 0; i < c.length; i++) { nu += c[i] * z[i]; de += z[i] * z[i]; } const k = de ? nu / de : 0; return c.map((v, i) => v - k * z[i]); }
      function gen() {
        const rnd = S.rng((seed * 7919 + n * 104729) >>> 0), a = [], b = [];
        for (let i = 0; i < n; i++) { a.push(S.randn(rnd)); b.push(S.randn(rnd)); }
        zx = stdz(a); ze = stdz(orth(b, zx)); zq = stdz(orth(zx.map(v => v * v), zx));   // ze, zq have zero correlation with zx exactly
        domain();
      }
      function cloud() {
        const xs = zx.map(v => 50 + 12 * v); let ys;
        if (pattern === 'line') { const a = target, b = Math.sqrt(Math.max(0, 1 - a * a)); ys = zx.map((v, i) => 50 + 12 * (a * v + b * ze[i])); }
        else ys = zq.map((q, i) => 64 - 13 * q + 3 * ze[i]);
        return { xs, ys };
      }
      function domain() {
        const xs = zx.map(v => 50 + 12 * v); let ylo, yhi;
        if (pattern === 'line') { let bd = 0; zx.forEach((v, i) => { bd = Math.max(bd, Math.hypot(v, ze[i])); }); ylo = 50 - 12 * bd; yhi = 50 + 12 * bd; }
        else { const ys = cloud().ys; ylo = Math.min.apply(null, ys); yhi = Math.max.apply(null, ys); }
        dom = { x0: Math.min(0, Math.floor((Math.min.apply(null, xs) - 3) / 10) * 10), x1: Math.max(100, Math.ceil((Math.max.apply(null, xs) + 3) / 10) * 10), y0: Math.min(0, Math.floor((ylo - 3) / 10) * 10), y1: Math.max(100, Math.ceil((yhi + 3) / 10) * 10) };
        if (out) { out.x = clamp(out.x, dom.x0, dom.x1); out.y = clamp(out.y, dom.y0, dom.y1); }
      }
      function syncPattern() { sR.input.disabled = pattern === 'curve'; sR.el.classList.toggle('wr-off', pattern === 'curve'); }
      function layout() {
        W.clear(gAx); const yt = W.nice(dom.y0, dom.y1, 5), xt = W.nice(dom.x0, dom.x1, st.narrow ? 4 : 6);
        L = lMargin(yt.map(t => loc(t, 0))); R = st.w - 14; T = 30; B = st.h - 44;
        sx = W.scale(dom.x0, dom.x1, L, R); sy = W.scale(dom.y0, dom.y1, B, T); clip.set(L, T, R - L, B - T);
        gridAxes(gAx, { sx, sy, L, R, T, B, xt, yt, fx: t => loc(t, 0), fy: t => loc(t, 0), xlab, ylab });
      }
      W.drag(svg, gOut, pt => { if (!out) return; out.x = clamp(sx.inv(pt.x), dom.x0, dom.x1); out.y = clamp(sy.inv(pt.y), dom.y0, dom.y1); outMoved = true; draw(); });
      gOut.addEventListener('keydown', e => {
        if (!out) return; const k = e.key, f = e.shiftKey ? 5 : 1, dx = (dom.x1 - dom.x0) / 50 * f, dy = (dom.y1 - dom.y0) / 50 * f;
        if (k === 'ArrowLeft') out.x -= dx; else if (k === 'ArrowRight') out.x += dx; else if (k === 'ArrowUp') out.y += dy; else if (k === 'ArrowDown') out.y -= dy; else return;
        e.preventDefault(); out.x = clamp(out.x, dom.x0, dom.x1); out.y = clamp(out.y, dom.y0, dom.y1); outMoved = true; draw();
      });
      const f2 = v => fx(v, 2), f3 = v => fx(v, 3);
      function draw() {
        const c = cloud(), X = c.xs.slice(), Y = c.ys.slice(); if (out) { X.push(out.x); Y.push(out.y); }
        const N = X.length, r = S.correl(X, Y), rho = S.spearman(X, Y), r0 = S.correl(c.xs, c.ys), rho0 = S.spearman(c.xs, c.ys), mx = S.mean(X), my = S.mean(Y);
        W.clear(gQ); W.clear(gFit); W.clear(gPts);
        let nPos = 0, nNeg = 0; const prod = X.map((x, i) => (x - mx) * (Y[i] - my)); prod.forEach(p => { if (p > 0) nPos++; else if (p < 0) nNeg++; });
        if (showQ) {
          const xm = sx(mx), ym = sy(my);
          [[xm, T, R - xm, ym - T, 1], [L, ym, xm - L, B - ym, 1], [L, T, xm - L, ym - T, 0], [xm, ym, R - xm, B - ym, 0]].forEach(q => W.s('rect', { x: q[0], y: q[1], width: Math.max(0, q[2]), height: Math.max(0, q[3]), style: q[4] ? 'fill:var(--acc-bg);opacity:.8' : 'fill:var(--surface-2);opacity:.9' }, gQ));
          W.s('line', { x1: xm, x2: xm, y1: T, y2: B, style: 'stroke:var(--ink-2);stroke-width:1.4;stroke-dasharray:5 4' }, gQ);
          W.s('line', { x1: L, x2: R, y1: ym, y2: ym, style: 'stroke:var(--ink-2);stroke-width:1.4;stroke-dasharray:5 4' }, gQ);
          const q = 'font-size:13px;font-weight:700', ok = 'fill:var(--acc-fg)', no = `fill:${C.c2f}`;
          W.text(gQ, R - 6, T + 17, '(+)×(+) = +', `${q};${ok}`, 'end'); W.text(gQ, L + 6, B - 8, '(−)×(−) = +', `${q};${ok}`, 'start');
          W.text(gQ, L + 6, T + 17, '(−)×(+) = −', `${q};${no}`, 'start'); W.text(gQ, R - 6, B - 8, '(+)×(−) = −', `${q};${no}`, 'end');
          W.text(gQ, xm + 5, B - 26 > T + 30 ? B - 26 : T + 34, 'x̄', 'font-size:14px;font-weight:700;fill:var(--ink-2)', 'start');
          W.text(gQ, R - 6, ym - 6, 'ȳ', 'font-size:14px;font-weight:700;fill:var(--ink-2)', 'end');
        }
        const rad = N > 120 ? 3.6 : N > 60 ? 4.6 : 5.6;
        c.xs.forEach((x, i) => { const col = showQ ? (prod[i] >= 0 ? 'var(--acc-deep)' : C.c2) : 'var(--acc-deep)'; W.s('circle', { cx: sx(x).toFixed(1), cy: sy(c.ys[i]).toFixed(1), r: rad, style: `fill:${col};fill-opacity:.82;stroke:var(--surface);stroke-width:1` }, gPts); });
        if (showFit && isFinite(r) && S.varS(X) > 0) { const lr = S.linreg(X, Y); W.s('line', { x1: sx(dom.x0), x2: sx(dom.x1), y1: sy(lr.b0 + lr.b1 * dom.x0), y2: sy(lr.b0 + lr.b1 * dom.x1), style: 'stroke:var(--ink);stroke-width:2;stroke-dasharray:7 5;opacity:.75' }, gFit); }
        if (out) { gOut.setAttribute('transform', `translate(${sx(out.x).toFixed(1)},${sy(out.y).toFixed(1)})`); outT.style.display = outMoved ? 'none' : ''; outT.setAttribute('x', clamp(sx(out.x), L + 60, R - 60) - sx(out.x)); gOut.setAttribute('aria-valuetext', `x ${loc(out.x, 1)}, y ${loc(out.y, 1)}`); }
        roR.set(f3(r)); roS.set(f3(rho)); roR2.set(isFinite(r) ? `${f3(r * r)} (${pct(r * r)})` : '—'); roW.set(strength(r)); roN.set(String(N));
        const rg = c => `${c}2:${c}${N + 1}`;
        xl.set([
          { k: 'Pearson r', f: `=CORREL(${rg('A')},${rg('B')})`, v: f3(r) },
          { k: 'r² (share of variation)', f: `=RSQ(${rg('B')},${rg('A')})`, v: isFinite(r) ? f3(r * r) : '—' },
          { k: 'Ranks for Spearman', f: `C2: =RANK.AVG(A2,$A$2:$A$${N + 1},1)   D2: =RANK.AVG(B2,$B$2:$B$${N + 1},1)`, v: 'fill down' },
          { k: 'Spearman ρ', f: `=CORREL(${rg('C')},${rg('D')})`, v: f3(rho) }
        ], `Data: ${esc(xlab)} in A2:A${N + 1}, ${esc(ylab)} in B2:B${N + 1}. CORREL gives the same answer whichever column comes first.`);
        let h;
        const r2txt = isFinite(r) ? ` r² = ${f2(r * r)}, so ${esc(XN)} lines up with about <b>${pct(r * r)}</b> of the variation in ${esc(YN)}.` : '';
        if (pattern === 'curve') h = `The dots follow a clear <b>curve</b> (up, then down), so ${esc(YN)} is very predictable from ${esc(XN)} — yet Pearson r = <b>${f2(r)}</b> and Spearman ρ = <b>${f2(rho)}</b>. Both only measure how well a <b>single rising or falling trend</b> fits; an up-then-down pattern cancels out. Always plot the data before trusting r.`;
        else {
          const a = Math.abs(r), dir = a < 0.1 ? '' : r > 0 ? ` — as ${esc(XN)} rises, ${esc(YN)} tends to rise` : ` — as ${esc(XN)} rises, ${esc(YN)} tends to fall`;
          h = `r = <b>${f2(r)}</b>: ${a < 0.1 ? '<b>practically no</b> linear relationship' : `a <b>${strength(r)}</b> linear relationship`}${dir}${a >= 0.1 && a < 0.7 ? ', with plenty of scatter' : ''}.${r2txt}`;
          if (!out && a > 0.97) h += ' Almost a perfect line.';
        }
        if (out) h += ` <b>One outlier</b> moves r from ${f2(r0)} to <b>${f2(r)}</b>${Math.abs(r - r0) >= 0.1 ? ' — a big change from a single point' : ''}; Spearman ρ moves from ${f2(rho0)} to ${f2(rho)}${Math.abs(rho - rho0) < Math.abs(r - r0) ? ' (ranks are less sensitive to one extreme value)' : ''}.`;
        if (showQ) h += ` Quadrants: <b>${nPos}</b> points have (x − x̄)(y − ȳ) > 0 and <b>${nNeg}</b> have it < 0; the sign of r follows whichever side carries more weight.`;
        note.innerHTML = h;
      }
      gen(); syncPattern(); layout(); draw();
    }
  });

  // =================================================================== regression-fit
  // params: x, y (arrays; default = class Sales data), xlabel, ylabel, predictAt
  const SALES = { x: [1, 3, 4, 4, 6, 8, 10, 10, 11, 13], y: [80, 97, 92, 102, 103, 111, 119, 123, 117, 136] };
  function pairs(ax, ay) {
    const x = [], y = []; if (!Array.isArray(ax) || !Array.isArray(ay)) return { x, y };
    const m = Math.min(ax.length, ay.length); for (let i = 0; i < m; i++) { const a = toNum(ax[i]), b = toNum(ay[i]); if (isFinite(a) && isFinite(b)) { x.push(a); y.push(b); } }
    return { x, y };
  }
  W.register('regression-fit', {
    title: 'Fit the line: least squares',
    init(api, P, el) {
      setup(el); const C = pal(el);
      const given = P.x !== undefined || P.y !== undefined; let pr = pairs(P.x, P.y), warnTxt = '';
      if (pr.x.length > 500) { pr.x = pr.x.slice(0, 500); pr.y = pr.y.slice(0, 500); }
      const ok = pr.x.length >= 3 && S.varS(pr.x) > 0;
      if (!ok) { if (given) warnTxt = 'The x and y values could not be used (they need at least 3 pairs of numbers, and x must vary), so the class Sales data is shown instead.'; pr = { x: SALES.x.slice(), y: SALES.y.slice() }; }
      const isDef = !ok, useP = !(isDef && given);
      const xlab = useP && P.xlabel ? String(P.xlabel) : (isDef ? 'Years of experience' : 'x'), ylab = useP && P.ylabel ? String(P.ylabel) : (isDef ? 'Annual sales ($1000s)' : 'y');
      const LX = parseLabel(xlab), LY = parseLabel(ylab), xs = pr.x, ys = pr.y, n = xs.length;
      const lr = S.linreg(xs, ys), mx = S.mean(xs), my = S.mean(ys), xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
      let pa = num(P.predictAt, NaN); if (!isFinite(pa) || !useP) pa = isDef ? 9 : NaN;
      // x domain (includes predictAt) and y domain (data + least-squares line)
      const xsp0 = Math.max(xmax, isFinite(pa) ? pa : xmax) - Math.min(xmin, isFinite(pa) ? pa : xmin) || 1;
      const xd = niceDom([Math.min(xmin, isFinite(pa) ? pa : xmin) - 0.05 * xsp0, Math.max(xmax, isFinite(pa) ? pa : xmax) + 0.05 * xsp0], 6, xmin >= 0);
      const yv = ys.concat([lr.b0 + lr.b1 * xd.lo, lr.b0 + lr.b1 * xd.hi]), ysp0 = (Math.max.apply(null, yv) - Math.min.apply(null, yv)) || 1;
      const yd = niceDom([Math.min.apply(null, yv) - 0.06 * ysp0, Math.max.apply(null, yv) + 0.06 * ysp0], 5, Math.min.apply(null, ys) >= 0);
      const xstep = niceStep((xd.hi - xd.lo) / 100), ystep = niceStep((yd.hi - yd.lo) / 300);
      if (!isFinite(pa)) pa = snap(mx, niceStep((xd.hi - xd.lo) / 20)); pa = clamp(snap(pa, xstep, xd.lo), xd.lo, xd.hi);
      const hx = [xd.lo + 0.1 * (xd.hi - xd.lo), xd.lo + 0.9 * (xd.hi - xd.lo)], start = snap(my, ystep);
      let uy = [start, start], lsOn = !!P.showLine, resMode = 'none', L, R, T, B, sx, sy;
      const dx = clamp(-Math.floor(Math.log10(xstep) + 1e-9), 0, 4), dyv = clamp(decFor(yd.hi - yd.lo) + 1, 0, 4);
      const fxv = v => loc(v, dx), fyv = v => loc(v, dyv);
      const st = frame(api, `Scatter plot of ${xlab} against ${ylab} with your line and the least-squares line`, (w, nar) => clamp(w * (nar ? 0.82 : 0.56), 270, 400), () => { layout(); draw(); });
      const svg = st.svg, clip = clipRect(svg);
      const gAx = W.s('g', null, svg), gRes = W.s('g', { 'clip-path': clip.url }, svg), gLn = W.s('g', { 'clip-path': clip.url }, svg), gMean = W.s('g', null, svg), gPts = W.s('g', null, svg), gPr = W.s('g', null, svg);
      const H = [0, 1].map(k => {
        const g = W.s('g', { class: 'wr-knob', tabindex: 0, role: 'slider', 'aria-label': `Handle ${k + 1} of your line: drag up or down, or use the arrow keys` }, svg);
        W.s('rect', { x: -22, y: -30, width: 44, height: 60, style: 'fill:transparent' }, g);
        W.s('path', { d: 'M-6,-15 L0,-23 L6,-15 Z M-6,15 L0,23 L6,15 Z', style: `fill:${C.c2};opacity:.85` }, g);
        W.s('circle', { r: 9.5, class: 'wr-dot', style: `fill:${C.c2};stroke:var(--surface);stroke-width:2.5` }, g);
        W.drag(svg, g, pt => { uy[k] = clamp(snap(sy.inv(pt.y), ystep), yd.lo, yd.hi); draw(); });
        g.addEventListener('keydown', e => { let d = 0; if (e.key === 'ArrowUp' || e.key === 'ArrowRight') d = 1; else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') d = -1; else return; e.preventDefault(); uy[k] = clamp(snap(uy[k] + d * (yd.hi - yd.lo) / 100 * (e.shiftKey ? 10 : 1), ystep), yd.lo, yd.hi); draw(); });
        return g;
      });
      const cap = W.el('p', { class: 'wr-cap' }, 'Drag the two round handles (or Tab to one and use ↑ ↓) to set your line. It starts flat at the mean of y. Shaded edges = beyond the data (extrapolation).'); api.stage.appendChild(cap);
      legend(api.stage, [{ c: C.c2, t: 'my line', cls: 'ln' }, { c: 'var(--acc-deep)', t: 'least-squares line', cls: 'ln' }, { c: 'var(--ink-2)', t: 'data point' }]);
      const row = btnRow(api.controls);
      const bLS = tog(row, 'Show least-squares line', lsOn, v => { lsOn = v; if (!v && resMode === 'ls') { resMode = 'none'; segR.set('none'); } draw(); });
      btn(row, 'Reset my line', () => { uy = [start, start]; draw(); });
      const segR = segBox(api, api.controls, 'Residuals', [{ v: 'none', label: 'Hide' }, { v: 'user', label: 'My line' }, { v: 'ls', label: 'Least squares' }], resMode, v => { resMode = v; if (v === 'ls' && !lsOn) { lsOn = true; bLS.setOn(true); } draw(); });
      const sP = api.slider({ label: `Predict at ${esc(LX.name || 'x')} =`, min: xd.lo, max: xd.hi, step: xstep, value: pa, fmt: v => fxv(v), onInput: v => { pa = v; draw(); } });
      const sse = W.el('div', { class: 'wr-sse' }); api.readout.appendChild(sse);
      sse.innerHTML = `<p>Sum of squared errors (SSE): smaller is better</p><div class="wr-bar"><span>My line</span><i data-k="u" style="--c:${C.c2}"></i><b data-v="u"></b></div><div class="wr-bar"><span>Least squares (the minimum)</span><i data-k="l" style="--c:var(--acc-deep)"></i><b data-v="l"></b></div><div class="wr-bar"><span>Flat line at ȳ (= SST)</span><i data-k="t" style="--c:var(--line-2)"></i><b data-v="t"></b></div>`;
      const bars = { u: sse.querySelector('[data-k=u]'), l: sse.querySelector('[data-k=l]'), t: sse.querySelector('[data-k=t]') }, vals = { u: sse.querySelector('[data-v=u]'), l: sse.querySelector('[data-v=l]'), t: sse.querySelector('[data-v=t]') };
      const roU = ro(api, 'My line'), roL = ro(api, 'Least squares'), roR2 = ro(api, 'r²'), roSe = ro(api, 'Standard error sₑ'), roP = ro(api, 'Prediction');
      const xl = xlBox(api.readout); const warn = msgEl(api.foot); warn(warnTxt); const note = api.note('');
      const eqS = (a, b) => `ŷ = ${sig(a, 1)}${signed(b, v => sig(v, 1))}x`;
      function layout() {
        W.clear(gAx); const fy = tickFmt(yd.step), fxx = tickFmt(xd.step);
        L = lMargin(yd.ticks.map(fy)); R = st.w - 16; T = 30; B = st.h - 44;
        sx = W.scale(xd.lo, xd.hi, L, R); sy = W.scale(yd.lo, yd.hi, B, T); clip.set(L, T, R - L, B - T);
        const xt = st.narrow && xd.ticks.length > 6 ? xd.ticks.filter(t => Math.abs(t / (2 * xd.step) - Math.round(t / (2 * xd.step))) < 1e-6) : xd.ticks;
        if (sx(xmin) - L > 2) W.s('rect', { x: L, y: T, width: sx(xmin) - L, height: B - T, style: 'fill:var(--surface-2);opacity:.75' }, gAx);
        if (R - sx(xmax) > 2) W.s('rect', { x: sx(xmax), y: T, width: R - sx(xmax), height: B - T, style: 'fill:var(--surface-2);opacity:.75' }, gAx);
        gridAxes(gAx, { sx, sy, L, R, T, B, xt, yt: yd.ticks, fx: fxx, fy, xlab, ylab });
        H.forEach((g, k) => g.setAttribute('aria-valuetext', ''));
      }
      function draw() {
        const b = (uy[1] - uy[0]) / (hx[1] - hx[0]), a = uy[0] - b * hx[0];
        let sseU = 0; xs.forEach((x, i) => { sseU += (ys[i] - a - b * x) ** 2; });
        W.clear(gRes); W.clear(gLn); W.clear(gMean); W.clear(gPts); W.clear(gPr);
        if (resMode !== 'none') { const ra = resMode === 'ls' ? lr.b0 : a, rb = resMode === 'ls' ? lr.b1 : b, col = resMode === 'ls' ? 'var(--acc-deep)' : C.c2; xs.forEach((x, i) => W.s('line', { x1: sx(x), x2: sx(x), y1: sy(ys[i]), y2: sy(ra + rb * x), style: `stroke:${col};stroke-width:2;stroke-dasharray:4 3;opacity:.9` }, gRes)); }
        if (lsOn) {
          W.s('line', { x1: sx(xd.lo), x2: sx(xd.hi), y1: sy(lr.b0 + lr.b1 * xd.lo), y2: sy(lr.b0 + lr.b1 * xd.hi), style: 'stroke:var(--acc-deep);stroke-width:3' }, gLn);
          const cx = sx(mx), cy = sy(my); W.s('path', { d: `M${cx - 7},${cy}H${cx + 7}M${cx},${cy - 7}V${cy + 7}`, style: 'stroke:var(--ink);stroke-width:2' }, gMean);
          W.text(gMean, cx + 8, cy + 18, '(x̄, ȳ)', 'font-size:13px;font-weight:700;fill:var(--ink-2)', 'start').setAttribute('class', 'wr-halo');
        }
        W.s('line', { x1: sx(xd.lo), x2: sx(xd.hi), y1: sy(a + b * xd.lo), y2: sy(a + b * xd.hi), style: `stroke:${C.c2};stroke-width:2.6` }, gLn);
        const rad = n > 150 ? 3.5 : n > 60 ? 4.5 : 5.8;
        xs.forEach((x, i) => W.s('circle', { cx: sx(x).toFixed(1), cy: sy(ys[i]).toFixed(1), r: rad, style: 'fill:var(--ink-2);fill-opacity:.85;stroke:var(--surface);stroke-width:1.2' }, gPts));
        // prediction marker
        const px = sx(pa), yhL = lr.b0 + lr.b1 * pa, yhU = a + b * pa;
        W.s('line', { x1: px, x2: px, y1: T, y2: B, style: 'stroke:var(--muted);stroke-width:1.4;stroke-dasharray:2 4' }, gPr);
        W.s('circle', { cx: px, cy: sy(yhU), r: 5, style: `fill:var(--surface);stroke:${C.c2};stroke-width:2.5` }, gPr);
        if (lsOn) { const yy = clamp(sy(yhL), T, B); W.s('circle', { cx: px, cy: yy, r: 6, style: 'fill:var(--acc-deep);stroke:var(--surface);stroke-width:2' }, gPr); const right = px < (L + R) / 2; W.text(gPr, px + (right ? 10 : -10), clamp(yy - 10, T + 12, B - 6), `ŷ = ${sig(yhL, 1)}`, 'font-size:13px;font-weight:700;fill:var(--acc-fg)', right ? 'start' : 'end').setAttribute('class', 'wr-halo'); }
        H.forEach((g, k) => { g.setAttribute('transform', `translate(${sx(hx[k]).toFixed(1)},${sy(uy[k]).toFixed(1)})`); g.setAttribute('aria-valuenow', uy[k]); g.setAttribute('aria-valuetext', `${ylab} ${fyv(uy[k])} at ${xlab} ${fxv(hx[k])}`); });
        // SSE bars
        const mxs = Math.max(sseU, lr.sst, 1e-12); bars.u.style.width = (100 * sseU / mxs).toFixed(1) + '%'; bars.l.style.width = (100 * lr.sse / mxs).toFixed(1) + '%'; bars.t.style.width = (100 * lr.sst / mxs).toFixed(1) + '%';
        vals.u.textContent = loc(sseU, 2); vals.l.textContent = loc(lr.sse, 2); vals.t.textContent = loc(lr.sst, 2);
        roU.set(eqS(a, b)); if (lsOn) roL.set(eqS(lr.b0, lr.b1)); else roL.html('<span style="font-family:var(--sans);font-weight:400;color:var(--muted)">hidden until you press “Show least-squares line”</span>'); roR2.set(fx(lr.r2, 4)); roSe.set(sig(lr.se, 1));
        roP.set(`x = ${fxv(pa)}: my line ${sig(yhU, 1)}` + (lsOn ? ` · least squares ${sig(yhL, 1)}` : ''));
        const rx = c => `${c}2:${c}${n + 1}`, hid = '<span style="font-family:var(--sans);font-weight:400;color:var(--muted)">(show the line)</span>';
        xl.set([
          { k: 'Slope b₁', f: `=SLOPE(${rx('B')},${rx('A')})`, v: lsOn ? sig(lr.b1, 2) : hid },
          { k: 'Intercept b₀', f: `=INTERCEPT(${rx('B')},${rx('A')})`, v: lsOn ? sig(lr.b0, 2) : hid },
          { k: 'r²', f: `=RSQ(${rx('B')},${rx('A')})`, v: fx(lr.r2, 4) },
          { k: 'Standard error sₑ', f: `=STEYX(${rx('B')},${rx('A')})`, v: sig(lr.se, 2) },
          { k: `ŷ at x = ${fxv(pa)}`, f: `=FORECAST.LINEAR(${xn(pa)},${rx('B')},${rx('A')})`, v: lsOn ? sig(yhL, 2) : hid },
          { k: 'SSE of my line', f: `=SUMPRODUCT((${rx('B')}-(${xn(a, 3)}${b < 0 ? '-' : '+'}${xn(Math.abs(b), 4)}*${rx('A')}))^2)`, v: loc(sseU, 2) }
        ], `Data: ${esc(xlab)} in A2:A${n + 1}, ${esc(ylab)} in B2:B${n + 1}. Note the order: y-range first, then x-range.`);
        const ratio = lr.sse > 1e-12 ? sseU / lr.sse : (sseU < 1e-9 ? 1 : Infinity);
        let h;
        if (ratio <= 1.01) h = `<b>Spot on!</b> Your SSE (${loc(sseU, 2)}) matches the least-squares minimum — no other straight line can do better.`;
        else if (ratio <= 1.1) h = `Very close: your SSE is only <b>${pct(ratio - 1, 1)}</b> above the minimum of ${loc(lr.sse, 2)}.`;
        else {
          const hint = Math.abs(b - lr.b1) > 0.15 * Math.abs(lr.b1) + 1e-9 ? (b < lr.b1 ? 'Try tilting it <b>more steeply upward</b>' : 'Try tilting it <b>less steeply</b>') : (a + b * mx < my ? 'Try raising the whole line' : 'Try lowering the whole line');
          h = `Your line’s SSE is <b>${loc(sseU, 1)}</b> — <b>${ratio < 100 ? sig(ratio, 0) : 'over 100'}×</b> the smallest possible (${loc(lr.sse, 1)}). ${b > 1e-12 && lr.b1 < 0 || b < -1e-12 && lr.b1 > 0 ? 'Your line slopes the wrong way. ' : ''}${hint}. Hint: the least-squares line always passes through the point of means (x̄, ȳ) = (${sig(mx, 1)}, ${sig(my, 1)}).`;
        }
        if (lsOn) {
          h += ` Least squares: <b>ŷ = ${sig(lr.b0, 1)}${signed(lr.b1, v => sig(v, 1))}x</b> — ${perUnit(LX)} goes with ${deltaY(lr.b1, LY)}. r² = ${fx(lr.r2, 3)}: the line explains ${pct(lr.r2)} of the variation in ${esc(lcFirst(LY.name) || 'y')}.`;
          h += ` At x = ${fxv(pa)}, ŷ = ${sig(lr.b0, 1)}${signed(lr.b1, v => sig(v, 1))} × ${fxv(pa)} = <b>${sig(yhL, 1)}</b>${LY.unit ? ` (${withUnit(yhL, LY.unit)})` : ''}.`;
        }
        if (pa < xmin - 1e-9 || pa > xmax + 1e-9) h += ` <b>Careful:</b> x = ${fxv(pa)} is outside the data (${fxv(xmin)} to ${fxv(xmax)}), so this prediction is an <b>extrapolation</b> and may not hold.`;
        note.innerHTML = h;
      }
      layout(); draw();
    }
  });

  // =================================================================== mlr-3d
  // params: data (array of [x1,x2,y]; default: illustrative 12 sales territories), labels (["x1 label","x2 label","y label"]),
  //         residuals (true to start with drop-lines on), spin (false to start still), predict ([x1,x2] start of the prediction sliders)
  const MLR_DEF = {
    data: [[2.0, 4, 37], [3.5, 6, 46], [5.0, 5, 55], [6.5, 9, 77], [4.0, 10, 62], [7.5, 7, 69], [2.5, 8, 53], [6.0, 4, 55], [8.0, 11, 90], [3.0, 3, 35], [5.5, 12, 75], [4.5, 6, 57]],
    labels: ['Ad spend (₹ lakh)', 'Sales reps', 'Monthly sales (₹ lakh)']
  };
  W.register('mlr-3d', {
    title: 'Multiple regression in 3D: the fitted plane',
    init(api, P, el) {
      setup(el); const C = pal(el);
      const given = P.data !== undefined && P.data !== null; let rows = [], warnTxt = '';
      if (Array.isArray(P.data)) P.data.forEach(r => { if (Array.isArray(r) && r.length >= 3) { const v = r.slice(0, 3).map(toNum); if (v.every(x => isFinite(x))) rows.push(v); } });
      if (rows.length > 300) rows = rows.slice(0, 300);
      const tryFit = rs => { try { const f = S.ols(rs.map(r => [r[0], r[1]]), rs.map(r => r[2])); return f.beta.every(b => isFinite(b)) && f.se.every(s => isFinite(s) || isNaN(s)) ? f : null; } catch (e) { return null; } };
      let fit = rows.length >= 4 ? tryFit(rows) : null;
      const isDef = !fit;
      if (isDef) { if (given) warnTxt = rows.length < 4 ? 'The data could not be used (it needs at least 4 rows of [x₁, x₂, y] numbers), so illustrative data is shown instead.' : 'The two x variables in this data move in perfect lock-step (or one never varies), so no unique plane exists. Illustrative data is shown instead.'; rows = MLR_DEF.data.map(r => r.slice()); fit = tryFit(rows); }
      const labs = isDef ? MLR_DEF.labels : [0, 1, 2].map(i => (Array.isArray(P.labels) && P.labels[i] ? String(P.labels[i]) : ['x₁', 'x₂', 'y'][i]));
      const NM = labs.map(parseLabel), n = rows.length, X1 = rows.map(r => r[0]), X2 = rows.map(r => r[1]), Y = rows.map(r => r[2]);
      const [b0, b1, b2] = fit.beta, plane = (a, b) => b0 + b1 * a + b2 * b;
      const d1 = niceDom(X1, 4, Math.min.apply(null, X1) >= 0), d2 = niceDom(X2, 4, Math.min.apply(null, X2) >= 0);
      const dY = niceDom(Y.concat([plane(d1.lo, d2.lo), plane(d1.lo, d2.hi), plane(d1.hi, d2.lo), plane(d1.hi, d2.hi)]), 4, Math.min.apply(null, Y) >= 0);
      const HY = 0.8, D = 8, PMIN = -0.3, PMAX = 1.5, PITCH0 = 0.42;
      const u1 = v => 2 * (v - d1.lo) / (d1.hi - d1.lo) - 1, u2 = v => 2 * (v - d2.lo) / (d2.hi - d2.lo) - 1, uy = v => HY * (2 * (v - dY.lo) / (dY.hi - dY.lo) - 1);
      // default view: from the plane's low side, about 30° off its steepest direction, so we look down onto its top face
      const gx = b1 * (d1.hi - d1.lo) * HY / (dY.hi - dY.lo), gz = b2 * (d2.hi - d2.lo) * HY / (dY.hi - dY.lo);
      const YAW0 = (() => {
        if (Math.hypot(gx, gz) < 0.05) return -0.62;
        const base = Math.atan2(gx, -gz), c = [base - 0.55, base + 0.55];          // the more horizontal axis should increase to the right
        const good = y => { const a = Math.cos(y), b = Math.sin(y); return Math.abs(a) > Math.abs(b) ? a > 0 : b > 0; };
        return good(c[0]) ? c[0] : good(c[1]) ? c[1] : c[0];
      })();
      let yaw = YAW0, pitch = PITCH0, spin = !REDUCED && P.spin !== false, showRes = !!P.residuals, showPlane = true, sel = -1;
      let cssW = 600, cssH = 420, dpr = 1, K = 100, cx = 300, cyc = 210, col = {}, scr = [], visible = true, raf = 0, last = 0, tween = null, vel = 0, dragging = false, lastMove = 0;
      const st1 = niceStep((d1.hi - d1.lo) / 100), st2 = niceStep((d2.hi - d2.lo) / 100);
      const pv = Array.isArray(P.predict) ? P.predict.map(toNum) : [];
      let p1 = clamp(snap(isFinite(pv[0]) ? pv[0] : S.mean(X1), st1, d1.lo), d1.lo, d1.hi), p2 = clamp(snap(isFinite(pv[1]) ? pv[1] : S.mean(X2), st2, d2.lo), d2.lo, d2.hi);
      const dec1 = clamp(-Math.floor(Math.log10(st1) + 1e-9), 0, 4), dec2 = clamp(-Math.floor(Math.log10(st2) + 1e-9), 0, 4);
      // ---- canvas
      const cv = W.el('canvas', { class: 'wr-3d', tabindex: '0', role: 'img', 'aria-label': `3D scatter of ${labs[2]} against ${labs[0]} and ${labs[1]} with the fitted regression plane. Drag or use the arrow keys to rotate.` });
      api.stage.appendChild(cv); const ctx = cv.getContext && cv.getContext('2d');
      if (!ctx) { api.stage.appendChild(W.el('p', { class: 'w-fallback' }, 'This browser cannot draw the 3D view.')); }
      const cap = W.el('p', { class: 'wr-cap' }, `<b>x₁</b> = ${esc(labs[0])} · <b>x₂</b> = ${esc(labs[1])} · <b>y</b> = ${esc(labs[2])}. ${isDef ? '<b>Illustrative data</b> (not real figures): 12 sales territories. ' : ''}Drag to rotate (or focus the chart and use the arrow keys). Tap a point to see its residual.`); api.stage.appendChild(cap);
      legend(api.stage, [{ c: C.c2, t: 'above the plane (actual > predicted)' }, { c: C.c2, t: 'below the plane', cls: 'ring' }, { c: 'var(--acc-deep)', t: 'fitted plane ŷ', cls: 'sq' }, { c: 'var(--ink)', t: 'prediction', cls: 'sq' }]);
      // ---- controls
      const row = btnRow(api.controls);
      const bSpin = tog(row, 'Auto-spin', spin, v => { setSpin(v); });
      btn(row, 'Reset view', () => { goTo(YAW0, PITCH0); });
      tog(row, 'Residual drop-lines', showRes, v => { showRes = v; draw(); });
      tog(row, 'Plane', true, v => { showPlane = v; draw(); });
      const views = [{ v: 'd', label: '3D view', y: YAW0, p: PITCH0 }, { v: 'a2', label: `Look along x₂ (see the x₁ slope)`, y: 0, p: 0 }, { v: 'a1', label: `Look along x₁ (see the x₂ slope)`, y: Math.PI / 2, p: 0 }, { v: 't', label: 'Top', y: 0, p: PMAX }];
      const segV = segBox(api, api.controls, 'View', views.map(o => ({ v: o.v, label: o.label })), 'd', v => { const o = views.find(x => x.v === v); goTo(o.y, o.p); });
      const s1 = api.slider({ label: `Predict at ${esc(NM[0].name)} (x₁)`, min: d1.lo, max: d1.hi, step: st1, value: p1, fmt: v => loc(v, dec1), onInput: v => { p1 = v; draw(); upd(); } });
      const s2 = api.slider({ label: `and ${esc(NM[1].name)} (x₂)`, min: d2.lo, max: d2.hi, step: st2, value: p2, fmt: v => loc(v, dec2), onInput: v => { p2 = v; draw(); upd(); } });
      void s1; void s2;
      const roEq = ro(api, 'Fitted plane', true), roR2 = ro(api, 'R²'), roA = ro(api, 'Adjusted R²'), roSe = ro(api, 'Standard error s'), roN = ro(api, 'n'), roP = ro(api, 'Prediction ŷ', true), roSel = ro(api, 'Selected point', true);
      roSel.show(false);
      const tw = W.el('div', { class: 'wr-tw' }); tw.style.flexBasis = '100%'; api.readout.appendChild(tw);
      const xl = xlBox(api.readout); const warn = msgEl(api.foot); warn(warnTxt); const note = api.note('');
      const short = s => fitText(s, 210, 7);
      const r1 = S.linreg(X1, Y), r2s = S.linreg(X2, Y), rx12 = S.correl(X1, X2);
      // ---- 3D maths
      let cY = 1, sY = 0, cP = 1, sP = 0;
      function rot(X, Yv, Z) { const xr = X * cY + Z * sY, zr = -X * sY + Z * cY; return [xr, Yv * cP - zr * sP, Yv * sP + zr * cP]; }
      function proj(X, Yv, Z) { const r = rot(X, Yv, Z), f = D / (D - r[2]); return [cx + K * r[0] * f, cyc - K * r[1] * f, r[2], f]; }
      const FACES = [
        { n: [0, -1, 0], c: [0, -HY, 0], q: [[-1, -HY, -1], [1, -HY, -1], [1, -HY, 1], [-1, -HY, 1]], ax: ['x', 'z'] },
        { n: [0, 1, 0], c: [0, HY, 0], q: [[-1, HY, -1], [1, HY, -1], [1, HY, 1], [-1, HY, 1]], ax: ['x', 'z'] },
        { n: [-1, 0, 0], c: [-1, 0, 0], q: [[-1, -HY, -1], [-1, HY, -1], [-1, HY, 1], [-1, -HY, 1]], ax: ['z', 'y'] },
        { n: [1, 0, 0], c: [1, 0, 0], q: [[1, -HY, -1], [1, HY, -1], [1, HY, 1], [1, -HY, 1]], ax: ['z', 'y'] },
        { n: [0, 0, -1], c: [0, 0, -1], q: [[-1, -HY, -1], [1, -HY, -1], [1, HY, -1], [-1, HY, -1]], ax: ['x', 'y'] },
        { n: [0, 0, 1], c: [0, 0, 1], q: [[-1, -HY, 1], [1, -HY, 1], [1, HY, 1], [-1, HY, 1]], ax: ['x', 'y'] }
      ];
      const isBack = f => { const nn = rot(f.n[0], f.n[1], f.n[2]), cc = rot(f.c[0], f.c[1], f.c[2]); return nn[0] * -cc[0] + nn[1] * -cc[1] + nn[2] * (D - cc[2]) < 0; };
      const T1 = d1.ticks.map(u1), T2 = d2.ticks.map(u2), TY = dY.ticks.map(uy);
      function readCols() {
        const cs = getComputedStyle(el), g = (nm, d) => cs.getPropertyValue(nm).trim() || d;
        col = { acc: g('--acc-deep', '#94600f'), accFg: g('--acc-fg', '#6a3e08'), c2: g(C.n2, '#4a42b5'), ink: g('--ink', '#1d2127'), ink2: g('--ink-2', '#3d434c'), muted: g('--muted', '#646b75'), line: g('--line', '#e3ded3'), line2: g('--line-2', '#cfc8ba'), surf: g('--surface', '#fff'), surf2: g('--surface-2', '#f4f1ea'), font: g('--sans', 'system-ui, sans-serif') };
      }
      function resize() {
        const w = Math.max(240, Math.round(api.stage.clientWidth || 600)); dpr = Math.min(3, window.devicePixelRatio || 1);
        cssW = w; cssH = Math.round(w < 520 ? clamp(w * 1.08, 300, 500) : clamp(w * 0.66, 360, 520));
        cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
        fitView();
      }
      // scale + centre: fill the canvas at the default view, but never let the box leave the canvas at any other view
      let KB = 100, KP = [], OX = 0, OY = 0;
      function fitView() {
        const save = [cY, sY, cP, sP]; K = 1; cx = 0; cyc = 0;
        const CR = [[-1, -HY, -1], [1, -HY, -1], [1, -HY, 1], [-1, -HY, 1], [-1, HY, -1], [1, HY, -1], [1, HY, 1], [-1, HY, 1]];
        const bb = (y, p) => { cY = Math.cos(y); sY = Math.sin(y); cP = Math.cos(p); sP = Math.sin(p); const a = [Infinity, -Infinity, Infinity, -Infinity]; CR.forEach(c => { const q = proj(c[0], c[1], c[2]); a[0] = Math.min(a[0], q[0]); a[1] = Math.max(a[1], q[0]); a[2] = Math.min(a[2], q[1]); a[3] = Math.max(a[3], q[1]); }); return a; };
        const b = bb(YAW0, PITCH0); OX = (b[0] + b[1]) / 2; OY = (b[2] + b[3]) / 2;
        const mx0 = clamp(cssW * 0.085, 30, 64); KB = Math.min((cssW - 2 * mx0) / (b[1] - b[0]), (cssH - 44 - 42) / (b[3] - b[2]));
        KP = [];   // for each tilt: the largest scale at which the box fits at every yaw (so spinning never zooms)
        for (let j = 0; j <= 12; j++) { const pj = PMIN + (PMAX - PMIN) * j / 12; let kk = Infinity; for (let i = 0; i < 24; i++) { const q = bb(i * Math.PI / 12, pj); kk = Math.min(kk, (cssW / 2 - 6) / Math.max(OX - q[0], q[1] - OX, 1e-6), (cssH / 2 - 6) / Math.max(OY - q[2], q[3] - OY, 1e-6)); } KP.push(kk); }
        [cY, sY, cP, sP] = save; setScale();
      }
      function setScale() {
        const t = (pitch - PMIN) / (PMAX - PMIN) * 12, j = clamp(Math.floor(t), 0, 11), f = clamp(t - j, 0, 1);
        K = Math.min(KB, KP.length ? KP[j] + (KP[j + 1] - KP[j]) * f : KB); cx = cssW / 2 - K * OX; cyc = cssH / 2 - K * OY + 1;
      }
      function line(a, b, color, w, alpha, dash) { ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
      function label(txt, x, y, align, bold, color, size) {
        ctx.font = `${bold ? 700 : 500} ${size || 12.5}px ${col.font}`; const w = ctx.measureText(txt).width;
        let xx = x; if (align === 'center') xx = clamp(x, 4 + w / 2, cssW - 4 - w / 2); else if (align === 'right') xx = clamp(x, 4 + w, cssW - 4); else xx = clamp(x, 4, cssW - 4 - w);
        const yy = clamp(y, 9, cssH - 8);
        ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = col.surf; ctx.strokeText(txt, xx, yy); ctx.fillStyle = color || col.muted; ctx.fillText(txt, xx, yy);
      }
      function draw() {
        if (!ctx) return;
        cY = Math.cos(yaw); sY = Math.sin(yaw); cP = Math.cos(pitch); sP = Math.sin(pitch); setScale();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssW, cssH);
        // back panes with grid
        let floorBack = false;
        FACES.forEach((f, fi) => {
          if (!isBack(f)) return; if (fi === 0) floorBack = true;
          const q = f.q.map(p => proj(p[0], p[1], p[2]));
          ctx.globalAlpha = 0.7; ctx.fillStyle = col.surf2; ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
          const fixed = f.c, grid = (axis, vals) => vals.forEach(v => {
            let a, b;
            if (axis === 'x') { a = [v, f.ax[1] === 'y' ? -HY : fixed[1], f.ax[1] === 'z' ? -1 : fixed[2]]; b = [v, f.ax[1] === 'y' ? HY : fixed[1], f.ax[1] === 'z' ? 1 : fixed[2]]; }
            else if (axis === 'z') { a = [f.ax[0] === 'x' ? -1 : fixed[0], f.ax[1] === 'y' ? -HY : fixed[1], v]; b = [f.ax[0] === 'x' ? 1 : fixed[0], f.ax[1] === 'y' ? HY : fixed[1], v]; }
            else { a = [f.ax[0] === 'x' ? -1 : fixed[0], v, f.ax[0] === 'z' ? -1 : fixed[2]]; b = [f.ax[0] === 'x' ? 1 : fixed[0], v, f.ax[0] === 'z' ? 1 : fixed[2]]; }
            const A = proj(a[0], a[1], a[2]), Bp = proj(b[0], b[1], b[2]); line(A, Bp, col.line2, 1, 0.75);
          });
          f.ax.forEach(ax => grid(ax, ax === 'x' ? T1 : ax === 'z' ? T2 : TY));
          ctx.globalAlpha = 0.9; ctx.strokeStyle = col.line2; ctx.lineWidth = 1.2; ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke(); ctx.globalAlpha = 1;
        });
        // pick axis edges: x1 & x2 on the floor nearest the viewer; y on the left-most vertical edge
        const ez = proj(0, -HY, 1)[2] >= proj(0, -HY, -1)[2] ? 1 : -1, ex = proj(1, -HY, 0)[2] >= proj(-1, -HY, 0)[2] ? 1 : -1;
        // y axis: the left- or right-most vertical edge whose neighbouring labelled floor edge runs most horizontally (labels don't stack)
        const VE = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(e => ({ e, x: proj(e[0], -HY, e[1])[0] })).sort((a, b) => a.x - b.x);
        const horiz = (a, b) => { const A = proj(a[0], a[1], a[2]), Bp = proj(b[0], b[1], b[2]), dx = Bp[0] - A[0], dyy = Bp[1] - A[1]; return Math.abs(dx) / (Math.hypot(dx, dyy) || 1); };
        const score = e => { const s1 = e[1] === ez ? horiz([e[0], -HY, ez], [-e[0], -HY, ez]) : 1, s2 = e[0] === ex ? horiz([ex, -HY, e[1]], [ex, -HY, -e[1]]) : 1; return Math.min(s1, s2) - (e[0] === ex && e[1] === ez ? 0.6 : 0); };
        const cL = VE[0].e, cR = VE[3].e, vy = score(cR) > score(cL) + 0.15 ? cR : cL;
        // floor shadows + prediction guides
        const pu1 = u1(p1), pu2 = u2(p2), pyv = plane(p1, p2), puy = uy(pyv);
        if (floorBack) {
          rows.forEach(r => { const s = proj(u1(r[0]), -HY, u2(r[1])); ctx.globalAlpha = 0.22; ctx.fillStyle = col.ink; ctx.beginPath(); ctx.arc(s[0], s[1], 2.6, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; });
          const f0 = proj(pu1, -HY, pu2); line(f0, proj(pu1, -HY, ez), col.ink, 1.2, 0.55, [3, 3]); line(f0, proj(ex, -HY, pu2), col.ink, 1.2, 0.55, [3, 3]);
        }
        // depth-sorted primitives: plane quads, residual lines, points, prediction
        const prims = [], NQ = 10;
        if (showPlane) {
          const G = []; for (let i = 0; i <= NQ; i++) { G.push([]); for (let j = 0; j <= NQ; j++) { const a = -1 + 2 * i / NQ, b = -1 + 2 * j / NQ, v1 = d1.lo + (a + 1) / 2 * (d1.hi - d1.lo), v2 = d2.lo + (b + 1) / 2 * (d2.hi - d2.lo); G[i].push(proj(a, uy(plane(v1, v2)), b)); } }
          for (let i = 0; i < NQ; i++) for (let j = 0; j < NQ; j++) {
            const q = [G[i][j], G[i + 1][j], G[i + 1][j + 1], G[i][j + 1]], z = (q[0][2] + q[1][2] + q[2][2] + q[3][2]) / 4;
            prims.push({ z, f: () => { ctx.beginPath(); q.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.globalAlpha = 0.16; ctx.fillStyle = col.acc; ctx.fill(); ctx.globalAlpha = 0.55; ctx.strokeStyle = col.acc; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; } });
          }
        }
        scr = [];
        rows.forEach((r, i) => {
          const a = u1(r[0]), b = u2(r[1]), yv = uy(r[2]), yh = uy(fit.fitted[i]), p = proj(a, yv, b), above = r[2] >= fit.fitted[i];
          scr[i] = p;
          if (showRes) { const q = proj(a, yh, b); prims.push({ z: (p[2] + q[2]) / 2 - 0.001, f: () => { line(p, q, col.c2, 1.8, 0.95, [4, 3]); ctx.globalAlpha = 0.9; ctx.strokeStyle = col.c2; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(q[0], q[1], 2.2, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; } }); }
          prims.push({ z: p[2] + 0.002, f: () => { const rr = clamp(5.6 * p[3], 4, 8.5) + (i === sel ? 2 : 0); ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, 6.283); ctx.fillStyle = above ? col.c2 : col.surf; ctx.fill(); ctx.lineWidth = above ? 1.5 : 2.4; ctx.strokeStyle = above ? col.surf : col.c2; ctx.stroke(); if (i === sel) { ctx.beginPath(); ctx.arc(p[0], p[1], rr + 4, 0, 6.283); ctx.lineWidth = 2; ctx.strokeStyle = col.ink; ctx.stroke(); } } });
        });
        const pp = proj(pu1, puy, pu2), pf = proj(pu1, -HY, pu2);
        prims.push({ z: (pp[2] + pf[2]) / 2, f: () => line(pp, pf, col.ink, 1.3, 0.6, [2, 3]) });
        prims.push({ z: pp[2] + 0.003, f: () => { const s = 7; ctx.beginPath(); ctx.moveTo(pp[0], pp[1] - s); ctx.lineTo(pp[0] + s, pp[1]); ctx.lineTo(pp[0], pp[1] + s); ctx.lineTo(pp[0] - s, pp[1]); ctx.closePath(); ctx.fillStyle = col.ink; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = col.surf; ctx.stroke(); } });
        prims.sort((p, q) => p.z - q.z).forEach(p => p.f());
        // axes, ticks and labels on top
        const axisLine = (a, b) => line(proj(a[0], a[1], a[2]), proj(b[0], b[1], b[2]), col.ink2, 1.5, 0.85);
        axisLine([-1, -HY, ez], [1, -HY, ez]); axisLine([ex, -HY, -1], [ex, -HY, 1]); axisLine([vy[0], -HY, vy[1]], [vy[0], HY, vy[1]]);
        const elen = (a, b) => { const A = proj(a[0], a[1], a[2]), Bp = proj(b[0], b[1], b[2]); return Math.hypot(A[0] - Bp[0], A[1] - Bp[1]); };
        const f1 = tickFmt(d1.step), f2v = tickFmt(d2.step), fyv = tickFmt(dY.step);
        const nar = cssW < 440, titleAt = (mid, out, txt) => { const m = proj(mid[0], mid[1], mid[2]), o = proj(out[0], out[1], out[2]), d = o[0] - m[0]; label(txt, o[0], o[1] + 4, d < -12 ? 'right' : d > 12 ? 'left' : 'center', true, col.ink); };
        const every = (n, len) => { const g = len / Math.max(1, n - 1); return g >= 21 ? 1 : g >= 11 ? 2 : g >= 7 ? 3 : 5; };
        if (elen([-1, -HY, ez], [1, -HY, ez]) > 70) {
          const k1 = every(T1.length, elen([-1, -HY, ez], [1, -HY, ez]));
          T1.forEach((t, i) => { if (i % k1) { line(proj(t, -HY, ez), proj(t, -HY - 0.03, ez * 1.05), col.ink2, 1.2, 0.8); return; } const p = proj(t, -HY, ez), q = proj(t, -HY - 0.03, ez * 1.05), lp = proj(t, -HY - 0.06, ez * 1.2); line(p, q, col.ink2, 1.2, 0.8); label(f1(d1.ticks[i]), lp[0], lp[1] + 4, 'center'); });
          titleAt([0, -HY, ez], [0, -HY - 0.16, ez * 1.6], nar ? `x₁ · ${fitText(NM[0].name || labs[0], 120, 7)}` : `x₁ · ${short(labs[0])}`);
        }
        if (elen([ex, -HY, -1], [ex, -HY, 1]) > 70) {
          const k2 = every(T2.length, elen([ex, -HY, -1], [ex, -HY, 1]));
          T2.forEach((t, i) => { if (i % k2) { line(proj(ex, -HY, t), proj(ex * 1.05, -HY - 0.03, t), col.ink2, 1.2, 0.8); return; } const p = proj(ex, -HY, t), q = proj(ex * 1.05, -HY - 0.03, t), lp = proj(ex * 1.2, -HY - 0.06, t); line(p, q, col.ink2, 1.2, 0.8); label(f2v(d2.ticks[i]), lp[0], lp[1] + 4, 'center'); });
          titleAt([ex, -HY, 0], [ex * 1.6, -HY - 0.16, 0], nar ? `x₂ · ${fitText(NM[1].name || labs[1], 120, 7)}` : `x₂ · ${short(labs[1])}`);
        }
        if (elen([vy[0], -HY, vy[1]], [vy[0], HY, vy[1]]) > 60) {
          const base = proj(vy[0], 0, vy[1]), off = proj(vy[0] * 1.14, 0, vy[1] * 1.14), side = off[0] < base[0] - 0.5 ? 'right' : off[0] > base[0] + 0.5 ? 'left' : 'right';
          const ky = every(TY.length, elen([vy[0], -HY, vy[1]], [vy[0], HY, vy[1]]));
          TY.forEach((t, i) => { const p = proj(vy[0], t, vy[1]), lp = proj(vy[0] * 1.12, t, vy[1] * 1.12); line(p, proj(vy[0] * 1.04, t, vy[1] * 1.04), col.ink2, 1.2, 0.8); if (i > 0 && i % ky === 0) label(fyv(dY.ticks[i]), lp[0] + (side === 'right' ? -3 : 3), lp[1], side); });
          const tp = proj(vy[0], HY, vy[1]), yt = nar ? `y · ${fitText(NM[2].name || labs[2], 150, 7)}` : 'y · ' + short(labs[2]);
          if (tp[1] - 16 >= 10) label(yt, tp[0], tp[1] - 16, 'center', true, col.ink); else label(yt, tp[0] + (side === 'right' ? -38 : 38), tp[1], side, true, col.ink);
        }
        // prediction + selection labels
        label(`ŷ = ${sig(pyv, 1)}`, pp[0] + 11, pp[1] - 12, 'left', true, col.ink, 13);
        if (sel >= 0 && scr[sel]) { const r = rows[sel], e = r[2] - fit.fitted[sel], p = scr[sel]; label(`#${sel + 1}: y = ${sig(r[2], 1)}, ŷ = ${sig(fit.fitted[sel], 1)}, e = ${e >= 0 ? '+' : '−'}${sig(Math.abs(e), 1)}`, p[0], p[1] - 20, 'center', true, col.ink, 13); }
        ctx.globalAlpha = 1;
      }
      // ---- motion
      function needLoop() { return visible && !dragging && (spin || !!tween || Math.abs(vel) > 2e-4); }
      function loop(ts) {
        raf = 0; const dt = last ? Math.min(0.05, (ts - last) / 1000) : 1 / 60; last = ts;
        if (tween) { const t = clamp((ts - tween.t0) / tween.dur, 0, 1), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; yaw = tween.y0 + (tween.y1 - tween.y0) * e; pitch = tween.p0 + (tween.p1 - tween.p0) * e; if (t >= 1) tween = null; }
        else { if (Math.abs(vel) > 2e-4) { yaw += vel; vel *= 0.92; } else vel = 0; if (spin) yaw += dt * 0.3; }
        draw(); if (needLoop()) kick(); else last = 0;
      }
      function kick() { if (!raf && ctx) raf = requestAnimationFrame(loop); }
      function setSpin(v) { spin = !!v; bSpin.setOn(spin); if (spin) { tween = null; kick(); } }
      function goTo(y1, p1v) {
        setSpin(false); vel = 0; const v = views.find(o => Math.abs(o.y - y1) < 1e-9 && Math.abs(o.p - p1v) < 1e-9); segV.set(v ? v.v : 'd');
        let dy = ((y1 - yaw) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
        if (REDUCED) { yaw += dy; pitch = p1v; tween = null; draw(); return; }
        tween = { t0: performance.now(), dur: 650, y0: yaw, y1: yaw + dy, p0: pitch, p1: p1v }; kick();
      }
      let pd = null;
      cv.addEventListener('pointerdown', e => { if (pd) return; pd = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } dragging = true; tween = null; vel = 0; if (spin) setSpin(false); segV.set(''); e.preventDefault(); });
      cv.addEventListener('pointermove', e => { if (!pd || e.pointerId !== pd.id) return; const dx = e.clientX - pd.x, dy = e.clientY - pd.y; pd.x = e.clientX; pd.y = e.clientY; pd.moved += Math.abs(dx) + Math.abs(dy); yaw += dx * 0.011; pitch = clamp(pitch + dy * 0.011, PMIN, PMAX); vel = dx * 0.011; lastMove = performance.now(); draw(); });
      const up = e => {
        if (!pd || e.pointerId !== pd.id) return; const tap = pd.moved < 7 && performance.now() - pd.t < 700; pd = null; dragging = false;
        if (tap) { vel = 0; const rc = cv.getBoundingClientRect(), mx = (e.clientX - rc.left) * cssW / rc.width, my = (e.clientY - rc.top) * cssH / rc.height; let bi = -1, bd = 22; scr.forEach((p, i) => { const d = Math.hypot(p[0] - mx, p[1] - my); if (d < bd) { bd = d; bi = i; } }); sel = bi === sel ? -1 : bi; updSel(); draw(); }
        else if (REDUCED || performance.now() - lastMove > 90) vel = 0;
        kick();
      };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('keydown', e => {
        const k = e.key, s = e.shiftKey ? 0.3 : 0.1;
        if (k === 'ArrowLeft') yaw -= s; else if (k === 'ArrowRight') yaw += s; else if (k === 'ArrowUp') pitch = clamp(pitch + s, PMIN, PMAX); else if (k === 'ArrowDown') pitch = clamp(pitch - s, PMIN, PMAX);
        else if (k === 'r' || k === 'R') { goTo(YAW0, PITCH0); e.preventDefault(); return; } else if (k === ' ') { setSpin(!spin); e.preventDefault(); return; } else return;
        e.preventDefault(); if (spin) setSpin(false); tween = null; segV.set(''); draw();
      });
      cv.wrPoints = () => scr.map(q => [q[0], q[1]]);   // read-only hook for automated tests
      if (window.IntersectionObserver) new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; if (visible) kick(); }).observe(cv);
      if (window.ResizeObserver) { let rr = 0; new ResizeObserver(() => { cancelAnimationFrame(rr); rr = requestAnimationFrame(() => { if (Math.abs((api.stage.clientWidth || 0) - cssW) >= 2) { resize(); draw(); } }); }).observe(api.stage); }
      onTheme(() => { readCols(); draw(); });
      // ---- readouts
      const cf = v => sig(v, 1), nmH = i => esc(NM[i].name || ['x₁', 'x₂', 'y'][i]);
      function updSel() {
        if (sel < 0) { roSel.show(false); return; } const r = rows[sel], e = r[2] - fit.fitted[sel];
        roSel.show(true); roSel.html(`#${sel + 1}: x₁ = ${loc(r[0], 4)}, x₂ = ${loc(r[1], 4)}, y = ${loc(r[2], 4)} · ŷ = ${cf(fit.fitted[sel])} · residual e = y − ŷ = ${e >= 0 ? '+' : '−'}${cf(Math.abs(e))} (${e >= 0 ? 'above' : 'below'} the plane)`);
      }
      function upd() {
        const yh = plane(p1, p2);
        roP.html(`x₁ = ${loc(p1, dec1)}, x₂ = ${loc(p2, dec2)} → ŷ = ${cf(b0)}${signed(b1, cf)} × ${loc(p1, dec1)}${signed(b2, cf)} × ${loc(p2, dec2)} = <b>${cf(yh)}</b>${NM[2].unit ? ` (${withUnit(yh, NM[2].unit)})` : ''}`);
        const rg = `C2:C${n + 1}`, rgx = `A2:B${n + 1}`;
        xl.set([
          { k: 'Coefficients (note the order: b₂, b₁, b₀)', f: `=LINEST(${rg},${rgx},TRUE,TRUE)`, v: `${cf(b2)}, ${cf(b1)}, ${cf(b0)}` },
          { k: 'R²', f: `=INDEX(LINEST(${rg},${rgx},TRUE,TRUE),3,1)`, v: fx(fit.r2, 4) },
          { k: 'Adjusted R²', f: `=1-(1-${xn(fit.r2, 4)})*(${n}-1)/(${n}-2-1)`, v: fx(fit.adjR2, 4) },
          { k: 'Prediction ŷ', f: `=TREND(${rg},${rgx},{${xn(p1)},${xn(p2)}})`, v: cf(yh) }
        ], `Data: ${esc(labs[0])} in A2:A${n + 1}, ${esc(labs[1])} in B2:B${n + 1}, ${esc(labs[2])} in C2:C${n + 1}. Or use Data → Data Analysis → Regression with Input Y Range C1:C${n + 1} and Input X Range A1:B${n + 1} (tick Labels).`);
      }
      roEq.html(`ŷ = ${cf(b0)}${signed(b1, cf)} × ${nmH(0)}${signed(b2, cf)} × ${nmH(1)}`);
      roR2.set(fx(fit.r2, 4)); roA.set(fx(fit.adjR2, 4)); roSe.set(sig(fit.s, 1)); roN.set(String(n));
      tw.innerHTML = `<table class="wr-t"><caption>Coefficients (as in Excel’s Regression output)</caption><thead><tr><th></th><th>Coefficient</th><th>Standard error</th><th>t Stat</th><th>P-value</th></tr></thead><tbody>${['Intercept', labs[0], labs[1]].map((nm, j) => `<tr><th class="rl" title="${esc(nm)}">${esc(fitText(nm, 150, 7))}</th><td>${fx(fit.beta[j], 4)}</td><td>${fx(fit.se[j], 4)}</td><td>${fx(fit.t[j], 3)}</td><td>${fP(fit.p[j])}</td></tr>`).join('')}</tbody></table>`;
      const slopeTxt = (j, other) => `Holding <b>${esc(lcFirst(NM[other].name || 'the other x'))}</b> constant, ${perUnit(NM[j])} goes with ${deltaY(fit.beta[j + 1], NM[2])}${fit.p[j + 1] > 0.05 ? ` <span class="muted">(but this slope is not significant at 5%: p = ${fP(fit.p[j + 1])})</span>` : ''}.`;
      note.innerHTML = `${slopeTxt(0, 1)} ${slopeTxt(1, 0)} Together the two variables explain <b>R² = ${pct(fit.r2)}</b> of the variation in ${esc(lcFirst(NM[2].name || 'y'))} (adjusted R² = ${pct(fit.adjR2)}, a little lower because it charges for each extra variable). On its own, ${esc(lcFirst(NM[0].name))} explains ${pct(r1.r2)} and ${esc(lcFirst(NM[1].name))} ${pct(r2s.r2)}${Math.abs(rx12) >= 0.6 ? ` — the two x’s are fairly correlated (r = ${fx(rx12, 2)}), so their separate effects are harder to pin down` : ''}. Rotate to “look along” an axis and the plane’s edge shows that slope.`;
      readCols(); resize(); updSel(); upd(); draw(); kick();
    }
  });

  // =================================================================== logistic
  // params: b0 (default −4), b1 (default 0.8), xlabel, event (what p is the probability of), x (start of the x slider), xmin, xmax
  W.register('logistic', {
    title: 'Logistic regression: the S-curve',
    init(api, P, el) {
      setup(el); const C = pal(el);
      const isDef = P.b0 === undefined && P.b1 === undefined;
      let b0 = num(P.b0, -4), b1 = num(P.b1, 0.8); const b00 = b0, b10 = b1;
      const xlab = P.xlabel ? String(P.xlabel) : (isDef ? 'Store visits in the last month' : 'x'), LX = parseLabel(xlab), XN = lcFirst(LX.name) || 'x';
      const ev = P.event ? String(P.event) : (isDef ? 'the customer buys' : 'y = 1');
      const bd = Math.abs(b1) > 1e-9 ? Math.abs(b1) : 0.5, c0 = Math.abs(b1) > 1e-9 ? -b0 / b1 : 0;
      let lo = isNum(P.xmin) ? +P.xmin : c0 - 6 / bd, hi = isNum(P.xmax) ? +P.xmax : c0 + 6 / bd;
      if (!isNum(P.xmin) && lo < 0 && c0 >= 0) lo = 0;
      if (!(hi > lo)) { lo = 0; hi = 10; }
      const xd = niceDom([lo, hi], 6), xstep = niceStep((xd.hi - xd.lo) / 200), dx = clamp(-Math.floor(Math.log10(xstep) + 1e-9), 0, 4);
      let x0 = isNum(P.x) ? +P.x : c0 + 1.5 / bd; x0 = clamp(snap(x0, isNum(P.x) ? xstep : niceStep((xd.hi - xd.lo) / 20), 0), xd.lo, xd.hi); x0 = snap(x0, xstep, xd.lo);
      const M0 = niceUp(Math.max(8, 2.5 * Math.abs(b0))), M1 = niceUp(Math.max(0.05, 3 * Math.abs(b1))), st0 = M0 / 200, st1 = niceStep(M1 / 100);
      let showLine = !!P.line, L, R, T, B, sx, sy, yLo, yHi;
      const pOf = x => 1 / (1 + Math.exp(-(b0 + b1 * x)));
      const st = frame(api, `S-shaped logistic curve of the probability that ${ev} against ${xlab}`, (w, nar) => clamp(w * (nar ? 0.98 : 0.52), 280, 380), () => draw());
      const svg = st.svg, clip = clipRect(svg), g = W.s('g', null, svg);
      const s0 = api.slider({ label: 'b₀ (intercept: shifts the curve)', min: -M0, max: M0, step: st0, value: clamp(snap(b0, st0, -M0), -M0, M0), fmt: v => fx(v, clamp(decFor(st0) - 2, 1, 3)), onInput: v => { b0 = v; draw(); } });
      const s1 = api.slider({ label: 'b₁ (slope: steepness and direction)', min: -M1, max: M1, step: st1, value: clamp(snap(b1, st1, -M1), -M1, M1), fmt: v => fx(v, clamp(-Math.floor(Math.log10(st1) + 1e-9), 1, 4)), onInput: v => { b1 = v; draw(); } });
      const sX = api.slider({ label: `x = ${esc(LX.name || 'x')}`, min: xd.lo, max: xd.hi, step: xstep, value: x0, fmt: v => loc(v, dx), onInput: v => { x0 = v; draw(); } });
      b0 = s0.get(); b1 = s1.get();
      const row = btnRow(api.controls);
      tog(row, 'Compare: straight line', showLine, v => { showLine = v; draw(); });
      btn(row, 'Reset', () => { s0.set(clamp(snap(b00, st0, -M0), -M0, M0)); s1.set(clamp(snap(b10, st1, -M1), -M1, M1)); b0 = s0.get(); b1 = s1.get(); draw(); });
      void sX;
      const roZ = ro(api, 'Log-odds z = b₀ + b₁x'), roPp = ro(api, 'Probability p'), roO = ro(api, 'Odds p/(1−p)'), roOR = ro(api, 'Odds ratio e^b₁'), roM = ro(api, '50% point −b₀/b₁');
      const xl = xlBox(api.readout); const note = api.note('');
      function draw() {
        W.clear(g); yLo = showLine ? -0.32 : -0.06; yHi = showLine ? 1.32 : 1.06;
        L = 50; R = st.w - 16; T = 30; B = st.h - 44; sx = W.scale(xd.lo, xd.hi, L, R); sy = W.scale(yLo, yHi, B, T); clip.set(L, T, R - L, B - T);
        // impossible bands
        W.s('rect', { x: L, y: T, width: R - L, height: Math.max(0, sy(1) - T), style: 'fill:var(--bad-bg);opacity:.9' }, g);
        W.s('rect', { x: L, y: sy(0), width: R - L, height: Math.max(0, B - sy(0)), style: 'fill:var(--bad-bg);opacity:.9' }, g);
        const xt = st.narrow && xd.ticks.length > 6 ? xd.ticks.filter((t, i) => i % 2 === 0) : xd.ticks;
        gridAxes(g, { sx, sy, L, R, T, B, xt, yt: [0, 0.25, 0.5, 0.75, 1], fx: tickFmt(xd.step), fy: t => String(t), xlab, ylab: `p = P(${ev})`, noY: false });
        if (showLine) { const up = b1 >= 0; W.text(g, up ? L + 6 : R - 6, (T + sy(1)) / 2 + 4, 'p > 1 is impossible', 'font-size:13px;font-weight:700;fill:var(--bad)', up ? 'start' : 'end'); W.text(g, up ? R - 6 : L + 6, (B + sy(0)) / 2 + 4, 'p < 0 is impossible', 'font-size:13px;font-weight:700;fill:var(--bad)', up ? 'end' : 'start'); }
        const gc = W.s('g', { 'clip-path': clip.url }, g);
        // straight line: tangent at the 50% point (or the middle of the axis)
        if (showLine) {
          const xc = Math.abs(b1) > 1e-9 ? clamp(-b0 / b1, xd.lo, xd.hi) : (xd.lo + xd.hi) / 2, pc = pOf(xc), m = b1 * pc * (1 - pc), lin = x => pc + m * (x - xc);
          W.s('line', { x1: sx(xd.lo), x2: sx(xd.hi), y1: sy(lin(xd.lo)), y2: sy(lin(xd.hi)), style: `stroke:${C.c2};stroke-width:2.4;stroke-dasharray:8 5` }, gc);
          if (Math.abs(m) > 1e-12) [[1, 1e9], [0, -1e9]].forEach(([lev]) => {
            const xe = xc + (lev - pc) / m; const seg = m > 0 ? (lev === 1 ? [xe, xd.hi] : [xd.lo, xe]) : (lev === 1 ? [xd.lo, xe] : [xe, xd.hi]);
            const a = clamp(seg[0], xd.lo, xd.hi), b = clamp(seg[1], xd.lo, xd.hi); if (b - a > 1e-9) W.s('line', { x1: sx(a), x2: sx(b), y1: sy(lin(a)), y2: sy(lin(b)), style: 'stroke:var(--bad);stroke-width:3.4' }, gc);
          });
        }
        let d = ''; for (let i = 0; i <= 240; i++) { const x = xd.lo + (xd.hi - xd.lo) * i / 240; d += (i ? 'L' : 'M') + sx(x).toFixed(1) + ',' + sy(pOf(x)).toFixed(1); }
        W.s('path', { d, style: 'fill:none;stroke:var(--acc-deep);stroke-width:3.2' }, gc);
        // 50% point
        if (Math.abs(b1) > 1e-9) { const xm = -b0 / b1; if (xm >= xd.lo && xm <= xd.hi) { W.s('circle', { cx: sx(xm), cy: sy(0.5), r: 4, style: 'fill:var(--surface);stroke:var(--acc-deep);stroke-width:2' }, g); } }
        // x marker
        const p = pOf(x0), px = sx(x0), py = sy(p);
        W.s('line', { x1: px, x2: px, y1: B, y2: py, style: 'stroke:var(--ink-2);stroke-width:1.4;stroke-dasharray:3 4' }, g);
        W.s('line', { x1: L, x2: px, y1: py, y2: py, style: 'stroke:var(--ink-2);stroke-width:1.4;stroke-dasharray:3 4' }, g);
        W.s('circle', { cx: px, cy: py, r: 7, style: 'fill:var(--acc-deep);stroke:var(--surface);stroke-width:2.5' }, g);
        const right = px < (L + R) * 0.62; W.text(g, px + (right ? 11 : -11), clamp(py + (p > 0.6 ? 20 : -11), T + 12, B - 6), `p = ${fx(p, 3)}`, 'font-size:14px;font-weight:700;fill:var(--acc-fg)', right ? 'start' : 'end').setAttribute('class', 'wr-halo');
        const z = b0 + b1 * x0, odds = Math.exp(z), or = Math.exp(b1);
        roZ.set(`${fx(b0, 2)}${signed(b1, v => sig(v, 1))} × ${loc(x0, dx)} = ${fx(z, 3)}`); roPp.set(fx(p, 4));
        roO.set(!isFinite(odds) || odds > 1e6 ? 'over a million to 1' : odds >= 1 ? `${sig(odds, 1)} (about ${sig(odds, 0)} to 1)` : `${fx(odds, 4)} (about 1 to ${sig(1 / odds, 0)})`);
        roOR.set(sig(or, 1)); roM.set(Math.abs(b1) > 1e-9 ? loc(-b0 / b1, dx + 1) : 'none (flat curve)');
        const zf = `${xn(b0)}${b1 < 0 ? '-' : '+'}${xn(Math.abs(b1))}*${xp(x0)}`;
        xl.set([
          { k: 'Probability p', f: `=1/(1+EXP(-(${zf})))`, v: fx(p, 4) },
          { k: 'Odds', f: `=EXP(${zf})`, v: isFinite(odds) ? sig(odds, 1) : '—' },
          { k: 'Odds ratio per unit of x', f: `=EXP(${xn(b1)})`, v: sig(or, 1) }
        ], 'Excel has no built-in logistic regression: b₀ and b₁ come from software (or Solver). Once you have them, these formulas turn any x into a probability.');
        let h = `At ${esc(XN)} = ${loc(x0, dx)}, z = ${fx(b0, 2)}${signed(b1, v => sig(v, 1))} × ${loc(x0, dx)} = ${fx(z, 2)}, so p = 1/(1 + e<sup>−z</sup>) = <b>${fx(p, 3)}</b>: the chance that ${esc(ev)} is about <b>${Math.round(p * 100)} in 100</b>.`;
        if (Math.abs(b1) > 1e-9) h += ` Each extra unit of ${esc(XN)} multiplies the odds by e<sup>b₁</sup> = <b>${sig(or, 1)}</b> (${or >= 1 ? '+' : '−'}${sig(Math.abs(or - 1) * 100, 0)}%), but the change in p depends on where you are: the curve is steepest at p = 0.5 (x = ${loc(-b0 / b1, dx)}) and flattens near 0 and 1.`;
        else h += ' With b₁ = 0, x has no effect: the “curve” is flat.';
        if (showLine) { const xc = Math.abs(b1) > 1e-9 ? clamp(-b0 / b1, xd.lo, xd.hi) : (xd.lo + xd.hi) / 2, pc = pOf(xc), m = b1 * pc * (1 - pc), le = pc + m * (xd.hi - xc), ls = pc + m * (xd.lo - xc), worst = Math.abs(le - 0.5) > Math.abs(ls - 0.5) ? [xd.hi, le] : [xd.lo, ls]; if (worst[1] > 1 || worst[1] < 0) h += ` The dashed straight line would predict p = <b>${fx(worst[1], 2)}</b> at x = ${loc(worst[0], dx)} — impossible. That is why we model log-odds with a straight line and let the S-curve keep p between 0 and 1.`; }
        note.innerHTML = h;
      }
      draw();
    }
  });

  // =================================================================== anova
  // params: groups (object name → array; default: illustrative training scores, seeded), alpha (0.05), label (what is measured), unit
  W.register('anova', {
    title: 'One-way ANOVA explorer',
    init(api, P, el) {
      setup(el); const C = pal(el);
      let alpha = normAlpha(P.alpha), names = [], base = [], warnTxt = '', seed = 1 + Math.abs(Math.round(num(P.seed, 3))) % 100000;
      const given = P.groups !== undefined && P.groups !== null;
      if (given && typeof P.groups === 'object') {
        const ent = Array.isArray(P.groups) ? P.groups.map((a, i) => [`Group ${i + 1}`, a]) : Object.keys(P.groups).map(k => [k, P.groups[k]]);
        ent.forEach(([k, a]) => { const v = nums(a); if (v.length >= 2 && names.length < 8) { names.push(String(k)); base.push(v.slice(0, 200)); } });
      }
      const isDef = base.length < 2;
      if (isDef) { if (given) warnTxt = 'The groups could not be used (ANOVA needs at least 2 groups with 2 or more numbers each), so illustrative data is shown instead.'; names = ['Method A', 'Method B', 'Method C']; }
      function genDef() { const r = S.rng((seed * 9973 + 17) >>> 0); base = [72, 78, 74].map(m => { const a = []; for (let i = 0; i < 8; i++) a.push(Math.round(m + 5 * S.randn(r))); return a; }); }
      if (isDef) genDef();
      const label = P.label ? String(P.label) : (isDef ? 'Test score after training' : 'Value'), unit = P.unit ? String(P.unit) : '';
      const k = names.length, cols = ['var(--acc-deep)', C.c2, C.c3, C.c4], colf = ['var(--acc-fg)', C.c2f, C.c3f, C.c4f];
      let mF = 1, sF = 1, showDev = false, dom = null, L, R, T, B, sy;
      const st = frame(api, `Dot plot of ${k} groups with their means`, (w, nar) => clamp(w * (nar ? 0.8 : 0.5), 250, 340), () => draw());
      const svg = st.svg, g = W.s('g', null, svg);
      const cap = W.el('p', { class: 'wr-cap' }, `${isDef ? '<b>Illustrative data</b>: 8 trainees per method. ' : ''}Each dot is one observation; the short coloured bars are group means, the dashed line the grand mean. Slider ×1.00 = the data as given.`); api.stage.appendChild(cap);
      const st2 = frame(api, 'Split of total variation into between- and within-group parts, and the F distribution', (w, nar) => (nar ? 236 : 206), () => draw());
      const g2 = W.s('g', null, st2.svg);
      api.slider({ label: 'Gap between group means', min: 0, max: 2.5, step: 0.05, value: 1, fmt: v => `×${v.toFixed(2)}`, onInput: v => { mF = v; draw(); } });
      api.slider({ label: 'Spread within groups', min: 0.2, max: 2.5, step: 0.05, value: 1, fmt: v => `×${v.toFixed(2)}`, onInput: v => { sF = v; draw(); } });
      alphaSeg(api, api.controls, alpha, v => { alpha = v; draw(); });
      const row = btnRow(api.controls);
      tog(row, 'Show deviations', false, v => { showDev = v; draw(); });
      btn(row, 'Reset sliders', () => { api.controls.querySelectorAll('input[type=range]').forEach(inp => { inp.value = 1; inp.dispatchEvent(new Event('input')); }); });
      if (isDef) btn(row, 'New sample', () => { seed = (seed * 48271 + 7) % 2147483647; genDef(); dom = null; draw(); });
      const roF = ro(api, 'F = MSB / MSW'), roPv = ro(api, 'p-value'), roFc = ro(api, 'F critical'), roD = ro(api, 'Decision');
      const tw = W.el('div', { class: 'wr-tw' }); tw.style.flexBasis = '100%'; api.readout.appendChild(tw);
      const xl = xlBox(api.readout); const warn = msgEl(api.foot); warn(warnTxt); const note = api.note('');
      const all0 = [].concat.apply([], base);
      const dd = clamp(decFor(Math.max.apply(null, all0.map(Math.abs)) || 1), 1, 4);
      function current() {
        const N = base.reduce((s, a) => s + a.length, 0), gm = base.reduce((s, a) => s + a.reduce((t, v) => t + v, 0), 0) / N;
        return base.map(a => { const m = S.mean(a); return a.map(v => gm + mF * (m - gm) + sF * (v - m)); });
      }
      function draw() {
        const cur = current(), all = [].concat.apply([], cur), res = S.anova1(cur), N = all.length, gm = S.mean(all), means = cur.map(a => S.mean(a));
        const fCrit = S.fInv(1 - alpha, res.dfb, res.dfw), Fv = res.ssw > 1e-12 ? res.F : (res.ssb > 1e-12 ? Infinity : NaN), pv = isFinite(Fv) ? 1 - S.fCdf(Fv, res.dfb, res.dfw) : (Fv === Infinity ? 0 : NaN);
        // value domain: rescale only when the dots leave it or shrink a lot
        const lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), span = (hi - lo) || Math.abs(hi) * 0.1 || 1;
        if (!dom || lo < dom.lo || hi > dom.hi || span < 0.45 * (dom.hi - dom.lo)) dom = niceDom([lo - 0.08 * span, hi + 0.08 * span], 5);
        W.clear(g); const fy = tickFmt(dom.step);
        L = lMargin(dom.ticks.map(fy)); R = st.w - 12; T = 30; B = st.h - 40; sy = W.scale(dom.lo, dom.hi, B, T);
        gridAxes(g, { sx: v => v, sy, L, R, T, B, xt: [], yt: dom.ticks, fy, ylab: label + (unit ? ` (${unit})` : '') });
        const bw = (R - L) / k;
        cur.forEach((a, j) => {
          const cxj = L + bw * (j + 0.5), c = cols[j % 4], m = means[j], r = a.length > 30 ? 3.6 : a.length > 15 ? 4.6 : 5.6;
          const order = a.map((v, i) => i).sort((p, q) => base[j][p] - base[j][q]), off = new Array(a.length), pat = [0, 1, -1, 2, -2, 0.5, -0.5, 1.5, -1.5];
          order.forEach((i, rank) => { off[i] = pat[rank % pat.length] * Math.min(r * 1.5, bw * 0.08); });
          if (showDev) {
            a.forEach((v, i) => W.s('line', { x1: cxj + off[i], x2: cxj + off[i], y1: sy(v), y2: sy(m), style: `stroke:${c};stroke-width:1.3;opacity:.5` }, g));
            W.s('line', { x1: cxj + bw * 0.3, x2: cxj + bw * 0.3, y1: sy(m), y2: sy(gm), style: 'stroke:var(--ink);stroke-width:4;opacity:.75' }, g);
          }
          a.forEach((v, i) => W.s('circle', { cx: (cxj + off[i]).toFixed(1), cy: sy(v).toFixed(1), r, style: `fill:${c};fill-opacity:.8;stroke:var(--surface);stroke-width:1` }, g));
          W.s('line', { x1: cxj - bw * 0.3, x2: cxj + bw * 0.3, y1: sy(m), y2: sy(m), style: `stroke:${c};stroke-width:3.5;stroke-linecap:round` }, g);
          W.text(g, cxj, B + 19, fitText(names[j], bw - 6, 7), 'font-size:13px;font-weight:700;fill:var(--ink-2)');
          W.text(g, cxj + bw * 0.32, clamp(sy(m) - 7, T + 10, B - 4), bw > 120 ? `x̄ = ${fx(m, dd)}` : fx(m, dd), `font-size:12.5px;font-weight:700;fill:${colf[j % 4]}`, 'end').setAttribute('class', 'wr-halo');
        });
        W.s('line', { x1: L, x2: R, y1: sy(gm), y2: sy(gm), style: 'stroke:var(--ink);stroke-width:1.6;stroke-dasharray:7 5' }, g);
        const near = Math.abs(sy(means[k - 1]) - sy(gm)) < 20; W.text(g, R - 2, clamp(sy(gm) + (near && sy(means[k - 1]) <= sy(gm) ? 16 : -6), T + 10, B - 4), `grand mean ${fx(gm, dd)}`, 'font-size:12.5px;font-weight:700;fill:var(--ink)', 'end').setAttribute('class', 'wr-halo');
        // ---- SS split + F distribution
        W.clear(g2); const w2 = st2.w, L2 = 14, R2 = w2 - 14, sst = res.ssb + res.ssw, fb = sst > 0 ? res.ssb / sst : 0, by = 26;
        W.text(g2, L2, 16, 'Total variation SST = between (SSB) + within (SSW)', 'font-size:13px;font-weight:700;fill:var(--ink-2)', 'start');
        W.s('rect', { x: L2, y: by, width: Math.max(0, (R2 - L2) * fb), height: 20, rx: 3, style: `fill:${C.c2}` }, g2);
        W.s('rect', { x: L2 + (R2 - L2) * fb, y: by, width: Math.max(0, (R2 - L2) * (1 - fb)), height: 20, rx: 3, style: 'fill:var(--acc-deep);opacity:.85' }, g2);
        const tB = `Between SSB = ${loc(res.ssb, 2)} (${pct(fb)})`, tW = `Within SSW = ${loc(res.ssw, 2)} (${pct(1 - fb)})`;
        if (st2.narrow) { W.text(g2, L2, by + 38, tB, `font-size:13px;font-weight:700;fill:${C.c2f}`, 'start'); W.text(g2, L2, by + 56, tW, 'font-size:13px;font-weight:700;fill:var(--acc-fg)', 'start'); }
        else { W.text(g2, L2, by + 38, tB, `font-size:13px;font-weight:700;fill:${C.c2f}`, 'start'); W.text(g2, R2, by + 38, tW, 'font-size:13px;font-weight:700;fill:var(--acc-fg)', 'end'); }
        const fy0 = st2.narrow ? 112 : 92, fB = st2.h - 24, fT = fy0 + 8;
        let fMax = Math.max(fCrit * 2.2, 4); if (isFinite(Fv) && Fv > fMax && Fv < fCrit * 5) fMax = Fv * 1.1;
        const fsx = W.scale(0, fMax, L2 + 4, R2 - 4); let pk = 0; const pdf = x => S.fPdf(x, res.dfb, res.dfw);
        for (let i = 1; i <= 240; i++) { const v = pdf(fMax * i / 240); if (isFinite(v) && v > pk) pk = v; } if (res.dfb === 1) pk = Math.min(pk, 1.1); if (!(pk > 0)) pk = 1;
        const fsy = W.scale(0, pk * 1.04, fB, fT), fpt = x => Math.max(fT - 2, fsy(Math.min(pdf(x), pk * 1.2)));
        W.text(g2, L2, fy0 - 8, `F distribution (df ${res.dfb}, ${res.dfw}) if H₀ is true`, 'font-size:13px;font-weight:700;fill:var(--ink-2)', 'start');
        let ar = `M${fsx(fCrit).toFixed(1)},${fB}`; for (let i = 0; i <= 80; i++) { const x = fCrit + (fMax - fCrit) * i / 80; ar += `L${fsx(x).toFixed(1)},${fpt(x).toFixed(1)}`; } ar += `L${fsx(fMax).toFixed(1)},${fB}Z`;
        if (fCrit < fMax) W.s('path', { d: ar, style: 'fill:var(--bad);opacity:.28' }, g2);
        let cd = ''; for (let i = 0; i <= 160; i++) { const x = Math.max(1e-6, fMax * i / 160); cd += (i ? 'L' : 'M') + fsx(x).toFixed(1) + ',' + fpt(x).toFixed(1); }
        W.s('path', { d: cd, style: 'fill:none;stroke:var(--ink-2);stroke-width:2' }, g2);
        W.s('line', { x1: L2, x2: R2, y1: fB, y2: fB, style: 'stroke:var(--line-2);stroke-width:1.2' }, g2);
        W.s('line', { x1: fsx(fCrit), x2: fsx(fCrit), y1: fT, y2: fB + 4, style: 'stroke:var(--bad);stroke-width:1.6;stroke-dasharray:4 3' }, g2);
        W.text(g2, fsx(fCrit), fB + 17, `F crit ${fx(fCrit, 2)}`, 'font-size:12.5px;font-weight:700;fill:var(--bad)', 'middle');
        W.nice(0, fMax, st2.narrow ? 4 : 7).forEach(t => { if (t > fMax) return; const xx = fsx(t); W.s('line', { x1: xx, x2: xx, y1: fB, y2: fB + 4, style: 'stroke:var(--line-2)' }, g2); if (Math.abs(xx - fsx(fCrit)) > 34) W.text(g2, xx, fB + 17, loc(t, 1), 'font-size:12.5px;fill:var(--muted)'); });
        if (isFinite(Fv) && Fv <= fMax) { const xF = fsx(Fv); W.s('line', { x1: xF, x2: xF, y1: fT - 4, y2: fB, style: 'stroke:var(--acc-deep);stroke-width:3' }, g2); const rt = Fv >= fCrit ? xF < R2 - 90 : xF - L2 < 90; W.text(g2, xF + (rt ? 7 : -7), fT + 12, `F = ${fx(Fv, 2)}`, 'font-size:13.5px;font-weight:700;fill:var(--acc-fg)', rt ? 'start' : 'end').setAttribute('class', 'wr-halo'); }
        else if (Fv > fMax) { W.s('path', { d: `M${R2 - 16},${fT + 8}L${R2},${fT + 14}L${R2 - 16},${fT + 20}Z`, style: 'fill:var(--acc-deep)' }, g2); W.text(g2, R2 - 20, fT + 4, `F = ${isFinite(Fv) ? fx(Fv, 1) : '∞'} (off the scale)`, 'font-size:13px;font-weight:700;fill:var(--acc-fg)', 'end').setAttribute('class', 'wr-halo'); }
        // ---- readouts & tables
        const rej = pv <= alpha;
        roF.set(isFinite(Fv) ? `${loc(res.msb, 3)} / ${loc(res.msw, 3)} = ${fx(Fv, 3)}` : Fv === Infinity ? '∞ (no spread inside groups)' : '—');
        roPv.set(fP(pv)); roFc.set(`${fx(fCrit, 3)} (α = ${+alpha.toFixed(4)})`);
        roD.html(isFinite(pv) ? (rej ? '<span class="wr-dec rej">Reject H₀</span>' : '<span class="wr-dec keep">Do not reject H₀</span>') : '—');
        const vr = a => (a.length > 1 ? S.varS(a) : NaN);
        tw.innerHTML = `<table class="wr-t"><caption>Anova: Single Factor (Excel layout)</caption><thead><tr><th>SUMMARY Groups</th><th>Count</th><th>Sum</th><th>Average</th><th>Variance</th><th></th><th></th></tr></thead><tbody>` +
          cur.map((a, j) => `<tr><th class="rl" title="${esc(names[j])}">${esc(fitText(names[j], 150, 7))}</th><td>${a.length}</td><td>${loc(a.reduce((s, v) => s + v, 0), dd)}</td><td>${fx(means[j], dd + 1)}</td><td>${fx(vr(a), dd + 1)}</td><td></td><td></td></tr>`).join('') +
          `<tr class="sub"><td>Source of variation</td><td>SS</td><td>df</td><td>MS</td><td>F</td><td>P-value</td><td>F crit</td></tr>` +
          `<tr><th class="rl">Between Groups</th><td>${fx(res.ssb, dd + 1)}</td><td>${res.dfb}</td><td>${fx(res.msb, dd + 1)}</td><td>${isFinite(Fv) ? fx(Fv, 3) : '—'}</td><td>${fP(pv)}</td><td>${fx(fCrit, 3)}</td></tr>` +
          `<tr><th class="rl">Within Groups</th><td>${fx(res.ssw, dd + 1)}</td><td>${res.dfw}</td><td>${fx(res.msw, dd + 1)}</td><td></td><td></td><td></td></tr>` +
          `<tr class="tot"><th class="rl">Total</th><td>${fx(res.sst, dd + 1)}</td><td>${N - 1}</td><td></td><td></td><td></td><td></td></tr></tbody></table>`;
        const maxN = Math.max.apply(null, cur.map(a => a.length)), lastC = colL(k - 1);
        xl.set([
          { k: 'p-value', f: `=F.DIST.RT(${xn(Fv, 4)},${res.dfb},${res.dfw})`, v: fP(pv) },
          { k: `F critical (α = ${+alpha.toFixed(4)})`, f: `=F.INV.RT(${+alpha.toFixed(4)},${res.dfb},${res.dfw})`, v: fx(fCrit, 3) },
          { k: 'Whole table', f: `Data → Data Analysis → Anova: Single Factor · Input Range A1:${lastC}${maxN + 1} · Grouped By: Columns · Labels in first row`, v: '' }
        ], `Data: one group per column (${names.slice(0, 4).map(esc).join(', ')}${k > 4 ? ', …' : ''} in columns A–${lastC}) with names in row 1.`);
        const ratio = res.msw > 0 ? res.msb / res.msw : Infinity;
        let h = `F = MSB ÷ MSW = ${loc(res.msb, 2)} ÷ ${loc(res.msw, 2)} = <b>${isFinite(Fv) ? fx(Fv, 2) : '∞'}</b>: the variation <b>between</b> the group means is ${isFinite(ratio) ? sig(ratio, 0) : 'infinitely many'} times the variation <b>within</b> groups (after allowing for degrees of freedom). `;
        h += isFinite(pv) ? (rej ? `That is above F crit ${fx(fCrit, 2)} (p = ${fP(pv)} ≤ α = ${+alpha.toFixed(4)}), so <b>reject H₀</b>: at least one group mean differs. ANOVA does not say which one — look at the means (or run a post-hoc test).` : `That is below F crit ${fx(fCrit, 2)} (p = ${fP(pv)} > α = ${+alpha.toFixed(4)}), so <b>do not reject H₀</b>: the gaps between the means are small compared with the noise inside the groups.`) : '';
        if (mF < 0.3) h += ' Slide the gap down to 0 and all group means coincide: F becomes 0.';
        else if (sF > 1.6 && !rej) h += ' More spread within groups hides the same gap between means.';
        else if (sF < 0.5 && rej) h += ' With tight groups, even a modest gap stands out clearly.';
        note.innerHTML = h;
      }
      draw();
    }
  });

  // =================================================================== chi-square
  // params: rows (labels), cols (labels), table (2D observed counts; default = class example age group × AI use), alpha (0.05)
  W.register('chi-square', {
    title: 'Chi-square test of independence',
    init(api, P, el) {
      setup(el); const C = pal(el); void C;
      let alpha = normAlpha(P.alpha), warnTxt = '';
      const DEF = { rows: ['Under 30', '30–49', '50 & above'], cols: ['Uses AI: Yes', 'Uses AI: No'], table: [[312, 178], [273, 183], [224, 270]] };
      let tb = []; const given = P.table !== undefined && P.table !== null;
      if (Array.isArray(P.table)) P.table.forEach(r => { if (Array.isArray(r)) tb.push(r.map(toNum)); });
      let nc = tb.length ? Math.min.apply(null, tb.map(r => r.length)) : 0;
      let ok = tb.length >= 2 && nc >= 2;
      if (ok) { if (tb.length > 5 || nc > 5) warnTxt = 'Only the first 5 rows and 5 columns are used.'; tb = tb.slice(0, 5).map(r => r.slice(0, Math.min(5, nc))); if (tb.some(r => r.some(v => !isFinite(v) || v < 0))) { warnTxt += (warnTxt ? ' ' : '') + 'Blank, negative or non-numeric counts were set to 0.'; tb = tb.map(r => r.map(v => (isFinite(v) && v > 0 ? v : 0))); } }
      const isDef = !ok;
      if (isDef && given) warnTxt = 'The observed table could not be read (it needs at least 2 rows and 2 columns of counts), so the class example is shown.';
      const lab = (arr, i, pre) => (!isDef && Array.isArray(arr) && arr[i] !== undefined && String(arr[i]).trim() ? String(arr[i]) : `${pre} ${i + 1}`);
      const init = isDef ? { rows: DEF.rows.slice(), cols: DEF.cols.slice(), table: DEF.table.map(r => r.slice()) } : { rows: tb.map((r, i) => lab(P.rows, i, 'Row')), cols: tb[0].map((v, j) => lab(P.cols, j, 'Column')), table: tb };
      let rows = init.rows.slice(), cols = init.cols.slice(), obs = init.table.map(r => r.slice()), bad = obs.map(r => r.map(() => false));
      // ---- tables in the stage
      const obsW = W.el('div', { class: 'wr-tw' }); api.stage.appendChild(obsW);
      const trow = btnRow(api.stage);
      const bAR = btn(trow, '+ Row', () => { if (rows.length >= 5) return; rows.push(`Row ${rows.length + 1}`); obs.push(cols.map((c, j) => fillVal(j, 'col'))); bad.push(cols.map(() => false)); rebuild(); });
      const bRR = btn(trow, '− Row', () => { if (rows.length <= 2) return; rows.pop(); obs.pop(); bad.pop(); rebuild(); });
      const bAC = btn(trow, '+ Column', () => { if (cols.length >= 5) return; cols.push(`Column ${cols.length + 1}`); obs.forEach((r, i) => r.push(fillVal(i, 'row'))); bad.forEach(r => r.push(false)); rebuild(); });
      const bRC = btn(trow, '− Column', () => { if (cols.length <= 2) return; cols.pop(); obs.forEach(r => r.pop()); bad.forEach(r => r.pop()); rebuild(); });
      btn(trow, 'Reset', () => { rows = init.rows.slice(); cols = init.cols.slice(); obs = init.table.map(r => r.slice()); bad = obs.map(r => r.map(() => false)); rebuild(); });
      const grid = W.el('div', { class: 'wr-grid2' }); api.stage.appendChild(grid);
      const expW = W.el('div', { class: 'wr-tw' }), conW = W.el('div', { class: 'wr-tw' }); grid.append(expW, conW);
      const st = frame(api, 'Chi-square distribution with the critical value and the test statistic', (w, nar) => (nar ? 226 : 214), () => drawCurve());
      st.svg.style.marginTop = '.7rem'; const g = W.s('g', null, st.svg);
      alphaSeg(api, api.controls, alpha, v => { alpha = v; compute(); });
      const roX = ro(api, 'χ² statistic'), roDf = ro(api, 'df = (r − 1)(c − 1)'), roPv = ro(api, 'p-value'), roCr = ro(api, 'Critical value'), roD = ro(api, 'Decision');
      const xl = xlBox(api.readout); const warnE = msgEl(api.foot), warn = msgEl(api.foot); warn(warnTxt); const note = api.note('');
      let res = null, crit = NaN;
      function fillVal(idx, kind) { // a sensible count for a new row / column
        const vals = kind === 'col' ? obs.map(r => r[idx]) : obs[idx]; const m = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 10; return Math.max(1, Math.round(m));
      }
      const fmtC = v => (Math.abs(v - Math.round(v)) < 1e-9 ? loc(v, 0) : loc(v, 2));
      function rebuild() {
        bAR.disabled = rows.length >= 5; bRR.disabled = rows.length <= 2; bAC.disabled = cols.length >= 5; bRC.disabled = cols.length <= 2;
        obsW.innerHTML = `<table class="wr-t"><caption>Observed counts (O) — edit any cell</caption><thead><tr><th></th>${cols.map(c => `<th title="${esc(c)}">${esc(fitText(c, 110, 6.5))}</th>`).join('')}<th>Total</th></tr></thead><tbody>` +
          rows.map((r, i) => `<tr><th class="rl" title="${esc(r)}">${esc(fitText(r, 120, 7))}</th>${cols.map((c, j) => `<td><input class="wr-cell" type="number" inputmode="numeric" min="0" step="1" value="${obs[i][j]}" data-i="${i}" data-j="${j}" aria-label="Observed count: ${esc(r)}, ${esc(c)}"></td>`).join('')}<td data-rt="${i}"></td></tr>`).join('') +
          `<tr class="tot"><th class="rl">Total</th>${cols.map((c, j) => `<td data-ct="${j}"></td>`).join('')}<td data-gt="1"></td></tr></tbody></table>`;
        obsW.querySelectorAll('input.wr-cell').forEach(inp => inp.addEventListener('input', () => {
          const i = +inp.dataset.i, j = +inp.dataset.j, v = toNum(inp.value), okv = inp.value.trim() !== '' && isFinite(v) && v >= 0;
          obs[i][j] = okv ? v : 0; bad[i][j] = !okv; inp.setAttribute('aria-invalid', String(!okv)); compute();
        }));
        compute();
      }
      function compute() {
        const R = rows.length, Cn = cols.length, rt = obs.map(r => r.reduce((s, v) => s + v, 0)), ct = cols.map((c, j) => obs.reduce((s, r) => s + r[j], 0)), N = rt.reduce((s, v) => s + v, 0);
        rt.forEach((v, i) => { const c = obsW.querySelector(`[data-rt="${i}"]`); if (c) c.textContent = fmtC(v); });
        ct.forEach((v, j) => { const c = obsW.querySelector(`[data-ct="${j}"]`); if (c) c.textContent = fmtC(v); });
        const gt = obsW.querySelector('[data-gt]'); if (gt) gt.textContent = fmtC(N);
        const valid = N > 0 && rt.every(v => v > 0) && ct.every(v => v > 0);
        res = valid ? S.chiSquareTest(obs) : null; const df = (R - 1) * (Cn - 1); crit = S.chi2Inv(1 - alpha, df);
        const E = res ? res.expected : null, contrib = res ? obs.map((r, i) => r.map((o, j) => (o - E[i][j]) ** 2 / E[i][j])) : null;
        // expected table
        expW.innerHTML = `<table class="wr-t"><caption>Expected if independent: E = row total × column total ÷ n</caption><thead><tr><th></th>${cols.map(c => `<th title="${esc(c)}">${esc(fitText(c, 100, 6.5))}</th>`).join('')}</tr></thead><tbody>` +
          rows.map((r, i) => `<tr><th class="rl" title="${esc(r)}">${esc(fitText(r, 110, 7))}</th>${cols.map((c, j) => { const e = E ? E[i][j] : NaN; return `<td${E && e < 5 ? ' style="color:var(--bad);font-weight:700"' : ''} title="${esc(r)} · ${esc(c)}: ${fmtC(rt[i])} × ${fmtC(ct[j])} ÷ ${fmtC(N)}">${E ? fx(e, 2) : '—'}</td>`; }).join('')}</tr>`).join('') + '</tbody></table>';
        // contribution heat map
        const mx = contrib ? Math.max.apply(null, [].concat.apply([], contrib)) : 0;
        conW.innerHTML = `<table class="wr-t"><caption>Contribution to χ²: (O − E)² ÷ E · darker = bigger · ▲/▼ = more/fewer than expected</caption><thead><tr><th></th>${cols.map(c => `<th title="${esc(c)}">${esc(fitText(c, 100, 6.5))}</th>`).join('')}</tr></thead><tbody>` +
          rows.map((r, i) => `<tr><th class="rl" title="${esc(r)}">${esc(fitText(r, 110, 7))}</th>${cols.map((c, j) => {
            if (!contrib) return '<td>—</td>'; const v = contrib[i][j], k = mx > 0 ? Math.round(78 * v / mx) : 0, more = obs[i][j] > E[i][j];
            return `<td class="hm" style="background:color-mix(in srgb,var(--acc-deep) ${k}%,var(--surface));${k > 45 ? 'color:#fff' : ''}" title="O = ${fmtC(obs[i][j])}, E = ${fx(E[i][j], 2)}">${fx(v, 2)}<small>${Math.abs(obs[i][j] - E[i][j]) < 1e-9 ? 'O = E' : more ? '▲ more' : '▼ fewer'}</small></td>`;
          }).join('')}</tr>`).join('') + '</tbody></table>';
        // readouts
        const pv = res ? res.p : NaN, chi = res ? res.chi2 : NaN, rej = res && pv <= alpha;
        roX.set(res ? fx(chi, 3) : '—'); roDf.set(`(${R} − 1)(${Cn} − 1) = ${df}`); roPv.set(fP(pv)); roCr.set(`${fx(crit, 3)} (α = ${+alpha.toFixed(4)})`);
        roD.html(res ? (rej ? '<span class="wr-dec rej">Reject H₀</span>' : '<span class="wr-dec keep">Do not reject H₀</span>') : '—');
        const lc = colL(Cn), tc = colL(Cn + 1), tr = R + 2, es = R + 5, ee = 2 * R + 4;
        xl.set([
          { k: 'Expected (first cell; fill across and down)', f: '=$' + tc + '2*B$' + tr + '/$' + tc + '$' + tr, v: E ? fx(E[0][0], 2) : '—' },
          { k: 'p-value straight from the tables', f: `=CHISQ.TEST(B2:${lc}${R + 1},B${es}:${lc}${ee})`, v: fP(pv) },
          { k: 'χ² statistic (Excel 365)', f: `=SUM((B2:${lc}${R + 1}-B${es}:${lc}${ee})^2/B${es}:${lc}${ee})`, v: res ? fx(chi, 3) : '—' },
          { k: `Critical value (α = ${+alpha.toFixed(4)})`, f: `=CHISQ.INV.RT(${+alpha.toFixed(4)},${df})`, v: fx(crit, 3) },
          { k: 'p-value from χ²', f: `=CHISQ.DIST.RT(${res ? xn(chi, 3) : 'χ²'},${df})`, v: fP(pv) }
        ], `Layout: observed counts in B2:${lc}${R + 1} with totals in column ${tc} and row ${tr}; expected counts in B${es}:${lc}${ee}. No Yates correction (same as CHISQ.TEST and hand calculation).`);
        // warnings
        if (!res) warnE('Every row and every column needs at least one observation (no zero totals), otherwise the expected counts are 0 and χ² cannot be computed.');
        else { const ex = [].concat.apply([], E), lowN = ex.filter(e => e < 5).length; warnE(lowN ? `<b>Caution:</b> ${lowN} of ${ex.length} expected counts ${lowN > 1 ? 'are' : 'is'} below 5 (smallest ${fx(Math.min.apply(null, ex), 2)}). The chi-square approximation may be unreliable: combine categories or collect more data${R === 2 && Cn === 2 ? ' (for a 2×2 table, Fisher’s exact test is an option)' : ''}.` : ''); }
        if (res) {
          let bi = 0, bj = 0; contrib.forEach((r, i) => r.forEach((v, j) => { if (v > contrib[bi][bj]) { bi = i; bj = j; } }));
          const share = chi > 0 ? contrib[bi][bj] / chi : 0, more = obs[bi][bj] > E[bi][bj];
          let h = `χ² = <b>${fx(chi, 2)}</b> with ${df} df ${rej ? 'is beyond' : 'is below'} the ${pct(alpha, alpha * 100 % 1 ? 1 : 0)} critical value ${fx(crit, 2)} (p = ${fP(pv)}${rej ? ' ≤ ' : ' > '}α), so ${rej ? `we <b>reject H₀</b>: the row variable and the column variable are <b>related</b> — the split across the columns differs from row to row.` : `we <b>do not reject H₀</b>: the observed counts are close enough to what independence predicts; there is no convincing evidence of a relationship.`}`;
          if (chi > 0) h += ` The biggest contribution (${fx(contrib[bi][bj], 2)}, ${pct(share)} of χ²) is <b>${esc(rows[bi])} × ${esc(cols[bj])}</b>: ${fmtC(obs[bi][bj])} observed vs ${fx(E[bi][bj], 1)} expected (${more ? 'more' : 'fewer'} than independence predicts).`;
          note.innerHTML = h;
        } else note.innerHTML = 'Enter counts so that every row and column total is above 0.';
        drawCurve();
      }
      function drawCurve() {
        W.clear(g); const R = rows.length, Cn = cols.length, df = (R - 1) * (Cn - 1), chi = res ? res.chi2 : NaN;
        const L = 16, Rr = st.w - 16, T = 34, B = st.h - 40;
        let xMax = Math.max(crit * 1.6, df + 4 * Math.sqrt(2 * df), 6); if (isFinite(chi) && chi > xMax && chi <= 2.6 * xMax) xMax = chi * 1.08;
        const sx = W.scale(0, xMax, L, Rr), pdf = x => S.chi2Pdf(x, df); let pk = 0; for (let i = 1; i <= 200; i++) { const v = pdf(xMax * i / 200); if (v > pk) pk = v; } if (df <= 2) pk = 0.5;
        const sy = W.scale(0, pk * 1.1, B, T), yy = x => Math.max(T - 4, sy(Math.min(pdf(x), pk * 1.25)));
        W.text(g, L, 18, `Chi-square distribution with ${df} df (if H₀ is true)`, 'font-size:13px;font-weight:700;fill:var(--ink-2)', 'start');
        if (crit < xMax) { let a = `M${sx(crit).toFixed(1)},${B}`; for (let i = 0; i <= 90; i++) { const x = crit + (xMax - crit) * i / 90; a += `L${sx(x).toFixed(1)},${yy(x).toFixed(1)}`; } W.s('path', { d: a + `L${sx(xMax).toFixed(1)},${B}Z`, style: 'fill:var(--bad);opacity:.28' }, g); }
        let d = ''; for (let i = 0; i <= 220; i++) { const x = Math.max(1e-6, xMax * i / 220); d += (i ? 'L' : 'M') + sx(x).toFixed(1) + ',' + yy(x).toFixed(1); }
        W.s('path', { d, style: 'fill:none;stroke:var(--ink-2);stroke-width:2.2' }, g);
        const xt = W.nice(0, xMax, st.narrow ? 4 : 7); W.axisX(g, sx, B, xt.filter(t => t <= xMax), t => loc(t, 1), { x0: L, x1: Rr });
        W.s('line', { x1: sx(crit), x2: sx(crit), y1: T, y2: B, style: 'stroke:var(--bad);stroke-width:1.8;stroke-dasharray:4 3' }, g);
        const cl = `critical ${fx(crit, 2)}`, cRight = sx(crit) < (L + Rr) * 0.7;
        W.text(g, sx(crit) + (cRight ? 5 : -5), T + 14, cl, 'font-size:12.5px;font-weight:700;fill:var(--bad)', cRight ? 'start' : 'end').setAttribute('class', 'wr-halo');
        W.text(g, Rr - 2, B - 8, `rejection region α = ${+alpha.toFixed(4)}`, 'font-size:12px;fill:var(--bad)', 'end').setAttribute('class', 'wr-halo');
        if (isFinite(chi)) {
          if (chi <= xMax) { const x = sx(chi); W.s('line', { x1: x, x2: x, y1: T - 6, y2: B, style: 'stroke:var(--acc-deep);stroke-width:3' }, g); W.s('circle', { cx: x, cy: T - 6, r: 5, style: 'fill:var(--acc-deep)' }, g); const rt = x < (L + Rr) * 0.6; W.text(g, x + (rt ? 9 : -9), T - 2, `χ² = ${fx(chi, 2)}`, 'font-size:13.5px;font-weight:700;fill:var(--acc-fg)', rt ? 'start' : 'end').setAttribute('class', 'wr-halo'); }
          else { const yo = T + (B - T) * 0.45; W.s('path', { d: `M${Rr - 18},${yo - 7}L${Rr},${yo}L${Rr - 18},${yo + 7}Z`, style: 'fill:var(--acc-deep)' }, g); W.text(g, Rr - 22, yo - 12, `χ² = ${fx(chi, 2)}`, 'font-size:13.5px;font-weight:700;fill:var(--acc-fg)', 'end').setAttribute('class', 'wr-halo'); W.text(g, Rr - 22, yo + 5, 'far off the scale →', 'font-size:12.5px;fill:var(--acc-fg)', 'end').setAttribute('class', 'wr-halo'); }
        }
      }
      rebuild();
    }
  });
})();
