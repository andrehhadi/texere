import React, { useState } from "react";
import { useStore, update, activeAt, NOW, PLAN, key } from "../store.js";
import { FC_MONTHS, HIST_MONTHS, FCW, NH, mLabel, wLabel, weeksInMonth, shiftYM, skuById, retById, WEEKS, ALL_R } from "../data/catalog.js";
import { PERIODS, units, monthUnits, accuracy, compWeeks } from "../engine/analytics.js";
import { publish } from "../actions.js";
import { saveFile } from "../ai.js";
import { FilterBar, useScope } from "../ui/filters.jsx";
import { Card, Kpi, Seg, Btn, Badge, Delta, cx, toast } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { Lines } from "../ui/charts.jsx";
import { fK, fU, sg, sp, fDate, plural } from "../ui/format.js";

export default function Forecast({ go }) {
  const { S, skus, rets, label } = useScope();
  const now = activeAt(NOW()), plan = activeAt(PLAN), withP = activeAt(NOW(), true), pub = activeAt(S.lastSync);
  const [grain, setGrain] = useState(S.ui.fcGrain || "month");
  const [mode, setMode] = useState("units");
  const [pend, setPend] = useState(false);
  const act = pend ? withP : now;
  const N13 = PERIODS.N13W.weeks, N52 = PERIODS.N52W.weeks;
  const u13 = units(skus, rets, N13, act), p13 = units(skus, rets, N13, plan), y13 = units(skus, rets, compWeeks("N13W", "YA"), now);
  const u52 = units(skus, rets, N52, act), p52 = units(skus, rets, N52, plan), y52 = units(skus, rets, compWeeks("N52W", "YA"), now);
  const acc = accuracy(skus, rets);
  const changed = S.assumptions.filter((a) => a.status === "approved" && key(a) > S.lastSync).length;
  const hm = HIST_MONTHS.slice(-12);
  const cols = grain === "month" ? FC_MONTHS.map((m) => ({ k: m, label: mLabel(m), w: weeksInMonth(m), lyw: weeksInMonth(shiftYM(m, -1)) })) : FCW.slice(0, 26).map((i) => ({ k: i, label: wLabel(i), w: [i], lyw: [i - 52] }));
  const skuRows = skus.filter((s) => units([s], rets, N52, act) > 0 || units([s], rets, N52, plan) > 0);
  const cell = (s, c) => { const v = units(s, rets, c.w, act), p = units(s, rets, c.w, plan), y = units(s, rets, c.lyw, now); return { v, p, y }; };
  const show = (x) => (mode === "units" ? fK(x.v) : mode === "plan" ? (x.p ? sp((x.v / x.p - 1) * 100, 0) : "–") : x.y ? sp((x.v / x.y - 1) * 100, 0) : "new");
  const heat = (x) => { const d = mode === "ly" ? (x.y ? x.v / x.y - 1 : 0) : x.p ? x.v / x.p - 1 : 0; if (Math.abs(d) < 0.005) return {}; const a = Math.min(0.5, Math.abs(d) * 2.2); return { background: `color-mix(in srgb, ${d > 0 ? "var(--good)" : "var(--bad)"} ${Math.round(a * 100)}%, transparent)` }; };
  async function exportCsv() {
    const lines = ["week_ending,retailer,upc,sku,units_forecast,units_plan"];
    for (const s of skus) for (const r of rets) for (const i of N52) lines.push([WEEKS[i].end, r, skuById(s).upc, s, Math.round(units([s], [r], [i], now)), Math.round(units([s], [r], [i], plan))].join(","));
    const res = await saveFile("texere-forecast-o9-import.csv", lines.join("\n"), "text/csv");
    if (res === "saved") toast("Forecast exported in the o9 import format.");
  }
  return (
    <>
      <div className="ph">
        <div><h1>Forecast</h1><p className="sub">Texere's forecast: a NielsenIQ driver baseline (distribution, price, trade calendar, seasonality, trend) adjusted by every approved assumption. Each number traces back to the conversation behind it.</p></div>
        <div className="ph-a">
          <Btn icon="download" onClick={exportCsv}>Export for o9</Btn>
          <Btn kind="primary" icon="send" onClick={publish} disabled={!changed}>{changed ? `Publish ${plural(changed, "change")} to supply` : "Published"}</Btn>
        </div>
      </div>
      <div className={cx("banner", S.engine === "o9" && "warn")}>
        <Icon name={S.engine === "o9" ? "merge" : "zap"} size={16} />
        {S.engine === "o9" ? <span><b>Path B: o9 runs the statistical forecast.</b> Texere sends approved assumptions to o9 as dated overrides and reads the result back. Switch engines in <button className="link" type="button" onClick={() => go("settings")}>Settings</button>.</span>
          : <span><b>Texere runs this forecast.</b> Last published to supply {fDate(S.lastSync)} by {S.syncLog[0]?.by}. {changed ? plural(changed, "approved change") + " since then." : "No changes since."} o9 can be used as the engine instead (<button className="link" type="button" onClick={() => go("settings")}>Settings</button>).</span>}
      </div>
      <FilterBar />
      <div className="kpis">
        <Kpi label="Next 13 weeks" value={fK(u13)} delta={u13 - p13} deltaText={sp((u13 / p13 - 1) * 100) + " vs plan"} foot={sp((u13 / y13 - 1) * 100) + " YoY"} />
        <Kpi label="Next 52 weeks" value={fK(u52)} delta={u52 - p52} deltaText={sp((u52 / p52 - 1) * 100) + " vs plan"} foot={sp((u52 / y52 - 1) * 100) + " YoY"} />
        <Kpi label="Change since plan" value={sg(u52 - p52)} delta={u52 - p52} deltaText="units, 52 wks" />
        <Kpi label="Pending, if approved" value={sg(units(skus, rets, N52, withP) - units(skus, rets, N52, now))} foot={plural(S.assumptions.filter((a) => a.status === "pending").length, "item")} />
        <Kpi label="Backtest accuracy" value={(acc.withContext * 100).toFixed(0) + "%"} delta={acc.withContext - acc.noContext} deltaText={"+" + ((acc.withContext - acc.noContext) * 100).toFixed(0) + " pts from context"} foot={"history only: " + (acc.noContext * 100).toFixed(0) + "%"} />
      </div>
      <Card id="fc" title={label} sub="Monthly units. The forecast starts in November."
        actions={<label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={pend} onChange={(e) => setPend(e.target.checked)} />Include pending items</label>}>
        <Lines height={260} labels={[...hm, ...FC_MONTHS].map(mLabel)} splitAt={12}
          series={[
            { name: "Year ago", color: "var(--faint)", width: 1.5, values: [...hm, ...FC_MONTHS].map((m) => monthUnits(skus, rets, shiftYM(m, -1), now) || null) },
            { name: "Actual", color: "var(--ink-2)", values: [...hm.map((m) => monthUnits(skus, rets, m, now)), ...FC_MONTHS.map(() => null)] },
            { name: "Plan (Sep)", color: "var(--muted)", dash: "5 4", values: [...hm.map(() => null), ...FC_MONTHS.map((m) => monthUnits(skus, rets, m, plan))] },
            { name: "Published to supply", color: "var(--saffron)", dash: "2 3", values: [...hm.map(() => null), ...FC_MONTHS.map((m) => monthUnits(skus, rets, m, pub))] },
            { name: pend ? "Forecast incl. pending" : "Forecast now", color: "var(--brand)", width: 2.6, dots: true, values: [...hm.map((m, i) => (i === 11 ? monthUnits(skus, rets, m, now) : null)), ...FC_MONTHS.map((m) => monthUnits(skus, rets, m, act))] },
          ]} />
      </Card>
      <Card pad={false} id="grid" title="Forecast by SKU" sub={mode === "units" ? "Units. Cell color shows the change vs plan." : mode === "plan" ? "Change vs the September plan" : "Change vs the same period last year"}
        actions={<><Seg size="sm" value={mode} onChange={setMode} options={[["units", "Units"], ["plan", "vs plan"], ["ly", "vs LY"]]} label="Show" /><Seg size="sm" value={grain} onChange={(g) => { setGrain(g); update((s) => { s.ui.fcGrain = g; }); }} options={[["month", "Monthly"], ["week", "Weekly"]]} label="Grain" /></>}>
        <div className="tbl-wrap" style={{ maxHeight: 560 }}><table className="tbl" style={{ fontSize: 12.5 }}>
          <thead><tr><th style={{ position: "sticky", left: 0, zIndex: 2 }}>SKU</th>{cols.map((c) => <th key={c.k} className="r">{c.label}</th>)}<th className="r">Total</th><th className="r">vs plan</th><th className="r">vs LY</th></tr></thead>
          <tbody>
            {skuRows.map((s) => {
              const cs = cols.map((c) => cell([s], c)); const t = cs.reduce((o, x) => ({ v: o.v + x.v, p: o.p + x.p, y: o.y + x.y }), { v: 0, p: 0, y: 0 });
              return <tr key={s}><td style={{ position: "sticky", left: 0, background: "var(--surface)", zIndex: 1 }}><div className="name">{skuById(s).short}</div><div className="meta">{skuById(s).subbrand} · {skuById(s).platform}</div></td>
                {cs.map((x, i) => <td key={i} className="r num" style={heat(x)} title={`Forecast ${fU(x.v)} · plan ${fU(x.p)} · LY ${fU(x.y)}`}>{show(x)}</td>)}
                <td className="r num"><b>{fK(t.v)}</b></td><td className="r"><Delta v={t.v - t.p} small>{t.p ? sp((t.v / t.p - 1) * 100) : "–"}</Delta></td><td className="r"><Delta v={t.v - t.y} small>{t.y ? sp((t.v / t.y - 1) * 100) : "new"}</Delta></td></tr>;
            })}
            {(() => { const cs = cols.map((c) => cell(skuRows, c)); const t = cs.reduce((o, x) => ({ v: o.v + x.v, p: o.p + x.p, y: o.y + x.y }), { v: 0, p: 0, y: 0 }); return (
              <tr className="tot"><td style={{ position: "sticky", left: 0, background: "var(--surface)" }}>Total</td>{cs.map((x, i) => <td key={i} className="r num" style={heat(x)}>{show(x)}</td>)}<td className="r num">{fK(t.v)}</td><td className="r"><Delta v={t.v - t.p} small>{sp((t.v / t.p - 1) * 100)}</Delta></td><td className="r"><Delta v={t.v - t.y} small>{sp((t.v / t.y - 1) * 100)}</Delta></td></tr>); })()}
          </tbody>
        </table></div>
      </Card>
      <Card id="pub" title="Publish history" sub="What supply planning has received">
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Date</th><th>By</th><th>Note</th><th className="r">Cells</th></tr></thead>
          <tbody>{S.syncLog.map((l, i) => <tr key={i}><td className="num">{fDate(l.at)}</td><td>{l.by}</td><td>{l.note}</td><td className="r num">{fU(l.cells)}</td></tr>)}</tbody></table></div>
      </Card>
    </>
  );
}
