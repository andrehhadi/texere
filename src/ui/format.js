import { MN, mLabel, skuById, retById, SKUS, RETAILERS } from "../data/catalog.js";

export const fU = (n) => Math.round(n).toLocaleString("en-US");
export function fK(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (a >= 1e5) return (n / 1e3).toFixed(0) + "k";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return Math.round(n).toString();
}
export const fMoney = (n) => { const a = Math.abs(n); return (n < 0 ? "−$" : "$") + (a >= 1e6 ? (a / 1e6).toFixed(2) + "M" : a >= 1e3 ? (a / 1e3).toFixed(0) + "k" : a.toFixed(2)); };
export const sg = (n, f = fK) => (n > 0.5 ? "+" : n < -0.5 ? "−" : "±") + f(Math.abs(n));
export const sp = (n, d) => { if (!isFinite(n)) return "n/a"; const v = Math.abs(n); const dd = d ?? (v < 10 ? 1 : 0); return (n > 0.05 ? "+" : n < -0.05 ? "−" : "±") + v.toFixed(dd) + "%"; };
export const pts = (n) => (n > 0.05 ? "+" : n < -0.05 ? "−" : "±") + Math.abs(n).toFixed(1) + " pts";
export const tone = (n, eps = 0.05) => (n > eps ? "up" : n < -eps ? "dn" : "flat");
export const fDate = (d) => { const [, m, dd] = d.slice(0, 10).split("-"); return MN[+m - 1] + " " + +dd; };
export const fDateTime = (d) => fDate(d) + (d.length > 10 ? " · " + d.slice(11, 16) : "");
export function relDay(d, today = "2026-11-13") {
  const n = Math.round((Date.parse(today) - Date.parse(d.slice(0, 10))) / 864e5);
  return n <= 0 ? "Today" : n === 1 ? "Yesterday" : n < 7 ? n + " days ago" : fDate(d);
}
export function mRange(ms) {
  if (!ms?.length) return "";
  const s = [...ms].sort();
  return s.length === 1 ? mLabel(s[0]) : mLabel(s[0]) + " – " + mLabel(s[s.length - 1]);
}
export const skuNames = (ids) => (ids.length === SKUS.length ? "All SKUs" : ids.map((i) => skuById(i)?.short || i).join(", "));
export const retNames = (ids) => (ids.length === RETAILERS.length ? "All retailers" : ids.map((i) => retById(i)?.name || i).join(", "));
const PROPER = /^(Walmart|Target|CVS|Walgreens|Clearwell|Bramble|Novaré|Dermova|SPF|Lumen|Hydra|Clear|Renew|Shield|Derm|Night Repair|Paid)(?=[\s,.:]|$)/;
export const lcFirst = (s) => (PROPER.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
export const plural = (n, w, p = w + "s") => `${n} ${n === 1 ? w : p}`;
