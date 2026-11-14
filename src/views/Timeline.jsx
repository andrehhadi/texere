import React from "react";
import { useStore, update, activeAt, NOW, PLAN, cellEvents, capById, statusOf, key } from "../store.js";
import { SKUS, RETAILERS, FC, LY12, HIST, DRIVERS, skuList, retList, skuById, retById, mLabel, shiftY } from "../data/catalog.js";
import { sumUnits, baselineFc, affects } from "../engine/model.js";
import { Head, StatusChip, Empty } from "../ui/common.jsx";
import { TrendChart, Legend } from "../ui/charts.jsx";
import { fU, sg, sp, dcls, fDate, mRange } from "../ui/format.js";

export default function Timeline() {
  const S = useStore();
  const u = S.ui;
  const skus = skuList(u.sku), rets = retList(u.ret);
  const now = activeAt(NOW()), plan = activeAt(PLAN), what = activeAt(NOW(), true);
  const m = FC.includes(u.month) ? u.month : FC[4];
  const months = [...LY12, ...FC];
  const markers = new Set(FC.filter((mm) => cellEvents(skus, rets, mm).length));
  const cur = months.map((mm) => (FC.includes(mm) || mm === LY12[11] ? sumUnits(skus, rets, [mm], now) : null));
  const act = months.map((mm) => (HIST.includes(mm) ? sumUnits(skus, rets, [mm], now) : null));
  const pl = months.map((mm) => (FC.includes(mm) ? sumUnits(skus, rets, [mm], plan) : null));
  const wi = months.map((mm) => (FC.includes(mm) ? sumUnits(skus, rets, [mm], what) : null));
  const ly = months.map((mm) => sumUnits(skus, rets, [shiftY(mm, -1)], now) || null);
  const hasPending = S.assumptions.some((a) => a.status === "pending" && skus.some((s) => a.skus.includes(s)) && rets.some((r) => a.retailers.includes(r)));
  const curV = sumUnits(skus, rets, [m], now), planV = sumUnits(skus, rets, [m], plan), lyV = sumUnits(skus, rets, [shiftY(m, -1)], now);
  const ev = cellEvents(skus, rets, m);
  const pendHere = S.assumptions.filter((a) => a.status === "pending" && skus.some((s) => rets.some((r) => affects(a, s, r, m))));
  const activeHere = now.filter((a) => skus.some((s) => rets.some((r) => affects(a, s, r, m))));
  const base = skus.reduce((t, s) => t + rets.reduce((tt, r) => tt + baselineFc(s, r, m), 0), 0);
  const list = S.assumptions.filter((a) => skus.some((s) => a.skus.includes(s)) && rets.some((r) => a.retailers.includes(r))).sort((a, b) => (b.decidedAt || b.createdAt).localeCompare(a.decidedAt || a.createdAt));
  const title = u.sku === "ALL" ? "All SKUs" : skuById(u.sku).name;
  const series = [
    { name: "Forecast", values: cur, color: "var(--accent)", width: 2.6 },
    { name: "Actual", values: act, color: "var(--ink)", width: 2 },
    { name: "September plan", values: pl, color: "var(--ink-3)", dash: "5 5", width: 1.6 },
    { name: "Year ago", values: ly, color: "var(--line-2)", width: 1.5 },
    ...(hasPending ? [{ name: "If pending items are accepted", values: wi, color: "var(--weft)", dash: "2 4", width: 1.6 }] : []),
  ];
  return (
    <>
      <Head title={title} sub={`${u.ret === "ALL" ? "All retailers" : retById(u.ret).name}. Every change to the forecast: when it happened, why, and who said it.`} />
      <div className="row">
        <label className="small" htmlFor="tl-sku">SKU</label>
        <select id="tl-sku" value={u.sku} onChange={(e) => update((s) => { s.ui.sku = e.target.value; })}><option value="ALL">All SKUs</option>{SKUS.map((s) => <option key={s.id} value={s.id}>{s.short}</option>)}</select>
        <label className="small" htmlFor="tl-ret">Retailer</label>
        <select id="tl-ret" value={u.ret} onChange={(e) => update((s) => { s.ui.ret = e.target.value; })}><option value="ALL">All retailers</option>{RETAILERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      </div>
      <div className="grid2">
        <section className="card stack" aria-labelledby="ch-h">
          <div className="row between"><h2 id="ch-h">Units by month</h2></div>
          <Legend items={series.map((s) => ({ name: s.name, color: s.color, dash: !!s.dash, width: s.width }))} />
          <div className="chart-box"><TrendChart months={months} series={series} todayIdx={LY12.length - 1} markers={markers} selected={months.indexOf(m)} onPick={(mm) => FC.includes(mm) && update((s) => { s.ui.month = mm; })} /></div>
          <p className="small muted">Actuals are NielsenIQ retail sales. Rust dots mark forecast months changed by an accepted assumption. Select a forecast month to see why.</p>
        </section>
        <section className="card stack" aria-labelledby="why-h">
          <div className="eyebrow">Selected month</div>
          <h2 id="why-h">{mLabel(m)}: {fU(curV)} units</h2>
          <p className="small">{planV ? <><span className={"num " + dcls(curV - planV)}>{sg(curV - planV, fU)} ({sp((curV / planV - 1) * 100)})</span> vs the September plan of <span className="num">{fU(planV)}</span>{lyV ? <>; <span className={"num " + dcls(curV - lyV)}>{sp((curV / lyV - 1) * 100)}</span> vs a year ago</> : null}.</> : "No volume was planned for this month in September."}</p>
          <ol className="steps">
            <li><div className="rail-dot"><span />{ev.length ? <em /> : null}</div><div className="body"><div className="small muted">Sep 28 · September consensus</div><div className="num">{fU(planV)}</div><div className="small">Texere baseline: last year's sales pattern, current distribution and price, and the recurring trade calendar.</div></div></li>
            {ev.map((e, i) => { const c = capById(e.a.capture) || {}; const last = i === ev.length - 1; return (
              <li key={e.a.id} className={"chg" + (last ? " now" : "")}><div className="rail-dot"><span />{last ? null : <em />}</div><div className="body">
                <div className="small muted">{fDate(e.a.decidedAt)} · {c.title} · {c.team}</div>
                <div className="num">{fU(e.from)} → {fU(e.to)} <span className={dcls(e.to - e.from)}>{sg(e.to - e.from, fU)}</span></div>
                <div className="small">{e.a.summary}{e.a.supersedes ? <span className="muted"> (replaces {e.a.supersedes})</span> : null}</div>
                <div className="small muted" style={{ fontStyle: "italic" }}>“{e.a.quote}” — {c.person}</div>
              </div></li>); })}
          </ol>
          {pendHere.length > 0 && <div className="stack" style={{ gap: 6 }}><div className="eyebrow">Waiting for review</div>{pendHere.map((a) => <div key={a.id} className="row between small"><span>{a.summary}</span><span className="row" style={{ gap: 6 }}><span className={"num " + dcls(a.impact)}>{sp(a.impact)}</span><a href="#review">Review</a></span></div>)}</div>}
          <details><summary>How {fU(curV)} is built</summary>
            <div className="small stack" style={{ gap: 4, marginTop: 8 }}>
              <div className="row between"><span>Texere baseline (model)</span><span className="num">{fU(base)}</span></div>
              {activeHere.map((a) => <div key={a.id} className="row between"><span>{a.id} · {DRIVERS[a.driver]} {sp(a.impact)}</span><span className="muted">{a.summary.slice(0, 48)}{a.summary.length > 48 ? "…" : ""}</span></div>)}
              <div className="row between" style={{ borderTop: "1px solid var(--line)", paddingTop: 4 }}><span>Forecast</span><span className="num">{fU(curV)}</span></div>
            </div>
          </details>
        </section>
      </div>
      <section className="stack" aria-labelledby="hist-h">
        <h2 id="hist-h">Assumption history for this selection</h2>
        <div className="tbl-wrap"><table>
          <thead><tr><th>Date</th><th>ID</th><th>What changed</th><th>Months</th><th className="n">Impact</th><th>Said by</th><th>Status</th></tr></thead>
          <tbody>{list.length ? list.map((a) => { const c = capById(a.capture) || {}; return (
            <tr key={a.id} className="click" tabIndex={0} onClick={() => update((s) => { s.ui.month = a.months[0]; })}>
              <td className="small nowrap">{fDate(a.decidedAt || a.createdAt)}</td><td className="mono">{a.id}</td><td style={{ minWidth: 260 }}>{a.summary}</td><td className="small nowrap">{mRange(a.months)}</td>
              <td className={"n " + dcls(a.impact)}>{sp(a.impact)}</td><td className="small" style={{ minWidth: 140 }}>{c.person}<br /><span className="muted">{c.title}</span></td><td><StatusChip a={a} /></td>
            </tr>); }) : <tr><td colSpan={7}><Empty>No assumptions touch this selection yet.</Empty></td></tr>}</tbody>
        </table></div>
      </section>
    </>
  );
}
