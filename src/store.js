import { useSyncExternalStore } from "react";
import { seedState } from "./data/seed.js";
import { TODAY, FC, ALL_S, ALL_R, ROLES } from "./data/catalog.js";
import { forecastCell, sumUnits, setNielsen, buildNielsen } from "./engine/model.js";

const KEY = "texere-app-v3";
let S;
try { S = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { S = null; }
if (!S || S.v !== 3) S = seedState();
if (S.nielsenRows) setNielsen(S.nielsenRows);

const subs = new Set();
let version = 0;
export const getState = () => S;
export function update(fn) {
  fn(S);
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage may be blocked */ }
  version++;
  subs.forEach((f) => f());
}
export function resetAll() { S = seedState(); setNielsen(buildNielsen()); update(() => {}); }
export function useStore() {
  useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => version);
  return S;
}
export function rerender() { version++; subs.forEach((f) => f()); }

// ---- Assumption logic ----
export const assm = (id) => S.assumptions.find((a) => a.id === id);
export const capById = (id) => S.captures.find((c) => c.id === id);
export const key = (a) => a.decidedAt + "#" + String(a.seq).padStart(3, "0");
export const NOW = () => TODAY + "#999";
export const PLAN = "2026-09-28#999";

export function replacedBy(a) { return S.assumptions.find((b) => b.supersedes === a.id && b.status === "approved"); }
export function statusOf(a) {
  if (a.status === "approved" && replacedBy(a)) return "superseded";
  return a.status;
}
export function activeAt(at, pending = false) {
  const act = S.assumptions.filter((a) => {
    if (a.status === "approved") {
      if (key(a) > at) return false;
      const r = replacedBy(a);
      return !(r && key(r) <= at);
    }
    return pending && a.status === "pending";
  });
  if (pending) {
    const sup = new Set(act.filter((a) => a.status === "pending" && a.supersedes).map((a) => a.supersedes));
    return act.filter((a) => !sup.has(a.id));
  }
  return act;
}
// Units an assumption adds or removes, everything else held as it is now
export function unitImpact(a, act) {
  const without = act.filter((x) => x.id !== a.id && x.id !== a.supersedes);
  const withA = [...without, a];
  let d = 0;
  for (const s of a.skus) for (const r of a.retailers) for (const m of a.months) d += forecastCell(s, r, m, withA) - forecastCell(s, r, m, without);
  return d;
}
export function recent(days = 14) {
  const cutoff = new Date(TODAY); cutoff.setDate(cutoff.getDate() - days);
  const c = cutoff.toISOString().slice(0, 10);
  return S.assumptions
    .filter((a) => (a.status === "approved" ? a.decidedAt : a.createdAt) >= c && statusOf(a) !== "rejected")
    .sort((a, b) => ((b.decidedAt || b.createdAt) + String(b.seq || 0).padStart(3, "0")).localeCompare((a.decidedAt || a.createdAt) + String(a.seq || 0).padStart(3, "0")));
}
// Month-level events for the SKU timeline
export function cellEvents(skus, rets, m) {
  const ev = S.assumptions
    .filter((a) => a.status === "approved" && skus.some((s) => rets.some((r) => a.skus.includes(s) && a.retailers.includes(r) && a.months.includes(m))))
    .sort((x, y) => key(x).localeCompare(key(y)));
  let prev = sumUnits(skus, rets, [m], activeAt(PLAN));
  return ev.map((a) => { const to = sumUnits(skus, rets, [m], activeAt(key(a))); const e = { a, from: prev, to }; prev = to; return e; });
}
// Changes since the forecast was last published to supply
export function supplyRows() {
  const now = activeAt(NOW()), sync = activeAt(S.lastSync);
  const rows = [];
  for (const s of ALL_S) for (const m of FC) {
    const a = sumUnits([s], ALL_R, [m], now), b = sumUnits([s], ALL_R, [m], sync);
    if (Math.abs(a - b) < 1) continue;
    const reasons = S.assumptions.filter((x) => x.status === "approved" && key(x) > S.lastSync && x.skus.includes(s) && x.months.includes(m));
    const pct = b ? (a / b - 1) * 100 : 100;
    rows.push({ sku: s, m, now: a, sync: b, diff: a - b, pct, risk: pct >= 10 ? "Stock-out risk" : pct <= -10 ? "Excess inventory risk" : null, reasons, rets: [...new Set(reasons.flatMap((r) => r.retailers))], k: s + "|" + m });
  }
  return rows.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
}
export const openQuestionsFor = (role) => Object.entries(S.threads || {}).filter(([, t]) => t.status === "open" && t.waitingOn === ROLES[role].person).map(([id]) => id);
