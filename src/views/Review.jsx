import React, { useState } from "react";
import { useStore, update, activeAt, NOW, unitImpact, statusOf, capById, assm } from "../store.js";
import { DRIVERS, TODAY, ROLES } from "../data/catalog.js";
import { Head, Icon, Chip, StatusChip, ConfChip, Empty, Toggle, toast } from "../ui/common.jsx";
import { sg, sp, fU, dcls, fDate, skuNames, retNames, mRange } from "../ui/format.js";
import { Thread } from "./parts.jsx";
import { go } from "../nav.js";

export default function Review() {
  const S = useStore();
  const pend = S.assumptions.filter((a) => a.status === "pending").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const f = S.ui.reviewFilter;
  const all = S.assumptions.filter((a) => f === "all" || statusOf(a) === f).sort((a, b) => (b.decidedAt || b.createdAt).localeCompare(a.decidedAt || a.createdAt));
  const now = activeAt(NOW());
  const openSku = (a) => { update((s) => { s.ui.sku = a.skus[0]; s.ui.ret = a.retailers.length === 1 ? a.retailers[0] : "ALL"; s.ui.month = a.months[0]; }); go("timeline"); };
  return (
    <>
      <Head title="Review assumptions" sub="Each card is one thing a team said that changes the forecast. Ask the person who raised it if you need more context, then accept it into the numbers or reject it." />
      <section className="stack" aria-labelledby="pend-h">
        <h2 id="pend-h">Waiting for review ({pend.length})</h2>
        {pend.length ? pend.map((a) => <ReviewCard key={a.id} a={a} now={now} />) : <Empty>You're all caught up.</Empty>}
      </section>
      <section className="stack" aria-labelledby="all-h">
        <div className="row between"><h2 id="all-h">All assumptions this cycle</h2>
          <Toggle label="Filter by status" value={f} onChange={(v) => update((s) => { s.ui.reviewFilter = v; })} options={[["all", "All"], ["approved", "In forecast"], ["pending", "Needs review"], ["superseded", "Replaced"], ["rejected", "Rejected"]]} /></div>
        <div className="tbl-wrap"><table>
          <thead><tr><th>ID</th><th>Assumption</th><th>Driver</th><th>Where and when</th><th className="n">Impact</th><th className="n">Units</th><th>Source</th><th>Status</th></tr></thead>
          <tbody>{all.length ? all.map((a) => { const c = capById(a.capture) || {}; const u = statusOf(a) === "approved" ? unitImpact(a, now) : null; const t = S.threads?.[a.id]; return (
            <tr key={a.id} className="click" tabIndex={0} onClick={() => openSku(a)} onKeyDown={(e) => e.key === "Enter" && openSku(a)}>
              <td className="mono">{a.id}</td><td style={{ minWidth: 240 }}>{a.summary}{t?.messages.length ? <span className="small muted"> · {t.messages.length} message{t.messages.length === 1 ? "" : "s"}</span> : null}</td><td>{DRIVERS[a.driver]}</td>
              <td className="small" style={{ minWidth: 180 }}>{skuNames(a.skus)}<br /><span className="muted">{retNames(a.retailers)} · {mRange(a.months)}</span></td>
              <td className={"n " + dcls(a.impact)}>{sp(a.impact)}</td><td className={"n " + (u === null ? "muted" : dcls(u))}>{u === null ? "–" : sg(u)}</td>
              <td className="small" style={{ minWidth: 150 }}>{c.title}<br /><span className="muted">{c.person} · {fDate(a.createdAt)}</span></td><td><StatusChip a={a} /></td>
            </tr>); }) : <tr><td colSpan={8} className="muted">No assumptions with this status.</td></tr>}</tbody>
        </table></div>
      </section>
    </>
  );
}

function ReviewCard({ a, now }) {
  const S = useStore();
  const c = capById(a.capture) || {};
  const sup = a.supersedes ? assm(a.supersedes) : null;
  const u = unitImpact(a, now);
  const [open, setOpen] = useState(!!S.threads?.[a.id]?.messages.length);
  const t = S.threads?.[a.id];
  function decide(status) {
    update((s) => {
      const x = s.assumptions.find((y) => y.id === a.id);
      x.status = status; x.decidedAt = TODAY;
      if (status === "approved") { x.seq = ++s.seq; if (x.supersedes) { const tt = s.assumptions.find((y) => y.id === x.supersedes); if (tt && tt.status === "pending") tt.status = "replaced"; } s.ui.sku = x.skus[0]; s.ui.ret = x.retailers.length === 1 ? x.retailers[0] : "ALL"; s.ui.month = x.months[0]; }
      if (s.threads?.[a.id]?.status === "open") s.threads[a.id].status = "resolved";
    });
    toast(status === "approved" ? `${a.id} is now in the forecast.` : `${a.id} rejected. It stays in the history.`, status === "approved" ? ["timeline", "See the timeline"] : null);
  }
  return (
    <article className="assm pending" aria-label={a.summary}>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}><div className="eyebrow">{a.id} · {DRIVERS[a.driver]}</div><h3 style={{ fontSize: 15, marginTop: 4 }}>{a.summary}</h3></div>
        <div className="row" style={{ gap: 6 }}>{t?.status === "open" && <Chip tone="warn">Question open</Chip>}<ConfChip c={a.confidence} /></div>
      </div>
      <div className="kv">
        <div><span>SKUs</span><span>{skuNames(a.skus)}</span></div>
        <div><span>Retailers</span><span>{retNames(a.retailers)}</span></div>
        <div><span>Months</span><span>{mRange(a.months)}</span></div>
        <div><span>Units if accepted</span><span className={"num " + dcls(u)}>{sg(u, fU)}</span></div>
      </div>
      <p className="quote">“{a.quote}”<br /><span className="small" style={{ fontStyle: "normal" }}><Icon name={c.kind} size={13} /> {c.title} · {c.person} ({c.team}) · {fDate(c.date || a.createdAt)}</span></p>
      {a.rationale && <p className="small muted">Why this impact: {a.rationale}</p>}
      {sup && <p className="small">Replaces <b>{sup.id}</b> ({sup.summary}, {sp(sup.impact)}) once accepted.</p>}
      <div className="row between">
        <div className="row">
          <label htmlFor={"imp-" + a.id} className="small">Volume impact</label>
          <input id={"imp-" + a.id} className="impact-in num" type="number" step="1" min="-100" max="300" value={a.impact}
            onChange={(e) => { const v = Number(e.target.value); if (isFinite(v)) update((s) => { s.assumptions.find((y) => y.id === a.id).impact = Math.max(-100, Math.min(300, v)); }); }} />
          <span className="small muted">% in each month</span>
          <button className="btn sm ghost" type="button" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="chat" size={15} /> {open ? "Hide discussion" : t?.messages.length ? `Discussion (${t.messages.length})` : `Ask ${c.person?.split(" ")[0] || "a question"}`}</button>
        </div>
        <div className="row"><button className="btn" type="button" onClick={() => decide("rejected")}>Reject</button><button className="btn good" type="button" onClick={() => decide("approved")}>Accept into forecast</button></div>
      </div>
      {open && <Thread a={a} />}
    </article>
  );
}
