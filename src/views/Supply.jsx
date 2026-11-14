import React, { useState } from "react";
import { useStore, update, stamp, me } from "../store.js";
import { WEEKS, wLabel, skuById, ROLES } from "../data/catalog.js";
import { supplyPlan, HORIZON } from "../engine/supply.js";
import { openAssm, ask } from "../actions.js";
import { FilterBar, useScope } from "../ui/filters.jsx";
import { Card, Kpi, Badge, Btn, Drawer, Empty, Delta, Seg, DriverTag, cx, toast } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { InventoryChart } from "../ui/charts.jsx";
import { fK, fU, sg, sp, fDate, plural } from "../ui/format.js";

const ST_T = { "Stock-out risk": "bad", "Below safety stock": "warn", "Excess risk": "brand", Changed: "neutral", "No change": "outline" };
const wkEnd = (i) => fDate(WEEKS[i].end);

export default function Supply() {
  const { S, skus } = useScope();
  const [open, setOpen] = useState(null);
  const [only, setOnly] = useState("all");
  const plans = skus.map(supplyPlan).filter((p) => p.inv && (p.rows.some((r) => r.current > 0) || p.inv.onHand > 0));
  const shown = plans.filter((p) => only === "all" || (only === "risk" ? p.firstRisk || p.excess : Math.abs(p.d13) >= 1));
  const risk = plans.filter((p) => p.firstRisk), excess = plans.filter((p) => !p.firstRisk && p.excess);
  const frozen = plans.reduce((t, p) => t + p.dFrozen, 0), d13 = plans.reduce((t, p) => t + p.d13, 0), pub13 = plans.reduce((t, p) => t + p.pub13, 0);
  const acked = (sku) => S.acks?.[sku];
  return (
    <>
      <div className="ph">
        <div><h1>Supply view</h1><p className="sub">What changed in demand since the last publish, where it lands against the production freeze, and the projected inventory for the next 26 weeks. Every change links to the conversation behind it.</p></div>
        <div className="ph-a"><Badge t="outline">Last publish {fDate(S.lastSync)} · {S.syncLog[0]?.by}</Badge><Badge t="outline">Frozen: weeks 1–4 · Slushy: 5–13 · Liquid: 14+</Badge></div>
      </div>
      <FilterBar noRetailer />
      <div className="kpis">
        <Kpi label="Stock-out or below safety" value={risk.length} foot={risk.map((p) => skuById(p.sku).short).join(", ") || "None in 26 weeks"} />
        <Kpi label="Excess inventory risk" value={excess.length} foot={excess.map((p) => skuById(p.sku).short).join(", ") || "None"} />
        <Kpi label="Demand change, frozen zone" value={sg(frozen)} delta={frozen} deltaText="units, weeks 1–4" />
        <Kpi label="Demand change, 13 weeks" value={sg(d13)} delta={d13} deltaText={sp(pub13 ? (d13 / pub13) * 100 : 0) + " vs published"} />
        <Kpi label="Acknowledged" value={`${Object.keys(S.acks || {}).filter((k) => skus.includes(k)).length} / ${plans.filter((p) => Math.abs(p.d13) >= 1).length}`} foot="changed SKUs reviewed by supply" />
      </div>
      <Card pad={false} id="heat" title="Projected inventory status by week" sub="Each cell is one week. Click a row for the detail." actions={<div className="row small" style={{ gap: 12 }}>
        <span className="row" style={{ gap: 5 }}><i className="hk-ok" style={{ width: 12, height: 12, borderRadius: 3, display: "inline-block" }} />Healthy</span><span className="row" style={{ gap: 5 }}><i className="hk-below" style={{ width: 12, height: 12, borderRadius: 3, display: "inline-block" }} />Below safety</span><span className="row" style={{ gap: 5 }}><i className="hk-stockout" style={{ width: 12, height: 12, borderRadius: 3, display: "inline-block" }} />Stock-out</span><span className="row" style={{ gap: 5 }}><i className="hk-excess" style={{ width: 12, height: 12, borderRadius: 3, display: "inline-block" }} />Excess (&gt;14 wks)</span></div>}>
        <div style={{ padding: "12px 18px 16px", overflowX: "auto" }}>
          <div className="heat" style={{ minWidth: 640 }}>
            <div className="heat-r xs muted"><span />{plans[0]?.rows.map((r, i) => <span key={i} style={{ textAlign: "center", fontSize: 10 }}>{i % 4 === 0 ? wLabel(r.i) : ""}</span>)}</div>
            {plans.map((p) => (
              <div className="heat-r" key={p.sku}>
                <span className="hl" onClick={() => setOpen(p.sku)}>{skuById(p.sku).short}</span>
                {p.rows.map((r, i) => <span key={i} className={cx("hc", r.current === 0 && r.onHand <= 0 ? "hk-none" : "hk-" + r.status)} title={`w/e ${wkEnd(r.i)}: on hand ${fU(r.onHand)}, ${r.wos.toFixed(1)} weeks of supply`} onClick={() => setOpen(p.sku)} style={i === 3 ? { marginRight: 3 } : i === 12 ? { marginRight: 3 } : undefined} />)}
              </div>
            ))}
          </div>
        </div>
      </Card>
      <Card pad={false} id="sku" title="Demand changes since the last publish" sub="Units. Published = what the production plan was built on."
        actions={<Seg size="sm" value={only} onChange={setOnly} options={[["all", "All SKUs"], ["changed", "Changed"], ["risk", "At risk"]]} label="Show" />}>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>SKU</th><th>Plant</th><th className="r">On hand</th><th className="r">Weeks of supply</th><th className="r">Frozen (1–4)</th><th className="r">Slushy (5–13)</th><th className="r">Liquid (14–26)</th><th>First risk</th><th>Status</th><th>Why it changed</th><th /></tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={11}><Empty>Nothing to show.</Empty></td></tr>}
            {shown.map((p) => {
              const sl = p.d13 - p.dFrozen, lq = p.d26 - p.d13;
              return (
                <tr key={p.sku} className="click" onClick={() => setOpen(p.sku)}>
                  <td><div className="name">{skuById(p.sku).short}</div><div className="meta">{skuById(p.sku).code}</div></td>
                  <td className="small">{p.inv.plant}<div className="meta">Lead time {p.inv.leadWks} wks</div></td>
                  <td className="r num">{fK(p.inv.onHand)}</td>
                  <td className={cx("r num", p.wosNow < p.inv.safetyWks && "dn")}>{p.wosNow > 50 ? "–" : p.wosNow.toFixed(1)}</td>
                  {[p.dFrozen, sl, lq].map((v, i) => <td key={i} className={cx("r num", v > 0.5 ? "up" : v < -0.5 ? "dn" : "muted")} style={i === 0 && Math.abs(v) >= 1 ? { fontWeight: 600 } : undefined}>{Math.abs(v) < 1 ? "–" : sg(v)}</td>)}
                  <td className="small">{p.firstRisk ? <span className="dn">w/e {wkEnd(p.firstRisk.i)}</span> : p.excess ? <span style={{ color: "var(--brand)" }}>Excess w/e {wkEnd(p.excess.i)}</span> : <span className="muted">None</span>}</td>
                  <td><Badge t={ST_T[p.status]} dot>{p.status}</Badge></td>
                  <td className="small">{p.reasons.length ? p.reasons.map((a) => <button key={a.id} type="button" className="link" style={{ marginRight: 6 }} onClick={(e) => { e.stopPropagation(); openAssm(a.id); }}>{a.id}</button>) : <span className="muted">–</span>}</td>
                  <td>{acked(p.sku) ? <Badge t="good"><Icon name="check" size={11} />Reviewed</Badge> : Math.abs(p.d13) >= 1 ? <Btn size="sm" onClick={(e) => { e.stopPropagation(); update((s) => { s.acks[p.sku] = { by: me().person, at: stamp() }; }); toast(`${skuById(p.sku).short} marked as reviewed.`); }}>Acknowledge</Btn> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </Card>
      {S.supplyActions.length > 0 && (
        <Card id="act" title="Supply actions" sub="Requests raised from this view">
          <div className="tbl-wrap"><table className="tbl"><thead><tr><th>When</th><th>SKU</th><th>Action</th><th>By</th></tr></thead>
            <tbody>{S.supplyActions.map((x, i) => <tr key={i}><td className="num small">{x.at}</td><td>{skuById(x.sku).short}</td><td>{x.text}</td><td>{x.by}</td></tr>)}</tbody></table></div>
        </Card>
      )}
      <SkuDrawer sku={open} onClose={() => setOpen(null)} />
    </>
  );
}

function SkuDrawer({ sku, onClose }) {
  const S = useStore();
  const [q, setQ] = useState("");
  if (!sku) return null;
  const p = supplyPlan(sku); const s = skuById(sku);
  const act = (text) => { update((x) => { x.supplyActions.unshift({ at: stamp(), sku, text, by: me().person }); }); toast(text + " logged."); };
  return (
    <Drawer open onClose={onClose} width={760} label={s.name}>
      <div className="dr-h" style={{ paddingBottom: 14 }}>
        <div className="row between"><span className="eyebrow">{s.code} · {p.inv.plant}</span><button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        <h2 style={{ fontSize: 18 }}>{s.name}</h2>
        <div className="row"><Badge t={ST_T[p.status]} dot>{p.status}</Badge><span className="small muted">On hand {fU(p.inv.onHand)} · safety stock {p.inv.safetyWks} weeks · lead time {p.inv.leadWks} weeks</span></div>
      </div>
      <div className="dr-b">
        <InventoryChart rows={p.rows} labels={p.rows.map((r) => wLabel(r.i))} />
        {p.reasons.length > 0 && <div className="stack"><div className="eyebrow">Why demand changed since the last publish</div>
          {p.reasons.map((a) => <button key={a.id} type="button" className="br" style={{ border: "1px solid var(--line)", background: "none", textAlign: "left", display: "grid", gridTemplateColumns: "1fr auto" }} onClick={() => openAssm(a.id)}><span className="small"><span className="num muted">{a.id}</span> {a.summary}</span><DriverTag d={a.driver} /></button>)}</div>}
        <div className="tbl-wrap" style={{ maxHeight: 300 }}><table className="tbl wk-tbl">
          <thead><tr><th>Week ending</th><th>Zone</th><th className="r">Published</th><th className="r">Demand now</th><th className="r">Change</th><th className="r">Planned supply</th><th className="r">On hand</th><th className="r">WOS</th></tr></thead>
          <tbody>{p.rows.map((r) => (
            <tr key={r.i} style={r.status === "stockout" || r.status === "below" ? { background: "var(--bad-soft)" } : undefined}>
              <td className="num">{wkEnd(r.i)}</td><td><span className="zone" style={{ color: r.zone === "Frozen" ? "var(--bad)" : r.zone === "Slushy" ? "var(--warn)" : "var(--good)" }}><i style={{ background: "currentColor" }} />{r.zone}</span></td>
              <td className="r num">{fK(r.published)}</td><td className="r num">{fK(r.current)}</td><td className={cx("r num", r.delta > 0.5 ? "up" : r.delta < -0.5 ? "dn" : "muted")}>{Math.abs(r.delta) < 1 ? "–" : sg(r.delta)}</td>
              <td className="r num">{fK(r.inbound)}</td><td className={cx("r num", r.onHand < 0 && "dn")}>{fK(r.onHand)}</td><td className="r num">{r.wos > 50 ? "–" : r.wos.toFixed(1)}</td>
            </tr>
          ))}</tbody>
        </table></div>
        <div className="stack"><div className="eyebrow">Ask the brand team</div>
          <div className="compose"><textarea rows={2} value={q} onChange={(e) => setQ(e.target.value)} placeholder={p.reasons[0] ? `e.g. Is ${p.reasons[0].id} locked? We'd need to move a run forward.` : "Ask about this SKU's demand"} aria-label="Question for the brand team" />
            <Btn size="sm" kind="primary" icon="send" disabled={!q.trim() || !p.reasons[0]} onClick={() => { ask(p.reasons[0].id, q.trim(), ROLES.bm.person); setQ(""); }}>Send</Btn></div>
          {!p.reasons[0] && <p className="xs muted">No assumption changed this SKU since the last publish.</p>}
        </div>
      </div>
      <div className="dr-f">
        <Btn kind="primary" icon="check" onClick={() => { update((x) => { x.acks[sku] = { by: me().person, at: stamp() }; }); toast("Marked as reviewed."); }}>Acknowledge change</Btn>
        {p.firstRisk && <Btn icon="zap" onClick={() => act(`Expedite request: pull the next ${s.short} run forward ${Math.max(1, Math.ceil(-Math.min(0, p.firstRisk.onHand - p.firstRisk.safety) / Math.max(1, p.firstRisk.current)))} week(s)`)}>Request expedite</Btn>}
        {p.excess && <Btn icon="arrowDown" onClick={() => act(`Reduce planned production of ${s.short} from w/e ${wkEnd(p.excess.i)}`)}>Reduce production</Btn>}
      </div>
    </Drawer>
  );
}
