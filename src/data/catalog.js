// Reference data for the demo brand. Everything here is fictional.
export const TODAY = "2026-11-13";
export const BRAND = "Lumen Skincare";

const ym = (y, m) => `${y}-${String(m).padStart(2, "0")}`;
function monthsFrom(y, m, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const mm = ((m - 1 + i) % 12) + 1;
    const yy = y + Math.floor((m - 1 + i) / 12);
    out.push(ym(yy, mm));
  }
  return out;
}
// 24 months of retail history (data through Oct 2026) and 12 forecast months
export const HIST = monthsFrom(2024, 11, 24);
export const FC = monthsFrom(2026, 11, 12);
export const LY12 = HIST.slice(12); // Nov 2025 - Oct 2026
export const PY12 = HIST.slice(0, 12); // Nov 2024 - Oct 2025
export const ALLM = [...HIST, ...FC];

export const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const mLabel = (m) => MN[+m.slice(5) - 1] + " ’" + m.slice(2, 4);
export const mShort = (m) => MN[+m.slice(5) - 1];
export const shiftY = (m, d) => +m.slice(0, 4) + d + m.slice(4);
export const monthIdx = (m) => ALLM.indexOf(m);

export const SKUS = [
  { id: "GEL17", upc: "0-81234-50017-3", code: "LM-GEL-17", name: "Daily Gel Moisturizer 1.7 oz", short: "Gel moisturizer 1.7 oz", cat: "moist", list: 12.99, aliases: "small gel, 1.7 oz gel, gel moisturizer" },
  { id: "GEL34", upc: "0-81234-50034-0", code: "LM-GEL-34", name: "Daily Gel Moisturizer 3.4 oz", short: "Gel moisturizer 3.4 oz", cat: "moist", list: 19.99, aliases: "large gel, 3.4 oz gel, big gel" },
  { id: "CLN65", upc: "0-81234-50065-4", code: "LM-CLN-65", name: "Foaming Cleanser 6.5 oz", short: "Foaming cleanser", cat: "clean", list: 9.49, aliases: "cleanser, face wash, foaming wash" },
  { id: "SPF30", upc: "0-81234-50030-2", code: "LM-SPF-30", name: "Daily SPF 30 Lotion 3 oz", short: "SPF 30 lotion", cat: "spf", list: 14.49, aliases: "sunscreen, SPF, sun care, SPF lotion" },
  { id: "SER10", upc: "0-81234-50010-4", code: "LM-SER-10", name: "Night Repair Serum 1 oz", short: "Night repair serum", cat: "serum", list: 24.99, launch: "2027-02", aliases: "serum, new serum, night serum (new launch)" },
];
export const RETAILERS = [
  { id: "WMT", name: "Walmart", weight: 0.42 },
  { id: "TGT", name: "Target", weight: 0.22 },
  { id: "CVS", name: "CVS", weight: 0.2 },
  { id: "WAG", name: "Walgreens", weight: 0.16 },
];
export const ALL_S = SKUS.map((s) => s.id);
export const ALL_R = RETAILERS.map((r) => r.id);
export const skuById = (id) => SKUS.find((s) => s.id === id);
export const retById = (id) => RETAILERS.find((r) => r.id === id);
export const skuList = (id) => (id === "ALL" ? ALL_S : [id]);
export const retList = (id) => (id === "ALL" ? ALL_R : [id]);

export const DRIVERS = {
  promotion: "Promotion",
  price: "Price",
  distribution: "Distribution",
  display: "Display",
  supply: "Supply",
  launch: "Launch",
  competition: "Competition",
  other: "Other",
};
export const CONF = { mentioned: "Mentioned", likely: "Likely", confirmed: "Confirmed" };
export const TEAMS = ["Customer strategy", "Finance", "Innovation", "Supply planning", "Sales", "Brand", "Market signal"];
export const KINDS = { call: "Call transcript", slack: "Slack or Teams message", email: "Email", doc: "Document", web: "Web signal" };
export const ROLES = {
  bm: { name: "Brand manager", person: "Lena Park", home: "today" },
  cs: { name: "Customer strategy", person: "Dana Ortiz", home: "capture" },
  dp: { name: "Demand planner", person: "Ravi Shah", home: "forecast" },
  sp: { name: "Supply planner", person: "Ken Watanabe", home: "supply" },
  lead: { name: "Marketing leadership", person: "Carla Mendes", home: "shareouts" },
};

export const range = (arr, a, b) => arr.slice(arr.indexOf(a), arr.indexOf(b) + 1);
export const fcRange = (a, b) => range(FC, a, b);
