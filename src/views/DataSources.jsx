import React, { useRef, useState } from "react";
import { useStore, update, rerender } from "../store.js";
import { SKUS, RETAILERS, HIST, skuById, retById, mLabel } from "../data/catalog.js";
import { getNielsen, setNielsen, buildNielsen } from "../engine/model.js";
import { Head, Kpi, Chip, SimTag, toast } from "../ui/common.jsx";
import { fU, fMoney } from "../ui/format.js";
import { saveFile } from "../ai.js";

const FIELDS = [
  ["period", "Month (YYYY-MM)", "NielsenIQ 4- or 5-week periods rolled up to calendar months"],
  ["retailer", "Retailer (WMT, TGT, CVS, WAG)", "Market or account the sales came from"],
  ["upc", "UPC", "Mapped to your SKU list"],
  ["units", "Unit sales", "Scanned units sold to shoppers"],
  ["dollars", "Dollar sales", "Scanned dollars"],
  ["acv", "%ACV distribution", "Share of the retailer's all-commodity volume in stores that sell the item; summed across items it gives TDPs"],
  ["promoAcv", "%ACV any promotion", "Share of stores (by volume) where the item was on a temporary price reduction, feature or display deal"],
  ["discount", "Average promo discount %", "Depth of the price cut when on promotion"],
  ["dispAcv", "%ACV any display", "Share of stores with the item on an endcap or secondary display"],
  ["avgPrice", "Average price paid", "Dollars divided by units"],
  ["basePrice", "Base (regular) price", "Shelf price without promotion"],
  ["baseUnits", "Base units", "Expected units without any promotion or display"],
  ["incrUnits", "Incremental units", "Units driven by promotion and display"],
];
const COLS = FIELDS.map((f) => f[0]);

function toCsv(rows) {
  return [COLS.join(","), ...rows.map((r) => COLS.map((c) => r[c]).join(","))].join("\n");
}

export default function DataSources() {
  const S = useStore();
  const rows = getNielsen();
  const fileRef = useRef(null);
  const [err, setErr] = useState(null);
  const units = rows.reduce((t, r) => t + r.units, 0), dollars = rows.reduce((t, r) => t + r.dollars, 0);
  function onFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const lines = String(rd.result).trim().split(/\r?\n/);
        const head = lines[0].split(",").map((h) => h.trim());
        const missing = ["period", "retailer", "upc", "units", "dollars", "acv", "promoAcv", "discount", "dispAcv", "basePrice"].filter((c) => !head.includes(c));
        if (missing.length) throw new Error("Missing columns: " + missing.join(", ") + ". Download the template to see the format.");
        const upcToSku = Object.fromEntries(SKUS.map((s) => [s.upc, s.id]));
        const out = [];
        for (const ln of lines.slice(1)) {
          const v = ln.split(","); const o = {}; head.forEach((h, i) => { o[h] = v[i]; });
          const sku = upcToSku[o.upc] || (skuById(o.sku) ? o.sku : null);
          if (!sku || !retById(o.retailer) || !HIST.includes(o.period)) continue;
          const num = (k) => Number(o[k]) || 0;
          const units = num("units");
          out.push({ period: o.period, retailer: o.retailer, upc: o.upc, sku, units, dollars: num("dollars"), acv: num("acv"), tdp: num("acv"), promoAcv: num("promoAcv"), discount: num("discount"), dispAcv: num("dispAcv"), avgPrice: units ? num("dollars") / units : num("basePrice"), basePrice: num("basePrice"), baseUnits: num("baseUnits") || units, incrUnits: num("incrUnits") || 0 });
        }
        if (!out.length) throw new Error("No rows matched your SKUs, retailers and the Nov 2024 to Oct 2026 window.");
        setNielsen(out);
        update((s) => { s.nielsenRows = out; s.nielsenSource = "upload"; s.nielsenFile = f.name; });
        setErr(null); toast(`Loaded ${out.length} rows from ${f.name}. Reports and the forecast now use this data.`);
      } catch (ex) { setErr(ex.message); }
    };
    rd.readAsText(f);
    e.target.value = "";
  }
  function restore() { setNielsen(buildNielsen()); update((s) => { delete s.nielsenRows; s.nielsenSource = "simulated"; s.nielsenFile = null; }); toast("Back to the simulated NielsenIQ data."); }
  return (
    <>
      <Head title="Data sources" sub="Where every number comes from. Sales history and the drivers behind it come from NielsenIQ; forward-looking context comes from your teams." />
      <section className="card stack" aria-labelledby="flow-h">
        <h2 id="flow-h">How data flows into Texere</h2>
        <div className="flow" role="img" aria-label="NielsenIQ export and team conversations flow into Texere's data layer, then into the driver model, forecast and reports">
          <div className="node src"><b>NielsenIQ retail measurement</b><span>Monthly export by retailer and UPC: units, dollars, %ACV, promotion, display, price</span><SimTag>{S.nielsenSource === "upload" ? "Your upload" : "Simulated"}</SimTag></div>
          <div className="arrow" aria-hidden="true">→</div>
          <div className="node"><b>Texere data layer</b><span>Maps UPCs to SKUs and retailers, rolls periods to months, checks gaps</span></div>
          <div className="arrow" aria-hidden="true">→</div>
          <div className="node"><b>Driver model</b><span>Measures elasticities: distribution 0.9, price {"−"}1.4, promotion, display, seasonality, trend</span></div>
          <div className="arrow" aria-hidden="true">→</div>
          <div className="node accent"><b>Forecast and reports</b><span>Baseline forecast, driver waterfalls, shareouts</span></div>
          <div className="node src wide"><b>Team context</b><span>Calls, Slack, email and web signals become dated assumptions that adjust the forecast</span></div>
        </div>
        <p className="small muted">In production, Texere would pull the NielsenIQ extract on a schedule (through NIQ's data delivery or a file drop the brand already receives) and could add retailer portal data and internal shipments. Here the dataset is simulated with the same fields, and you can upload your own file in the same format.</p>
      </section>
      <div className="grid-kpi">
        <Kpi label="Source" value={S.nielsenSource === "upload" ? "Your file" : "Simulated NIQ"} sub={S.nielsenFile || "Same fields as a NielsenIQ RMS export"} />
        <Kpi label="Coverage" value={`${mLabel(HIST[0])} to ${mLabel(HIST[HIST.length - 1])}`} sub="24 months, data through Oct 31, 2026" />
        <Kpi label="Rows" value={fU(rows.length)} sub={`${SKUS.filter((s) => !s.launch).length} SKUs × ${RETAILERS.length} retailers × 24 months`} />
        <Kpi label="Total sales" value={fU(units) + " units"} sub={fMoney(dollars)} />
      </div>
      <section className="card stack" aria-labelledby="up-h">
        <div className="row between"><h2 id="up-h">Load NielsenIQ data</h2>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn" type="button" onClick={async () => { const r = await saveFile("texere-nielsen-template.csv", toCsv(rows), "text/csv"); if (r === "saved") toast("Template downloaded."); }}>Download current data (CSV)</button>
            <button className="btn primary" type="button" onClick={() => fileRef.current?.click()}>Upload a NielsenIQ export</button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
            {S.nielsenSource === "upload" && <button className="btn ghost" type="button" onClick={restore}>Use simulated data</button>}
          </div></div>
        <p className="small">Upload a CSV with the columns below (one row per month, retailer and UPC). Texere rebuilds the reports and the forecast from it right away, in your browser.</p>
        {err && <p className="small" style={{ color: "var(--bad)" }}>{err}</p>}
      </section>
      <section className="stack" aria-labelledby="f-h">
        <h2 id="f-h">Fields used</h2>
        <div className="tbl-wrap"><table>
          <thead><tr><th>Column</th><th>Measure</th><th>What it means</th></tr></thead>
          <tbody>{FIELDS.map(([c, m, d]) => <tr key={c}><td className="mono">{c}</td><td>{m}</td><td className="small">{d}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section className="stack" aria-labelledby="s-h">
        <h2 id="s-h">Latest month, as loaded</h2>
        <div className="tbl-wrap"><table>
          <thead><tr><th>Period</th><th>Retailer</th><th>SKU</th><th className="n">Units</th><th className="n">Dollars</th><th className="n">%ACV</th><th className="n">%ACV promo</th><th className="n">Discount</th><th className="n">%ACV display</th><th className="n">Avg price</th><th className="n">Base price</th></tr></thead>
          <tbody>{rows.filter((r) => r.period === HIST[HIST.length - 1]).map((r) => (
            <tr key={r.sku + r.retailer}><td className="mono">{r.period}</td><td>{retById(r.retailer).name}</td><td>{skuById(r.sku).short}</td><td className="n">{fU(r.units)}</td><td className="n">{fMoney(r.dollars)}</td><td className="n">{r.acv.toFixed(1)}</td><td className="n">{r.promoAcv.toFixed(1)}</td><td className="n">{r.discount.toFixed(0)}%</td><td className="n">{r.dispAcv.toFixed(1)}</td><td className="n">${r.avgPrice.toFixed(2)}</td><td className="n">${r.basePrice.toFixed(2)}</td></tr>
          ))}</tbody>
        </table></div>
      </section>
      <section className="card stack" aria-labelledby="o-h">
        <h2 id="o-h">Other sources</h2>
        <div className="tbl-wrap flat"><table>
          <thead><tr><th>Source</th><th>What it adds</th><th>In this prototype</th></tr></thead>
          <tbody>
            <tr><td>NielsenIQ retail measurement</td><td>Sales history and drivers (distribution, price, promotion, display)</td><td><Chip tone="warn">Simulated</Chip> Upload works</td></tr>
            <tr><td>Meetings (Zoom, Teams, Meet)</td><td>Retailer news, finance, innovation and supply updates</td><td><Chip tone="warn">Simulated connection</Chip> Upload or paste works</td></tr>
            <tr><td>Slack and email</td><td>Quick updates and promo calendars</td><td><Chip tone="warn">Simulated connection</Chip> Paste works</td></tr>
            <tr><td>Web and competitor monitor</td><td>Competitor launches, price moves, trends</td><td><Chip tone="warn">Example signals</Chip> Paste works</td></tr>
            <tr><td>Retailer portals and shipments</td><td>Store-level sell-through and what you shipped to each retailer</td><td><Chip>Planned</Chip></td></tr>
            <tr><td>o9, Kinaxis or SAP IBP</td><td>Optional: send assumptions and receive the planning system's forecast</td><td><Chip tone="warn">Simulated</Chip> See Settings</td></tr>
          </tbody>
        </table></div>
      </section>
    </>
  );
}
