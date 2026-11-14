import { MN, mLabel, skuById, retById, SKUS, RETAILERS } from "../data/catalog.js";

export const fU = (n) => Math.round(n).toLocaleString("en-US");
export function fK(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (a >= 1e5) return (n / 1e3).toFixed(0) + "k";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return Math.round(n).toString();
}
export const fMoney = (n) => { const a = Math.abs(n); return "$" + (a >= 1e6 ? (n / 1e6).toFixed(2) + "M" : a >= 1e3 ? (n / 1e3).toFixed(0) + "k" : n.toFixed(2)); };
export const sg = (n, f = fK) => (n > 0.5 ? "+" : n < -0.5 ? "−" : "±") + f(Math.abs(n));
export const sp = (n, d) => { const v = Math.abs(n); const dd = d ?? (v < 10 && v % 1 ? 1 : 0); return (n > 0.05 ? "+" : n < -0.05 ? "−" : "±") + v.toFixed(dd) + "%"; };
export const pts = (n) => (n > 0.05 ? "+" : n < -0.05 ? "−" : "±") + Math.abs(n).toFixed(1) + " pts";
export const dcls = (n) => (n > 0.5 ? "delta-up" : n < -0.5 ? "delta-dn" : "muted");
export const fDate = (d) => { const [, m, dd] = d.split("-"); return MN[+m - 1] + " " + +dd; };
export function mRange(ms) {
  if (!ms?.length) return "";
  const s = [...ms].sort();
  return s.length === 1 ? mLabel(s[0]) : mLabel(s[0]) + " to " + mLabel(s[s.length - 1]);
}
export const skuNames = (ids) => (ids.length === SKUS.length ? "All SKUs" : ids.map((i) => skuById(i)?.short || i).join(", "));
export const retNames = (ids) => (ids.length === RETAILERS.length ? "All retailers" : ids.map((i) => retById(i)?.name || i).join(", "));
const PROPER = /^(Walmart|Target|CVS|Walgreens|Clearwell|Bramble|SPF|Lumen|Night Repair)\b/;
export const lcFirst = (s) => (PROPER.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
