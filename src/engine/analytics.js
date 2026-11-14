// Periods, KPIs, forecast, driver decomposition, share, competitors and accuracy.
import { WEEKS, NH, HISTW, FCW, SKUS, RETAILERS, COMPETITORS, SEGMENTS, ALL_R, skuById, retById, monthOfWeek, weeksInMonth } from "../data/catalog.js";
import { driversOf, obsDrivers, modelUnits, actualUnits, row, lift, ELAST, compRows, ACV_EVENTS, PRICE_EVENTS, COMP_EVENTS, getRows } from "./sim.js";
import { getVersion } from "../store.js";

// ---------- Periods
const lastH = NH - 1;
const span = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
const ytdStart = WEEKS.findIndex((w) => w.end >= "2026-01-01");
export const PERIODS = {
  LW: { label: "Last week", short: "LW", weeks: [lastH] },
  L4W: { label: "Last 4 weeks", short: "L4W", weeks: span(lastH - 3, lastH) },
  L13W: { label: "Last 13 weeks", short: "L13W", weeks: span(lastH - 12, lastH) },
  L52W: { label: "Last 52 weeks", short: "L52W", weeks: span(lastH - 51, lastH) },
  YTD: { label: "Year to date", short: "YTD", weeks: span(ytdStart, lastH) },
  N13W: { label: "Next 13 weeks (forecast)", short: "N13W", weeks: span(NH, NH + 12) },
  N52W: { label: "Next 52 weeks (forecast)", short: "N52W", weeks: span(NH, NH + 51) },
};
export const COMPS = {
  YA: { label: "vs year ago", short: "YoY" },
  PP: { label: "vs prior period", short: "PoP" },
};
export function compWeeks(period, comp) {
  const w = PERIODS[period].weeks;
  if (period.startsWith("N")) return comp === "PP" && period === "N13W" ? span(lastH - 12, lastH) : w.map((i) => i - 52);
  if (comp === "YA" || period === "YTD" || period === "L52W" && w[0] - 52 < 0) return w.map((i) => i - 52);
  return w.map((i) => i - w.length);
}
export const ppName = (period) => ({ LW: "WoW", L4W: "vs prior 4 weeks", L13W: "QoQ", L52W: "vs prior 52 weeks", YTD: "YoY", N13W: "vs last 13 weeks", N52W: "YoY" }[period]);
export function periodLabel(period, comp) { return `${PERIODS[period].short} ${comp === "YA" ? "vs year ago" : ppName(period)}`; }
export const weekRangeLabel = (weeks) => { if (!weeks.length) return ""; const a = WEEKS[weeks[0]], b = WEEKS[weeks[weeks.length - 1]]; const f = (e) => new Date(e + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit", timeZone: "UTC" }); return weeks.length === 1 ? "w/e " + f(b.end) : f(new Date(Date.parse(a.end) - 6 * 864e5).toISOString().slice(0, 10)) + " to " + f(b.end); };

// ---------- Forecast (cached per state version and assumption set)
let cacheV = -1; const cache = new Map();
const aKey = (act) => act.map((a) => a.id + ":" + a.impact).join(",");
function cacheFor() { const v = getVersion(); if (v !== cacheV) { cache.clear(); cacheV = v; } return cache; }
const baseFc = new Map();
export function baselineWeek(sku, ret, i) {
  const k = sku + ret + i; let v = baseFc.get(k);
  if (v === undefined) { v = modelUnits(sku, ret, i); baseFc.set(k, v); }
  return v;
}
export const affects = (a, sku, ret, m) => a.skus.includes(sku) && a.retailers.includes(ret) && a.months.includes(m);
export function fcWeek(sku, ret, i, act) {
  let v = baselineWeek(sku, ret, i); const m = monthOfWeek(i);
  for (const a of act) if (affects(a, sku, ret, m)) v *= 1 + a.impact / 100;
  return Math.max(0, v);
}
export function unitsWeek(sku, ret, i, act) { return i < NH ? actualUnits(sku, ret, i) : fcWeek(sku, ret, i, act); }
export function units(skus, rets, weeks, act = []) {
  const c = cacheFor(), k = "u|" + skus.join() + "|" + rets.join() + "|" + weeks[0] + "-" + weeks[weeks.length - 1] + "-" + weeks.length + "|" + aKey(act);
  if (c.has(k)) return c.get(k);
  let t = 0; for (const s of skus) for (const r of rets) for (const i of weeks) if (i >= 0) t += unitsWeek(s, r, i, act);
  c.set(k, t); return t;
}
export function dollars(skus, rets, weeks, act = []) {
  let t = 0;
  for (const s of skus) for (const r of rets) for (const i of weeks) {
    if (i < 0) continue;
    if (i < NH) t += row(s, r, i)?.dollars || 0;
    else { const d = driversOf(s, r, i); t += fcWeek(s, r, i, act) * d.basePrice * (1 - d.depth * d.promoAcv); }
  }
  return t;
}
export const monthUnits = (skus, rets, m, act) => units(skus, rets, weeksInMonth(m), act);

// ---------- KPIs
export function kpis(skus, rets, weeks, act = []) {
  let u = 0, $ = 0, acvW = 0, tdp = 0, promoW = 0, featW = 0, dispW = 0, wsum = 0, base = 0;
  for (const i of weeks) {
    if (i < 0) continue;
    for (const r of rets) {
      const w = retById(r).weight; let tdpR = 0;
      for (const s of skus) {
        const d = i < NH ? obsDrivers(s, r, i) : driversOf(s, r, i);
        if (!d.acv) continue;
        const uu = unitsWeek(s, r, i, act); u += uu;
        $ += i < NH ? row(s, r, i)?.dollars || 0 : uu * d.basePrice * (1 - d.depth * d.promoAcv);
        base += uu / (lift.promo(d) * lift.feature(d) * lift.display(d));
        tdpR += d.acv; promoW += d.promoAcv * 100 * w * d.acv; featW += d.featAcv * 100 * w * d.acv; dispW += d.dispAcv * 100 * w * d.acv; acvW += w * d.acv;
      }
      tdp += tdpR * w; wsum += w;
    }
  }
  const n = weeks.filter((i) => i >= 0).length || 1;
  const wn = wsum / n || 1;
  return {
    units: u, dollars: $, avgPrice: u ? $ / u : 0, tdp: tdp / wn / n, promoAcv: acvW ? promoW / acvW : 0, featAcv: acvW ? featW / acvW : 0, dispAcv: acvW ? dispW / acvW : 0,
    velocity: tdp ? $ / (tdp / wn) / n : 0, incr: u ? 1 - base / u : 0, weeks: n,
  };
}

// ---------- Share of segment (history only)
export function shareOf(skus, rets, weeks) {
  const segs = [...new Set(skus.map((s) => skuById(s).segment))];
  const segSkus = SKUS.filter((s) => segs.includes(s.segment)).map((s) => s.id);
  let ours = 0, total = 0;
  const cr = compRows();
  for (const i of weeks) {
    if (i < 0 || i >= NH) continue;
    for (const r of rets) { for (const s of skus) ours += row(s, r, i)?.dollars || 0; for (const s of segSkus) total += row(s, r, i)?.dollars || 0; }
  }
  const set = new Set(weeks);
  for (const c of cr) if (segs.includes(c.segment) && rets.includes(c.ret) && set.has(c.i)) total += c.dollars;
  return total ? ours / total : 0;
}
export function competitorTable(skus, rets, weeksA, weeksB) {
  const segs = [...new Set(skus.map((s) => skuById(s).segment))];
  const cr = compRows();
  const agg = (set) => {
    const m = new Map(); let total = 0;
    const add = (k, u, $, promo) => { const o = m.get(k) || { units: 0, dollars: 0, promoW: 0, n: 0 }; o.units += u; o.dollars += $; o.promoW += promo; o.n++; m.set(k, o); total += $; };
    for (const c of cr) if (segs.includes(c.segment) && rets.includes(c.ret) && set.has(c.i)) add(c.comp, c.units, c.dollars, c.promo);
    for (const s of SKUS.filter((x) => segs.includes(x.segment))) for (const r of rets) for (const i of set) { const rr = row(s.id, r, i); if (rr) add("LUMEN", rr.units, rr.dollars, rr.promoAcv > 0 ? 1 : 0); }
    return { m, total };
  };
  const A = agg(new Set(weeksA)), B = agg(new Set(weeksB));
  const ids = ["LUMEN", ...COMPETITORS.map((c) => c.id)];
  return ids.map((id) => {
    const a = A.m.get(id) || { units: 0, dollars: 0, promoW: 0, n: 0 }, b = B.m.get(id) || { units: 0, dollars: 0, promoW: 0, n: 0 };
    return { id, name: id === "LUMEN" ? "Lumen Beauty" : COMPETITORS.find((c) => c.id === id).name, color: id === "LUMEN" ? "var(--brand)" : COMPETITORS.find((c) => c.id === id).color,
      dollars: b.dollars, dollarsA: a.dollars, share: B.total ? b.dollars / B.total : 0, shareA: A.total ? a.dollars / A.total : 0, price: b.units ? b.dollars / b.units : 0, priceA: a.units ? a.dollars / a.units : 0, promo: b.n ? b.promoW / b.n : 0 };
  }).filter((x) => x.dollars || x.dollarsA);
}
export function segmentsOf(skus) { return [...new Set(skus.map((s) => skuById(s).segment))]; }

// ---------- Driver decomposition: B vs A, week paired with week
export const DECOMP = ["distribution", "price", "promotion", "feature", "display", "seasonality", "competition", "trend", "launch", "supply", "context", "other"];
export const DECOMP_LABEL = { distribution: "Distribution (TDPs)", price: "Base price", promotion: "Promotion (TPR)", feature: "Feature", display: "Display", seasonality: "Seasonality", competition: "Competition", trend: "Base velocity", launch: "New items", supply: "Supply", context: "Other context", other: "Unexplained" };
const ctxDriver = (d) => ({ promotion: "promotion", price: "price", distribution: "distribution", display: "display", supply: "supply", launch: "launch", competition: "competition" }[d] || "context");
export function decompose(skus, rets, weeksA, weeksB, act = []) {
  const c = cacheFor(), ck = "d|" + skus.join() + rets.join() + weeksA[0] + "|" + weeksB[0] + "|" + weeksB.length + aKey(act);
  if (c.has(ck)) return c.get(ck);
  const total = Object.fromEntries(DECOMP.map((k) => [k, 0]));
  const cells = new Map();
  let A = 0, B = 0;
  weeksB.forEach((ib, n) => {
    const ia = weeksA[n];
    for (const s of skus) for (const r of rets) {
      const ua = ia >= 0 ? unitsWeek(s, r, ia, act) : 0, ub = unitsWeek(s, r, ib, act);
      A += ua; B += ub;
      if (!ua && !ub) continue;
      const L = Object.fromEntries(DECOMP.map((k) => [k, 0]));
      if (!ua) L.launch = ub;
      else if (!ub) { const cause = act.find((a) => affects(a, s, r, monthOfWeek(ib)) && a.impact <= -100); L[cause ? ctxDriver(cause.driver) : "distribution"] = -ua; }
      else {
        const da = obsDrivers(s, r, ia), db = obsDrivers(s, r, ib);
        const g = {};
        g.distribution = ELAST.distribution * Math.log(db.acv / da.acv);
        g.price = ELAST.price * Math.log(db.basePrice / da.basePrice);
        g.promotion = Math.log(lift.promo(db) / lift.promo(da));
        g.feature = Math.log(lift.feature(db) / lift.feature(da));
        g.display = Math.log(lift.display(db) / lift.display(da));
        g.seasonality = Math.log(db.season / da.season);
        g.competition = Math.log(db.comp / da.comp);
        g.trend = Math.log(db.trend / da.trend);
        if (ib >= NH) for (const a of act) if (affects(a, s, r, monthOfWeek(ib))) { const k = ctxDriver(a.driver); g[k] = (g[k] || 0) + Math.log(Math.max(1e-6, 1 + a.impact / 100)); }
        const tot = Math.log(ub / ua); let known = 0; for (const k in g) known += g[k];
        g.other = tot - known;
        const dd = ub - ua;
        for (const k in g) L[k] += Math.abs(tot) > 1e-9 ? (dd * g[k]) / tot : ua * g[k];
      }
      const ckey = s + "|" + r; const cc = cells.get(ckey) || Object.fromEntries(DECOMP.map((k) => [k, 0]));
      for (const k of DECOMP) { total[k] += L[k]; cc[k] += L[k]; }
      cells.set(ckey, cc);
    }
  });
  const res = { A, B, total, cells };
  c.set(ck, res); return res;
}
export function decompSteps(dec) { return DECOMP.map((k) => ({ key: k, label: DECOMP_LABEL[k], v: dec.total[k] })).filter((s) => Math.abs(s.v) >= 0.5); }
export function topCells(dec, driver, n = 3) {
  return [...dec.cells.entries()].map(([k, v]) => ({ sku: k.split("|")[0], ret: k.split("|")[1], v: v[driver] })).filter((x) => Math.abs(x.v) >= 1).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, n);
}
export function driverNote(driver, sku, ret) {
  if (driver === "distribution") { const e = ACV_EVENTS.filter(([k, r, f, , n]) => k === sku && r === ret && f && n).pop(); return e ? e[4] : ""; }
  if (driver === "price") { const e = PRICE_EVENTS.find(([k]) => k === sku); return e ? `${e[3]}, ${new Date(e[1] + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}` : ""; }
  if (driver === "competition") { const e = COMP_EVENTS.find((c) => c.skus.includes(sku) && c.ret === ret); return e ? e.note : ""; }
  return "";
}

// ---------- Forecast accuracy backtest (weekly, last 13 weeks, 4-week lag)
// Without context: a forecast made 4 weeks ahead from history and the recurring trade calendar only.
export function accuracy(skus, rets, weeks = PERIODS.L13W.weeks) {
  let eNo = 0, eCtx = 0, bias = 0, tot = 0;
  for (const s of skus) for (const r of rets) for (const i of weeks) {
    const a = actualUnits(s, r, i); if (!a) continue;
    const full = obsDrivers(s, r, i), lag = obsDrivers(s, r, i - 4);
    const noCtx = modelUnits(s, r, i, { ...full, acv: lag.acv || full.acv, basePrice: lag.basePrice, promoAcv: 0, depth: 0, featAcv: 0, dispAcv: 0, comp: lag.comp });
    const ctx = modelUnits(s, r, i, full);
    eNo += Math.abs(noCtx - a); eCtx += Math.abs(ctx - a); bias += ctx - a; tot += a;
  }
  return { noContext: tot ? 1 - eNo / tot : 0, withContext: tot ? 1 - eCtx / tot : 0, bias: tot ? bias / tot : 0 };
}
export { getRows };
