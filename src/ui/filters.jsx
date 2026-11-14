import React from "react";
import { useStore, update } from "../store.js";
import { CATEGORIES, BRANDS, SUBBRANDS, SKUS, RETAILERS, skusFor, scopeLabel } from "../data/catalog.js";
import { PERIODS, COMPS, ppName, weekRangeLabel } from "../engine/analytics.js";
import { Select, Seg } from "./kit.jsx";
import { Icon } from "./icons.jsx";

const ALL = "ALL";
// Each level narrows the options of the next, like a NielsenIQ product hierarchy.
export function FilterBar({ period = false, fcPeriods = false, noRetailer = false, extra }) {
  const S = useStore(); const f = S.filter;
  const set = (k, v) => update((s) => {
    s.filter[k] = v;
    const order = ["category", "brand", "subbrand", "platform", "sku"];
    for (const kk of order.slice(order.indexOf(k) + 1)) {
      const ok = SKUS.filter((x) => (s.filter.category === ALL || x.category === s.filter.category) && (s.filter.brand === ALL || x.brand === s.filter.brand) && (s.filter.subbrand === ALL || x.subbrand === s.filter.subbrand) && (s.filter.platform === ALL || x.platform === s.filter.platform));
      const field = kk === "sku" ? "id" : kk;
      if (s.filter[kk] !== ALL && !ok.some((x) => x[field] === s.filter[kk])) s.filter[kk] = ALL;
    }
  });
  const pool = (upto) => SKUS.filter((x) => (upto <= 0 || f.category === ALL || x.category === f.category) && (upto <= 1 || f.brand === ALL || x.brand === f.brand) && (upto <= 2 || f.subbrand === ALL || x.subbrand === f.subbrand) && (upto <= 3 || f.platform === ALL || x.platform === f.platform));
  const uniq = (arr) => [...new Set(arr)];
  const any = Object.values(f).some((v) => v !== ALL);
  const pkeys = Object.keys(PERIODS).filter((k) => (fcPeriods ? true : !k.startsWith("N")));
  return (
    <div className="fbar" role="group" aria-label="Filters">
      <Icon name="filter" size={15} style={{ color: "var(--muted)", marginLeft: 4 }} />
      <Select label="Category" value={f.category} onChange={(v) => set("category", v)} options={[[ALL, "All"], ...CATEGORIES.map((c) => [c, c])]} />
      <Select label="Brand" value={f.brand} onChange={(v) => set("brand", v)} options={[[ALL, "All"], ...uniq(pool(1).map((x) => x.brand)).map((c) => [c, c])]} />
      <Select label="Sub-brand" value={f.subbrand} onChange={(v) => set("subbrand", v)} options={[[ALL, "All"], ...uniq(pool(2).map((x) => x.subbrand)).map((c) => [c, c])]} />
      <Select label="Platform" value={f.platform} onChange={(v) => set("platform", v)} options={[[ALL, "All"], ...uniq(pool(3).map((x) => x.platform)).map((c) => [c, c])]} />
      <Select label="SKU" value={f.sku} wide onChange={(v) => set("sku", v)} options={[[ALL, "All"], ...pool(4).map((x) => [x.id, x.short])]} />
      {!noRetailer && <><span className="sep" /><Select label="Retailer" value={f.retailer} onChange={(v) => set("retailer", v)} options={[[ALL, "Total US"], ...RETAILERS.map((r) => [r.id, r.name])]} /></>}
      {any && <button className="clear" type="button" onClick={() => update((s) => { for (const k in s.filter) s.filter[k] = ALL; })}>Clear</button>}
      {period && <>
        <span className="sep" />
        <Seg label="Period" size="sm" value={S.period} onChange={(v) => update((s) => { s.period = v; })} options={pkeys.map((k) => [k, PERIODS[k].short, PERIODS[k].label + " · " + weekRangeLabel(PERIODS[k].weeks)])} />
        <Seg label="Compare" size="sm" value={S.comp} onChange={(v) => update((s) => { s.comp = v; })} options={[["YA", "YoY"], ["PP", ppName(S.period) === "YoY" ? "PoP" : ppName(S.period).replace("vs prior ", "vs P").replace(" weeks", "W").replace("vs last 13W", "vs L13W")]]} />
      </>}
      {extra}
      <span className="scope">{skusFor(f).length} SKUs · {scopeLabel(f)}</span>
    </div>
  );
}
export function useScope() {
  const S = useStore();
  const f = S.filter;
  const skus = skusFor(f), rets = f.retailer === ALL ? RETAILERS.map((r) => r.id) : [f.retailer];
  return { S, f, skus, rets, label: scopeLabel(f) };
}
