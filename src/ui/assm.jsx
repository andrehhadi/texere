import React, { useState, useSyncExternalStore } from "react";
import { useStore, assm, capById, statusOf, replacedBy, activeAt, NOW, PLAN, me } from "../store.js";
import { ROLES, mLabel, weeksInMonth, retById, skuById, KINDS } from "../data/catalog.js";
import { units } from "../engine/analytics.js";
import { impactUnits } from "../engine/stories.js";
import { approve, reject, reopen, editImpact, ask, reply, resolve, getDrawer, subDrawer, closeAssm, openAssm } from "../actions.js";
import { Badge, StatusBadge, DriverTag, ConfTag, Avatar, Btn, Drawer, Tabs, Delta, cx, toast, Spinner } from "./kit.jsx";
import { Icon } from "./icons.jsx";
import { fK, sg, sp, mRange, skuNames, retNames, fDate, fDateTime } from "./format.js";
import { askText, aiAvailable, aiError } from "../ai.js";

export function monthImpacts(a) {
  const act = activeAt(NOW()).filter((x) => x.id !== a.id && x.id !== a.supersedes);
  return a.months.map((m) => {
    const w = weeksInMonth(m);
    const without = units(a.skus, a.retailers, w, act), withA = units(a.skus, a.retailers, w, [...act, a]);
    return { m, d: withA - without, base: without };
  });
}

export function ImpactBox({ a }) {
  const mi = monthImpacts(a);
  const tot = mi.reduce((t, x) => t + x.d, 0), base = mi.reduce((t, x) => t + x.base, 0);
  const max = Math.max(...mi.map((x) => Math.abs(x.d)), 1);
  const st = statusOf(a);
  const prev = a.supersedes && assm(a.supersedes);
  return (
    <div className="imp-box">
      <div className="eyebrow">{st === "pending" ? "If approved" : st === "approved" ? "Effect on the forecast" : st === "superseded" ? "Effect before it was replaced" : "Would have changed"}</div>
      <div className="row nw" style={{ alignItems: "baseline", gap: 10 }}>
        <span className={cx("imp-big", tot >= 0 ? "up" : "dn")}>{sg(tot)}</span><span className="muted small">units · {sp(base ? (tot / base) * 100 : 0)} in {mi.length === 1 ? mLabel(mi[0].m) : mi.length + " months"}</span>
      </div>
      {mi.length > 1 && (
        <div className="month-bars" aria-label="Impact by month">
          {mi.map((x) => <span key={x.m} className={cx("on", x.d < 0 && "neg")} style={{ height: Math.max(6, (Math.abs(x.d) / max) * 100) + "%" }} title={`${mLabel(x.m)}: ${sg(x.d)} units`} />)}
        </div>
      )}
      {mi.length > 1 && <div className="row between xs faint"><span>{mLabel(mi[0].m)}</span><span>{mLabel(mi[mi.length - 1].m)}</span></div>}
      {prev && <div className="small">Revises <button className="link" type="button" onClick={() => openAssm(prev.id)}>{prev.id}</button>: impact <span className="num">{prev.impact}%</span> → <span className="num"><b>{a.impact}%</b></span></div>}
    </div>
  );
}

export function Facts({ a }) {
  const c = capById(a.capture);
  return (
    <dl className="facts">
      <dt>SKUs</dt><dd>{skuNames(a.skus)}</dd>
      <dt>Retailers</dt><dd>{retNames(a.retailers)}</dd>
      <dt>Months</dt><dd>{mRange(a.months)}</dd>
      <dt>Driver</dt><dd><DriverTag d={a.driver} /></dd>
      <dt>Confidence</dt><dd><ConfTag c={a.confidence} /></dd>
      <dt>Impact</dt><dd><span className="num">{a.impact > 0 ? "+" : ""}{a.impact}%</span> <span className="muted small">on units in those months</span></dd>
      <dt>Source</dt><dd>{c ? <>{KINDS[c.kind]} · {c.title}<div className="small muted">{c.person}, {c.team} · {fDate(c.date)}{c.auto ? " · via " + c.auto : ""}</div></> : "Added by hand"}</dd>
    </dl>
  );
}

const ACT = { created: ["plus", "created"], edited: ["edit", "edited"], approved: ["check", "approved"], rejected: ["x", "rejected"], superseded: ["merge", "superseded"], comment: ["chat", "commented"], reopened: ["refresh", "reopened"] };
export function HistoryView({ a }) {
  const h = [...(a.history || [])];
  const r = replacedBy(a);
  if (r && !h.some((e) => e.action === "superseded")) h.push({ at: r.decidedAt, by: r.decidedBy || ROLES.bm.person, action: "superseded", note: `Replaced by ${r.id}`, field: "impact", from: a.impact, to: r.impact });
  return (
    <div className="hist">
      {h.map((e, i) => {
        const [ic, verb] = ACT[e.action] || ["info", e.action];
        return (
          <div className="he" key={i}>
            <span className={"he-dot " + e.action}><Icon name={ic} size={13} stroke={2.2} /></span>
            <div>
              <div className="h1"><b>{e.by}</b> {verb}{e.action === "superseded" && r ? <> by <button className="link" type="button" onClick={() => openAssm(r.id)}>{r.id}</button></> : ""}</div>
              <div className="h2">{fDateTime(e.at)}</div>
              {e.field && e.from != null && e.to != null && e.from !== e.to && <div className="diff">{e.field === "impact" ? "Impact" : "Months"} <s>{e.from}{e.field === "impact" ? "%" : ""}</s><Icon name="right" size={11} /><ins>{e.to}{e.field === "impact" ? "%" : ""}</ins></div>}
              {e.note && <p className="small" style={{ marginTop: 4 }}>{e.note}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const PEOPLE_TO = ["Dana Ortiz", "Marcus Lee", "Ken Watanabe", "Sofia Ramos", "Jordan Kim", "Ravi Shah", "Lena Park"];
export function ThreadView({ a, compact }) {
  const S = useStore();
  const t = S.threads[a.id];
  const mine = me().person;
  const owner = capById(a.capture)?.person;
  const defTo = t?.status === "open" && t.waitingOn === mine ? (t.askedBy || ROLES.bm.person) : owner && owner !== "Texere monitor" && owner !== mine ? owner : mine === ROLES.bm.person ? "Dana Ortiz" : ROLES.bm.person;
  const [txt, setTxt] = useState("");
  const [to, setTo] = useState(defTo);
  const [busy, setBusy] = useState(false);
  function send() {
    const v = txt.trim(); if (!v) return;
    if (t?.status === "open" && t.waitingOn === mine) reply(a.id, v); else ask(a.id, v, to);
    setTxt("");
  }
  async function askTx() {
    setBusy(true);
    const mi = monthImpacts(a); const tot = mi.reduce((s, x) => s + x.d, 0);
    const c = capById(a.capture);
    const related = S.assumptions.filter((b) => b.id !== a.id && b.skus.some((s) => a.skus.includes(s)) && b.retailers.some((r) => a.retailers.includes(r)) && ["approved", "pending"].includes(statusOf(b)));
    let text;
    try {
      if (!aiAvailable()) throw Object.assign(new Error(), { code: "offline" });
      text = (await askText(`You are Texere, a forecasting assistant for a CPG brand team. In at most 90 words, help the brand manager decide whether to approve this forecast assumption. Point out what to verify and any overlap with related assumptions.\n\nAssumption ${a.id}: ${a.summary}. Impact ${a.impact}% on ${skuNames(a.skus)} at ${retNames(a.retailers)}, ${mRange(a.months)} (${sg(tot)} units). Confidence: ${a.confidence}. Quote: "${a.quote}". Rationale: ${a.rationale}. Source: ${c?.title} with ${c?.person} on ${c?.date}.\nRelated: ${related.map((b) => `${b.id} [${statusOf(b)}] ${b.summary} (${b.impact}%)`).join("; ") || "none"}\nThread so far: ${(t?.messages || []).map((m) => m.name + ": " + m.text).join(" | ") || "none"}`)).trim();
    } catch (e) {
      text = `This adds ${sg(tot)} units (${a.impact > 0 ? "+" : ""}${a.impact}%) across ${mRange(a.months)}. ${a.rationale} Confidence is "${a.confidence}"${a.confidence !== "confirmed" ? ", so it's worth confirming before approving" : ""}.${related.length ? ` It overlaps with ${related.map((b) => b.id).join(", ")} on the same SKUs and retailers; check they don't double count.` : ""}`;
      if (e?.code && e.code !== "offline") text += " (" + aiError(e) + ")";
    }
    reply(a.id, text, "Texere");
    setBusy(false);
  }
  const waitingMe = t?.status === "open" && t.waitingOn === mine;
  return (
    <div className="stack">
      {t?.status === "open" && <div className={cx("banner", waitingMe && "warn")}><Icon name="clock" size={15} />{waitingMe ? <>Waiting on you: <b>{t.askedBy || ROLES.bm.person}</b> asked a question.</> : <>Waiting on <b>{t.waitingOn}</b> to answer.</>}</div>}
      {t?.status === "answered" && <div className="banner"><Icon name="chat" size={15} /><span><b>{t.messages[t.messages.length - 1].name}</b> answered. Approve, edit or reply.</span><button className="link" style={{ marginLeft: "auto" }} type="button" onClick={() => resolve(a.id)}>Mark resolved</button></div>}
      <div className="thread">
        {(t?.messages || []).length === 0 && <p className="muted small">No discussion yet. Ask the person who was in the conversation before approving.</p>}
        {(t?.messages || []).map((m, i) => (
          <div className={cx("msg", m.name === "Texere" && "ai")} key={i}>
            <Avatar name={m.name} size={28} />
            <div><div className="who"><b>{m.name}</b>{fDateTime(m.at)}{m.simulated && <span className="sim" style={{ marginLeft: 6 }}>Simulated reply</span>}</div><div className="bub">{m.text}</div></div>
          </div>
        ))}
        {busy && <div className="msg ai"><Avatar name="Texere" size={28} /><div className="bub row"><Spinner /> Reading the assumption and related data</div></div>}
      </div>
      <div className="compose">
        <textarea rows={compact ? 1 : 2} value={txt} placeholder={waitingMe ? "Write your answer" : "Ask a question or leave a comment"} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} aria-label="Message" />
        {!waitingMe && (
          <label className="to">To <select className="plain" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: "2px 4px", fontSize: 12 }}>{PEOPLE_TO.filter((p) => p !== mine).map((p) => <option key={p}>{p}</option>)}<option value={mine}>Just a comment</option></select></label>
        )}
        <Btn kind="primary" size="sm" icon="send" onClick={send} disabled={!txt.trim()}>{waitingMe ? "Answer" : "Send"}</Btn>
      </div>
      <div className="row"><Btn size="sm" kind="ghost" icon="spark" onClick={askTx} disabled={busy}>Ask Texere to check this</Btn><span className="xs faint">⌘ + Enter to send</span></div>
    </div>
  );
}

export function Decide({ a, onDone }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(a.impact);
  const [note, setNote] = useState("");
  const st = statusOf(a);
  const canDecide = ["bm", "lead"].includes(useStore().role);
  if (edit) return (
    <div className="row" style={{ width: "100%" }}>
      <span className="small">New impact</span>
      <input className="impact-in" type="number" value={v} aria-label="New impact percent" onChange={(e) => setV(Math.max(-100, Math.min(300, Number(e.target.value) || 0)))} />
      <span className="small">%</span>
      <input type="text" className="grow" placeholder="Why the change (kept in the history)" value={note} onChange={(e) => setNote(e.target.value)} />
      <Btn size="sm" onClick={() => setEdit(false)}>Cancel</Btn>
      <Btn size="sm" kind="primary" onClick={() => { editImpact(a.id, v, note); setEdit(false); setNote(""); }}>Save</Btn>
    </div>
  );
  if (st === "pending") return (
    <>
      <Btn kind="good" icon="check" onClick={() => { approve(a.id); onDone?.(); }} disabled={!canDecide} title={canDecide ? "" : "Switch to the brand manager to approve"}>Approve</Btn>
      <Btn kind="danger" icon="x" onClick={() => { reject(a.id); onDone?.(); }} disabled={!canDecide}>Reject</Btn>
      <Btn icon="edit" onClick={() => setEdit(true)}>Edit impact</Btn>
      {!canDecide && <span className="small muted">Only the brand manager approves. You can comment or answer.</span>}
    </>
  );
  return (
    <>
      {st === "approved" && <Btn icon="edit" onClick={() => setEdit(true)}>Edit impact</Btn>}
      {(st === "rejected" || st === "approved") && <Btn kind="ghost" icon="refresh" onClick={() => reopen(a.id)} disabled={!canDecide}>Move back to review</Btn>}
      {st === "superseded" && <span className="small muted">Replaced by {replacedBy(a)?.id}. Kept for the record.</span>}
    </>
  );
}

export function AssmHeader({ a }) {
  return (
    <>
      <div className="row"><span className="num small muted">{a.id}</span><StatusBadge a={a} /><DriverTag d={a.driver} /><ConfTag c={a.confidence} /></div>
      <h2 style={{ fontSize: 17, lineHeight: 1.35 }}>{a.summary}</h2>
    </>
  );
}

export function AssumptionDrawer() {
  const d = useSyncExternalStore(subDrawer, getDrawer);
  const S = useStore();
  const [tab, setTab] = useState(null);
  const a = d && assm(d.id);
  const cur = tab && d && tab.id === d.id ? tab.t : d?.tab || "details";
  const set = (t) => setTab({ id: d.id, t });
  if (!a) return null;
  const c = capById(a.capture);
  const t = S.threads[a.id];
  return (
    <Drawer open onClose={closeAssm} label={a.summary} width={600}>
      <div className="dr-h">
        <div className="row between"><span className="eyebrow">Assumption</span><button className="icon-btn" type="button" onClick={closeAssm} aria-label="Close"><Icon name="x" /></button></div>
        <AssmHeader a={a} />
        <Tabs value={cur} onChange={set} tabs={[["details", "Details"], ["history", "What changed", (a.history || []).filter((h) => h.action !== "comment").length], ["discussion", "Discussion", t?.messages?.length], ["impact", "Impact"]]} />
      </div>
      <div className="dr-b">
        {cur === "details" && <>
          {a.quote && <div className="quote">“{a.quote}”<span className="src">{c ? `${c.person} · ${c.title} · ${fDate(c.date)}` : ""}</span></div>}
          <Facts a={a} />
          {a.rationale && <div><div className="eyebrow" style={{ marginBottom: 4 }}>How the impact was estimated</div><p className="small">{a.rationale}</p></div>}
          <ImpactBox a={a} />
        </>}
        {cur === "history" && <HistoryView a={a} />}
        {cur === "discussion" && <ThreadView key={a.id} a={a} />}
        {cur === "impact" && <ImpactDetail a={a} />}
      </div>
      <div className="dr-f"><Decide key={a.id} a={a} /></div>
    </Drawer>
  );
}

function ImpactDetail({ a }) {
  const now = activeAt(NOW()), plan = activeAt(PLAN);
  const mi = monthImpacts(a);
  return (
    <div className="stack">
      <ImpactBox a={a} />
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Month</th><th className="r">Plan (Sep)</th><th className="r">Forecast now</th><th className="r">vs plan</th><th className="r">This item</th></tr></thead>
        <tbody>{mi.map((x) => {
          const w = weeksInMonth(x.m), p = units(a.skus, a.retailers, w, plan), n = units(a.skus, a.retailers, w, now);
          return <tr key={x.m}><td>{mLabel(x.m)}</td><td className="r num">{fK(p)}</td><td className="r num">{fK(n)}</td><td className="r"><Delta v={n - p} small>{sp(p ? (n / p - 1) * 100 : 0)}</Delta></td><td className={cx("r num", x.d >= 0 ? "up" : "dn")}>{sg(x.d)}</td></tr>;
        })}</tbody>
      </table></div>
      <p className="xs muted">Units for {skuNames(a.skus)} at {retNames(a.retailers)}. "Forecast now" includes every approved assumption; "This item" is the difference this assumption makes on its own.</p>
    </div>
  );
}
