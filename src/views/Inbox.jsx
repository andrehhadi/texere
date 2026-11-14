import React, { useState } from "react";
import { useStore, update, statusOf, capById, activeAt, NOW, me } from "../store.js";
import { DRIVERS, ROLES } from "../data/catalog.js";
import { impactUnits } from "../engine/stories.js";
import { approve, reject, openAssm } from "../actions.js";
import { Badge, StatusBadge, DriverTag, ConfTag, Avatar, Btn, Tabs, Empty, cx, Seg } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { ImpactBox, Facts, ThreadView, HistoryView, Decide } from "../ui/assm.jsx";
import { sg, mRange, skuNames, retNames, fDate, relDay, plural } from "../ui/format.js";

export default function Inbox({ go }) {
  const S = useStore();
  const now = activeAt(NOW());
  const mine = me().person;
  const tab = S.ui.inboxTab || "pending";
  const [q, setQ] = useState("");
  const [drv, setDrv] = useState("ALL");
  const [sel, setSel] = useState([]);
  const [side, setSide] = useState("discussion");
  const th = (a) => S.threads[a.id];
  const isQ = (a) => ["open", "answered"].includes(th(a)?.status);
  const lists = {
    pending: S.assumptions.filter((a) => a.status === "pending"),
    questions: S.assumptions.filter(isQ),
    approved: S.assumptions.filter((a) => statusOf(a) === "approved"),
    rejected: S.assumptions.filter((a) => ["rejected", "superseded"].includes(statusOf(a))),
    all: S.assumptions,
  };
  const items = lists[tab].filter((a) => (drv === "ALL" || a.driver === drv) && (!q || (a.id + a.summary + (capById(a.capture)?.person || "")).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (isQ(b) && th(b).waitingOn === mine) - (isQ(a) && th(a).waitingOn === mine) || (b.createdAt + b.id).localeCompare(a.createdAt + a.id));
  const cur = items.find((a) => a.id === S.ui.inboxSel) || items[0];
  const setTab = (t) => update((s) => { s.ui.inboxTab = t; });
  const pick = (id) => update((s) => { s.ui.inboxSel = id; });
  const canDecide = ["bm", "lead"].includes(S.role);
  const totalPending = lists.pending.reduce((t, a) => t + impactUnits(a, now), 0);
  function bulk(fn) { sel.forEach((id) => fn(id, "Bulk action")); setSel([]); }
  const next = () => { const i = items.indexOf(cur); const n = items[i + 1] || items[i - 1]; if (n) pick(n.id); };
  return (
    <>
      <div className="ph">
        <div><h1>Approvals</h1><p className="sub">Everything your teams shared that would change the forecast. Approve it, reject it, change the number, or ask the person who was in the room.</p></div>
        <div className="ph-a"><Badge t="warn" dot>{plural(lists.pending.length, "item")} pending · {sg(totalPending)} units</Badge>{S.role === "cs" && <Badge t="brand">Viewing as {mine}: answer questions, approvals are the brand manager's</Badge>}</div>
      </div>
      <div className="inbox">
        <div className="ib-list">
          <div className="ib-head">
            <Tabs value={tab} onChange={setTab} tabs={[["pending", "Needs review", lists.pending.length], ["questions", "Questions", lists.questions.length], ["approved", "Approved"], ["rejected", "Closed"], ["all", "All"]]} />
            <div className="row nw">
              <input type="search" className="grow" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search approvals" style={{ height: 30 }} />
              <select className="plain" value={drv} onChange={(e) => setDrv(e.target.value)} aria-label="Driver" style={{ height: 30, padding: "0 8px", fontSize: 12.5 }}><option value="ALL">All drivers</option>{Object.entries(DRIVERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </div>
            {tab === "pending" && canDecide && items.length > 1 && (
              <div className="row small"><label className="row" style={{ gap: 6 }}><input type="checkbox" checked={sel.length === items.length} onChange={(e) => setSel(e.target.checked ? items.map((a) => a.id) : [])} />Select all</label>
                {sel.length > 0 && <><Btn size="sm" kind="good" icon="check" onClick={() => bulk(approve)}>Approve {sel.length}</Btn><Btn size="sm" kind="danger" onClick={() => bulk(reject)}>Reject</Btn></>}</div>
            )}
          </div>
          <div className="ib-items" role="list">
            {items.length === 0 && <Empty icon="check">{tab === "pending" ? "Nothing waiting. Every shared item has a decision." : "Nothing here."}</Empty>}
            {items.map((a) => {
              const c = capById(a.capture); const t = th(a); const imp = impactUnits(a, now);
              return (
                <div key={a.id} role="listitem" className={cx("ib-it", cur?.id === a.id && "on")} onClick={() => pick(a.id)} onDoubleClick={() => openAssm(a.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") pick(a.id); }}>
                  {tab === "pending" && canDecide && <input type="checkbox" checked={sel.includes(a.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => setSel(e.target.checked ? [...sel, a.id] : sel.filter((x) => x !== a.id))} aria-label={"Select " + a.id} />}
                  <Avatar name={c?.person || "Texere"} size={28} />
                  <div className="grow">
                    <div className="row nw between"><span className="xs muted">{c?.person} · {relDay(a.createdAt)}</span><span className={cx("num xs", imp >= 0 ? "up" : "dn")}>{sg(imp)}</span></div>
                    <div className="t">{a.summary}</div>
                    <div className="m"><DriverTag d={a.driver} />{tab !== "pending" && <StatusBadge a={a} />}
                      {t?.status === "open" && <Badge t={t.waitingOn === mine ? "bad" : "brand"}><Icon name="chat" size={11} />{t.waitingOn === mine ? "Waiting on you" : "Asked " + t.waitingOn.split(" ")[0]}</Badge>}
                      {t?.status === "answered" && <Badge t="good"><Icon name="chat" size={11} />Answered</Badge>}
                      {a.supersedes && <Badge t="outline">Revises {a.supersedes}</Badge>}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {cur ? (
          <div className="ib-detail">
            <div className="ib-dh">
              <div className="row between"><div className="row"><span className="num small muted">{cur.id}</span><StatusBadge a={cur} /><DriverTag d={cur.driver} /><ConfTag c={cur.confidence} /></div>
                <Btn size="sm" kind="ghost" icon="external" onClick={() => openAssm(cur.id)}>Open full record</Btn></div>
              <h2>{cur.summary}</h2>
              <div className="row small muted"><Avatar name={capById(cur.capture)?.person} size={20} />{capById(cur.capture)?.person} shared this from <button className="link" type="button" onClick={() => { update((s) => { s.ui.cap = cur.capture; }); go("capture"); }}>{capById(cur.capture)?.title}</button> · {fDate(cur.createdAt)}</div>
            </div>
            <div className="ib-body">
              <div className="stack lg">
                {cur.quote && <div className="quote">“{cur.quote}”<span className="src">Exact words from the {capById(cur.capture)?.kind === "call" ? "call transcript" : "source"}</span></div>}
                <div>
                  <Tabs value={side} onChange={setSide} tabs={[["discussion", "Discussion", S.threads[cur.id]?.messages?.length], ["history", "What changed", (cur.history || []).filter((h) => h.action !== "comment").length]]} />
                  <div style={{ paddingTop: 14 }}>{side === "discussion" ? <ThreadView key={cur.id} a={cur} /> : <HistoryView a={cur} />}</div>
                </div>
              </div>
              <div className="stack">
                <ImpactBox a={cur} />
                <Facts a={cur} />
                {cur.rationale && <div><div className="eyebrow" style={{ marginBottom: 4 }}>How the impact was estimated</div><p className="small">{cur.rationale}</p></div>}
              </div>
            </div>
            <div className="ib-actions"><Decide key={cur.id} a={cur} onDone={next} /></div>
          </div>
        ) : <div className="ib-detail"><Empty>Pick an item on the left.</Empty></div>}
      </div>
    </>
  );
}
