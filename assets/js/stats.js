/* Statistics for Managers — small, dependency-free statistics library.
   Every function is checked against scipy in build/test_stats.py (|error| < 1e-9 for distributions).
   Exposed as window.Stats (and module.exports for Node tests). */
(function (root) {
  'use strict';
  const S = {};
  const LN_SQRT_2PI = 0.9189385332046727;

  // ---------- special functions ----------
  const LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  S.lgamma = function (x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - S.lgamma(1 - x);
    x -= 1; let a = LG[0]; const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += LG[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  };
  S.lnChoose = (n, k) => S.lgamma(n + 1) - S.lgamma(k + 1) - S.lgamma(n - k + 1);
  S.choose = function (n, k) {
    if (k < 0 || k > n) return 0; k = Math.min(k, n - k); let r = 1;
    for (let i = 1; i <= k; i++) r = r * (n - k + i) / i;
    return Math.round(r) === r || r > 1e15 ? r : Math.round(r);
  };
  S.factorial = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };

  // regularised incomplete beta I_x(a,b) — continued fraction (Lentz)
  function betacf(a, b, x) {
    const FPMIN = 1e-300; let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
    for (let m = 1; m <= 1000; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
      const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break;
    }
    return h;
  }
  S.ibeta = function (x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(S.lgamma(a + b) - S.lgamma(a) - S.lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  };
  // regularised lower incomplete gamma P(a,x)
  S.igamma = function (a, x) {
    if (x <= 0) return 0;
    if (x < a + 1) { let ap = a, sum = 1 / a, del = sum; for (let n = 0; n < 2000; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-16) break; } return sum * Math.exp(-x + a * Math.log(x) - S.lgamma(a)); }
    const FPMIN = 1e-300; let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
    for (let i = 1; i < 2000; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN; c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-16) break; }
    return 1 - Math.exp(-x + a * Math.log(x) - S.lgamma(a)) * h;
  };

  // ---------- normal ----------
  S.normPdf = (x, mu = 0, sd = 1) => Math.exp(-0.5 * ((x - mu) / sd) ** 2 - LN_SQRT_2PI) / sd;
  // Hart (1968) / West (2005) double precision cumulative normal
  function phi(z) {
    const x = Math.abs(z); let c;
    if (x > 37) c = 0;
    else {
      const e = Math.exp(-x * x / 2);
      if (x < 7.07106781186547) {
        let n = 3.52624965998911e-02 * x + 0.700383064443688; n = n * x + 6.37396220353165; n = n * x + 33.912866078383; n = n * x + 112.079291497871; n = n * x + 221.213596169931; n = n * x + 220.206867912376;
        let d = 8.83883476483184e-02 * x + 1.75566716318264; d = d * x + 16.064177579207; d = d * x + 86.7807322029461; d = d * x + 296.564248779674; d = d * x + 637.333633378831; d = d * x + 793.826512519948; d = d * x + 440.413735824752;
        c = e * n / d;
      } else { let b = x + 0.65; b = x + 4 / b; b = x + 3 / b; b = x + 2 / b; b = x + 1 / b; c = e / b / 2.506628274631; }
    }
    return z > 0 ? 1 - c : c;
  }
  S.normCdf = (x, mu = 0, sd = 1) => phi((x - mu) / sd);
  // Acklam inverse normal + one Halley step
  S.normInv = function (p, mu = 0, sd = 1) {
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425; let q, r, x;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p <= 1 - pl) { q = p - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    else { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    const e = phi(x) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2); x = x - u / (1 + x * u / 2);
    return mu + sd * x;
  };

  // ---------- t ----------
  S.tPdf = (t, df) => Math.exp(S.lgamma((df + 1) / 2) - S.lgamma(df / 2) - 0.5 * Math.log(df * Math.PI) - (df + 1) / 2 * Math.log(1 + t * t / df));
  S.tCdf = function (t, df) { const x = df / (df + t * t), tail = 0.5 * S.ibeta(x, df / 2, 0.5); return t >= 0 ? 1 - tail : tail; };
  S.tInv = function (p, df) { // quantile
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    let x = S.normInv(p);
    for (let i = 0; i < 60; i++) { const f = S.tCdf(x, df) - p, g = S.tPdf(x, df); const step = f / g; x -= step; if (Math.abs(step) < 1e-13 * Math.max(1, Math.abs(x))) break; }
    return x;
  };
  // ---------- chi-square ----------
  S.chi2Pdf = (x, k) => x <= 0 ? 0 : Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.log(2) - S.lgamma(k / 2));
  S.chi2Cdf = (x, k) => x <= 0 ? 0 : S.igamma(k / 2, x / 2);
  S.chi2Inv = function (p, k) { return bisect(x => S.chi2Cdf(x, k) - p, 0, Math.max(10, k * 10 + 100)); };
  // ---------- F ----------
  S.fPdf = (x, d1, d2) => x <= 0 ? 0 : Math.exp(0.5 * (d1 * Math.log(d1 * x) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * x + d2)) - Math.log(x) - (S.lgamma(d1 / 2) + S.lgamma(d2 / 2) - S.lgamma((d1 + d2) / 2)));
  S.fCdf = (x, d1, d2) => x <= 0 ? 0 : S.ibeta(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2);
  S.fInv = function (p, d1, d2) { return bisect(x => S.fCdf(x, d1, d2) - p, 0, 1000); };
  function bisect(f, lo, hi) { let flo = f(lo); for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2, fm = f(mid); if (Math.abs(hi - lo) < 1e-12 * Math.max(1, mid)) return mid; if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else hi = mid; } return (lo + hi) / 2; }

  // ---------- discrete ----------
  S.binomPmf = (k, n, p) => (k < 0 || k > n || k % 1) ? 0 : (p === 0 ? (k === 0 ? 1 : 0) : p === 1 ? (k === n ? 1 : 0) : Math.exp(S.lnChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p)));
  S.binomCdf = (k, n, p) => { k = Math.floor(k); if (k < 0) return 0; if (k >= n) return 1; let s = 0; for (let i = 0; i <= k; i++) s += S.binomPmf(i, n, p); return Math.min(1, s); };
  S.poissonPmf = (k, lam) => (k < 0 || k % 1) ? 0 : Math.exp(k * Math.log(lam) - lam - S.lgamma(k + 1));
  S.poissonCdf = (k, lam) => { let s = 0; for (let i = 0; i <= Math.floor(k); i++) s += S.poissonPmf(i, lam); return Math.min(1, s); };

  // ---------- descriptive (Excel-compatible) ----------
  const num = a => a.filter(v => typeof v === 'number' && isFinite(v));
  S.sum = a => num(a).reduce((s, v) => s + v, 0);
  S.mean = a => { a = num(a); return S.sum(a) / a.length; };
  S.sorted = a => num(a).slice().sort((x, y) => x - y);
  S.median = a => { const s = S.sorted(a), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  S.modes = a => { const m = new Map(); num(a).forEach(v => m.set(v, (m.get(v) || 0) + 1)); let best = 0; m.forEach(c => { if (c > best) best = c; }); if (best < 2) return []; const out = []; m.forEach((c, v) => { if (c === best) out.push(v); }); return out.sort((x, y) => x - y); };
  S.varS = a => { a = num(a); const m = S.mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1); };
  S.varP = a => { a = num(a); const m = S.mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length; };
  S.sdS = a => Math.sqrt(S.varS(a));
  S.sdP = a => Math.sqrt(S.varP(a));
  S.range = a => { const s = S.sorted(a); return s[s.length - 1] - s[0]; };
  S.cv = a => S.sdS(a) / S.mean(a);
  // percentile, Excel PERCENTILE.EXC (rank (n+1)p) and PERCENTILE.INC (rank 1+(n-1)p)
  S.percentileExc = (a, p) => { const s = S.sorted(a), n = s.length, r = (n + 1) * p; if (r < 1 || r > n) return NaN; const lo = Math.floor(r), f = r - lo; return lo >= n ? s[n - 1] : s[lo - 1] + f * (s[lo] - s[lo - 1]); };
  S.percentileInc = (a, p) => { const s = S.sorted(a), n = s.length, r = 1 + (n - 1) * p, lo = Math.floor(r), f = r - lo; return lo >= n ? s[n - 1] : s[lo - 1] + f * (s[lo] - s[lo - 1]); };
  S.quartileExc = (a, q) => S.percentileExc(a, q / 4);
  S.quartileInc = (a, q) => S.percentileInc(a, q / 4);
  S.skew = a => { a = num(a); const n = a.length, m = S.mean(a), s = S.sdS(a); return n / ((n - 1) * (n - 2)) * a.reduce((t, v) => t + ((v - m) / s) ** 3, 0); };
  S.kurt = a => { a = num(a); const n = a.length, m = S.mean(a), s = S.sdS(a); const k4 = a.reduce((t, v) => t + ((v - m) / s) ** 4, 0); return n * (n + 1) / ((n - 1) * (n - 2) * (n - 3)) * k4 - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3)); };
  S.covS = (x, y) => { const mx = S.mean(x), my = S.mean(y); let s = 0; for (let i = 0; i < x.length; i++) s += (x[i] - mx) * (y[i] - my); return s / (x.length - 1); };
  S.correl = (x, y) => S.covS(x, y) / (S.sdS(x) * S.sdS(y));
  S.ranks = a => { const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]); const r = new Array(a.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1; } return r; };
  S.spearman = (x, y) => S.correl(S.ranks(x), S.ranks(y));
  S.zscores = a => { const m = S.mean(a), s = S.sdS(a); return a.map(v => (v - m) / s); };
  S.fiveNum = a => ({ min: S.sorted(a)[0], q1: S.quartileExc(a, 1), median: S.median(a), q3: S.quartileExc(a, 3), max: S.sorted(a)[num(a).length - 1] });

  // ---------- regression ----------
  S.linreg = function (x, y) {
    const n = x.length, mx = S.mean(x), my = S.mean(y); let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    const b1 = sxy / sxx, b0 = my - b1 * mx; let sse = 0;
    for (let i = 0; i < n; i++) sse += (y[i] - b0 - b1 * x[i]) ** 2;
    const ssr = syy - sse, r2 = ssr / syy, se = Math.sqrt(sse / (n - 2)), sb1 = se / Math.sqrt(sxx), tb1 = b1 / sb1;
    return { b0, b1, r2, r: Math.sign(b1) * Math.sqrt(r2), sse, ssr, sst: syy, se, sb1, t: tb1, p: 2 * (1 - S.tCdf(Math.abs(tb1), n - 2)), n, F: ssr / (sse / (n - 2)) };
  };
  // OLS with intercept: X is array of rows (without the 1 column)
  S.ols = function (X, y) {
    const n = y.length, k = X[0].length, p = k + 1; const A = []; // design with intercept
    for (let i = 0; i < n; i++) A.push([1].concat(X[i]));
    const XtX = Array.from({ length: p }, () => new Array(p).fill(0)), Xty = new Array(p).fill(0);
    for (let i = 0; i < n; i++) for (let a = 0; a < p; a++) { Xty[a] += A[i][a] * y[i]; for (let b = 0; b < p; b++) XtX[a][b] += A[i][a] * A[i][b]; }
    const inv = S.matInv(XtX), beta = inv.map(row => row.reduce((s, v, j) => s + v * Xty[j], 0));
    const my = S.mean(y); let sse = 0, sst = 0; const fitted = [];
    for (let i = 0; i < n; i++) { const f = A[i].reduce((s, v, j) => s + v * beta[j], 0); fitted.push(f); sse += (y[i] - f) ** 2; sst += (y[i] - my) ** 2; }
    const ssr = sst - sse, dfe = n - p, mse = sse / dfe, se = beta.map((_, j) => Math.sqrt(mse * inv[j][j])), t = beta.map((b, j) => b / se[j]);
    const F = (ssr / k) / mse;
    return { beta, se, t, p: t.map(v => 2 * (1 - S.tCdf(Math.abs(v), dfe))), r2: ssr / sst, adjR2: 1 - (sse / dfe) / (sst / (n - 1)), F, pF: 1 - S.fCdf(F, k, dfe), sse, ssr, sst, mse, s: Math.sqrt(mse), dfr: k, dfe, n, fitted };
  };
  S.matInv = function (M) {
    const n = M.length, A = M.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))));
    for (let c = 0; c < n; c++) {
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      [A[c], A[piv]] = [A[piv], A[c]]; const d = A[c][c]; if (Math.abs(d) < 1e-14) throw new Error('singular');
      for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
    }
    return A.map(r => r.slice(n));
  };

  // ---------- tests ----------
  S.chiSquareTest = function (obs) { // obs: 2D array
    const R = obs.length, C = obs[0].length, rt = obs.map(r => r.reduce((s, v) => s + v, 0)), ct = obs[0].map((_, j) => obs.reduce((s, r) => s + r[j], 0)), N = rt.reduce((s, v) => s + v, 0);
    const exp = obs.map((r, i) => r.map((_, j) => rt[i] * ct[j] / N)); let chi = 0;
    obs.forEach((r, i) => r.forEach((o, j) => { chi += (o - exp[i][j]) ** 2 / exp[i][j]; }));
    const df = (R - 1) * (C - 1); return { chi2: chi, df, p: 1 - S.chi2Cdf(chi, df), expected: exp, rowTotals: rt, colTotals: ct, n: N };
  };
  S.anova1 = function (groups) {
    const all = [].concat(...groups), gm = S.mean(all), k = groups.length, N = all.length; let ssb = 0, ssw = 0;
    groups.forEach(g => { const m = S.mean(g); ssb += g.length * (m - gm) ** 2; g.forEach(v => { ssw += (v - m) ** 2; }); });
    const dfb = k - 1, dfw = N - k, msb = ssb / dfb, msw = ssw / dfw, F = msb / msw;
    return { ssb, ssw, sst: ssb + ssw, dfb, dfw, msb, msw, F, p: 1 - S.fCdf(F, dfb, dfw), fCrit: S.fInv(0.95, dfb, dfw) };
  };

  // ---------- random (seedable) ----------
  S.rng = function (seed) { let s = (seed >>> 0) || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
  S.randn = function (rand) { let u = 0, v = 0; while (u === 0) u = rand(); while (v === 0) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // ---------- formatting ----------
  S.fmt = function (v, d = 4) { if (v === null || v === undefined || isNaN(v)) return '—'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; const s = Math.abs(v) >= 1e6 ? v.toExponential(2) : v.toFixed(d); return s.replace('-', '−'); };
  S.fmtP = function (p) { if (p < 0.0001) return '< 0.0001'; return p.toFixed(4); };

  root.Stats = S;
  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
