import React from "react";
import { useStore, update, supplyRows, capById } from "../store.js";
import { TODAY, skuById, mLabel, ALL_R } from "../data/catalog.js";
import { Head, Kpi, Chip, Empty, SimTag } from "../ui/common.jsx";
import { fU, sg, sp, dcls, fDate, retNames } from "../ui/format.js";
import { exportForecast, publish } from "./Forecast.jsx";

export default function Supply() {
  const S = useStore();
  const rows = supplyRows();
  const open = rows.filter((r) => !S.acks[r.k]);
  const o9 = S.engine === "o9";
  return (
    <>
      <Head title="Supply handoff" sub={`What changed since the forecast was last published${o9 ? " to o9" : " to supply"}, why it changed, and where it could create a stock-out or excess inventory.`}>
        <button className="btn" type="button" onClick={exportForecast}>Export CSV</button>
        <button className="btn primary" type="button" onClick={publish}>{o9 ? "Send" : "Publish"} {rows.length} change{rows.length === 1 ? "" : "s"}</button>
      </Head>
      <div className="grid-kpi">
        <Kpi label="Last published" value={fDate(S.lastSync.slice(0, 10))} sub={S.syncLog[S.syncLog.length - 1]?.note} />
        <Kpi label="Changes since" value={rows.length} sub="SKU-months that moved" />
        <Kpi label="Risks" value={rows.filter((r) => r.risk).length} sub="Moves of 10% or more" tone={rows.some((r) => r.risk) ? "attn" : ""} />
        <Kpi label="Not yet acknowledged" value={open.length} sub="By supply planning" />
      </div>
      <div className="tbl-wrap"><table>
        <thead><tr><th className="sticky">SKU</th><th>Month</th><th className="n">Published</th><th className="n">Now</th><th className="n">Change</th><th>Why it changed</th><th>Risk</th><th /></tr></thead>
        <tbody>{rows.length ? rows.map((r) => (
          <tr key={r.k}>
            <td className="sticky" style={{ minWidth: 170 }}><b>{skuById(r.sku).short}</b><div className="small muted">{retNames(r.rets.length ? r.rets : ALL_R)}</div></td>
            <td className="nowrap">{mLabel(r.m)}</td><td className="n">{fU(r.sync)}</td><td className="n">{fU(r.now)}</td>
            <td className={"n " + dcls(r.diff)}>{sg(r.diff, fU)}<div className="small">{sp(r.pct)}</div></td>
            <td className="small" style={{ minWidth: 260 }}>{r.reasons.length ? r.reasons.map((a) => { const c = capById(a.capture) || {}; return <div key={a.id}><b>{a.id}</b> {a.summary} <span className="muted">· {c.person}, {fDate(a.decidedAt)}</span></div>; }) : <span className="muted">Change in an earlier assumption</span>}</td>
            <td>{r.risk ? <Chip tone={r.diff > 0 ? "warn" : "bad"}>{r.risk}</Chip> : <Chip>Small change</Chip>}</td>
            <td>{S.acks[r.k] ? <Chip tone="good">Acknowledged</Chip> : <button className="btn sm" type="button" onClick={() => update((s) => { s.acks[r.k] = TODAY; })}>Acknowledge</button>}</td>
          </tr>
        )) : <tr><td colSpan={8}><Empty>The forecast matches what was last published. Nothing to hand off.</Empty></td></tr>}</tbody>
      </table></div>
      <section className="card stack" aria-labelledby="log-h"><h2 id="log-h">Publish history</h2>
        {[...S.syncLog].reverse().map((l, i) => <div key={i} className="row between small"><span><b>{fDate(l.at)}</b> · {l.note}</span><span className="muted">{l.by} · {l.cells} SKU-retailer-months</span></div>)}
        <p className="small muted">{o9 ? <>Sending to o9 is simulated <SimTag />. The real product would write through o9's API or an import file.</> : "In the real product supply planning would receive this in their system (SAP, Kinaxis, o9) or by file."}</p>
      </section>
    </>
  );
}
