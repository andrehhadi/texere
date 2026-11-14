// Simulated NielsenIQ-style weekly retail data for Lumen Beauty and its competitors.
// Units = velocity x distribution^0.9 x seasonality x price effect x promotion x feature x display x trend x competition.
// History is the model plus noise, so driver decomposition and the forecast share one set of elasticities.
import { WEEKS, NH, SKUS, RETAILERS, COMPETITORS, SEGMENTS, skuById, retById } from "../data/catalog.js";

export const ELAST = { distribution: 0.9, price: -1.4, promo: 1.6, feature: 0.25, display: 0.45 };
const SEASON = {
  moist: [1.15, 1.1, 1.05, 0.95, 0.9, 0.85, 0.85, 0.9, 0.95, 1.0, 1.1, 1.2],
  clean: [1.0, 0.98, 1.0, 1.0, 1.02, 1.0, 1.0, 1.05, 1.02, 0.98, 0.97, 1.0],
  serum: [1.05, 1.0, 1.0, 0.98, 0.97, 0.95, 0.95, 0.97, 1.0, 1.02, 1.05, 1.1],
  spf: [0.6, 0.65, 0.85, 1.1, 1.35, 1.5, 1.5, 1.3, 0.95, 0.7, 0.6, 0.6],
  spf2: [0.45, 0.5, 0.75, 1.1, 1.45, 1.75, 1.75, 1.4, 0.9, 0.6, 0.45, 0.45],
};
const SEG_SEASON = { Moisturizers: "moist", Cleansers: "clean", Serums: "serum", "Sun protection": "spf" };
const ACV_ADJ = { GEL17: 0, GEL34: -6, CRM17: -10, FOM65: -2, MIC13: -14, VTC10: -18, SER10: 0, SPF30: -4, SPF50: -8, BAR17: -12, DCL80: -16 };

// Distribution changes: sku, retailer, from date, %ACV, note
export const ACV_EVENTS = [
  ["GEL17", "TGT", null, 84, ""], ["GEL17", "TGT", "2026-03-07", 93, "Target added the 1.7 oz gel to the full skincare set"],
  ["GEL34", "CVS", "2025-09-06", 64, "CVS dropped the 3.4 oz gel from smaller stores"],
  ["FOM65", "WAG", "2026-06-06", 62, "Walgreens cut the foaming cleanser from about 18% of stores"],
  ["SPF30", "WMT", null, 88, ""], ["SPF30", "WMT", "2026-02-07", 98, "Walmart expanded Shield SPF 30 to the full sun care set"],
  ["BAR17", "WMT", null, 0, ""], ["BAR17", "WMT", "2025-08-02", 85, "Walmart launched Derm Barrier Cream"],
  ["VTC10", "TGT", null, 66, ""], ["VTC10", "TGT", "2026-01-03", 86, "Target expanded the Vitamin C serum"],
  ["MIC13", "CVS", null, 58, ""], ["MIC13", "CVS", "2025-11-01", 78, "CVS added micellar water to the cleansing set"],
];
// List price changes: sku, from date, multiplier, note
export const PRICE_EVENTS = [
  ["GEL17", "2026-03-01", 1.05, "List price up 5%"], ["GEL34", "2026-03-01", 1.05, "List price up 5%"],
  ["CRM17", "2026-01-01", 1.06, "List price up 6%"], ["SPF30", "2025-04-01", 1.04, "List price up 4%"],
  ["VTC10", "2026-05-02", 0.95, "List price down 5%"],
];
// Promotions: sku, retailer, start, weeks, share of stores, discount, feature share, recurring
export const PROMOS = [];
const P = (s, r, d, w, a, dp, f, rec) => PROMOS.push({ sku: s, ret: r, start: d, wks: w, acv: a, depth: dp, feat: f, rec });
for (const y of [2025, 2026]) {
  P("GEL17", "WMT", `${y}-01-03`, 4, 0.9, 0.15, 0.3, true); P("GEL34", "WMT", `${y}-01-03`, 4, 0.9, 0.15, 0.3, true);
  P("GEL17", "WAG", `${y}-02-07`, 2, 1.0, 0.25, 0.5, true);
  P("SPF30", "CVS", `${y}-05-02`, 3, 1.0, 0.3, 0.6, false); P("FOM65", "CVS", `${y}-08-01`, 3, 1.0, 0.2, 0.4, false);
  P("SPF50", "WMT", `${y}-06-06`, 2, 0.8, 0.15, 0.2, true); P("MIC13", "WAG", `${y}-03-07`, 2, 1.0, 0.2, 0.4, true);
  P("DCL80", "CVS", `${y}-10-03`, 2, 0.9, 0.2, 0.3, true); P("CRM17", "TGT", `${y}-11-07`, 2, 1.0, 0.15, 0.3, true);
}
for (const d of ["2024-11-02", "2025-01-04", "2025-03-01", "2025-05-03", "2025-07-05", "2025-09-06", "2025-11-01", "2026-01-03", "2026-03-07", "2026-05-02", "2026-07-04", "2026-09-05"]) P("GEL34", "CVS", d, 2, 0.8, 0.2, 0.3, true);
P("GEL17", "TGT", "2025-04-05", 2, 0.6, 0.15, 0.2, false); P("GEL17", "TGT", "2025-12-06", 4, 1.0, 0.2, 0.5, false); P("GEL17", "TGT", "2026-04-04", 2, 1.0, 0.15, 0.3, false);
P("FOM65", "WMT", "2025-04-05", 4, 0.9, 0.15, 0.3, false); P("SPF30", "TGT", "2025-06-07", 3, 0.8, 0.2, 0.3, false);
P("MIC13", "TGT", "2026-09-05", 3, 1.0, 0.2, 0.4, false); P("VTC10", "CVS", "2026-06-06", 2, 1.0, 0.25, 0.4, false);
// Displays: sku, retailer, start, weeks, share of stores, recurring
export const DISPLAYS = [];
const D = (s, r, d, w, a, rec) => DISPLAYS.push({ sku: s, ret: r, start: d, wks: w, acv: a, rec });
D("GEL17", "WMT", "2025-03-01", 4, 1.0, false); D("GEL34", "WMT", "2025-03-01", 4, 1.0, false);
D("FOM65", "TGT", "2025-09-06", 4, 0.6, false); D("BAR17", "WMT", "2025-08-02", 6, 0.8, false);
D("SPF30", "TGT", "2026-06-06", 8, 0.5, false); D("SPF50", "TGT", "2026-06-06", 8, 0.4, false);
for (const y of [2025, 2026]) { D("SPF30", "WMT", `${y}-05-02`, 13, 0.7, true); D("SPF50", "WMT", `${y}-05-02`, 13, 0.6, true); }
// Competitive pressure on our SKUs: sku list, retailer, from date, factor, competitor, note
export const COMP_EVENTS = [
  { skus: ["SPF30", "SPF50"], ret: "TGT", from: "2026-04-04", factor: 0.92, comp: "NOV", note: "Novaré launched sun care at Target" },
  { skus: ["VTC10"], ret: "CVS", from: "2025-10-04", factor: 0.94, comp: "BRM", note: "Bramble Labs launched a cheaper vitamin C serum at CVS" },
  { skus: ["FOM65", "DCL80"], ret: "WMT", from: "2026-07-04", factor: 0.95, comp: "DMV", note: "Dermova doubled its cleanser promotions at Walmart" },
];

function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
const DAY = 86400000;
const t = (d) => Date.parse(d + "T00:00:00Z");
const inRange = (wEnd, start, wks) => { const e = t(wEnd), s = t(start); return e >= s && e < s + wks * 7 * DAY; };
const shift364 = (d) => new Date(t(d) + 364 * DAY).toISOString().slice(0, 10);

export function acvOf(sku, ret, i) {
  const s = skuById(sku), wk = WEEKS[i];
  if (s.launch) {
    if (wk.month < s.launch) return 0;
    const first = WEEKS.findIndex((w) => w.month >= s.launch);
    const k = i - first;
    return [30, 55, 72, 84, 90][Math.min(k, 4)];
  }
  const end = i >= NH ? WEEKS[NH - 1].end : wk.end;
  let v = retById(ret).acv + ACV_ADJ[sku];
  for (const [k, r, from, val] of ACV_EVENTS) if (k === sku && r === ret && (from === null || end >= from)) v = val;
  return Math.max(0, Math.min(100, v));
}
export function basePriceOf(sku, ret, i) {
  const s = skuById(sku), end = i >= NH ? WEEKS[NH - 1].end : WEEKS[i].end;
  let p = s.list * retById(ret).priceIdx;
  for (const [k, from, mult] of PRICE_EVENTS) if (k === sku && end >= from) p *= mult;
  return p;
}
const refPrice = (sku, ret) => skuById(sku).list * retById(ret).priceIdx;
function promoAt(sku, ret, i) {
  const end = WEEKS[i].end, fc = i >= NH;
  const e = PROMOS.find((p) => p.sku === sku && p.ret === ret && (fc ? p.rec && inRange(end, shift364(p.start), p.wks) && p.start >= "2025-11-01" : inRange(end, p.start, p.wks)));
  return e ? { acv: e.acv, depth: e.depth, feat: e.feat } : { acv: 0, depth: 0, feat: 0 };
}
function dispAt(sku, ret, i) {
  const end = WEEKS[i].end, fc = i >= NH;
  const e = DISPLAYS.find((p) => p.sku === sku && p.ret === ret && (fc ? p.rec && inRange(end, shift364(p.start), p.wks) && p.start >= "2025-11-01" : inRange(end, p.start, p.wks)));
  return e ? e.acv : 0;
}
function compAt(sku, ret, i) {
  const end = i >= NH ? WEEKS[NH - 1].end : WEEKS[i].end;
  let f = 1; for (const c of COMP_EVENTS) if (c.skus.includes(sku) && c.ret === ret && end >= c.from) f *= c.factor;
  return f;
}
// Drivers for a SKU x retailer x week: observed in history, planned in the forecast
export function driversOf(sku, ret, i) {
  const s = skuById(sku), p = promoAt(sku, ret, i);
  return {
    acv: acvOf(sku, ret, i), basePrice: basePriceOf(sku, ret, i), promoAcv: p.acv, depth: p.depth, featAcv: p.feat,
    dispAcv: dispAt(sku, ret, i), season: SEASON[s.season][+WEEKS[i].month.slice(5) - 1], trend: Math.pow(1 + s.trend, i / 52), comp: compAt(sku, ret, i),
  };
}
export const lift = {
  promo: (d) => 1 + ELAST.promo * d.depth * d.promoAcv,
  feature: (d) => 1 + ELAST.feature * d.featAcv,
  display: (d) => 1 + ELAST.display * d.dispAcv,
};
export function modelUnits(sku, ret, i, d = driversOf(sku, ret, i)) {
  if (!d.acv) return 0;
  const k = retById(ret).base * skuById(sku).scale;
  return k * Math.pow(d.acv / 100, ELAST.distribution) * d.season * Math.pow(d.basePrice / refPrice(sku, ret), ELAST.price) * lift.promo(d) * lift.feature(d) * lift.display(d) * d.trend * d.comp;
}

// ---------- Our scanned history
let ROWS = null, IDX = null;
export function buildRows() {
  const rows = [];
  for (const s of SKUS) for (const r of RETAILERS) for (let i = 0; i < NH; i++) {
    const d = driversOf(s.id, r.id, i);
    if (!d.acv) continue;
    const units = Math.round(modelUnits(s.id, r.id, i, d) * (1 + (hash(s.id + r.id + i) - 0.5) * 0.1));
    const avgPrice = d.basePrice * (1 - d.depth * d.promoAcv);
    const baseUnits = Math.round(units / (lift.promo(d) * lift.feature(d) * lift.display(d)));
    rows.push({ week: WEEKS[i].end, i, retailer: r.id, upc: s.upc, sku: s.id, units, dollars: Math.round(units * avgPrice), acv: +d.acv.toFixed(1), promoAcv: +(d.promoAcv * 100).toFixed(1), discount: +(d.depth * 100).toFixed(1), featAcv: +(d.featAcv * 100).toFixed(1), dispAcv: +(d.dispAcv * 100).toFixed(1), avgPrice: +avgPrice.toFixed(2), basePrice: +d.basePrice.toFixed(2), baseUnits, incrUnits: units - baseUnits });
  }
  return rows;
}
export function getRows() { if (!ROWS) ROWS = buildRows(); return ROWS; }
export function setRows(rows) { ROWS = rows; IDX = null; }
export function row(sku, ret, i) {
  if (!IDX) { IDX = new Map(); for (const r of getRows()) IDX.set(r.sku + r.retailer + r.i, r); }
  return IDX.get(sku + ret + i);
}
export const actualUnits = (sku, ret, i) => row(sku, ret, i)?.units || 0;
export function obsDrivers(sku, ret, i) {
  const d = driversOf(sku, ret, i);
  const r = i < NH ? row(sku, ret, i) : null;
  if (!r) return d;
  return { ...d, acv: r.acv, basePrice: r.basePrice, promoAcv: r.promoAcv / 100, depth: r.discount / 100, featAcv: r.featAcv / 100, dispAcv: r.dispAcv / 100 };
}

// ---------- Competitors (history only), by segment and retailer
const COMP_PRICE = { CLW: 0.9, BRM: 1.12, NOV: 1.0, DMV: 0.95, PL: 0.68 };
const COMP_TREND = { CLW: 0.06, BRM: 0.04, NOV: 0.3, DMV: 0.02, PL: 0.05 };
const SEG_PRICE = { Moisturizers: 14, Cleansers: 9.5, Serums: 21, "Sun protection": 13.5 };
let COMP_CACHE = null;
function segBase(seg, ret) { return SKUS.filter((s) => s.segment === seg && !s.launch).reduce((a, s) => a + retById(ret).base * s.scale, 0); }
export function compRows() {
  if (COMP_CACHE) return COMP_CACHE;
  const out = [];
  for (const c of COMPETITORS) for (const [seg, ratio] of Object.entries(c.segments)) for (const r of RETAILERS) for (let i = 0; i < NH; i++) {
    const end = WEEKS[i].end;
    if (c.id === "NOV" && (r.id !== "TGT" || end < "2026-04-04")) continue;
    const season = SEASON[SEG_SEASON[seg]][+WEEKS[i].month.slice(5) - 1];
    const onPromo = hash(c.id + seg + r.id + Math.floor(i / 2)) < (c.id === "DMV" && r.id === "WMT" && end >= "2026-07-04" ? 0.55 : 0.22);
    const depth = onPromo ? 0.15 + hash(c.id + i) * 0.15 : 0;
    const acv = Math.min(98, (c.id === "PL" ? 95 : 70) + hash(c.id + seg + r.id) * 20);
    const units = segBase(seg, r.id) * ratio * season * Math.pow(1 + COMP_TREND[c.id], i / 52) * (1 + 1.4 * depth) * (1 + (hash(c.id + seg + r.id + i) - 0.5) * 0.12);
    const price = SEG_PRICE[seg] * COMP_PRICE[c.id] * r.priceIdx * (1 - depth);
    out.push({ comp: c.id, segment: seg, ret: r.id, i, units: Math.round(units), dollars: Math.round(units * price), price, promo: onPromo ? 1 : 0, acv });
  }
  COMP_CACHE = out;
  return out;
}
export { SEGMENTS };
