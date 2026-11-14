import React, { useRef, useState } from "react";
import { useStore, update } from "../store.js";
import { SKUS, RETAILERS, WEEKS, NH, skuById, retById } from "../data/catalog.js";
import { getRows, setRows, buildRows } from "../engine/sim.js";
import { saveFile } from "../ai.js";
import { Card, Kpi, Badge, Btn, Sim, toast } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { fU, fMoney, fDate } from "../ui/format.js";

const FIELDS = [
  ["week", "Week ending (YYYY-MM-DD)", "NielsenIQ retail weeks end on Saturday"],
  ["retailer", "Retailer (WMT, TGT, CVS, WAG)", "Account-level market"],
  ["upc", "UPC", "Mapped to your item master"],
  ["units", "Unit sales", "Scanned units sold to shoppers"],
  ["dollars", "Dollar sales", "Scanned dollars"],
  ["acv", "%ACV distribution", "Share of the retailer's all-commodity volume selling the item; summed across items it gives TDPs"],
  ["promoAcv", "%ACV any price reduction", "Stores (by volume) with a temporary price reduction"],
  ["discount", "Average discount %", "Depth of the price cut when on promotion"],
  ["featAcv", "%ACV feature", "Stores where the item was in the circular or digital feature"],
  ["dispAcv", "%ACV display", "Stores with the item on an endcap or secondary display"],
  ["avgPrice", "Average price paid", "Dollars divided by units"],
  ["basePrice", "Base (regular) price", "Shelf price without promotion"],
  ["baseUnits", "Base units", "Expected units with no promotion, feature or display"],
  ["incrUnits", "Incremental units", "Units driven by trade support"],
];
const COLS = FIELDS.map((f) => f[0]);
const toCsv = (rows) => [COLS.join(","), ...rows.map((r) => COLS.map((c) => r[c]).join(","))].join("\n");

export default function Data() {
  const S = useStore();
  const rows = getRows();
  const fileRef = useRef(null);
  const [err, setErr] = useState(null);
  const units = rows.reduce((t, r) => t + r.units, 0), dollars = rows.reduce((t, r) => t + r.dollars, 0);
  const last = rows.filter((r) => r.i === NH - 1);
  function onFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const lines = String(rd.result).trim().split(/\r?\n/);
        const head = lines[0].split(",").map((h) => h.trim());
        const need = ["week", "retailer", "upc", "units", "dollars", "acv", "promoAcv", "discount", "dispAcv", "basePrice"];
        const missing = need.filter((c) => !head.includes(c));
        if (missing.length) throw new Error("Missing columns: " + missing.join(", ") + ". Download the current data to see the format.");
        const upc = Object.fromEntries(SKUS.map((s) => [s.upc, s.id]));
        const wi = Object.fromEntries(WEEKS.slice(0, NH).map((w) => [w.end, w.i]));
        const out = [];
        for (const ln of lines.slice(1)) {
          const v = ln.split(","); const o = {}; head.forEach((h, i) => { o[h] = v[i]; });
          const sku = upc[o.upc]; const i = wi[o.week];
          if (!sku || !retById(o.retailer) || i == null) continue;
          const n = (k) => Number(o[k]) || 0; const u = n("units");
          out.push({ week: o.week, i, retailer: o.retailer, upc: o.upc, sku, units: u, dollars: n("dollars"), acv: n("acv"), promoAcv: n("promoAcv"), discount: n("discount"), featAcv: n("featAcv"), dispAcv: n("dispAcv"), avgPrice: u ? n("dollars") / u : n("basePrice"), basePrice: n("basePrice"), baseUnits: n("baseUnits") || u, incrUnits: n("incrUnits") });
        }
        if (!out.length) throw new Error("No rows matched your UPCs, retailers and the 104-week window ending Oct 31, 2026.");
        setRows(out);
        update((s) => { s.nielsenRows = out; s.nielsenSource = "upload"; s.nielsenFile = f.name; });
        setErr(null); toast(`Loaded ${fU(out.length)} rows from ${f.name}. Every report and the forecast now use it.`);
      } catch (ex) { setErr(ex.message); }
    };
    rd.readAsText(f); e.target.value = "";
  }
  function restore() { setRows(buildRows()); update((s) => { delete s.nielsenRows; s.nielsenSource = "simulated"; s.nielsenFile = null; }); toast("Back to the simulated NielsenIQ data."); }
  const steps = [
    ["NielsenIQ delivery", "Weekly RMS extract by retailer and UPC, picked up from NIQ Connect or a file drop every Tuesday"],
    ["Item and market mapping", "UPCs to SKUs, sub-brands and platforms; markets to accounts; gaps and restatements flagged"],
    ["Driver model", "Measures elasticities for distribution, price, TPR, feature and display, plus seasonality and trend"],
    ["Baseline + context", "Projects the trade calendar forward, then applies every approved assumption by SKU, retailer and month"],
    ["Outputs", "Forecast to supply (or o9), driver reports, shareouts"],
  ];
  return (
    <>
      <div className="ph"><div><h1>Data sources</h1><p className="sub">Where every number comes from. History and its drivers come from NielsenIQ; what's coming comes from your teams.</p></div>
        <div className="ph-a"><Btn icon="download" onClick={async () => { const r = await saveFile("texere-nielsen-weekly.csv", toCsv(rows), "text/csv"); if (r === "saved") toast("Downloaded."); }}>Download current data</Btn>
          <Btn kind="primary" icon="upload" onClick={() => fileRef.current?.click()}>Upload a NielsenIQ export</Btn><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
          {S.nielsenSource === "upload" && <Btn kind="ghost" onClick={restore}>Use simulated data</Btn>}</div></div>
      {err && <div className="banner bad"><Icon name="alert" size={15} />{err}</div>}
      <div className="pipe">{steps.map(([t, d], i) => <div className="pipe-s" key={t}><span className="n">0{i + 1}</span><b>{t}</b><span>{d}</span></div>)}</div>
      <div className="kpis">
        <Kpi label="Source" value={S.nielsenSource === "upload" ? "Your file" : "NIQ RMS"} foot={S.nielsenFile || "Simulated, same fields as an RMS export"} />
        <Kpi label="Coverage" value="104 weeks" foot={`w/e ${fDate(WEEKS[0].end)}, 2024 to ${fDate(WEEKS[NH - 1].end)}, 2026`} />
        <Kpi label="Rows" value={fU(rows.length)} foot={`${SKUS.length} SKUs × ${RETAILERS.length} retailers × weeks`} />
        <Kpi label="Units" value={fU(units)} foot={fMoney(dollars) + " in sales"} />
        <Kpi label="Freshness" value="Nov 3" foot="Data through Oct 31 · next load Nov 10" />
      </div>
      <div className="grid2">
        <Card pad={false} id="fl" title="Fields used" sub="One row per week, retailer and UPC">
          <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Column</th><th>Measure</th><th>What it means</th></tr></thead>
            <tbody>{FIELDS.map(([c, m, d]) => <tr key={c}><td><span className="code">{c}</span></td><td>{m}</td><td className="small muted">{d}</td></tr>)}</tbody></table></div>
        </Card>
        <Card pad={false} id="os" title="Connections" sub="What feeds Texere">
          <div className="tbl-wrap"><table className="tbl"><tbody>
            {[["NielsenIQ RMS", "Sales history and drivers", "sim"], ["Zoom, Teams, Meet", "Retailer, finance, innovation and supply conversations", "sim"], ["Slack and email", "Quick updates and promo calendars", "sim"], ["Web monitor", "Competitor launches, price moves, trends", "sim"], ["Walmart Luminate, Target Roundel", "Store-level sell-through", "planned"], ["Shipments (SAP)", "What you shipped to each account", "planned"], ["o9 / Kinaxis / SAP IBP", "Optional engine: send assumptions, read the forecast back", "sim"]].map(([n, d, s]) => (
              <tr key={n}><td><div className="name">{n}</div><div className="meta">{d}</div></td><td className="r">{s === "sim" ? <Sim /> : <Badge t="outline">Planned</Badge>}</td></tr>
            ))}
          </tbody></table></div>
        </Card>
      </div>
      <Card pad={false} id="lw" title={`Latest week as loaded · w/e ${fDate(WEEKS[NH - 1].end)}`} sub="Exactly what the reports and the driver model read">
        <div className="tbl-wrap" style={{ maxHeight: 420 }}><table className="tbl" style={{ fontSize: 12.5 }}>
          <thead><tr><th>Retailer</th><th>SKU</th><th>UPC</th><th className="r">Units</th><th className="r">Dollars</th><th className="r">%ACV</th><th className="r">TPR %ACV</th><th className="r">Discount</th><th className="r">Feature</th><th className="r">Display</th><th className="r">Avg price</th><th className="r">Base price</th><th className="r">Incr units</th></tr></thead>
          <tbody>{last.map((r) => <tr key={r.sku + r.retailer}><td>{retById(r.retailer).name}</td><td>{skuById(r.sku).short}</td><td className="num xs muted">{r.upc}</td><td className="r num">{fU(r.units)}</td><td className="r num">{fMoney(r.dollars)}</td><td className="r num">{r.acv.toFixed(1)}</td><td className="r num">{r.promoAcv.toFixed(1)}</td><td className="r num">{r.discount ? r.discount.toFixed(0) + "%" : "–"}</td><td className="r num">{r.featAcv.toFixed(1)}</td><td className="r num">{r.dispAcv.toFixed(1)}</td><td className="r num">${(+r.avgPrice).toFixed(2)}</td><td className="r num">${(+r.basePrice).toFixed(2)}</td><td className="r num">{fU(r.incrUnits)}</td></tr>)}</tbody>
        </table></div>
      </Card>
    </>
  );
}
