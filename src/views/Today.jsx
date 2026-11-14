import React from "react";
import { useStore, activeAt, NOW, PLAN, recent, supplyRows, openQuestionsFor, assm, update, capById } from "../store.js";
import { ALL_S, ALL_R, FC, LY12, ROLES, TODAY, skuById, mLabel } from "../data/catalog.js";
import { sumUnits } from "../engine/model.js";
import { Head, Kpi, Empty, Icon, Chip } from "../ui/common.jsx";
import { fK, sg, sp, dcls, fDate } from "../ui/format.js";
import { FeedItem, Thread } from "./parts.jsx";
import { go } from "../nav.js";

export default function Today() {
  const S = useStore();
  const now = activeAt(NOW()), plan = activeAt(PLAN), sync = activeAt(S.lastSync);
  const tN = sumUnits(ALL_S, ALL_R, FC, now), tP = sumUnits(ALL_S, ALL_R, FC, plan), tS = sumUnits(ALL_S, ALL_R, FC, sync), tLY = sumUnits(ALL_S, ALL_R, LY12, now);
  const pend = S.assumptions.filter((a) => a.status === "pending");
  const caps = S.captures.filter((c) => c.status === "new" || c.status === "review");
  const risks = supplyRows().filter((r) => r.risk);
  const qs = openQuestionsFor(S.role);
  const me = ROLES[S.role];
  const card = {
    bm: <><b>{pend.length} assumption{pend.length === 1 ? "" : "s"}</b> waiting for your review and <b>{caps.length} new conversation{caps.length === 1 ? "" : "s"}</b> captured from your teams.</>,
    cs: <>You have <b>{caps.length} captured conversation{caps.length === 1 ? "" : "s"}</b> to approve before sharing{qs.length ? <>, and <b>{qs.length} question{qs.length === 1 ? "" : "s"}</b> from marketing</> : null}.</>,
    dp: <>The forecast moved <b className="num">{sg(tN - tS)}</b> units since it was last published to supply on {fDate(S.lastSync.slice(0, 10))}.</>,
    sp: <><b>{risks.length} change{risks.length === 1 ? "" : "s"}</b> since the last publish could cause a stock-out or excess inventory.</>,
    lead: <>The next-12-month forecast is <b className="num">{sp((tN / tP - 1) * 100)}</b> vs the September consensus. Your monthly deck is ready in Shareouts.</>,
  }[S.role];
  return (
    <>
      <Head title={`Good afternoon, ${me.person.split(" ")[0]}`} sub={`Everything that changed across the portfolio, in one place. Today is ${fDate(TODAY)}, 2026.`}>
        <a className="btn" href="#capture">Add a conversation</a>
        <a className="btn primary" href="#review">Review assumptions</a>
      </Head>
      <div className="hl-box">{card}</div>
      <div className="grid-kpi">
        <Kpi label="Next 12 months" value={fK(tN) + " units"} sub={`${sp((tN / tLY - 1) * 100)} vs the last 12 months`} />
        <Kpi label="vs September consensus" value={sg(tN - tP)} vClass={dcls(tN - tP)} sub={`${sp((tN / tP - 1) * 100)} since the last S&OP`} />
        <Kpi label="Needs review" value={pend.length} sub="Pending assumptions" tone={pend.length ? "attn" : ""} />
        <Kpi label="Supply risks" value={risks.length} sub="Moves of 10% or more since the last publish" />
      </div>
      {qs.length > 0 && (
        <section className="card stack" aria-labelledby="q-h">
          <h2 id="q-h">Questions for you</h2>
          {qs.map((id) => { const a = assm(id); return (
            <div key={id} className="stack" style={{ gap: 8 }}>
              <div><b>{a.id}</b> · {a.summary} <span className="small muted">({capById(a.capture)?.title})</span></div>
              <Thread a={a} compact />
            </div>
          ); })}
        </section>
      )}
      <div className="grid2">
        <section className="card stack" aria-labelledby="feed-h">
          <div className="row between"><h2 id="feed-h">What changed in the last two weeks</h2><a href="#review" className="small">All assumptions</a></div>
          <div className="feed">{recent(14).slice(0, 7).map((a) => <FeedItem key={a.id} a={a} />)}</div>
        </section>
        <div className="stack">
          <section className="card stack" aria-labelledby="in-h">
            <h2 id="in-h">New from your teams</h2>
            {caps.length ? caps.map((c) => (
              <button key={c.id} type="button" className="list-btn" onClick={() => { update((s) => { s.ui.cap = c.id; }); go("capture"); }}>
                <span className="src-ico sm"><Icon name={c.kind} size={16} /></span>
                <span><b>{c.title}</b><br /><span className="small muted">{c.person} · {c.team} · {fDate(c.date)}{c.auto ? ` · via ${c.auto}` : ""}</span></span>
              </button>
            )) : <Empty>No new conversations.</Empty>}
          </section>
          <section className="card stack" aria-labelledby="risk-h">
            <div className="row between"><h2 id="risk-h">Supply watch</h2><a href="#supply" className="small">Open supply handoff</a></div>
            {risks.length ? risks.slice(0, 4).map((r) => (
              <div className="row between" key={r.k}><div><b>{skuById(r.sku).short}</b> · {mLabel(r.m)}<div className="small muted">{r.reasons.map((a) => a.summary).join("; ")}</div></div><Chip tone={r.diff > 0 ? "warn" : "bad"}>{r.risk}</Chip></div>
            )) : <Empty>No big changes since the last publish.</Empty>}
          </section>
        </div>
      </div>
    </>
  );
}
