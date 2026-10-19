/* Statistics for Managers — page behaviour (no dependencies). */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const ROOT = document.body.dataset.root || '';
  const SLUG = document.body.dataset.slug || '';

  // ---------- storage (best effort) ----------
  const KEY = 'sfm:v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  let state = load(); state.done = state.done || {}; state.pq = state.pq || {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } }
  window.SFM = { state, save };

  // ---------- theme ----------
  const themeBtn = $('#theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('sfm:theme', next); } catch (e) { }
    document.dispatchEvent(new CustomEvent('sfm:theme'));
  });
  // ---------- menu ----------
  const menuBtn = $('#menu-btn'), nav = $('#nav');
  if (menuBtn && nav) menuBtn.addEventListener('click', () => { const o = nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', o); });

  // ---------- TOC active section ----------
  const tocLinks = $$('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const map = new Map(tocLinks.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { tocLinks.forEach(a => a.classList.remove('active')); const a = map.get(e.target.id); if (a) a.classList.add('active'); } });
    }, { rootMargin: '-20% 0px -70% 0px' });
    map.forEach((a, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  // ---------- quick-check quizzes ----------
  $$('.quiz-set').forEach(set => {
    const quizzes = $$('.quiz', set); let n = 0;
    quizzes.forEach(q => { const qq = $('.q', q); if (qq) qq.setAttribute('data-n', ++n); });
    const score = document.createElement('div'); score.className = 'quiz-score'; score.setAttribute('aria-live', 'polite');
    const upd = () => { const done = quizzes.filter(q => q.classList.contains('done')).length, right = quizzes.filter(q => q.dataset.result === 'right').length; score.innerHTML = `<span>Score: ${right} / ${quizzes.length}</span>` + (done === quizzes.length ? `<span class="muted" style="font-weight:400">${right === quizzes.length ? 'Perfect — you have this topic.' : right >= quizzes.length * 0.6 ? 'Good. Re-read the explanations for the ones you missed.' : 'Worth another pass through the Theory section.'}</span> <button class="btn small" type="button">Try again</button>` : `<span class="muted" style="font-weight:400">${done} of ${quizzes.length} answered</span>`); const b = $('button', score); if (b) b.onclick = () => { quizzes.forEach(reset); upd(); }; };
    set.appendChild(score); set.addEventListener('sfm:answered', upd); upd();
  });
  function reset(q) { q.classList.remove('done'); delete q.dataset.result; $$('ol.opts button', q).forEach(b => { b.classList.remove('right', 'wrong'); b.disabled = false; b.removeAttribute('aria-pressed'); }); }
  $$('.quiz').forEach((q, qi) => {
    if (!$('.q', q).hasAttribute('data-n')) $('.q', q).setAttribute('data-n', qi + 1);
    const ans = (q.dataset.answer || '').trim();
    $$('ol.opts > li', q).forEach((li, i) => {
      const k = li.dataset.k || 'abcdefg'[i]; const b = document.createElement('button'); b.type = 'button';
      b.innerHTML = `<span class="k">${k.toUpperCase()}</span><span>${li.innerHTML}</span>`; li.innerHTML = ''; li.appendChild(b);
      b.addEventListener('click', () => {
        if (q.classList.contains('done')) return;
        const right = k === ans; b.classList.add(right ? 'right' : 'wrong'); b.setAttribute('aria-pressed', 'true');
        if (!right) { const rb = $$('ol.opts button', q).find(x => $('.k', x).textContent.toLowerCase() === ans); if (rb) rb.classList.add('right'); }
        q.classList.add('done'); q.dataset.result = right ? 'right' : 'wrong';
        const why = $('.why', q); if (why && !$('.verdict', why)) { const v = document.createElement('span'); v.className = 'verdict'; why.prepend(v); }
        const v = why && $('.verdict', why); if (v) { v.textContent = right ? 'Correct.' : `Not quite — the answer is ${ans.toUpperCase()}.`; v.style.color = right ? 'var(--ok)' : 'var(--bad)'; }
        q.dispatchEvent(new CustomEvent('sfm:answered', { bubbles: true }));
      });
    });
  });

  // ---------- practice questions ----------
  $$('.pq-set').forEach(set => {
    const items = $$('article.pq', set), setId = set.dataset.set || SLUG;
    const topics = [...new Set(items.map(i => i.dataset.topic).filter(Boolean))];
    const topicNames = JSON.parse(set.dataset.topicNames || '{}');
    items.forEach((it, i) => {
      const id = it.id || `${setId}-q${String(i + 1).padStart(2, '0')}`; it.id = id;
      const h = document.createElement('header'); const lv = (it.dataset.level || '').toLowerCase();
      h.innerHTML = `<span class="num">Q${i + 1}</span>` + (lv ? `<span class="tag lv-${lv}">${lv[0].toUpperCase() + lv.slice(1)}</span>` : '') + (it.dataset.topic ? `<span class="tag">${topicNames[it.dataset.topic] || it.dataset.topic.replace(/-/g, ' ')}</span>` : '') + (it.dataset.type ? `<span class="tag">${it.dataset.type}</span>` : '') + (it.dataset.marks ? `<span class="tag">${it.dataset.marks} marks</span>` : '') + `<button type="button" class="btn small done-btn" aria-pressed="false">Mark done</button>`;
      it.prepend(h);
      const db = $('.done-btn', h); const setDone = d => { it.classList.toggle('is-done', d); db.setAttribute('aria-pressed', d); db.textContent = d ? 'Done ✓' : 'Mark done'; };
      setDone(!!state.pq[id]);
      db.addEventListener('click', () => { const d = !state.pq[id]; if (d) state.pq[id] = 1; else delete state.pq[id]; save(); setDone(d); refresh(); });
    });
    const tools = document.createElement('div'); tools.className = 'pq-tools no-print';
    tools.innerHTML = `<div class="seg" role="group" aria-label="Level">${['all', 'basic', 'intermediate', 'advanced'].map((l, i) => `<button type="button" data-lv="${l}" aria-pressed="${i === 0}">${l === 'all' ? 'All levels' : l[0].toUpperCase() + l.slice(1)}</button>`).join('')}</div>` +
      (topics.length > 1 ? `<select class="w-input" style="width:auto" aria-label="Topic"><option value="">All topics</option>${topics.map(t => `<option value="${t}">${topicNames[t] || t.replace(/-/g, ' ')}</option>`).join('')}</select>` : '') +
      `<button type="button" class="btn small" data-act="open">Show all solutions</button><button type="button" class="btn small" data-act="print">Print</button><span class="count"></span>`;
    set.prepend(tools);
    let lv = 'all', tp = '';
    function refresh() { let shown = 0, done = 0; items.forEach(it => { const ok = (lv === 'all' || (it.dataset.level || '').toLowerCase() === lv) && (!tp || it.dataset.topic === tp); it.hidden = !ok; if (ok) shown++; if (state.pq[it.id]) done++; }); $('.count', tools).textContent = `${shown} shown · ${done}/${items.length} done`; }
    $$('.seg button', tools).forEach(b => b.addEventListener('click', () => { lv = b.dataset.lv; $$('.seg button', tools).forEach(x => x.setAttribute('aria-pressed', x === b)); refresh(); }));
    const sel = $('select', tools); if (sel) sel.addEventListener('change', () => { tp = sel.value; refresh(); });
    const ob = $('[data-act=open]', tools); ob.addEventListener('click', () => { const open = ob.dataset.open !== '1'; items.forEach(it => $$('details', it).forEach(d => { d.open = open; })); ob.dataset.open = open ? '1' : '0'; ob.textContent = open ? 'Hide all solutions' : 'Show all solutions'; });
    $('[data-act=print]', tools).addEventListener('click', () => window.print());
    refresh();
  });

  // ---------- question bank ----------
  $$('.qb-set').forEach(set => {
    const items = $$('article.qb', set);
    items.forEach(it => {
      const m = document.createElement('div'); m.className = 'meta';
      const d = it.dataset;
      m.innerHTML = `<span class="mk">${d.marks} marks</span>` + (d.module ? `<span>Module ${d.module}</span>` : '') + (d.co ? `<span>${d.co}</span>` : '') + (d.bloom ? `<span>${d.bloom}</span>` : '') + (d.type ? `<span>${d.type}</span>` : '');
      it.prepend(m);
    });
    const tools = $('.qb-tools', set); if (!tools) return;
    let mod = '', mk = '';
    const refresh = () => { let n = 0; items.forEach(it => { const ok = (!mod || it.dataset.module === mod) && (!mk || it.dataset.marks === mk || (mk === '2' && it.dataset.marks === '3')); it.hidden = !ok; if (ok) n++; }); $$('.qb-module', set).forEach(sec => { sec.hidden = !$$('article.qb', sec).some(i => !i.hidden); }); const c = $('.count', tools); if (c) c.textContent = `${n} questions`; };
    $$('[data-mod]', tools).forEach(b => b.addEventListener('click', () => { mod = b.dataset.mod; $$('[data-mod]', tools).forEach(x => x.setAttribute('aria-pressed', x === b)); refresh(); }));
    $$('[data-mk]', tools).forEach(b => b.addEventListener('click', () => { mk = b.dataset.mk; $$('[data-mk]', tools).forEach(x => x.setAttribute('aria-pressed', x === b)); refresh(); }));
    const ob = $('[data-act=open]', tools); if (ob) ob.addEventListener('click', () => { const open = ob.dataset.open !== '1'; items.forEach(it => $$('details', it).forEach(d => { d.open = open; })); ob.dataset.open = open ? '1' : '0'; ob.textContent = open ? 'Hide answer pointers' : 'Show answer pointers'; });
    refresh();
  });

  // ---------- document viewer ----------
  const MAT = window.SFM_MATERIALS || { docs: [], data: [] };
  const docById = Object.fromEntries(MAT.docs.map(d => [d.id, d]));
  const ext = f => (f.split('.').pop() || '').toLowerCase();
  function parsePages(spec, total) {
    if (!spec) return Array.from({ length: total }, (_, i) => i + 1);
    const out = []; String(spec).split(',').forEach(part => { const [a, b] = part.split('-').map(s => parseInt(s, 10)); if (b) { for (let i = a; i <= b; i++) out.push(i); } else if (a) out.push(a); });
    return out.filter(p => p >= 1 && p <= total);
  }
  const KIND = { slides: 'Class slides', problems: 'Class problems', solutions: 'Solutions', table: 'Table', case: 'Case problem' };
  function initDocview(el) {
    const d = docById[el.dataset.doc]; if (!d) { el.innerHTML = `<p class="dv-note">Missing document: ${el.dataset.doc}</p>`; return; }
    const pages = parsePages(el.dataset.pages, d.pages); let idx = Math.max(0, pages.indexOf(parseInt(el.dataset.page || pages[0], 10)));
    const src = p => `${ROOT}${d.dir}/p-${String(p).padStart(3, '0')}.jpg`;
    const orig = d.file, isPdf = ext(orig) === 'pdf';
    const title = el.dataset.title || d.title;
    const range = el.dataset.pages ? ` · ${/[-,]/.test(el.dataset.pages) ? 'pages' : 'page'} ${el.dataset.pages}` : '';
    el.innerHTML = `<div class="dv-head"><span class="dv-kind">${KIND[d.kind] || 'Material'}</span><span class="dv-title">${title}<span class="muted" style="font-weight:400">${range}</span></span><span class="dv-actions"><a class="btn small" href="${ROOT}${orig}" download>Download .${ext(orig)}</a>${isPdf ? '' : `<a class="btn small" href="${ROOT}${d.pdf}" target="_blank" rel="noopener">PDF</a>`}<button class="btn small" type="button" data-act="fs" aria-label="Full screen">⤢</button></span></div>
      <div class="dv-stage"><img alt="" loading="lazy" decoding="async" width="${d.w}" height="${d.h}"></div>
      <div class="dv-bar"><button class="btn small" type="button" data-act="prev" aria-label="Previous page">←</button><span class="pg"></span><input type="range" min="0" max="${pages.length - 1}" value="${idx}" aria-label="Page"><button class="btn small" type="button" data-act="next" aria-label="Next page">→</button></div>
      ${pages.length > 1 ? `<div class="dv-strip">${pages.map((p, i) => `<button type="button" data-i="${i}" aria-label="Page ${p}"><img src="${src(p)}" alt="" loading="lazy" width="84" height="${Math.round(84 * d.h / d.w)}"></button>`).join('')}</div>` : ''}
      ${el.dataset.note ? `<p class="dv-note">${el.dataset.note}</p>` : ''}`;
    el.tabIndex = 0;
    const img = $('.dv-stage img', el), pg = $('.pg', el), rng = $('input[type=range]', el), strip = $$('.dv-strip button', el);
    if (pages.length < 2) { $('.dv-bar', el).style.display = 'none'; }
    function show(i) {
      idx = Math.max(0, Math.min(pages.length - 1, i)); img.src = src(pages[idx]); img.alt = `${title} — page ${pages[idx]} of ${d.pages}`;
      pg.textContent = `${pages[idx]} / ${d.pages}`; rng.value = idx;
      strip.forEach((b, j) => b.setAttribute('aria-current', j === idx));
      const cur = strip[idx]; if (cur && cur.parentElement) { const s = cur.parentElement; const x = cur.offsetLeft - s.clientWidth / 2 + cur.clientWidth / 2; s.scrollTo({ left: x, behavior: 'smooth' }); }
      if (pages[idx + 1]) { const pre = new Image(); pre.src = src(pages[idx + 1]); }
    }
    $('[data-act=prev]', el).onclick = () => show(idx - 1);
    $('[data-act=next]', el).onclick = () => show(idx + 1);
    rng.oninput = () => show(+rng.value);
    strip.forEach(b => b.onclick = () => show(+b.dataset.i));
    el.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (e.key === 'ArrowRight') { show(idx + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { show(idx - 1); e.preventDefault(); } });
    $('[data-act=fs]', el).onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); else openLightbox(img.src); };
    img.addEventListener('click', () => { if (!document.fullscreenElement) openLightbox(img.src); });
    show(idx);
  }
  $$('.docview[data-doc]').forEach(initDocview);
  function openDocModal(id) {
    const ov = document.createElement('div'); ov.className = 'lightbox'; ov.style.cursor = 'default';
    ov.innerHTML = `<div style="width:min(1100px,100%)"><div style="text-align:right;margin-bottom:.4rem"><button class="btn small" type="button">Close ✕</button></div><div class="docview" data-doc="${id}"></div></div>`;
    document.body.appendChild(ov); initDocview($('.docview', ov)); $('.docview', ov).focus();
    const close = () => ov.remove(); $('button', ov).onclick = close; ov.addEventListener('click', e => { if (e.target === ov) close(); }); ov.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
  document.addEventListener('click', e => { const a = e.target.closest('[data-view]'); if (!a) return; const t = document.getElementById('view-' + a.dataset.view); if (t) return; e.preventDefault(); openDocModal(a.dataset.view); });
  function openLightbox(src) {
    const lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = `<img src="${src}" alt="Enlarged page">`; lb.tabIndex = 0;
    const close = () => lb.remove(); lb.addEventListener('click', close); lb.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    document.body.appendChild(lb); lb.focus();
  }

  // materials list blocks: <div class="mat-list" data-pillar="descriptive"></div> or data-ids="a,b"
  $$('.mat-list[data-pillar],.mat-list[data-ids]').forEach(el => {
    const ids = el.dataset.ids ? el.dataset.ids.split(',').map(s => s.trim()) : null;
    const all = MAT.docs.map(d => Object.assign({ isDoc: 1 }, d)).concat(MAT.data);
    const list = ids ? ids.map(i => all.find(x => x.id === i)).filter(Boolean) : all.filter(x => x.pillar === el.dataset.pillar);
    el.innerHTML = list.map(x => { const e = ext(x.file); return `<div class="mat"><span class="mi ${e}">${e.toUpperCase()}</span><span class="mt"><b>${x.title}</b><span>${x.isDoc ? `${x.pages} ${x.kind === 'slides' ? 'slides' : 'pages'} · ` : 'Dataset · '}${x.file.split('/').pop()}</span></span><span class="ma">${x.isDoc ? `<a class="btn small" href="#view-${x.id}" data-view="${x.id}">View</a>` : ''}<a class="btn small" href="${ROOT}${x.file}" download>Download</a></span></div>`; }).join('');
  });

  // ---------- mark page done ----------
  const doneBtn = $('#done-btn');
  if (doneBtn && SLUG) {
    const paint = () => { const d = !!state.done[SLUG]; doneBtn.setAttribute('aria-pressed', d); doneBtn.textContent = d ? 'Completed ✓ (undo)' : 'Mark this topic complete'; };
    doneBtn.addEventListener('click', () => { if (state.done[SLUG]) delete state.done[SLUG]; else state.done[SLUG] = Date.now(); save(); paint(); });
    paint();
  }
  // concept-map progress
  const mapLinks = $$('[data-topic-link]');
  if (mapLinks.length) {
    let n = 0; mapLinks.forEach(a => { if (state.done[a.dataset.topicLink]) { a.classList.add('is-done'); n++; } });
    const topics = new Set(mapLinks.map(a => a.dataset.topicLink)), done = [...topics].filter(t => state.done[t]).length;
    const pl = $('#progress-line'); if (pl) { pl.querySelector('i').style.width = (100 * done / topics.size) + '%'; pl.querySelector('.txt').textContent = done ? `${done} of ${topics.size} topics completed on this device` : `${topics.size} topics · progress is saved on this device`; }
  }

  // ---------- print: open all details unless answers are hidden ----------
  window.addEventListener('beforeprint', () => { if (!document.body.classList.contains('print-answers-off')) $$('details').forEach(d => { if (!d.open) { d.dataset.printOpened = '1'; d.open = true; } }); });
  window.addEventListener('afterprint', () => { $$('details[data-print-opened]').forEach(d => { d.open = false; delete d.dataset.printOpened; }); });

  // ---------- search ----------
  const sBtn = $('#search-btn');
  if (sBtn) sBtn.addEventListener('click', openSearch);
  document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); } });
  function openSearch() {
    const idx = window.SFM_SEARCH || []; const ov = document.createElement('div'); ov.className = 'lightbox'; ov.style.cursor = 'default'; ov.style.placeItems = 'start center';
    ov.innerHTML = `<div class="card" style="width:min(680px,100%);margin-top:8vh"><div class="search"><input type="search" placeholder="Search topics, formulas, Excel functions…" aria-label="Search"><button class="btn small" type="button">Esc</button></div><div class="res" style="margin-top:.8rem;max-height:60vh;overflow:auto"></div></div>`;
    document.body.appendChild(ov); const inp = $('input', ov), res = $('.res', ov); inp.focus();
    const close = () => ov.remove(); $('button', ov).onclick = close; ov.addEventListener('click', e => { if (e.target === ov) close(); }); ov.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    const run = () => { const q = inp.value.trim().toLowerCase(); if (!q) { res.innerHTML = '<p class="muted small">Try “standard deviation”, “p-value”, “CORREL”, “Bayes”…</p>'; return; } const terms = q.split(/\s+/); const hits = idx.map(r => { const hay = (r.t + ' ' + r.s + ' ' + (r.k || '')).toLowerCase(); let sc = 0; terms.forEach(t => { if (hay.includes(t)) sc += r.t.toLowerCase().includes(t) ? 3 : 1; else sc -= 10; }); return [sc, r]; }).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 30); res.innerHTML = hits.length ? hits.map(([, r]) => `<a href="${ROOT}${r.u}" style="display:block;padding:.5rem .4rem;border-bottom:1px solid var(--line);text-decoration:none;color:var(--ink)"><b>${r.t}</b><br><span class="small muted">${r.s}</span></a>`).join('') : '<p class="muted">No matches.</p>'; };
    inp.addEventListener('input', run); run();
  }

  // ---------- tap-to-zoom diagrams (small screens) ----------
  $$('.fig').forEach(fig => {
    const svg = $(':scope > svg', fig); if (!svg || fig.closest('a')) return;
    fig.classList.add('zoomable');
    fig.addEventListener('click', e => {
      if (window.innerWidth > 900 || e.target.closest('a,button,input')) return;
      const ov = document.createElement('div'); ov.className = 'fig-zoom'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Enlarged figure');
      ov.innerHTML = '<span class="fz-hint">Scroll to explore</span><button class="btn small fz-close" type="button">Close ✕</button>';
      const c = svg.cloneNode(true); c.classList.remove('wsvg'); ov.appendChild(c);
      const cap = $('figcaption', fig); if (cap) { const p = document.createElement('p'); p.className = 'small muted'; p.innerHTML = cap.innerHTML; ov.appendChild(p); }
      const close = () => ov.remove(); $('.fz-close', ov).onclick = close; ov.addEventListener('keydown', ev => { if (ev.key === 'Escape') close(); });
      document.body.appendChild(ov); $('.fz-close', ov).focus();
    });
  });

  // ---------- widgets ----------
  if (window.SFMW) window.SFMW.boot();
})();
