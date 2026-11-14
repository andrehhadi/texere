import React, { useMemo, useState } from "react";
import { useStore, update, activeAt, NOW } from "../store.js";
import { SKUS, RETAILERS, WEEKS, NH, wLabel, skuById, retById, DRIVER_COLOR } from "../data/catalog.js";
import { PERIODS, COMPS, compWeeks, kpis, units, shareOf, decompose, decompSteps, topCells, driverNote, DECOMP_LABEL, periodLabel, weekRangeLabel, ppName } from "../engine/analytics.js";
import { driverStory } from "../engine/stories.js";
import { FilterBar, useScope } from "../ui/filters.jsx";
import { Card, Kpi, Seg, Btn, Delta, Badge, Empty, cx } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { Waterfall, Lines, Spark } from "../ui/charts.jsx";
import { fK, fMoney, sg, sp, pts, lcFirst } from "../ui/format.js";

const METRICS = {
  dollars: { label: "Dollar sales", f: fMoney, d: (b, a) => [b / a - 1, sp((b / a - 1) * 100)] },
  units: { label: "Units", f: fK, d: (b, a) => [b / a - 1, sp((b / a - 1) * 100)] },
  share: { label: "Dollar share", f: (v) => (v * 100).toFixed(1) + "%", d: (b, a) => [b - a, pts((b - a) * 100)] },
  tdp: { label: "TDPs", f: (v) => v.toFixed(0), d: (b, a) => [b / a - 1, sp((b / a - 1) * 100)] },
  velocity: { label: "$ / TDP / week", f: (v) => "$" + v.toFixed(0), d: (b, a) => [b / a - 1, sp((b / a - 1) * 100)] },
  avgPrice: { label: "Avg price paid", f: (v) => "$" + v.toFixed(2), d: (b, a) => [b / a - 1, sp((b / a - 1) * 100)], invert: true },
  promoAcv: { label: "%ACV any promo", f: (v) => v.toFixed(1), d: (b, a) => [b - a, pts(b - a)] },
  featAcv: { label: "%ACV feature", f: (v) => v.toFixed(1), d: (b, a) => [b - a, pts(b - a)] },
  dispAcv: { label: "%ACV display", f: (v) => v.toFixed(1), d: (b, a) => [b - a, pts(b - a)] },
  incr: { label: "Incremental %", f: (v) => (v * 100).toFixed(1) + "%", d: (b, a) => [b - a, pts((b - a) * 100)] },
};
const GROUPS = { subbrand: "Sub-brand", platform: "Platform", sku: "SKU", retailer: "Retailer", brand: "Brand", category: "Category" };

export default function Performance() {
  const { S, skus, rets, label } = useScope();
  const now = activeAt(NOW());
  const period = S.period, comp = S.comp;
  const B = PERIODS[period].weeks, A = compWeeks(period, comp);
  const fc = period.startsWith("N");
  const [metric, setMetric] = useState("units");
  const [drv, setDrv] = useState(null);
  const k1 = kpis(skus, rets, B, now), k0 = kpis(skus, rets, A, now);
  const sh1 = fc ? null : shareOf(skus, rets, B), sh0 = fc ? null : shareOf(skus, rets, A);
  const vals = { ...k1, share: sh1 }, prev = { ...k0, share: sh0 };
  const dec = decompose(skus, rets, A, B, now);
  const story = driverStory(dec, period, skus, rets);
  const compLbl = comp === "YA" ? "vs YA" : ppName(period);

  // Weekly trend for the selected metric: 52 weeks back + 13 forward, with year-ago
  const tw = []; for (let i = NH - 52; i < NH + 13; i++) tw.push(i);
  const wk = (i) => { if (metric === "share") return i < NH ? shareOf(skus, rets, [i]) : null; const k = kpis(skus, rets, [i], now); return k[metric]; };
  const trend = useMemo(() => ({ cur: tw.map(wk), ya: tw.map((i) => (metric === "share" && i - 52 >= NH ? null : wk(i - 52))) }), [metric, skus.join(), rets.join(), S.assumptions]);
  const inB = new Set(B);

  return (
    <>
      <div className="ph">
        <div><h1>Performance</h1><p className="sub">NielsenIQ results and what drove them: distribution, price, promotion, feature and display, measured week by week. Forecast periods show what the plan expects.</p></div>
        <div className="ph-a"><Badge t="outline">{PERIODS[period].label} · {weekRangeLabel(B)}</Badge><Badge t="outline">Compared with {weekRangeLabel(A)}</Badge></div>
      </div>
      <FilterBar period fcPeriods />
      <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        {Object.entries(METRICS).map(([k, m]) => {
          if (k === "share" && fc) return null;
          const [dv, dt] = m.d(vals[k], prev[k]);
          return <Kpi key={k} label={m.label} value={m.f(vals[k])} delta={dv} invert={m.invert} deltaText={dt + " " + compLbl} onClick={() => setMetric(k)} active={metric === k} />;
        })}
      </div>
      <div className="g-main">
        <Card id="wf" title={`What drove units: ${periodLabel(period, comp)}`} sub={`${story.headline}. Click a bar to see where it came from.`}>
          <Waterfall start={dec.A} end={dec.B} steps={decompSteps(dec)} startLabel={comp === "YA" ? "Year ago" : "Prior"} endLabel={PERIODS[period].short} onPick={(k) => setDrv(k === drv ? null : k)} picked={drv} height={280} />
        </Card>
        <DriverDetail dec={dec} drv={drv} story={story} setDrv={setDrv} />
      </div>
      <Card id="tr" title={`${METRICS[metric].label} by week`} sub={`${label}. Shaded weeks are the selected period; the right edge is the forecast.`}
        actions={<Seg size="sm" value={metric} onChange={setMetric} options={["units", "dollars", "tdp", "avgPrice", "promoAcv", "dispAcv"].map((k) => [k, METRICS[k].label.replace("Avg price paid", "Price").replace("%ACV any promo", "Promo").replace("%ACV display", "Display")])} label="Metric" />}>
        <Lines height={240} labels={tw.map(wLabel)} splitAt={52} fmt={METRICS[metric].f}
          series={[
            { name: "Year ago", color: "var(--faint)", values: trend.ya, width: 1.5 },
            { name: "This year", color: "var(--ink-2)", values: trend.cur.map((v, i) => (tw[i] < NH ? v : null)) },
            { name: "Forecast", color: "var(--brand)", values: trend.cur.map((v, i) => (tw[i] >= NH - 1 ? v : null)), width: 2.4 },
            { name: "Selected period", color: "var(--saffron)", values: trend.cur.map((v, i) => (inB.has(tw[i]) ? v : null)), width: 3.5, opacity: 0.5, hideTip: true },
          ]} />
      </Card>
      <Scorecard B={B} A={A} compLbl={compLbl} fc={fc} />
    </>
  );
}

function DriverDetail({ dec, drv, story, setDrv }) {
  if (!drv) return (
    <Card id="dd" title="The story" sub="Generated from the decomposition, no analyst required">
      <p style={{ fontWeight: 500, fontSize: 15 }}>{story.headline}.</p>
      <div className="stack" style={{ gap: 8 }}>
        {story.bullets.map((b) => (
          <button key={b.key} type="button" className="br" style={{ border: "1px solid var(--line)", background: "none", textAlign: "left", display: "grid", gridTemplateColumns: "1fr auto" }} onClick={() => setDrv(b.key)}>
            <span className="small">{b.text}</span><span className={cx("num small", b.v >= 0 ? "up" : "dn")}>{sg(b.v)}</span>
          </button>
        ))}
      </div>
      <p className="xs muted">Each driver's effect comes from NielsenIQ week-by-week changes in that driver times the elasticity Texere measured on your history (distribution 0.9, price −1.4, TPR 1.6 × depth, feature 0.25, display 0.45).</p>
    </Card>
  );
  const cells = topCells(dec, drv, 8);
  const tot = dec.total[drv];
  return (
    <Card id="dd" eyebrow="Driver detail" title={DECOMP_LABEL[drv]} sub={`${sg(tot)} units in total. Biggest contributors:`} actions={<Btn size="sm" kind="ghost" icon="x" onClick={() => setDrv(null)} aria-label="Close driver detail" />}>
      {cells.length === 0 ? <Empty>No single SKU and retailer explains this one; it's spread thin.</Empty> : (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>SKU at retailer</th><th className="r">Units</th><th>Why</th></tr></thead>
          <tbody>{cells.map((c) => <tr key={c.sku + c.ret}><td><div className="name">{skuById(c.sku).short}</div><div className="meta">{retById(c.ret).name}</div></td><td className={cx("r num", c.v >= 0 ? "up" : "dn")}>{sg(c.v)}</td><td className="small">{driverNote(drv, c.sku, c.ret) || <span className="muted">Measured change</span>}</td></tr>)}</tbody>
        </table></div>
      )}
    </Card>
  );
}

function Scorecard({ B, A, compLbl, fc }) {
  const { S, skus, rets } = useScope();
  const now = activeAt(NOW());
  const by = S.ui.groupBy || "subbrand";
  const groups = by === "retailer" ? RETAILERS.filter((r) => rets.includes(r.id)).map((r) => ({ k: r.id, label: r.name, skus, rets: [r.id] }))
    : [...new Set(SKUS.filter((s) => skus.includes(s.id)).map((s) => (by === "sku" ? s.id : s[by])))].map((g) => ({ k: g, label: by === "sku" ? skuById(g).short : g, meta: by === "sku" ? skuById(g).code : by === "platform" ? SKUS.find((s) => s.platform === g).subbrand : "", skus: SKUS.filter((s) => skus.includes(s.id) && (by === "sku" ? s.id === g : s[by] === g)).map((s) => s.id), rets }));
  const rows = groups.map((g) => {
    const b = kpis(g.skus, g.rets, B, now), a = kpis(g.skus, g.rets, A, now);
    const d = decompose(g.skus, g.rets, A, B, now);
    const top = decompSteps(d).filter((s) => s.key !== "other").sort((x, y) => Math.abs(y.v) - Math.abs(x.v))[0];
    return { ...g, b, a, sh: fc ? null : shareOf(g.skus, g.rets, B), sha: fc ? null : shareOf(g.skus, g.rets, A), top, spark: B.map((i) => units(g.skus, g.rets, [i], now)) };
  }).sort((x, y) => y.b.dollars - x.b.dollars);
  const maxD = Math.max(...rows.map((r) => r.b.dollars), 1);
  const drill = (r) => {
    if (by === "category" || by === "brand" || by === "subbrand" || by === "platform") update((s) => { s.filter[by] = r.k; s.ui.groupBy = by === "category" ? "brand" : by === "brand" ? "subbrand" : by === "subbrand" ? "platform" : "sku"; });
    else if (by === "sku") update((s) => { s.filter.sku = r.k; s.ui.groupBy = "retailer"; });
    else update((s) => { s.filter.retailer = r.k; s.ui.groupBy = "sku"; });
  };
  return (
    <Card pad={false} id="sc" title="Scorecard" sub={`Click a row to drill down. Changes are ${compLbl}.`}
      actions={<Seg size="sm" value={by} onChange={(v) => update((s) => { s.ui.groupBy = v; })} options={Object.entries(GROUPS).map(([k, v]) => [k, v])} label="Group by" />}>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>{GROUPS[by]}</th><th className="r">Dollar sales</th><th className="r">Chg</th><th className="r">Units</th><th className="r">Chg</th>{!fc && <th className="r">Share</th>}{!fc && <th className="r">Chg</th>}<th className="r">TDPs</th><th className="r">Chg</th><th className="r">Price</th><th className="r">Promo %ACV</th><th className="r">Display %ACV</th><th>Weekly units</th><th>Biggest driver</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.k} className="click" onClick={() => drill(r)}>
            <td><div className="name">{r.label}</div>{r.meta && <div className="meta">{r.meta}</div>}</td>
            <td className="r num"><span className="cell-bar" style={{ width: (r.b.dollars / maxD) * 46, marginRight: 8 }} />{fMoney(r.b.dollars)}</td>
            <td className="r"><Delta v={r.b.dollars - r.a.dollars} small>{sp((r.b.dollars / r.a.dollars - 1) * 100)}</Delta></td>
            <td className="r num">{fK(r.b.units)}</td>
            <td className="r"><Delta v={r.b.units - r.a.units} small>{r.a.units ? sp((r.b.units / r.a.units - 1) * 100) : "new"}</Delta></td>
            {!fc && <td className="r num">{(r.sh * 100).toFixed(1)}%</td>}
            {!fc && <td className="r"><Delta v={r.sh - r.sha} small>{pts((r.sh - r.sha) * 100)}</Delta></td>}
            <td className="r num">{r.b.tdp.toFixed(0)}</td>
            <td className="r"><Delta v={r.b.tdp - r.a.tdp} small>{r.a.tdp ? sp((r.b.tdp / r.a.tdp - 1) * 100) : "new"}</Delta></td>
            <td className="r num">${r.b.avgPrice.toFixed(2)} <span className="xs muted">{r.a.avgPrice ? sp((r.b.avgPrice / r.a.avgPrice - 1) * 100) : ""}</span></td>
            <td className="r num">{r.b.promoAcv.toFixed(1)}</td>
            <td className="r num">{r.b.dispAcv.toFixed(1)}</td>
            <td><Spark values={r.spark} w={84} h={22} fill={false} /></td>
            <td className="small">{r.top ? <span className="row nw" style={{ gap: 6 }}><span className="dtag" style={{ "--c": DRIVER_COLOR[{ promotion: "promotion", feature: "promotion", distribution: "distribution", price: "price", display: "display", competition: "competition", launch: "launch", supply: "supply" }[r.top.key] || "other"] }}><i />{r.top.label.replace(" (TDPs)", "").replace(" (TPR)", "")}</span><span className={cx("num", r.top.v >= 0 ? "up" : "dn")}>{sg(r.top.v)}</span></span> : "–"}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </Card>
  );
}
