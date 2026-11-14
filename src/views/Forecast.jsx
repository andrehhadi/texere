import React from "react";
import { useStore, update, activeAt, NOW, PLAN, supplyRows, getState } from "../store.js";
import { SKUS, RETAILERS, FC, LY12, ALL_S, ALL_R, TODAY, ROLES, skuList, skuById, mLabel, shiftY } from "../data/catalog.js";
import { sumUnits, forecastCell, affects, backtest, driversOf } from "../engine/model.js";
import { Head, Kpi, Toggle, SimTag, toast } from "../ui/common.jsx";
import { fK, fU, sp, sg, dcls, fDate } from "../ui/format.js";
import { saveFile } from "../ai.js";
import { go } from "../nav.js";

export function forecastCsv() {
  const act = activeAt(NOW()), plan = activeAt(PLAN);
  const lines = [["Item", "UPC", "Item description", "Customer", "Period", "Forecast units", "September plan units", "Last year units", "Planned %ACV", "Planned base price", "Change reasons"].join(",")];
  for (const s of SKUS) for (const r of RETAILERS) for (const m of FC) {
    const d = driversOf(s.id, r.id, m);
    const rs = act.filter((a) => affects(a, s.id, r.id, m)).map((a) => a.id + ": " + a.summary).join(" | ");
    lines.push([s.code, s.upc, `"${s.name}"`, r.name, m, Math.round(forecastCell(s.id, r.id, m, act)), Math.round(forecastCell(s.id, r.id, m, plan)), Math.round(sumUnits([s.id], [r.id], [shiftY(m, -1)], act)), d.acv.toFixed(1), d.basePrice.toFixed(2), `"${rs.replace(/"/g, "'")}"`].join(","));
  }
  return lines.join("\n");
}
export async function exportForecast() {
  const r = await saveFile("texere-forecast.csv", forecastCsv(), "text/csv");
  if (r === "saved") toast("Forecast exported.");
}
export function publish() {
  const S = getState();
  const n = supplyRows().length;
  if (!n) { toast(S.engine === "o9" ? "Nothing new to send. o9 already has the current assumptions." : "Nothing new to publish. Supply already has the current forecast."); return; }
  update((s) => {
    s.seq++; s.lastSync = TODAY + "#" + String(s.seq).padStart(3, "0");
    s.syncLog.push({ at: TODAY, by: ROLES[s.role].person, note: s.engine === "o9" ? `Sent ${n} changed SKU-month${n === 1 ? "" : "s"} to o9 as demand assumptions (simulated)` : `Published ${n} changed SKU-month${n === 1 ? "" : "s"} to supply planning`, cells: SKUS.length * RETAILERS.length * FC.length });
    s.acks = {};
  });
  toast(S.engine === "o9" ? `Sent to o9 (simulated). ${n} change${n === 1 ? "" : "s"}.` : `Published to supply. ${n} change${n === 1 ? "" : "s"}.`);
}

export default function Forecast() {
  const S = useStore();
  const u = S.ui;
  const act = activeAt(NOW(), u.fcPending), plan = activeAt(PLAN);
  const skus = skuList(u.fcSku);
  const bt = backtest(ALL_S, ALL_R);
  const tN = sumUnits(ALL_S, ALL_R, FC, act), tLY = sumUnits(ALL_S, ALL_R, LY12, act), tP = sumUnits(ALL_S, ALL_R, FC, plan);
  const rows = u.fcGroup === "sku"
    ? skus.map((s) => ({ label: skuById(s).short, sub: skuById(s).code, skus: [s], rets: ALL_R, kids: RETAILERS.map((r) => ({ label: r.name, skus: [s], rets: [r.id] })) }))
    : RETAILERS.map((r) => ({ label: r.name, sub: "", skus, rets: [r.id], kids: skus.map((s) => ({ label: skuById(s).short, skus: [s], rets: [r.id] })) }));
  const open = (r) => { update((s) => { s.ui.sku = r.skus.length === 1 ? r.skus[0] : "ALL"; s.ui.ret = r.rets.length === 1 ? r.rets[0] : "ALL"; }); go("timeline"); };
  const Row = ({ r, kid }) => {
    const tot = sumUnits(r.skus, r.rets, FC, act), ly = sumUnits(r.skus, r.rets, LY12, act);
    return (
      <tr className="click" tabIndex={0} onClick={() => open(r)}>
        <td className="sticky" style={{ minWidth: kid ? 170 : 190, paddingLeft: kid ? 26 : undefined, color: kid ? "var(--ink-2)" : undefined, fontWeight: kid ? 400 : 600 }}>{r.label}{r.sub ? <div className="small muted mono" style={{ fontWeight: 400 }}>{r.sub}</div> : null}</td>
        {FC.map((m) => { const v = sumUnits(r.skus, r.rets, [m], act), p = sumUnits(r.skus, r.rets, [m], plan); return <td key={m} className={"n" + (Math.abs(v - p) > 1 ? " cell-chg" : "")} title={Math.abs(v - p) > 1 ? `September plan ${fU(p)}` : undefined}>{fK(v)}</td>; })}
        <td className="n" style={{ fontWeight: 600 }}>{fK(tot)}</td><td className={"n " + dcls(tot - ly)}>{ly ? sp((tot / ly - 1) * 100) : "new"}</td>
      </tr>
    );
  };
  return (
    <>
      <Head title="Forecast and splits" sub="Texere builds the forecast: a driver model fit on NielsenIQ history (distribution, price, promotion, display, seasonality, trend), plus every accepted assumption from your teams.">
        <button className="btn" type="button" onClick={exportForecast}>Export CSV</button>
        <button className="btn primary" type="button" onClick={publish}>{S.engine === "o9" ? "Send to o9" : "Publish to supply"}</button>
      </Head>
      <div className="engine-bar">
        <div><b>Forecast engine:</b> {S.engine === "o9" ? <>o9 computes the final numbers; Texere sends it structured assumptions <SimTag>o9 connection simulated</SimTag></> : <>Texere (driver model + context)</>}</div>
        <button className="btn sm ghost" type="button" onClick={() => go("settings")}>Change in Settings</button>
      </div>
      <div className="grid-kpi">
        <Kpi label="Next 12 months" value={fK(tN) + " units"} sub={`${sp((tN / tLY - 1) * 100)} vs the last 12 months`} />
        <Kpi label="vs September consensus" value={sg(tN - tP)} vClass={dcls(tN - tP)} sub={sp((tN / tP - 1) * 100)} />
        <Kpi label="Backtest accuracy" value={(bt.withContext * 100).toFixed(1) + "%"} sub={`vs ${(bt.noContext * 100).toFixed(1)}% without captured context, last 12 months`} />
        <Kpi label="Last published" value={fDate(S.lastSync.slice(0, 10))} sub={S.engine === "o9" ? "to o9" : "to supply planning"} />
      </div>
      <div className="row">
        <span className="small">Split by</span>
        <Toggle label="Split by" value={u.fcGroup} onChange={(v) => update((s) => { s.ui.fcGroup = v; })} options={[["sku", "SKU, then retailer"], ["ret", "Retailer, then SKU"]]} />
        <label className="small" htmlFor="fc-sku">SKU</label>
        <select id="fc-sku" value={u.fcSku} onChange={(e) => update((s) => { s.ui.fcSku = e.target.value; })}><option value="ALL">All SKUs</option>{SKUS.map((s) => <option key={s.id} value={s.id}>{s.short}</option>)}</select>
        <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={u.fcPending} onChange={(e) => update((s) => { s.ui.fcPending = e.target.checked; })} /> Include items waiting for review (what-if)</label>
      </div>
      <div className="tbl-wrap"><table>
        <thead><tr><th className="sticky">{u.fcGroup === "sku" ? "SKU / retailer" : "Retailer / SKU"}</th>{FC.map((m) => <th key={m} className="n">{mLabel(m)}</th>)}<th className="n">12 mo</th><th className="n">vs LY</th></tr></thead>
        <tbody>
          {rows.map((r) => <React.Fragment key={r.label}><Row r={r} />{r.kids.map((k) => <Row key={k.label} r={k} kid />)}</React.Fragment>)}
          <tr><td className="sticky" style={{ fontWeight: 700 }}>Total</td>{FC.map((m) => <td key={m} className="n" style={{ fontWeight: 600 }}>{fK(sumUnits(skus, ALL_R, [m], act))}</td>)}<td className="n" style={{ fontWeight: 700 }}>{fK(sumUnits(skus, ALL_R, FC, act))}</td><td /></tr>
        </tbody>
      </table></div>
      <p className="small muted">{u.fcPending ? "What-if view including items still waiting for review. These numbers are not published." : "Rust numbers changed since the September plan; hover for the plan value. Select any row to open its timeline."}</p>
    </>
  );
}
