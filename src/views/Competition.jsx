import React, { useMemo, useState } from "react";
import { useStore, update } from "../store.js";
import { COMPETITORS, HIST_MONTHS, mLabel, weeksInMonth, compById, skuById, retById } from "../data/catalog.js";
import { PERIODS, compWeeks, competitorTable, segmentsOf, periodLabel, ppName } from "../engine/analytics.js";
import { COMP_EVENTS } from "../engine/sim.js";
import { addAssumption, openAssm } from "../actions.js";
import { FilterBar, useScope } from "../ui/filters.jsx";
import { Card, Kpi, Seg, Btn, Badge, Delta, Empty, DriverTag, cx, toast } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { Lines, HBars } from "../ui/charts.jsx";
import { fMoney, sp, pts, fDate, skuNames, retNames, mRange } from "../ui/format.js";

export default function Competition({ go }) {
  const { S, skus, rets, label } = useScope();
  const period = S.period.startsWith("N") ? "L13W" : S.period;
  const B = PERIODS[period].weeks, A = compWeeks(period, S.comp);
  const [cid, setCid] = useState("ALL");
  const segs = segmentsOf(skus);
  const tbl = competitorTable(skus, rets, A, B).sort((a, b) => b.share - a.share);
  const us = tbl.find((r) => r.id === "LUMEN") || { share: 0, shareA: 0, price: 0 };
  const comps = tbl.filter((r) => r.id !== "LUMEN");
  const months = HIST_MONTHS.slice(-18);
  const trend = useMemo(() => months.map((m) => competitorTable(skus, rets, weeksInMonth(m), weeksInMonth(m))), [skus.join(), rets.join()]);
  const ids = tbl.map((r) => r.id);
  const shown = cid === "ALL" ? ids : ["LUMEN", cid];
  const gainer = [...comps].sort((a, b) => (b.share - b.shareA) - (a.share - a.shareA))[0];
  const avgCompPrice = comps.reduce((t, c) => t + c.price * c.dollars, 0) / (comps.reduce((t, c) => t + c.dollars, 0) || 1);
  const sel = cid !== "ALL" && tbl.find((r) => r.id === cid);
  const events = COMP_EVENTS.filter((e) => (cid === "ALL" || e.comp === cid) && e.skus.some((s) => skus.includes(s)) && rets.includes(e.ret));
  const signals = S.signals.filter((x) => (cid === "ALL" || x.comp === cid));
  return (
    <>
      <div className="ph">
        <div><h1>Competition</h1><p className="sub">Share, pricing and promotion for every brand in the segments your selected SKUs compete in, from NielsenIQ, plus market signals Texere picks up from the web.</p></div>
        <div className="ph-a"><Badge t="outline">Segments: {segs.join(", ")}</Badge></div>
      </div>
      <FilterBar period extra={<><span className="sep" /><label className="sel" style={{ background: cid !== "ALL" ? "var(--brand-soft)" : undefined }}><span className="sel-l">Competitor</span><select value={cid} onChange={(e) => setCid(e.target.value)}><option value="ALL">All</option>{COMPETITORS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><Icon name="down" size={13} /></label></>} />
      <div className="kpis">
        <Kpi label="Lumen dollar share" value={(us.share * 100).toFixed(1) + "%"} delta={us.share - us.shareA} deltaText={pts((us.share - us.shareA) * 100) + " " + (S.comp === "YA" ? "vs YA" : ppName(period))} />
        <Kpi label="Biggest gainer" value={gainer?.name || "–"} delta={gainer ? gainer.share - gainer.shareA : 0} deltaText={gainer ? pts((gainer.share - gainer.shareA) * 100) : ""} />
        <Kpi label="Lumen price index" value={avgCompPrice ? Math.round((us.price / avgCompPrice) * 100) : "–"} foot="vs competitor average = 100" />
        <Kpi label="Segment sales" value={fMoney(tbl.reduce((t, r) => t + r.dollars, 0))} foot={periodLabel(period, S.comp).split(" ")[0]} />
        {sel && <Kpi label={sel.name + " share"} value={(sel.share * 100).toFixed(1) + "%"} delta={sel.share - sel.shareA} deltaText={pts((sel.share - sel.shareA) * 100)} />}
      </div>
      <div className="g-main">
        <Card id="sh" title="Dollar share by month" sub={`${label} · segments ${segs.join(", ")}`}>
          <Lines height={260} labels={months.map(mLabel)} fmt={(v) => (v * 100).toFixed(0) + "%"}
            series={shown.map((id) => { const r = tbl.find((x) => x.id === id); return { name: r.name, color: r.color, width: id === "LUMEN" ? 2.8 : 1.8, values: trend.map((t) => t.find((x) => x.id === id)?.share ?? null) }; })} />
        </Card>
        <Card id="px" title="Average price paid" sub="Per unit, selected period">
          <HBars rows={tbl.map((r) => ({ k: r.id, label: r.name, v: r.price, color: r.color }))} fmt={(v) => "$" + v.toFixed(2)} />
          <hr className="div" />
          <div className="eyebrow">Weeks on promotion</div>
          <HBars rows={tbl.map((r) => ({ k: r.id, label: r.name, v: r.promo, color: r.color }))} fmt={(v) => (v * 100).toFixed(0) + "%"} max={1} />
        </Card>
      </div>
      <Card pad={false} id="ct" title="Share table" sub={`${periodLabel(period, S.comp)}`}>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Brand</th><th className="r">Dollar sales</th><th className="r">Chg</th><th className="r">Share</th><th className="r">Chg</th><th className="r">Avg price</th><th className="r">Price chg</th><th className="r">Weeks on promo</th></tr></thead>
          <tbody>{tbl.map((r) => (
            <tr key={r.id} className={cx("click", (cid === r.id || (r.id === "LUMEN")) && "sel")} onClick={() => setCid(r.id === "LUMEN" ? "ALL" : r.id)}>
              <td><span className="row nw"><i style={{ width: 10, height: 10, borderRadius: 3, background: r.color, display: "inline-block" }} /><span className="name">{r.name}</span></span></td>
              <td className="r num">{fMoney(r.dollars)}</td><td className="r"><Delta v={r.dollars - r.dollarsA} small>{r.dollarsA ? sp((r.dollars / r.dollarsA - 1) * 100) : "new"}</Delta></td>
              <td className="r num">{(r.share * 100).toFixed(1)}%</td><td className="r"><Delta v={r.share - r.shareA} small>{pts((r.share - r.shareA) * 100)}</Delta></td>
              <td className="r num">${r.price.toFixed(2)}</td><td className="r"><Delta v={r.price - r.priceA} small invert>{r.priceA ? sp((r.price / r.priceA - 1) * 100) : "–"}</Delta></td>
              <td className="r num">{(r.promo * 100).toFixed(0)}%</td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>
      <div className="grid2">
        <Card pad={false} id="ev" title="Competitive events measured in NielsenIQ" sub="Already in the history and the baseline forecast">
          {events.length === 0 ? <Empty>No measured events for this selection.</Empty> : events.map((e) => (
            <div key={e.comp + e.ret} className="fi" style={{ cursor: "default" }}>
              <span className="avatar" style={{ width: 30, height: 30, background: compById(e.comp).color, fontSize: 11 }}>{compById(e.comp).name.slice(0, 2)}</span>
              <div><div className="t">{e.note}</div><div className="m">{retById(e.ret).name} · since {fDate(e.from)}, {e.from.slice(0, 4)} · {skuNames(e.skus)}</div></div>
              <div className="r"><span className="num small dn">{sp((e.factor - 1) * 100, 0)}</span><span className="xs faint">on our SKUs</span></div>
            </div>
          ))}
        </Card>
        <Card pad={false} id="sg" title="Market signals" sub="Found by Texere's web monitor: trade press, retailer sites, price scans and search trends">
          {signals.length === 0 ? <Empty>No signals for this competitor.</Empty> : signals.map((x) => (
            <div key={x.id} className="fi" style={{ cursor: "default", gridTemplateColumns: "32px minmax(0,1fr)" }}>
              <span className="avatar" style={{ width: 30, height: 30, background: x.comp ? compById(x.comp).color : "var(--brand-deep)" }}><Icon name="web" size={15} /></span>
              <div className="stack" style={{ gap: 6 }}>
                <div><div className="t">{x.title}</div><div className="m">{x.source} · {fDate(x.date)}</div></div>
                <p className="small">{x.body}</p>
                {x.added ? <div className="row small"><Badge t="good" dot>On the forecast as {x.added}</Badge><button className="link small" type="button" onClick={() => openAssm(x.added)}>Open</button></div>
                  : x.suggest ? <div className="row"><span className="small muted">Suggested: {x.suggest.impact > 0 ? "+" : ""}{x.suggest.impact}% on {skuNames(x.suggest.skus)} at {retNames(x.suggest.retailers)}, {mRange(x.suggest.months)}</span>
                    <Btn size="sm" kind="primary" icon="plus" onClick={() => { const id = addAssumption({ ...x.suggest, quote: x.body }, null); update((s) => { s.signals.find((y) => y.id === x.id).added = id; }); toast(`${id} sent for approval.`, ["inbox", "Open approvals"]); }}>Send for approval</Btn></div> : null}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
