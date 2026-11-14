import React, { useState } from "react";
import { useStore, update, activeAt, NOW } from "../store.js";
import { SKUS, RETAILERS, HIST, FC, LY12, PY12, DRIVERS, skuList, retList, skuById, retById, shiftY, mLabel } from "../data/catalog.js";
import { decompose, kpis, sumUnits, sumDollars, driversOf, DECOMP_LABEL, DECOMP_ORDER, topCells, driverNote, affects } from "../engine/model.js";
import { PERIODS, driverSteps, driverStory } from "../engine/stories.js";
import { Head, Toggle, Chip, Spinner, SimTag, toast } from "../ui/common.jsx";
import { Waterfall, TrendChart, Legend } from "../ui/charts.jsx";
import { fK, fU, fMoney, sp, sg, pts, dcls, mRange } from "../ui/format.js";
import { askText, aiAvailable, aiError } from "../ai.js";

function fcKpis(skus, rets, months, act) {
  let acvW = 0, promoW = 0, dispW = 0, w = 0;
  for (const s of skus) for (const r of rets) for (const m of months) {
    const d = driversOf(s, r, m), wt = RETAILERS.find((x) => x.id === r).weight;
    if (!d.acv) continue;
    acvW += d.acv * wt; promoW += d.promoAcv * 100 * wt; dispW += d.dispAcv * 100 * wt; w += wt;
  }
  const units = sumUnits(skus, rets, months, act), dollars = sumDollars(skus, rets, months, act);
  return { units, dollars, avgPrice: units ? dollars / units : 0, acv: w ? acvW / w : 0, promoAcv: w ? promoW / w : 0, dispAcv: w ? dispW / w : 0 };
}

export default function Reports() {
  const S = useStore();
  const u = S.ui;
  const skus = skuList(u.repSku), rets = retList(u.repRet);
  const P = PERIODS[u.repPeriod];
  const act = activeAt(NOW());
  const dec = decompose(skus, rets, P.a, P.b, act);
  const story = driverStory(dec, u.repPeriod, skus, rets);
  const steps = driverSteps(dec);
  const kA = HIST.includes(P.a[0]) ? kpis(skus, rets, P.a) : fcKpis(skus, rets, P.a, act);
  const kB = HIST.includes(P.b[0]) ? kpis(skus, rets, P.b) : fcKpis(skus, rets, P.b, act);
  const [polished, setPolished] = useState(null);
  const [busy, setBusy] = useState(false);
  const months = [...PY12, ...LY12, ...FC];
  const series = [
    { name: "Actual", values: months.map((m) => (HIST.includes(m) ? sumUnits(skus, rets, [m], act) : null)), color: "var(--ink)", width: 2 },
    { name: "Forecast", values: months.map((m) => (FC.includes(m) || m === LY12[11] ? sumUnits(skus, rets, [m], act) : null)), color: "var(--accent)", width: 2.6 },
    { name: "Year ago", values: months.map((m) => (HIST.includes(shiftY(m, -1)) ? sumUnits(skus, rets, [shiftY(m, -1)], act) : null)), color: "var(--line-2)", width: 1.5 },
  ];
  const ctx = u.repPeriod === "fc" ? act.filter((a) => a.skus.some((s) => skus.includes(s)) && a.retailers.some((r) => rets.includes(r))) : [];
  const rowsK = [
    ["Units", fK(kA.units), fK(kB.units), sp((kB.units / kA.units - 1) * 100)],
    ["Dollar sales", fMoney(kA.dollars), fMoney(kB.dollars), sp((kB.dollars / kA.dollars - 1) * 100)],
    ["Avg %ACV distribution (TDP per item)", kA.acv.toFixed(1), kB.acv.toFixed(1), pts(kB.acv - kA.acv)],
    ["Avg price paid", "$" + kA.avgPrice.toFixed(2), "$" + kB.avgPrice.toFixed(2), sp((kB.avgPrice / kA.avgPrice - 1) * 100)],
    ["%ACV on promotion (any)", kA.promoAcv.toFixed(1), kB.promoAcv.toFixed(1), pts(kB.promoAcv - kA.promoAcv)],
    ["%ACV on display", kA.dispAcv.toFixed(1), kB.dispAcv.toFixed(1), pts(kB.dispAcv - kA.dispAcv)],
  ];
  async function polish() {
    setBusy(true);
    try {
      const facts = [story.headline, ...story.bullets.map((b) => b.text), ...rowsK.map((r) => `${r[0]}: ${r[1]} to ${r[2]} (${r[3]})`), ...ctx.map((a) => `${a.id}: ${a.summary}, ${a.impact}%`)].join("\n");
      const t = await askText(`Write the "what drove performance" paragraph for a CPG brand review: 4 to 5 plain sentences, numbers from the facts only, lead with the overall result, then the two or three biggest drivers and their causes, then what to watch. No headings or bullets.\n\nScope: ${u.repSku === "ALL" ? "all SKUs" : skuById(u.repSku).name}, ${u.repRet === "ALL" ? "all retailers" : retById(u.repRet).name}, ${P.label}.\nFacts:\n${facts}`);
      setPolished(t.trim());
    } catch (e) { toast(aiError(e)); } finally { setBusy(false); }
  }
  return (
    <>
      <Head title="Driver reports" sub="How distribution, price, promotion, display and trend explain performance, from NielsenIQ actuals and from the forecast. Every number traces to the data or to an assumption." />
      <div className="row">
        <label className="small" htmlFor="rp-sku">SKU</label>
        <select id="rp-sku" value={u.repSku} onChange={(e) => { setPolished(null); update((s) => { s.ui.repSku = e.target.value; }); }}><option value="ALL">All SKUs</option>{SKUS.map((s) => <option key={s.id} value={s.id}>{s.short}</option>)}</select>
        <label className="small" htmlFor="rp-ret">Retailer</label>
        <select id="rp-ret" value={u.repRet} onChange={(e) => { setPolished(null); update((s) => { s.ui.repRet = e.target.value; }); }}><option value="ALL">All retailers</option>{RETAILERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <Toggle label="Period" value={u.repPeriod} onChange={(v) => { setPolished(null); update((s) => { s.ui.repPeriod = v; }); }} options={[["ly", "Last 12 months"], ["q", "Latest quarter"], ["fc", "Next 12 months"]]} />
      </div>
      <div className="grid2">
        <section className="card stack" aria-labelledby="wf-h">
          <div><div className="eyebrow">{P.label}</div><h2 id="wf-h" style={{ marginTop: 4 }}>{story.headline}</h2></div>
          <div className="chart-box"><Waterfall start={dec.A} end={dec.B} steps={steps} startLabel={P.aLabel} endLabel={P.bLabel} title={story.headline} /></div>
          <p className="small muted">Each bar is the change in units explained by one driver, using elasticities measured on this brand's history: distribution 0.9, price {"−"}1.4, promotion lift 1.6 × discount × share of stores, display lift 0.45 × share of stores. {u.repPeriod === "fc" ? "Forecast bars include the accepted assumptions from your teams." : "Other is what the drivers don't explain (weather, competition, noise)."}</p>
        </section>
        <section className="card stack" aria-labelledby="st-h">
          <div className="row between"><h2 id="st-h">What drove it</h2>{aiAvailable() && <button className="btn sm" type="button" onClick={polish} disabled={busy}>{busy ? <><Spinner /> Writing</> : "Write it up with Claude"}</button>}</div>
          {polished ? <div className="answer">{polished}</div> : <ul className="bullets">{story.bullets.map((b) => <li key={b.key}>{b.text}</li>)}</ul>}
          <p className="small muted">{polished ? "Written by Claude from the numbers on this page." : "Generated automatically from the decomposition."}</p>
        </section>
      </div>
      <section className="card stack" aria-labelledby="k-h">
        <h2 id="k-h">Driver scorecard</h2>
        <div className="tbl-wrap flat"><table>
          <thead><tr><th>Measure</th><th className="n">{P.aLabel}</th><th className="n">{P.bLabel}</th><th className="n">Change</th></tr></thead>
          <tbody>{rowsK.map((r) => <tr key={r[0]}><td>{r[0]}</td><td className="n">{r[1]}</td><td className="n">{r[2]}</td><td className={"n " + (r[3].startsWith("+") ? "delta-up" : r[3].startsWith("−") ? "delta-dn" : "muted")}>{r[3]}</td></tr>)}</tbody>
        </table></div>
        <p className="small muted">Source: NielsenIQ retail measurement by retailer, monthly <SimTag>simulated data</SimTag>. {u.repPeriod === "fc" ? "Forecast columns use planned distribution, price and the recurring trade calendar; one-time events come from assumptions." : "Distribution and promotion measures are weighted by each retailer's share of all-commodity volume."}</p>
      </section>
      <section className="card stack" aria-labelledby="tr-h">
        <h2 id="tr-h">Units by month: 24 months of actuals and the forecast</h2>
        <Legend items={series} />
        <div className="chart-box"><TrendChart months={months} series={series} todayIdx={23} /></div>
      </section>
      <section className="card stack" aria-labelledby="dd-h">
        <h2 id="dd-h">Where each driver came from</h2>
        <div className="tbl-wrap flat"><table>
          <thead><tr><th>Driver</th><th className="n">Units</th><th>Biggest contributors</th></tr></thead>
          <tbody>{DECOMP_ORDER.filter((k) => Math.abs(dec.total[k]) >= 1).map((k) => (
            <tr key={k}><td>{DECOMP_LABEL[k]}</td><td className={"n " + dcls(dec.total[k])}>{sg(dec.total[k])}</td>
              <td className="small">{topCells(dec, k, 3).filter((t) => Math.abs(t.v) >= 1).map((t) => { const n = driverNote(k, t.sku, t.ret); return <div key={t.sku + t.ret}>{skuById(t.sku).short} at {retById(t.ret).name}: <span className={dcls(t.v)}>{sg(t.v)}</span>{n ? <span className="muted"> · {n}</span> : null}</div>; })}
                {u.repPeriod === "fc" && ctx.filter((a) => ({ promotion: "promotion", price: "price", distribution: "distribution", display: "display", supply: "supply", launch: "launch", competition: "competition" }[a.driver] || "other") === k).map((a) => <div key={a.id} className="muted">Context: {a.id} {a.summary}</div>)}</td></tr>
          ))}</tbody>
        </table></div>
      </section>
    </>
  );
}
