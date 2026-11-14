import React, { useState } from "react";
import { useStore, update, activeAt, NOW, PLAN, supplyRows, capById, statusOf } from "../store.js";
import { ALL_S, ALL_R, FC, LY12, PY12, SKUS, BRAND, TODAY, ROLES, mLabel } from "../data/catalog.js";
import { sumUnits, decompose } from "../engine/model.js";
import { vpNote, buildDeck, DECKS, driverSteps } from "../engine/stories.js";
import { deckToPptx } from "../engine/pptx.js";
import { Head, Toggle, Spinner, toast } from "../ui/common.jsx";
import { Waterfall, TrendChart, Legend } from "../ui/charts.jsx";
import { fK, fU, sp, fDate } from "../ui/format.js";
import { askText, aiAvailable, aiError, saveFile } from "../ai.js";

function Slide({ s, n }) {
  return (
    <div className={"slide slide-" + s.type} aria-label={`Slide ${n}: ${s.title}`}>
      {s.type === "title" ? (
        <div className="slide-title"><div className="bars" aria-hidden="true"><i /><i /></div><div><h3>{s.title}</h3><p>{s.sub}</p></div><span className="brandmark">Texere</span></div>
      ) : (
        <>
          {s.kicker && <div className="kicker">{s.kicker}</div>}
          <h3>{s.title}</h3>
          <div className="slide-body">
            {s.type === "bullets" && <ul>{s.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
            {s.type === "kpis" && <div className="s-kpis">{s.kpis.map(([l, v, d]) => <div key={l}><span>{l}</span><b>{v}</b><em className={d.startsWith("+") ? "delta-up" : d.startsWith("−") ? "delta-dn" : ""}>{d} vs year ago</em></div>)}</div>}
            {s.type === "trend" && <><Legend items={[{ name: "Actual", color: "var(--ink)" }, { name: "Forecast", color: "var(--accent)" }, { name: "Year ago", color: "var(--line-2)" }]} /><TrendChart months={s.months} series={s.series.map((x, i) => ({ ...x, color: ["var(--ink)", "var(--accent)", "var(--line-2)"][i], width: [2, 2.6, 1.5][i] }))} todayIdx={LY12.length - 1} height={250} /></>}
            {s.type === "waterfall" && <div className="s-split"><Waterfall start={s.start} end={s.end} steps={s.steps} startLabel={s.startLabel} endLabel={s.endLabel} /><ul>{s.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul></div>}
            {s.type === "table" && (s.rows.length ? <table><thead><tr>{s.head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{s.rows.map((r, i) => <tr key={i}>{r.cells.map((c, j) => <td key={j} className={j === 0 && r.tone ? "tone-" + r.tone : ""}>{c}</td>)}</tr>)}</tbody></table> : <p className="muted">{s.empty}</p>)}
          </div>
          {s.note && <p className="s-note">{s.note}</p>}
          <span className="pg">{n}</span>
        </>
      )}
    </div>
  );
}

export default function Shareouts() {
  const S = useStore();
  const [tab, setTab] = useState(S.role === "lead" ? "deck" : "note");
  return (
    <>
      <Head title="Shareouts" sub="Texere writes the story for you: a short note for your VP, presentation decks for business reviews and S&OP, and answers to questions about the forecast." />
      <Toggle label="Shareout type" value={tab} onChange={setTab} options={[["note", "VP note"], ["deck", "Presentation decks"], ["ask", "Ask Texere"]]} />
      {tab === "note" && <VpNote />}
      {tab === "deck" && <Decks />}
      {tab === "ask" && <Ask />}
    </>
  );
}

function VpNote() {
  const S = useStore();
  const base = vpNote();
  const [text, setText] = useState(null);
  const [busy, setBusy] = useState(false);
  const body = text ?? base.body + (base.bullets.length ? "\n\nThis week's accepted changes:\n" + base.bullets.map((b) => "• " + b).join("\n") : "");
  async function rewrite() {
    setBusy(true);
    try { setText((await askText(`Rewrite this forecast update as a short email from ${ROLES.bm.person} (brand manager) to her VP, ${ROLES.lead.person}. Keep every number exactly as given. Plain, confident, under 150 words, no greeting line or sign-off.\n\n${body}`)).trim()); }
    catch (e) { toast(aiError(e)); } finally { setBusy(false); }
  }
  async function copy() { try { await navigator.clipboard.writeText(`Subject: ${base.subject}\n\n${body}`); toast("Copied. Paste it into an email or Slack."); } catch { toast("Copy isn't available here. Select the text instead."); } }
  return (
    <div className="grid2">
      <section className="card stack" aria-labelledby="vp-h">
        <div className="row between"><h2 id="vp-h">Weekly note to {ROLES.lead.person}</h2>
          <div className="row" style={{ gap: 6 }}>{aiAvailable() && <button className="btn sm" type="button" onClick={rewrite} disabled={busy}>{busy ? <><Spinner /> Writing</> : "Rewrite with Claude"}</button>}<button className="btn sm primary" type="button" onClick={copy}>Copy</button></div></div>
        <div className="small muted">Subject: {base.subject}</div>
        <div className="answer">{body}</div>
        <p className="small muted">{text ? "Rewritten by Claude. Numbers come from the data." : "Drafted automatically from the forecast, this week's changes and supply risks."}</p>
      </section>
      <section className="card stack" aria-labelledby="src-h">
        <h2 id="src-h">Where each sentence comes from</h2>
        <ul className="bullets small">
          <li>Totals: Texere forecast vs the September consensus and the last 12 months of NielsenIQ actuals.</li>
          <li>Biggest change: the accepted assumption this week with the largest unit impact, with its source.</li>
          <li>Driver: the largest bar in the last-12-months driver report.</li>
          <li>Supply: changes of 10% or more since the forecast was last published.</li>
          <li>Pending: items still in Review and what they're worth.</li>
        </ul>
      </section>
    </div>
  );
}

function Decks() {
  const S = useStore();
  const kind = S.ui.deck || "mbr";
  const slides = buildDeck(kind);
  const [busy, setBusy] = useState(false);
  const [headline, setHeadline] = useState({});
  const shown = slides.map((s, i) => (headline[kind]?.[i] ? { ...s, ...headline[kind][i] } : s));
  async function download() {
    setBusy(true);
    try {
      const blob = await deckToPptx(shown);
      const r = await saveFile(`texere-${kind}-${TODAY}.pptx`, blob, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      if (r === "saved") toast("Deck downloaded.");
    } catch (e) { toast("The deck couldn't be created: " + (e?.message || "unknown error")); } finally { setBusy(false); }
  }
  async function sharpen() {
    setBusy(true);
    try {
      const idx = shown.map((s, i) => [i, s]).filter(([, s]) => s.type !== "title");
      const prompt = `You are editing slide titles for a CPG business review deck. Rewrite each title as an action title: one sentence under 14 words that states the takeaway, keeping every number exactly. Reply with only a JSON array of strings, same order.\n\n${idx.map(([i, s]) => `${i}: ${s.title} | content: ${(s.bullets || []).join(" ").slice(0, 300)}`).join("\n")}`;
      const t = await askText(prompt);
      const arr = JSON.parse(t.slice(t.indexOf("["), t.lastIndexOf("]") + 1));
      const map = {}; idx.forEach(([i], j) => { if (arr[j]) map[i] = { title: String(arr[j]) }; });
      setHeadline({ ...headline, [kind]: map });
    } catch (e) { toast(aiError(e)); } finally { setBusy(false); }
  }
  return (
    <>
      <div className="deck-picker">
        {Object.entries(DECKS).map(([k, d]) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => update((s) => { s.ui.deck = k; })}>
            <b>{d.name}</b><span className="small muted">For {d.for}</span><span className="small">{d.desc}</span>
          </button>
        ))}
      </div>
      <div className="row between">
        <p className="small muted">Built from live data. Change an assumption and the deck updates.</p>
        <div className="row" style={{ gap: 6 }}>
          {aiAvailable() && <button className="btn" type="button" onClick={sharpen} disabled={busy}>Sharpen titles with Claude</button>}
          <button className="btn primary" type="button" onClick={download} disabled={busy}>{busy ? <><Spinner /> Working</> : "Download PowerPoint"}</button>
        </div>
      </div>
      <div className="slides">{shown.map((s, i) => <Slide key={i} s={s} n={i + 1} />)}</div>
    </>
  );
}

function brief() {
  const now = activeAt(NOW()), plan = activeAt(PLAN);
  const lines = SKUS.map((s) => `${s.short}: next 12 months ${fU(sumUnits([s.id], ALL_R, FC, now))} units; last 12 months ${fU(sumUnits([s.id], ALL_R, LY12, now))}; September plan ${fU(sumUnits([s.id], ALL_R, FC, plan))}`);
  const months = FC.map((m) => `${mLabel(m)}: ${fU(sumUnits(ALL_S, ALL_R, [m], now))} now vs ${fU(sumUnits(ALL_S, ALL_R, [m], plan))} plan`);
  const dec = decompose(ALL_S, ALL_R, PY12, LY12, now);
  const drv = driverSteps(dec).map((d) => `${d.label}: ${fU(d.v)} units`).join("; ");
  return { lines, months, drv };
}
function Ask() {
  const S = useStore();
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState([]);
  const [busy, setBusy] = useState(false);
  const presets = ["Why did the March forecast for the small gel change?", "What drove the last 12 months?", "What should supply worry about most?", "Which retailer changed the most and why?"];
  async function ask(question) {
    const qq = (question ?? q).trim(); if (!qq) return;
    const now = activeAt(NOW());
    const b = brief();
    const as = S.assumptions.map((a) => { const c = capById(a.capture) || {}; return `${a.id} [${statusOf(a)}] ${a.summary}; months ${a.months[0]} to ${a.months[a.months.length - 1]}; impact ${a.impact}%; from ${c.title} (${c.person}, ${c.team}) on ${a.decidedAt || a.createdAt}`; });
    const risks = supplyRows().filter((r) => r.risk).map((r) => `${r.sku} ${r.m}: ${r.risk} (${fU(r.diff)} units)`);
    const data = `Brand ${BRAND}. Today ${TODAY}.\nBy SKU:\n${b.lines.join("\n")}\nBy month (all SKUs):\n${b.months.join("\n")}\nLast-12-month drivers vs year ago: ${b.drv}\nAssumptions:\n${as.join("\n")}\nSupply risks: ${risks.join("; ") || "none"}`;
    const history = turns.slice(-6).map((t) => `${t.role === "user" ? "Question" : "Answer"}: ${t.text}`).join("\n");
    setTurns((t) => [...t, { role: "user", text: qq }]); setQ(""); setBusy(true);
    try {
      const a = await askText(`You are Texere, a forecasting assistant for a CPG brand team. Answer using only the data below. Be specific: cite assumption IDs, people, dates and unit numbers. At most 120 words, plain sentences.\n\n${history ? "Conversation so far:\n" + history + "\n\n" : ""}Question: ${qq}\n\nData:\n${data}`);
      setTurns((t) => [...t, { role: "assistant", text: a.trim() }]);
    } catch (e) { setTurns((t) => [...t, { role: "assistant", text: aiError(e) }]); } finally { setBusy(false); }
  }
  if (!aiAvailable()) return <section className="card"><p>Ask Texere needs Claude. Open this app inside the Claude app, or add an Anthropic API key in <a href="#settings">Settings</a>.</p></section>;
  return (
    <section className="card stack" aria-labelledby="ask-h">
      <h2 id="ask-h">Ask Texere about the forecast</h2>
      <div className="chips">{presets.map((p) => <button key={p} className="chip btnchip" type="button" onClick={() => ask(p)} disabled={busy}>{p}</button>)}</div>
      <ol className="msgs big">{turns.map((t, i) => <li key={i} className={"msg " + (t.role === "user" ? "mine" : "bot")}><div className="who">{t.role === "user" ? ROLES[S.role].person : "Texere"}</div><div>{t.text}</div></li>)}{busy && <li className="msg bot"><Spinner /> Thinking</li>}</ol>
      <form className="row" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <label className="sr" htmlFor="ask-q">Question</label>
        <input id="ask-q" type="text" style={{ flex: 1, minWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything about the numbers, drivers or assumptions" />
        <button className="btn primary" type="submit" disabled={busy || !q.trim()}>Ask</button>
      </form>
    </section>
  );
}
