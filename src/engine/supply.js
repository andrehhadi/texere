// Supply view: what supply planning cares about. Published demand (what the production plan was
// built on), current demand, the change, and a projected inventory position per SKU by week.
import { FCW, NH, ALL_R, SKUS, monthOfWeek } from "../data/catalog.js";
import { units } from "./analytics.js";
import { getState, activeAt, NOW, key } from "../store.js";

export const HORIZON = 26;
export const zoneOf = (n) => (n < 4 ? "Frozen" : n < 13 ? "Slushy" : "Liquid");

export function supplyPlan(sku) {
  const S = getState();
  const inv = S.inventory[sku];
  const now = activeAt(NOW()), pub = activeAt(S.lastSync);
  const weeks = FCW.slice(0, HORIZON);
  let oh = inv.onHand;
  const rows = weeks.map((i, n) => {
    const published = units([sku], ALL_R, [i], pub), current = units([sku], ALL_R, [i], now);
    // Production plan was built on published demand. It replenishes to keep safety stock against published demand.
    const inbound = n === 0 ? published : published;
    oh = oh + inbound - current;
    return { i, n, zone: zoneOf(n), published, current, delta: current - published, inbound, onHand: oh };
  });
  // Weeks of supply = on hand / average current demand of the following 4 weeks
  rows.forEach((r, n) => {
    const next = rows.slice(n + 1, n + 5); const avg = next.length ? next.reduce((a, x) => a + x.current, 0) / next.length : r.current;
    r.wos = avg ? r.onHand / avg : 99;
    r.safety = inv.safetyWks * avg;
    r.status = r.onHand < 0 ? "stockout" : r.onHand < r.safety ? "below" : r.wos > 14 ? "excess" : "ok";
  });
  const firstRisk = rows.find((r) => r.status === "stockout" || r.status === "below");
  const excess = rows.find((r) => r.status === "excess");
  const reasons = S.assumptions.filter((a) => a.status === "approved" && key(a) > S.lastSync && a.skus.includes(sku));
  const dFrozen = rows.slice(0, 4).reduce((a, r) => a + r.delta, 0);
  const d13 = rows.slice(0, 13).reduce((a, r) => a + r.delta, 0);
  const d26 = rows.reduce((a, r) => a + r.delta, 0);
  const pub13 = rows.slice(0, 13).reduce((a, r) => a + r.published, 0);
  return { sku, inv, rows, firstRisk, excess, reasons, dFrozen, d13, d26, pub13, pct13: pub13 ? d13 / pub13 : 0, wosNow: rows[0].wos,
    status: rows.some((r) => r.status === "stockout") ? "Stock-out risk" : firstRisk ? "Below safety stock" : excess ? "Excess risk" : Math.abs(d13) > 1 ? "Changed" : "No change" };
}
export function allSupply() { return SKUS.map((s) => supplyPlan(s.id)); }
export { monthOfWeek, NH };
