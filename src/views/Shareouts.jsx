import React, { useState } from "react";
import { useStore, update, activeAt, NOW, PLAN, statusOf, capById, key, me } from "../store.js";
import { ALL_S, ALL_R, SKUS, RETAILERS, FC_MONTHS, COMPANY, TODAY, ROLES, mLabel, weeksInMonth, skuById, WEEKS } from "../data/catalog.js";
import { PERIODS, units, compWeeks, decompose, decompSteps, monthUnits } from "../engine/analytics.js";
import { vpNote, buildDeck, DECKS, driverStory, impactUnits } from "../engine/stories.js";
import { allSupply } from "../engine/supply.js";
import { deckToPptx } from "../engine/pptx.js";
import { askText, aiAvailable, aiError, saveFile } from "../ai.js";
import { Card, Btn, Tabs, Spinner, Avatar, Badge, cx, toast } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { Lines, Waterfall } from "../ui/charts.jsx";
import { fK, fU, sg, sp, fDate, lcFirst, mRange } from "../ui/format.js";

export default function Shareouts() {
  const S = useStore();
  const [tab, setTab] = useState("note");
  return (
    <>
      <div className="ph">
        <div><h1>Shareouts</h1><p className="sub">Leadership updates written from live data: the weekly note, three ready decks, and answers to ad-hoc questions. Change an assumption and they all update.</p></div>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[["note", "Weekly VP note"], ["deck", "Presentation decks"], ["ask", "Ask Texere"]]} />
      {tab === "note" && <VpNote />}
      {tab === "deck" && <Decks />}
      {tab === "ask" && <Ask />}
    </>
  );
}

function VpNote() {
  const base = vpNote();
  const [body, setBody] = useState(null);
  const [busy, setBusy] = useState(false);
  const text = body ?? base.body;
  async function rewrite() {
    setBusy(true);
    try { setBody((await askText(`Rewrite this weekly forecast note for a VP of Marketing at a CPG company. Keep every number exactly. Plain, confident sentences, under 150 words, no bullet points.\n\n${base.body}`)).trim()); }
    catch (e) { toast(aiError(e)); } finally { setBusy(false); }
  }
  async function copy() { try { await navigator.clipboard.writeText(`Subject: ${base.subject}\n\n${text}`); toast("Copied. Paste it into an email or Slack."); } catch { toast("Copy isn't available here. Select the text instead."); } }
  return (
    <div className="g-main">
      <Card id="vp" title="Weekly note to Carla Mendes" sub="Drafted every Friday from the forecast, the driver model and the approvals log"
        actions={<>{aiAvailable() && <Btn size="sm" icon="spark" onClick={rewrite} disabled={busy}>{busy ? "Writing" : "Polish with Claude"}</Btn>}<Btn size="sm" kind="primary" icon="doc" onClick={copy}>Copy</Btn></>}>
        <div className="note-box">
          <div className="row" style={{ marginBottom: 10 }}><Avatar name="Lena Park" size={26} /><div className="small"><b>Lena Park</b> to Carla Mendes<div className="xs muted">Draft · {fDate(TODAY)}</div></div></div>
          <div className="subj">{base.subject}</div>
          <p>{text}</p>
          {base.bullets.length > 0 && <><div className="eyebrow" style={{ marginTop: 14, marginBottom: 6 }}>Changes approved this week</div><ul style={{ margin: 0, paddingLeft: 18 }}>{base.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul></>}
        </div>
      </Card>
      <Card id="src" title="Where each sentence comes from" sub="So nobody has to ask">
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          <li>Sales and share: NielsenIQ, last 13 weeks vs the same weeks a year ago.</li>
          <li>Biggest driver: Texere's driver decomposition (distribution, price, promotion, feature, display, seasonality, competition).</li>
          <li>Forecast vs plan: next 52 weeks with every approved assumption vs the September 28 consensus.</li>
          <li>This week's changes: assumptions approved since Nov 6, with the person who shared each one.</li>
          <li>Supply: the projected-inventory check in the Supply view.</li>
        </ul>
      </Card>
    </div>
  );
}

function SlideView({ s, n }) {
  if (s.type === "title") return <div className="slide title"><div className="sk" style={{ color: "#F0A527" }}>Texere</div><div className="st">{s.title}</div><div style={{ fontSize: 10, color: "#C9CAF0" }}>{s.sub}</div><span className="sn">{n}</span></div>;
  return (
    <div className="slide" aria-label={`Slide ${n}: ${s.title}`}>
      {s.kicker && <div className="sk">{s.kicker}</div>}
      <div className="st">{s.title}</div>
      <div className="mini">
        {s.type === "bullets" && <ul>{s.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
        {s.type === "kpis" && <div className="sk-grid">{s.kpis.map(([l, v, d]) => <div key={l}><span style={{ color: "#6B6D82" }}>{l}</span><b>{v}</b><span style={{ color: d.startsWith("+") ? "#0E8F6E" : d.startsWith("−") ? "#D0442F" : "#6B6D82", fontFamily: "var(--mono)" }}>{d}</span></div>)}</div>}
        {s.type === "trend" && <Lines height={120} legend={false} labels={s.labels} splitAt={11} series={s.series.map((x, i) => ({ ...x, color: ["#3B3D55", "#3D44E8", "#9A9CAE", "#D6D5CC"][i], dash: i === 2 ? "4 3" : undefined, width: i === 1 ? 2.2 : 1.6 }))} />}
        {s.type === "waterfall" && <Waterfall start={s.start} end={s.end} steps={s.steps} startLabel={s.startLabel} endLabel={s.endLabel} height={130} />}
        {s.type === "table" && (s.rows.length ? <table><thead><tr>{s.head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{s.rows.slice(0, 7).map((r, i) => <tr key={i}>{r.cells.map((c, j) => <td key={j} style={{ color: r.tone === "bad" && j === 1 ? "#D0442F" : undefined }}>{c}</td>)}</tr>)}</tbody></table> : <p style={{ color: "#6B6D82" }}>{s.empty}</p>)}
      </div>
      {s.note && <div style={{ fontSize: 8, color: "#9A9CAE" }}>{s.note}</div>}
      <span className="sn">{n}</span>
    </div>
  );
}

function Decks() {
  const S = useStore();
  const kind = S.ui.deck || "mbr";
  const slides = buildDeck(kind);
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try { const blob = await deckToPptx(slides); const r = await saveFile(`Texere - ${DECKS[kind].name}.pptx`, blob, "application/vnd.openxmlformats-officedocument.presentationml.presentation"); if (r === "saved") toast("PowerPoint downloaded."); }
    catch (e) { toast("Couldn't build the file: " + (e?.message || e)); } finally { setBusy(false); }
  }
  return (
    <div className="stack lg">
      <div className="grid3">
        {Object.entries(DECKS).map(([k, d]) => (
          <button key={k} type="button" className={cx("kpi click", kind === k && "on")} style={{ gap: 4 }} onClick={() => update((s) => { s.ui.deck = k; })}>
            <span className="row between"><b style={{ fontSize: 14 }}>{d.name}</b><Icon name="present" size={16} /></span><span className="xs muted">For {d.for}</span><span className="small">{d.desc}</span>
          </button>
        ))}
      </div>
      <div className="row between"><p className="small muted">{slides.length} slides, built from live data on {fDate(TODAY)}. Charts are native PowerPoint charts you can restyle.</p>
        <Btn kind="primary" icon="download" onClick={download} disabled={busy}>{busy ? <><Spinner /> Building</> : "Download PowerPoint"}</Btn></div>
      <div className="slides">{slides.map((s, i) => <SlideView key={i} s={s} n={i + 1} />)}</div>
    </div>
  );
}

// Offline answers built straight from the model, for the preset questions
function offlineAnswer(q) {
  const now = activeAt(NOW()), plan = activeAt(PLAN);
  const ql = q.toLowerCase();
  if (/supply|stock|inventory/.test(ql)) {
    const r = allSupply().filter((x) => x.firstRisk || x.excess);
    return r.length ? r.map((x) => `${skuById(x.sku).short}: ${x.status.toLowerCase()}${x.firstRisk ? ` from the week ending ${fDate(WEEKS[x.firstRisk.i].end)}` : ""}, 13-week demand ${sg(x.d13)} units vs the last publish${x.reasons.length ? " (" + x.reasons.map((a) => a.id).join(", ") + ")" : ""}.`).join(" ") : "No SKU drops below safety stock in the next 26 weeks.";
  }
  if (/march|gel/.test(ql)) {
    const w = weeksInMonth("2027-03"), p = units(["GEL17"], ALL_R, w, plan), n = units(["GEL17"], ALL_R, w, now);
    const ch = S().assumptions.filter((a) => a.skus.includes("GEL17") && a.months.includes("2027-03") && a.decidedAt && key(a) > PLAN);
    return `Hydra Gel 1.7 oz in March moved from ${fK(p)} to ${fK(n)} units (${sp((n / p - 1) * 100)}). ${ch.map((a) => `${a.id} (${a.status === "approved" && !a.supersedes ? "" : ""}${lcFirst(a.summary)}, ${a.impact > 0 ? "+" : ""}${a.impact}%, from ${capById(a.capture)?.person} on ${fDate(a.decidedAt)})`).join("; ")}.`;
  }
  if (/retailer/.test(ql)) {
    const N = PERIODS.N52W.weeks;
    const r = RETAILERS.map((x) => ({ x, d: units(ALL_S, [x.id], N, now) - units(ALL_S, [x.id], N, plan) })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
    const as = S().assumptions.filter((a) => statusOf(a) === "approved" && a.retailers.includes(r.x.id) && a.retailers.length === 1);
    return `${r.x.name} moved the most: ${sg(r.d)} units over the next 52 weeks vs plan, from ${as.map((a) => `${a.id} (${lcFirst(a.summary)})`).join(", ") || "price and supply changes across all retailers"}.`;
  }
  const st = driverStory(decompose(ALL_S, ALL_R, compWeeks("L13W", "YA"), PERIODS.L13W.weeks), "L13W");
  return `${st.headline} in the last 13 weeks vs a year ago. ${st.bullets.map((b) => b.text).join(" ")}`;
}
import { getState as S } from "../store.js";

function Ask() {
  const st = useStore();
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState([]);
  const [busy, setBusy] = useState(false);
  const presets = ["Why did the March forecast for the small gel change?", "What drove the last 13 weeks?", "What should supply worry about most?", "Which retailer changed the most vs plan, and why?"];
  async function ask(question) {
    const qq = (question ?? q).trim(); if (!qq) return;
    setTurns((t) => [...t, { role: "user", text: qq }]); setQ(""); setBusy(true);
    let a;
    try {
      if (!aiAvailable()) throw Object.assign(new Error(), { code: "offline" });
      const now = activeAt(NOW()), plan = activeAt(PLAN);
      const sk = SKUS.map((s) => `${s.short}: next 52 wks ${fU(units([s.id], ALL_R, PERIODS.N52W.weeks, now))} units, plan ${fU(units([s.id], ALL_R, PERIODS.N52W.weeks, plan))}, last 52 wks ${fU(units([s.id], ALL_R, PERIODS.L52W.weeks, now))}`).join("\n");
      const ms = FC_MONTHS.map((m) => `${mLabel(m)}: ${fU(monthUnits(ALL_S, ALL_R, m, now))} now vs ${fU(monthUnits(ALL_S, ALL_R, m, plan))} plan`).join("\n");
      const dec = decompose(ALL_S, ALL_R, compWeeks("L13W", "YA"), PERIODS.L13W.weeks);
      const as = st.assumptions.map((x) => { const c = capById(x.capture) || {}; return `${x.id} [${statusOf(x)}] ${x.summary}; ${mRange(x.months)}; impact ${x.impact}%; ${sg(impactUnits(x, now))} units; from ${c.title || "market signal"} (${c.person || "Texere"}) ${x.decidedAt || x.createdAt}`; }).join("\n");
      const risks = allSupply().filter((x) => x.firstRisk).map((x) => `${x.sku}: ${x.status}`).join("; ");
      const hist = turns.slice(-6).map((t) => `${t.role === "user" ? "Q" : "A"}: ${t.text}`).join("\n");
      a = (await askText(`You are Texere, a forecasting assistant for the ${COMPANY} brand team. Today is ${TODAY}. Answer using only the data below; cite assumption IDs, people, dates and unit numbers. At most 120 words, plain sentences.\n\n${hist ? "Conversation so far:\n" + hist + "\n\n" : ""}Question: ${qq}\n\nBy SKU:\n${sk}\n\nBy month:\n${ms}\n\nLast 13 weeks vs YA drivers: ${decompSteps(dec).map((d) => `${d.label} ${fU(d.v)}`).join("; ")}\n\nAssumptions:\n${as}\n\nSupply risks: ${risks || "none"}`)).trim();
    } catch (e) {
      a = offlineAnswer(qq) + (e?.code === "offline" ? "" : ` (${aiError(e)})`);
    }
    setTurns((t) => [...t, { role: "assistant", text: a, offline: !aiAvailable() }]); setBusy(false);
  }
  return (
    <Card id="ask" title="Ask Texere" sub={aiAvailable() ? "Answers from the live forecast, drivers and approvals log, written by Claude" : "Claude isn't connected, so answers come from built-in templates over the same data. Connect Claude in Settings for free-form questions."}>
      <div className="chips">{presets.map((p) => <button key={p} className="chip" style={{ cursor: "pointer", border: "1px solid var(--line)" }} type="button" onClick={() => ask(p)} disabled={busy}>{p}</button>)}</div>
      <div className="thread">
        {turns.map((t, i) => (
          <div className={cx("msg", t.role !== "user" && "ai")} key={i}><Avatar name={t.role === "user" ? me().person : "Texere"} size={28} /><div><div className="who"><b>{t.role === "user" ? me().person : "Texere"}</b>{t.offline && t.role !== "user" && <span className="sim">Template answer</span>}</div><div className="bub">{t.text}</div></div></div>
        ))}
        {busy && <div className="msg ai"><Avatar name="Texere" size={28} /><div className="bub row"><Spinner />Looking through the data</div></div>}
      </div>
      <form className="compose" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <textarea rows={1} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about the numbers, drivers or assumptions" aria-label="Question" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} />
        <Btn kind="primary" size="sm" icon="send" type="submit" disabled={busy || !q.trim()}>Ask</Btn>
      </form>
    </Card>
  );
}
