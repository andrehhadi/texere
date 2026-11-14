// Simulated NielsenIQ-style retail data and the Texere driver model.
// Volume = velocity x distribution^0.9 x seasonality x price effect x promotion lift x display lift x trend.
// History (Nov 2024 - Oct 2026) is generated from the same model plus noise, so the
// driver decomposition and the forecast use one consistent set of elasticities.
import { HIST, FC, ALLM, SKUS, RETAILERS, skuById, monthIdx, shiftY, mLabel } from "../data/catalog.js";

export const ELAST = { distribution: 0.9, price: -1.4, promoLift: 1.6, displayLift: 0.45 };

const RET_BASE = { WMT: 40000, TGT: 18000, CVS: 12000, WAG: 9000 };
const SKU_SCALE = { GEL17: 1.0, GEL34: 0.6, CLN65: 0.8, SPF30: 0.7, SER10: 0.35 };
const TREND = { GEL17: 0.05, GEL34: 0.03, CLN65: 0.0, SPF30: 0.02, SER10: 0.0 };
const PRICE_IDX = { WMT: 0.92, TGT: 1.0, CVS: 1.08, WAG: 1.08 };
const SEASON = {
  moist: [1.15, 1.1, 1.05, 0.95, 0.9, 0.85, 0.85, 0.9, 0.95, 1.0, 1.1, 1.2],
  clean: [1.0, 0.98, 1.0, 1.0, 1.02, 1.0, 1.0, 1.05, 1.02, 0.98, 0.97, 1.0],
  spf: [0.6, 0.65, 0.85, 1.1, 1.35, 1.5, 1.5, 1.3, 0.95, 0.7, 0.6, 0.6],
  serum: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};
const ACV_BASE = { WMT: 96, TGT: 90, CVS: 82, WAG: 76 };
const ACV_SKU_ADJ = { GEL17: 0, GEL34: -6, CLN65: -2, SPF30: -4, SER10: 0 };

// Distribution changes: [sku, retailer, from month, new %ACV, note]
const ACV_EVENTS = [
  ["GEL17", "TGT", null, 84, ""],
  ["GEL17", "TGT", "2026-03", 93, "Target added the 1.7 oz gel to the full skincare set"],
  ["GEL34", "CVS", "2025-09", 70, "CVS dropped the 3.4 oz gel from smaller stores"],
  ["CLN65", "WAG", "2026-06", 62, "Walgreens cut the cleanser from about 18% of stores"],
  ["SPF30", "WMT", null, 92, ""],
  ["SPF30", "WMT", "2026-02", 98, "Walmart expanded the SPF lotion to the full sun care set"],
];
// List price changes: [sku, from month, multiplier]
const PRICE_EVENTS = [
  ["GEL17", "2026-03", 1.05],
  ["GEL34", "2026-03", 1.05],
  ["SPF30", "2025-04", 1.04],
];
// Promotions: [sku, retailer, month, share of stores, discount, recurring?]
// Recurring programs repeat in the forecast trade calendar; one-time events come in through assumptions.
const PROMOS = [
  ["GEL17", "WMT", "2025-01", 0.9, 0.15, true], ["GEL17", "WMT", "2026-01", 0.9, 0.15, true],
  ["GEL34", "WMT", "2025-01", 0.9, 0.15, true], ["GEL34", "WMT", "2026-01", 0.9, 0.15, true],
  ["GEL17", "TGT", "2025-04", 0.6, 0.15, false], ["GEL17", "TGT", "2025-12", 1.0, 0.2, false], ["GEL17", "TGT", "2026-04", 1.0, 0.15, false],
  ["GEL17", "WAG", "2025-02", 1.0, 0.25, true], ["GEL17", "WAG", "2026-02", 1.0, 0.25, true],
  ["CLN65", "WMT", "2025-04", 0.9, 0.15, false],
  ["CLN65", "CVS", "2025-08", 1.0, 0.2, false], ["CLN65", "CVS", "2026-08", 1.0, 0.2, false],
  ["SPF30", "CVS", "2025-05", 1.0, 0.3, false], ["SPF30", "CVS", "2026-05", 1.0, 0.3, false],
  ["SPF30", "TGT", "2025-06", 0.8, 0.2, false],
];
for (const m of ["2024-12", "2025-02", "2025-04", "2025-06", "2025-08", "2025-10", "2025-12", "2026-02", "2026-04", "2026-06", "2026-08", "2026-10"]) {
  PROMOS.push(["GEL34", "CVS", m, 0.8, 0.2, true]);
}
// Displays: [sku, retailer, month, share of stores, recurring?]
const DISPLAYS = [
  ["GEL17", "WMT", "2025-03", 1.0, false], ["GEL34", "WMT", "2025-03", 1.0, false],
  ["CLN65", "TGT", "2025-09", 0.6, false],
  ["SPF30", "TGT", "2026-06", 0.5, false], ["SPF30", "TGT", "2026-07", 0.5, false],
];
for (const y of [2025, 2026]) for (const mm of ["05", "06", "07"]) DISPLAYS.push(["SPF30", "WMT", `${y}-${mm}`, 0.7, true]);

function hash(str) {
  let h = 2166136261;
  for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

const isHist = (m) => HIST.includes(m);

export function acvOf(sku, ret, m) {
  const s = skuById(sku);
  if (s.launch) {
    if (isHist(m) || m < s.launch) return 0;
    const i = FC.indexOf(m) - FC.indexOf(s.launch);
    return [40, 70, 85, 90][Math.min(i, 3)];
  }
  let v = ACV_BASE[ret] + ACV_SKU_ADJ[sku];
  for (const [k, r, from, val] of ACV_EVENTS) if (k === sku && r === ret && (from === null || m >= from)) v = val;
  return v;
}
export function basePriceOf(sku, ret, m) {
  const s = skuById(sku);
  let p = s.list * PRICE_IDX[ret];
  for (const [k, from, mult] of PRICE_EVENTS) if (k === sku && m >= from) p *= mult;
  return p;
}
const refPrice = (sku, ret) => skuById(sku).list * PRICE_IDX[ret];

export function promoOf(sku, ret, m) {
  if (isHist(m)) {
    const e = PROMOS.find(([k, r, mm]) => k === sku && r === ret && mm === m);
    return e ? { acv: e[3], depth: e[4] } : { acv: 0, depth: 0 };
  }
  const ly = shiftY(m, -1);
  const e = PROMOS.find(([k, r, mm, , , rec]) => k === sku && r === ret && mm === ly && rec);
  return e ? { acv: e[3], depth: e[4] } : { acv: 0, depth: 0 };
}
export function displayOf(sku, ret, m) {
  if (isHist(m)) {
    const e = DISPLAYS.find(([k, r, mm]) => k === sku && r === ret && mm === m);
    return e ? e[3] : 0;
  }
  const ly = shiftY(m, -1);
  const e = DISPLAYS.find(([k, r, mm, , rec]) => k === sku && r === ret && mm === ly && rec);
  return e ? e[3] : 0;
}
// What a plan made without context would have known: recurring programs only
function plannedOnly(sku, ret, m) {
  const p = PROMOS.find(([k, r, mm, , , rec]) => k === sku && r === ret && mm === m && rec);
  const d = DISPLAYS.find(([k, r, mm, , rec]) => k === sku && r === ret && mm === m && rec);
  return { promo: p ? { acv: p[3], depth: p[4] } : { acv: 0, depth: 0 }, disp: d ? d[3] : 0 };
}

export function driversOf(sku, ret, m) {
  const s = skuById(sku);
  const promo = promoOf(sku, ret, m);
  return {
    acv: acvOf(sku, ret, m),
    basePrice: basePriceOf(sku, ret, m),
    promoAcv: promo.acv,
    depth: promo.depth,
    dispAcv: displayOf(sku, ret, m),
    season: SEASON[s.cat][+m.slice(5) - 1],
    trend: Math.pow(1 + TREND[sku], monthIdx(m) / 12),
  };
}
const promoLift = (d) => 1 + ELAST.promoLift * d.depth * d.promoAcv;
const dispLift = (d) => 1 + ELAST.displayLift * d.dispAcv;

export function modelUnits(sku, ret, m, d = driversOf(sku, ret, m)) {
  if (!d.acv) return 0;
  const k = RET_BASE[ret] * SKU_SCALE[sku];
  return k * Math.pow(d.acv / 100, ELAST.distribution) * d.season * Math.pow(d.basePrice / refPrice(sku, ret), ELAST.price) * promoLift(d) * dispLift(d) * d.trend;
}

// ---- Simulated Nielsen rows ----
let NIELSEN = null;
export function buildNielsen() {
  const rows = [];
  for (const s of SKUS) for (const r of RETAILERS) for (const m of HIST) {
    if (s.launch) continue;
    const d = driversOf(s.id, r.id, m);
    const units = Math.round(modelUnits(s.id, r.id, m, d) * (1 + (hash(s.id + r.id + m) - 0.5) * 0.08));
    const avgPrice = d.basePrice * (1 - d.depth * d.promoAcv);
    const baseUnits = Math.round(units / (promoLift(d) * dispLift(d)));
    rows.push({
      period: m, retailer: r.id, upc: s.upc, sku: s.id, units, dollars: Math.round(units * avgPrice),
      acv: +d.acv.toFixed(1), tdp: +d.acv.toFixed(1), promoAcv: +(d.promoAcv * 100).toFixed(1), discount: +(d.depth * 100).toFixed(1),
      dispAcv: +(d.dispAcv * 100).toFixed(1), avgPrice: +avgPrice.toFixed(2), basePrice: +d.basePrice.toFixed(2),
      baseUnits, incrUnits: units - baseUnits,
    });
  }
  return rows;
}
export function setNielsen(rows) { NIELSEN = rows; INDEX = null; }
export function getNielsen() { if (!NIELSEN) NIELSEN = buildNielsen(); return NIELSEN; }
let INDEX = null;
export function nRow(sku, ret, m) {
  if (!INDEX) { INDEX = new Map(); for (const r of getNielsen()) INDEX.set(r.sku + r.retailer + r.period, r); }
  return INDEX.get(sku + ret + m);
}
export const actual = (sku, ret, m) => nRow(sku, ret, m)?.units || 0;
// Drivers as observed in the data (history) or planned (forecast)
export function obsDrivers(sku, ret, m) {
  const r = nRow(sku, ret, m);
  if (!r) return driversOf(sku, ret, m);
  const d = driversOf(sku, ret, m);
  return { ...d, acv: r.acv, basePrice: r.basePrice, promoAcv: r.promoAcv / 100, depth: r.discount / 100, dispAcv: r.dispAcv / 100 };
}

// ---- Forecast ----
export const affects = (a, sku, ret, m) => a.skus.includes(sku) && a.retailers.includes(ret) && a.months.includes(m);
export function baselineFc(sku, ret, m) { return modelUnits(sku, ret, m); }
export function forecastCell(sku, ret, m, act) {
  let v = baselineFc(sku, ret, m);
  for (const a of act) if (affects(a, sku, ret, m)) v *= 1 + a.impact / 100;
  return Math.max(0, v);
}
// Units for any month: actuals in history, forecast in the future
export function unitsAt(sku, ret, m, act) { return HIST.includes(m) ? actual(sku, ret, m) : forecastCell(sku, ret, m, act); }
export function sumUnits(skus, rets, months, act) {
  let t = 0;
  for (const s of skus) for (const r of rets) for (const m of months) t += unitsAt(s, r, m, act);
  return t;
}
export function sumDollars(skus, rets, months, act) {
  let t = 0;
  for (const s of skus) for (const r of rets) for (const m of months) {
    if (HIST.includes(m)) t += nRow(s, r, m)?.dollars || 0;
    else { const d = driversOf(s, r, m); t += forecastCell(s, r, m, act) * d.basePrice * (1 - d.depth * d.promoAcv); }
  }
  return t;
}

// ---- Accuracy backtest (last 12 months) ----
// "Without context": a forecast made three months ahead from history and the recurring
// trade calendar only, so it misses new distribution, price changes and one-time events.
// "With context": the same model when those events were known in advance.
export function backtest(skus, rets) {
  const months = HIST.slice(-12);
  let errNo = 0, errCtx = 0, tot = 0;
  for (const s of skus) for (const r of rets) for (const m of months) {
    const a = actual(s, r, m); if (!a) continue;
    const full = obsDrivers(s, r, m);
    const lag = obsDrivers(s, r, HIST[HIST.indexOf(m) - 3]);
    const p = plannedOnly(s, r, m);
    const noCtx = modelUnits(s, r, m, { ...full, acv: lag.acv, basePrice: lag.basePrice, promoAcv: p.promo.acv, depth: p.promo.depth, dispAcv: p.disp });
    const ctx = modelUnits(s, r, m, full);
    errNo += Math.abs(noCtx - a); errCtx += Math.abs(ctx - a); tot += a;
  }
  return { months, noContext: tot ? 1 - errNo / tot : 0, withContext: tot ? 1 - errCtx / tot : 0 };
}

// ---- Driver decomposition ----
// Compares period B with period A month by month (same calendar month), splits each
// cell's change across drivers in proportion to its log contribution, then sums.
export const DECOMP_ORDER = ["distribution", "price", "promotion", "display", "trend", "launch", "supply", "competition", "other"];
export const DECOMP_LABEL = { distribution: "Distribution (TDPs)", price: "Price", promotion: "Promotion", display: "Display", trend: "Base trend", launch: "New items", supply: "Supply", competition: "Competition", other: "Other" };
const ctxDriver = (drv) => ({ promotion: "promotion", price: "price", distribution: "distribution", display: "display", supply: "supply", launch: "launch", competition: "competition" }[drv] || "other");

export function decompose(skus, rets, monthsA, monthsB, act) {
  const total = Object.fromEntries(DECOMP_ORDER.map((k) => [k, 0]));
  const byCell = [];
  let A = 0, B = 0;
  monthsB.forEach((mb, i) => {
    const ma = monthsA[i];
    for (const s of skus) for (const r of rets) {
      const ua = unitsAt(s, r, ma, act), ub = unitsAt(s, r, mb, act);
      A += ua; B += ub;
      if (!ua && !ub) continue;
      const c = Object.fromEntries(DECOMP_ORDER.map((k) => [k, 0]));
      if (!ua) { c.launch = ub; }
      else if (!ub) {
        // a month with no volume at all (a launch slip, say) goes to the context driver that removed it
        const cause = act.find((a) => affects(a, s, r, mb) && a.impact <= -100);
        c[cause ? ctxDriver(cause.driver) : "other"] = -ua;
      } else {
        const da = obsDrivers(s, r, ma), db = obsDrivers(s, r, mb);
        const L = {};
        L.distribution = ELAST.distribution * Math.log(db.acv / da.acv);
        L.price = ELAST.price * Math.log(db.basePrice / da.basePrice);
        L.promotion = Math.log(promoLift(db) / promoLift(da));
        L.display = Math.log(dispLift(db) / dispLift(da));
        L.trend = Math.log(db.trend / da.trend);
        if (!HIST.includes(mb)) for (const a of act) if (affects(a, s, r, mb)) { const k = ctxDriver(a.driver); L[k] = (L[k] || 0) + Math.log(Math.max(1e-6, 1 + a.impact / 100)); }
        const tot = Math.log(ub / ua);
        let known = 0; for (const k in L) known += L[k];
        L.other = (L.other || 0) + (tot - known);
        const d = ub - ua;
        for (const k in L) c[k] += Math.abs(tot) > 1e-9 ? (d * L[k]) / tot : ua * L[k];
      }
      for (const k of DECOMP_ORDER) total[k] += c[k];
      byCell.push({ sku: s, ret: r, ma, mb, ...c });
    }
  });
  return { A, B, total, byCell };
}
// Which SKU x retailer moved a driver the most
export function topCells(dec, driver, n = 2) {
  const agg = new Map();
  for (const c of dec.byCell) { const k = c.sku + "|" + c.ret; agg.set(k, (agg.get(k) || 0) + c[driver]); }
  return [...agg.entries()].map(([k, v]) => ({ sku: k.split("|")[0], ret: k.split("|")[1], v })).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, n);
}
export function driverNote(driver, sku, ret) {
  if (driver === "distribution") { const e = ACV_EVENTS.find(([k, r, f, , n]) => k === sku && r === ret && f && n); return e ? e[4] : ""; }
  if (driver === "price") { const e = PRICE_EVENTS.find(([k]) => k === sku); return e ? `List price up ${Math.round((e[2] - 1) * 100)}% from ${mLabel(e[1])}` : ""; }
  return "";
}

// KPI block for a set of months (history only)
export function kpis(skus, rets, months) {
  let units = 0, dollars = 0, acvW = 0, promoW = 0, dispW = 0, wsum = 0, baseU = 0;
  for (const s of skus) for (const r of rets) for (const m of months) {
    const row = nRow(s, r, m); if (!row) continue;
    const w = RETAILERS.find((x) => x.id === r).weight;
    units += row.units; dollars += row.dollars; baseU += row.baseUnits;
    acvW += row.acv * w; promoW += row.promoAcv * w; dispW += row.dispAcv * w; wsum += w;
  }
  const n = wsum || 1;
  return { units, dollars, avgPrice: units ? dollars / units : 0, acv: acvW / n, promoAcv: promoW / n, dispAcv: dispW / n, incrShare: units ? 1 - baseU / units : 0, velocity: acvW ? units / (acvW / n) / months.length : 0 };
}
export { ALLM };
