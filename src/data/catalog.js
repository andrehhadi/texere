// Product hierarchy, retailers, competitors and the weekly calendar for the demo.
// Everything here is fictional: Lumen Beauty Co. and its brands do not exist.
export const TODAY = "2026-11-13";
export const COMPANY = "Lumen Beauty Co.";

// ---------- Calendar: 104 weeks of history (data through Sat Oct 31, 2026) + 52 forecast weeks
const DAY = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const LAST_HIST = Date.UTC(2026, 9, 31);
export const WEEKS = [];
for (let i = 0; i < 156; i++) {
  const t = LAST_HIST + (i - 103) * 7 * DAY;
  const end = iso(t);
  WEEKS.push({ i, end, month: end.slice(0, 7), hist: i <= 103 });
}
export const NH = 104; // number of history weeks
export const HISTW = WEEKS.slice(0, NH).map((w) => w.i);
export const FCW = WEEKS.slice(NH).map((w) => w.i);
export const weekEnd = (i) => WEEKS[i].end;
export const monthOfWeek = (i) => WEEKS[i].month;
export const FC_MONTHS = [...new Set(FCW.map(monthOfWeek))];
export const HIST_MONTHS = [...new Set(HISTW.map(monthOfWeek))];
export const ALL_MONTHS = [...HIST_MONTHS, ...FC_MONTHS];
export const weeksInMonth = (m) => WEEKS.filter((w) => w.month === m).map((w) => w.i);
export const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const mLabel = (m) => MN[+m.slice(5) - 1] + " ’" + m.slice(2, 4);
export const mShort = (m) => MN[+m.slice(5) - 1];
export const wLabel = (i) => { const e = WEEKS[i].end; return MN[+e.slice(5, 7) - 1] + " " + +e.slice(8); };
export const shiftYM = (m, d) => +m.slice(0, 4) + d + m.slice(4);
export const fcRange = (a, b) => FC_MONTHS.slice(FC_MONTHS.indexOf(a), FC_MONTHS.indexOf(b) + 1);

// ---------- Hierarchy
export const CATEGORIES = ["Facial skincare", "Sun care"];
export const BRANDS = ["Lumen", "Lumen Derm"];
export const SUBBRANDS = ["Hydra", "Clear", "Renew", "Shield", "Barrier"];
export const SEGMENTS = ["Moisturizers", "Cleansers", "Serums", "Sun protection"];
export const SKUS = [
  { id: "GEL17", code: "LM-HYD-GEL17", upc: "081234500173", name: "Hydra Daily Gel Moisturizer 1.7 oz", short: "Hydra Gel 1.7 oz", category: "Facial skincare", brand: "Lumen", subbrand: "Hydra", platform: "Daily Gel", segment: "Moisturizers", season: "moist", scale: 1.0, trend: 0.05, list: 12.99, aliases: "small gel, 1.7 oz gel, gel moisturizer, Hydra gel" },
  { id: "GEL34", code: "LM-HYD-GEL34", upc: "081234500340", name: "Hydra Daily Gel Moisturizer 3.4 oz", short: "Hydra Gel 3.4 oz", category: "Facial skincare", brand: "Lumen", subbrand: "Hydra", platform: "Daily Gel", segment: "Moisturizers", season: "moist", scale: 0.6, trend: 0.03, list: 19.99, aliases: "large gel, 3.4 oz gel, big gel" },
  { id: "CRM17", code: "LM-HYD-CRM17", upc: "081234500177", name: "Hydra Rich Cream 1.7 oz", short: "Hydra Rich Cream", category: "Facial skincare", brand: "Lumen", subbrand: "Hydra", platform: "Rich Cream", segment: "Moisturizers", season: "moist", scale: 0.45, trend: -0.02, list: 14.99, aliases: "rich cream, night cream, Hydra cream" },
  { id: "FOM65", code: "LM-CLR-FOM65", upc: "081234500654", name: "Clear Foaming Cleanser 6.5 oz", short: "Clear Foaming Cleanser", category: "Facial skincare", brand: "Lumen", subbrand: "Clear", platform: "Foaming Cleanser", segment: "Cleansers", season: "clean", scale: 0.8, trend: 0.0, list: 9.49, aliases: "cleanser, face wash, foaming wash" },
  { id: "MIC13", code: "LM-CLR-MIC13", upc: "081234500135", name: "Clear Micellar Water 13.5 oz", short: "Clear Micellar Water", category: "Facial skincare", brand: "Lumen", subbrand: "Clear", platform: "Micellar Water", segment: "Cleansers", season: "clean", scale: 0.55, trend: 0.08, list: 8.99, aliases: "micellar, micellar water, makeup remover" },
  { id: "VTC10", code: "LM-RNW-VTC10", upc: "081234500104", name: "Renew Vitamin C Serum 1 oz", short: "Renew Vitamin C Serum", category: "Facial skincare", brand: "Lumen", subbrand: "Renew", platform: "Vitamin C Serum", segment: "Serums", season: "serum", scale: 0.3, trend: 0.12, list: 22.99, aliases: "vitamin C, vit C serum" },
  { id: "SER10", code: "LM-RNW-NGT10", upc: "081234500111", name: "Renew Night Repair Serum 1 oz", short: "Renew Night Serum", category: "Facial skincare", brand: "Lumen", subbrand: "Renew", platform: "Night Serum", segment: "Serums", season: "serum", scale: 0.35, trend: 0, list: 24.99, launch: "2027-02", aliases: "night serum, new serum, night repair (new launch)" },
  { id: "SPF30", code: "LM-SHD-SPF30", upc: "081234500302", name: "Shield Daily SPF 30 Lotion 3 oz", short: "Shield SPF 30", category: "Sun care", brand: "Lumen", subbrand: "Shield", platform: "Daily SPF", segment: "Sun protection", season: "spf", scale: 0.7, trend: 0.02, list: 14.49, aliases: "SPF 30, sunscreen, daily SPF, sun care" },
  { id: "SPF50", code: "LM-SHD-SPF50", upc: "081234500500", name: "Shield Sport SPF 50 Lotion 5 oz", short: "Shield Sport SPF 50", category: "Sun care", brand: "Lumen", subbrand: "Shield", platform: "Sport SPF", segment: "Sun protection", season: "spf2", scale: 0.5, trend: 0.04, list: 13.49, aliases: "SPF 50, sport sunscreen" },
  { id: "BAR17", code: "LD-BAR-CRM17", upc: "081234600172", name: "Lumen Derm Barrier Repair Cream 1.7 oz", short: "Derm Barrier Cream", category: "Facial skincare", brand: "Lumen Derm", subbrand: "Barrier", platform: "Barrier Cream", segment: "Moisturizers", season: "moist", scale: 0.4, trend: 0.1, list: 16.99, aliases: "barrier cream, Derm cream, repair cream" },
  { id: "DCL80", code: "LD-BAR-CLN80", upc: "081234600806", name: "Lumen Derm Gentle Cleanser 8 oz", short: "Derm Gentle Cleanser", category: "Facial skincare", brand: "Lumen Derm", subbrand: "Barrier", platform: "Gentle Cleanser", segment: "Cleansers", season: "clean", scale: 0.35, trend: 0.06, list: 11.99, aliases: "gentle cleanser, Derm cleanser" },
];
export const PLATFORMS = [...new Set(SKUS.map((s) => s.platform))];
export const RETAILERS = [
  { id: "WMT", name: "Walmart", short: "WMT", base: 9200, priceIdx: 0.92, acv: 96, weight: 0.42 },
  { id: "TGT", name: "Target", short: "TGT", base: 4200, priceIdx: 1.0, acv: 90, weight: 0.22 },
  { id: "CVS", name: "CVS", short: "CVS", base: 2800, priceIdx: 1.08, acv: 82, weight: 0.2 },
  { id: "WAG", name: "Walgreens", short: "WAG", base: 2100, priceIdx: 1.08, acv: 76, weight: 0.16 },
];
export const COMPETITORS = [
  { id: "CLW", name: "Clearwell", color: "#0E9384", segments: { Moisturizers: 0.75, Cleansers: 0.35 } },
  { id: "BRM", name: "Bramble Labs", color: "#C2410C", segments: { Moisturizers: 0.5, Serums: 0.9 } },
  { id: "NOV", name: "Novaré", color: "#7C3AED", segments: { "Sun protection": 0.6 } },
  { id: "DMV", name: "Dermova", color: "#0369A1", segments: { Cleansers: 0.8, Moisturizers: 0.3 } },
  { id: "PL", name: "Retailer brands", color: "#6B7280", segments: { Moisturizers: 0.55, Cleansers: 0.7, Serums: 0.25, "Sun protection": 0.65 } },
];
export const ALL_S = SKUS.map((s) => s.id);
export const ALL_R = RETAILERS.map((r) => r.id);
export const skuById = (id) => SKUS.find((s) => s.id === id);
export const retById = (id) => RETAILERS.find((r) => r.id === id);
export const compById = (id) => COMPETITORS.find((c) => c.id === id);

export const DRIVERS = { promotion: "Promotion", price: "Price", distribution: "Distribution", display: "Display", supply: "Supply", launch: "Launch", competition: "Competition", other: "Other" };
export const DRIVER_COLOR = { promotion: "#3D44E8", price: "#B45309", distribution: "#0E8F6E", display: "#7C3AED", supply: "#D0442F", launch: "#0369A1", competition: "#BE185D", other: "#6B7280" };
export const CONF = { mentioned: "Mentioned", likely: "Likely", confirmed: "Confirmed" };
export const TEAMS = ["Customer strategy", "Finance", "Innovation", "Supply planning", "Sales", "Brand", "Market signal"];
export const KINDS = { call: "Call transcript", slack: "Slack message", email: "Email", doc: "Document", web: "Web signal" };
export const PEOPLE = {
  "Lena Park": { role: "Brand manager", initials: "LP", color: "#3D44E8" },
  "Dana Ortiz": { role: "Customer strategy", initials: "DO", color: "#0E8F6E" },
  "Marcus Lee": { role: "Finance", initials: "ML", color: "#B45309" },
  "Ken Watanabe": { role: "Supply planning", initials: "KW", color: "#D0442F" },
  "Sofia Ramos": { role: "Innovation", initials: "SR", color: "#7C3AED" },
  "Jordan Kim": { role: "Sales", initials: "JK", color: "#0369A1" },
  "Ravi Shah": { role: "Demand planning", initials: "RS", color: "#BE185D" },
  "Carla Mendes": { role: "VP Marketing", initials: "CM", color: "#374151" },
  "Texere": { role: "Assistant", initials: "Tx", color: "#2A2FB8" },
  "Texere monitor": { role: "Market signal", initials: "Tx", color: "#2A2FB8" },
};
export const ROLES = {
  bm: { name: "Brand manager", person: "Lena Park", home: "home" },
  cs: { name: "Customer strategy", person: "Dana Ortiz", home: "inbox" },
  dp: { name: "Demand planner", person: "Ravi Shah", home: "forecast" },
  sp: { name: "Supply planner", person: "Ken Watanabe", home: "supply" },
  lead: { name: "VP Marketing", person: "Carla Mendes", home: "performance" },
};

// Which SKUs match the global filters
export function skusFor(f = {}) {
  return SKUS.filter((s) =>
    (!f.category || f.category === "ALL" || s.category === f.category) &&
    (!f.brand || f.brand === "ALL" || s.brand === f.brand) &&
    (!f.subbrand || f.subbrand === "ALL" || s.subbrand === f.subbrand) &&
    (!f.platform || f.platform === "ALL" || s.platform === f.platform) &&
    (!f.sku || f.sku === "ALL" || s.id === f.sku)
  ).map((s) => s.id);
}
export const retsFor = (f = {}) => (!f.retailer || f.retailer === "ALL" ? ALL_R : [f.retailer]);
export function scopeLabel(f = {}) {
  const parts = [];
  if (f.sku && f.sku !== "ALL") parts.push(skuById(f.sku).short);
  else if (f.platform && f.platform !== "ALL") parts.push(f.platform);
  else if (f.subbrand && f.subbrand !== "ALL") parts.push(f.subbrand);
  else if (f.brand && f.brand !== "ALL") parts.push(f.brand);
  else if (f.category && f.category !== "ALL") parts.push(f.category);
  else parts.push("All Lumen Beauty");
  parts.push(f.retailer && f.retailer !== "ALL" ? retById(f.retailer).name : "Total US (4 retailers)");
  return parts.join(" · ");
}
