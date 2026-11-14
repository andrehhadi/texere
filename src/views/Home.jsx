import React from "react";
import { useStore, activeAt, NOW, PLAN, statusOf, openQuestionsFor, openQuestions, capById, me } from "../store.js";
import { ALL_S, ALL_R, FC_MONTHS, HIST_MONTHS, ROLES, TODAY, mLabel, skuById, WEEKS } from "../data/catalog.js";
import { PERIODS, compWeeks, kpis, units, shareOf, decompose, monthUnits } from "../engine/analytics.js";
import { driverStory, impactUnits } from "../engine/stories.js";
import { allSupply } from "../engine/supply.js";
import { openAssm, approve, markSeen } from "../actions.js";
import { Card, Kpi, Badge, StatusBadge, DriverTag, Avatar, Btn, Delta, cx } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { Spark, Lines } from "../ui/charts.jsx";
import { fK, fMoney, sg, sp, pts, mRange, skuNames, retNames, relDay, fDate, plural } from "../ui/format.js";

const VERB = { created: "shared", edited: "changed", approved: "approved", rejected: "rejected", superseded: "replaced", comment: "commented on", reopened: "reopened" };

export function recentEvents(S, n = 12, dedupe = false) {
  const ev = [];
  for (const a of S.assumptions) for (const h of a.history || []) ev.push({ a, h });
  ev.sort((x, y) => y.h.at.localeCompare(x.h.at));
  if (!dedupe) return ev.slice(0, n);
  const seen = new Set(); return ev.filter((e) => (seen.has(e.a.id) ? false : seen.add(e.a.id))).slice(0, n);
}

export function FeedItem({ a, h, seen }) {
  const now = activeAt(NOW());
  const imp = impactUnits(a, now);
  const unseen = seen && h.at > seen;
  return (
    <button type="button" className={cx("fi", unseen && "unseen")} onClick={() => openAssm(a.id, h.action === "comment" ? "discussion" : h.action === "edited" || h.action === "superseded" ? "history" : "details")}>
      <Avatar name={h.by} size={30} />
      <div style={{ minWidth: 0 }}>
        <div className="small muted"><b style={{ color: "var(--ink)", fontWeight: 600 }}>{h.by}</b> {VERB[h.action] || h.action} <span className="num">{a.id}</span>{h.action !== "created" && a.history?.[0]?.by !== h.by && <> · shared by {a.history[0].by}</>}
          {h.field === "impact" && h.from != null && <> · impact <span className="num">{h.from}% → {h.to}%</span></>}</div>
        <div className="t" style={{ marginTop: 2 }}>{h.action === "comment" ? "“" + h.note + "”" : a.summary}</div>
        <div className="m"><DriverTag d={a.driver} /><span>{skuNames(a.skus)}</span><span>·</span><span>{retNames(a.retailers)}</span><span>·</span><span>{mRange(a.months)}</span></div>
      </div>
      <div className="r"><StatusBadge a={a} /><span className={cx("num small", imp >= 0 ? "up" : "dn")}>{statusOf(a) === "rejected" ? "" : sg(imp) + " units"}</span><span className="xs faint">{relDay(h.at)}</span></div>
    </button>
  );
}

export default function Home({ go }) {
  const S = useStore();
  const role = ROLES[S.role];
  const now = activeAt(NOW()), plan = activeAt(PLAN);
  const pend = S.assumptions.filter((a) => a.status === "pending").sort((a, b) => Math.abs(impactUnits(b, now)) - Math.abs(impactUnits(a, now)));
  const myQs = openQuestionsFor(role.person), allQs = openQuestions();
  const ev = recentEvents(S, 10, true);
  const unseen = ev.filter((e) => e.h.at > S.seen).length;
  const N = PERIODS.N52W.weeks;
  const tN = units(ALL_S, ALL_R, N, now), tP = units(ALL_S, ALL_R, N, plan);
  const L = PERIODS.L13W.weeks, LA = compWeeks("L13W", "YA");
  const k1 = kpis(ALL_S, ALL_R, L), k0 = kpis(ALL_S, ALL_R, LA);
  const s1 = shareOf(ALL_S, ALL_R, L), s0 = shareOf(ALL_S, ALL_R, LA);
  const weekly = (f) => PERIODS.L52W.weeks.filter((_, i) => i % 2 === 0).map(f);
  const spU = weekly((i) => units(ALL_S, ALL_R, [i]));
  const risks = allSupply().filter((x) => x.firstRisk);
  const newCaps = S.captures.filter((c) => c.status === "new");
  const signals = S.signals.filter((x) => !x.added && x.suggest);
  const dec = decompose(ALL_S, ALL_R, LA, L), story = driverStory(dec, "L13W");
  const months = FC_MONTHS;
  const hr = 9;
  const first = role.person.split(" ")[0];
  return (
    <>
      <section className="hero">
        <div style={{ position: "relative", zIndex: 1 }} className="stack">
          <div className="eyebrow" style={{ color: "#9EA2E8" }}>Friday, November 13 · Week 46</div>
          <h1>Good morning, {first}.</h1>
          <p>{unseen ? <>Since you last looked on {fDate(S.seen)}, <b style={{ color: "#fff" }}>{plural(unseen, "update")}</b> landed on the forecast.</> : "You're caught up on forecast changes."}{" "}
            {pend.length ? <>{plural(pend.length, "assumption")} {pend.length === 1 ? "is" : "are"} waiting for approval{myQs.length ? <> and {plural(myQs.length, "question")} {myQs.length === 1 ? "needs" : "need"} your answer</> : ""}.</> : "Nothing is waiting for approval."}{" "}
            The next 52 weeks sit at <b style={{ color: "#fff" }}>{fK(tN)} units</b>, {sp((tN / tP - 1) * 100)} vs the September plan.</p>
          <div className="row" style={{ marginTop: 6 }}>
            <Btn kind="on-dark" icon="inbox" onClick={() => go("inbox")}>{pend.length ? `Review ${pend.length} item${pend.length === 1 ? "" : "s"}` : "Open approvals"}</Btn>
            <Btn kind="on-dark-2" icon="timeline" onClick={() => go("timeline")}>Open the timeline</Btn>
            {unseen > 0 && <Btn kind="on-dark-2" icon="check" onClick={markSeen}>Mark all as seen</Btn>}
          </div>
        </div>
        <div className="hstats">
          <button type="button" className="hstat" onClick={() => go("inbox")}><div className="v">{pend.length}</div><div className="l">Waiting for approval</div></button>
          <button type="button" className="hstat" onClick={() => go("inbox")}><div className="v">{allQs.length}</div><div className="l">Open questions</div></button>
          <button type="button" className="hstat" onClick={() => go("supply")}><div className="v">{risks.length}</div><div className="l">SKUs at supply risk</div></button>
          <button type="button" className="hstat" onClick={() => go("capture")}><div className="v">{newCaps.length}</div><div className="l">New conversations</div></button>
          <button type="button" className="hstat" onClick={() => go("competition")}><div className="v">{signals.length}</div><div className="l">Market signals</div></button>
          <button type="button" className="hstat" onClick={() => go("forecast")}><div className="v" style={{ fontSize: 20 }}>{sp((tN / tP - 1) * 100)}</div><div className="l">Forecast vs plan</div></button>
        </div>
      </section>

      <div className="kpis">
        <Kpi label="Dollar sales · L13W" value={fMoney(k1.dollars)} delta={k1.dollars / k0.dollars - 1} deltaText={sp((k1.dollars / k0.dollars - 1) * 100) + " YoY"} spark={<Spark values={weekly((i) => kpis(ALL_S, ALL_R, [i]).dollars)} w={70} h={24} />} onClick={() => go("performance")} />
        <Kpi label="Units · L13W" value={fK(k1.units)} delta={k1.units / k0.units - 1} deltaText={sp((k1.units / k0.units - 1) * 100) + " YoY"} spark={<Spark values={spU} w={70} h={24} />} onClick={() => go("performance")} />
        <Kpi label="Dollar share" value={(s1 * 100).toFixed(1) + "%"} delta={s1 - s0} deltaText={pts((s1 - s0) * 100)} onClick={() => go("competition")} />
        <Kpi label="TDPs" value={k1.tdp.toFixed(0)} delta={k1.tdp / k0.tdp - 1} deltaText={sp((k1.tdp / k0.tdp - 1) * 100)} onClick={() => go("performance")} />
        <Kpi label="Forecast · next 52 wks" value={fK(tN)} delta={tN - tP} deltaText={sg(tN - tP) + " vs plan"} onClick={() => go("forecast")} />
      </div>

      <div className="g-main">
        <Card pad={false} title="Latest assumption updates" sub="Every change to the forecast, who made it and what it's worth" id="feed"
          actions={<><Badge t="saffron">{unseen} new</Badge><Btn size="sm" kind="ghost" onClick={() => go("timeline")}>All changes<Icon name="right" size={13} /></Btn></>}>
          <div className="feed">{ev.map((e, i) => <FeedItem key={i} a={e.a} h={e.h} seen={S.seen} />)}</div>
        </Card>
        <div className="stack lg">
          <Card title="Needs your attention" id="att" pad>
            <div className="stack" style={{ gap: 0 }}>
              {pend.slice(0, 3).map((a) => (
                <div key={a.id} className="row nw" style={{ padding: "9px 0", borderBottom: "1px solid var(--line)", alignItems: "flex-start" }}>
                  <Icon name="flag" size={16} style={{ color: "var(--warn)", marginTop: 2 }} />
                  <div className="grow"><button className="link" style={{ color: "var(--ink)", textAlign: "left", fontWeight: 500 }} type="button" onClick={() => openAssm(a.id)}>{a.summary}</button>
                    <div className="xs muted">{capById(a.capture)?.person} · {mRange(a.months)} · <span className={cx("num", impactUnits(a, now) >= 0 ? "up" : "dn")}>{sg(impactUnits(a, now))} units</span>{S.threads[a.id]?.status === "open" ? " · question open" : ""}</div></div>
                  {["bm", "lead"].includes(S.role) && <Btn size="sm" kind="ghost" icon="check" onClick={() => approve(a.id)} aria-label={"Approve " + a.id}>Approve</Btn>}
                </div>
              ))}
              {myQs.map((id) => (
                <div key={id} className="row nw" style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                  <Icon name="chat" size={16} style={{ color: "var(--brand)" }} />
                  <div className="grow small">{S.threads[id].askedBy || "Someone"} asked you about <button className="link" type="button" onClick={() => openAssm(id, "discussion")}>{id}</button></div>
                </div>
              ))}
              {risks.slice(0, 2).map((x) => (
                <div key={x.sku} className="row nw" style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                  <Icon name="alert" size={16} style={{ color: "var(--bad)" }} />
                  <div className="grow small"><b>{skuById(x.sku).short}</b> drops below safety stock w/e {fDate(WEEKS[x.firstRisk.i].end)}</div>
                  <Btn size="sm" kind="ghost" onClick={() => go("supply")}>View</Btn>
                </div>
              ))}
              {newCaps.length > 0 && (
                <div className="row nw" style={{ padding: "9px 0" }}>
                  <Icon name="capture" size={16} style={{ color: "var(--good)" }} />
                  <div className="grow small">{plural(newCaps.length, "new conversation")} from {[...new Set(newCaps.map((c) => c.auto))].join(", ")} to extract</div>
                  <Btn size="sm" kind="ghost" onClick={() => go("capture")}>Open</Btn>
                </div>
              )}
            </div>
          </Card>
          <Card title="Forecast vs plan by month" sub="All SKUs, total US. Click through for the bridge." id="fvp" actions={<Btn size="sm" kind="ghost" onClick={() => go("timeline")}>Timeline<Icon name="right" size={13} /></Btn>}>
            <Lines height={190} labels={[...HIST_MONTHS.slice(-4), ...months].map(mLabel)} splitAt={4} onPick={() => go("timeline")}
              series={[
                { name: "Actual", color: "var(--ink-2)", values: [...HIST_MONTHS.slice(-4).map((m) => monthUnits(ALL_S, ALL_R, m, now)), ...months.map(() => null)] },
                { name: "Plan (Sep)", color: "var(--faint)", dash: "4 4", values: [...HIST_MONTHS.slice(-4).map(() => null), ...months.map((m) => monthUnits(ALL_S, ALL_R, m, plan))] },
                { name: "Forecast now", color: "var(--brand)", width: 2.4, values: [...HIST_MONTHS.slice(-4).map((m, i) => (i === 3 ? monthUnits(ALL_S, ALL_R, m, now) : null)), ...months.map((m) => monthUnits(ALL_S, ALL_R, m, now))] },
              ]} />
          </Card>
          <Card title="Performance pulse" sub="Last 13 weeks vs year ago" id="pulse" actions={<Btn size="sm" kind="ghost" onClick={() => go("performance")}>Drivers<Icon name="right" size={13} /></Btn>}>
            <p style={{ fontWeight: 500 }}>{story.headline}.</p>
            <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>{story.bullets.slice(0, 3).map((b) => <li key={b.key}>{b.text}</li>)}</ul>
          </Card>
        </div>
      </div>
    </>
  );
}
