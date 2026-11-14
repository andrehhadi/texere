import React, { useRef, useState } from "react";
import { useStore, update, capById, assm, me } from "../store.js";
import { KINDS, TEAMS, TODAY, ROLES, fcRange } from "../data/catalog.js";
import { extractPrompt, normalize, parseTranscript } from "../engine/extract.js";
import { askJSON, aiAvailable, aiError, aiModeLabel } from "../ai.js";
import { addAssumption, openAssm } from "../actions.js";
import { Card, Badge, Btn, Empty, Spinner, DriverTag, ConfTag, Avatar, StatusBadge, Sim, cx, toast } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { skuNames, retNames, mRange, fDate, relDay, plural } from "../ui/format.js";

const SOURCES = [
  ["Zoom", "call", "Joins approved meetings; the transcript arrives when the call ends", "6 meetings this cycle", true],
  ["Microsoft Teams", "call", "Same, through the Teams meeting app", "2 meetings this cycle", true],
  ["Slack", "slack", "Channels the team picks, like #lumen-target", "3 channels watched", true],
  ["Email", "email", "Forward buyer emails and promo calendars to capture@texere", "1 email this cycle", true],
  ["Google Meet", "call", "Transcripts from Google Docs after each meeting", "Not connected", false],
  ["Web monitor", "web", "Trade press, retailer sites, price scans, search trends", "4 signals this month", true],
];
const INCOMING = {
  kind: "call", title: "CVS buyer call", team: "Customer strategy", person: "Dana Ortiz", auto: "Zoom",
  text: "Dana (Lumen): Hi Mia, thanks for the time. Anything new on the spring plan?\nMia (CVS buyer): A couple of things. We're adding the night repair serum to our prestige skincare set at launch, all stores.\nDana: Great. Still April?\nMia: Yes, we're planning around your April ship date. And the 3.4 oz gel is coming off the every-other-month promotion starting in January. We're moving that money to the serum launch.\nDana: Understood. So January onward, no more 3.4 oz deals?\nMia: Correct, at least through the summer.",
  example: [
    { summary: "CVS stops the every-other-month promotion on Hydra Gel 3.4 oz from January through summer", skus: ["GEL34"], retailers: ["CVS"], months: ["2027-01", "2027-03", "2027-05", "2027-07"], driver: "promotion", impact: -21, confidence: "confirmed", quote: "The 3.4 oz gel is coming off the every-other-month promotion starting in January.", rationale: "These deals (20% off in 80% of stores) lifted volume about 26%; removing them gives back about 21%.", supersedes: null },
    { summary: "CVS confirms Renew Night Serum in all stores at the April launch", skus: ["SER10"], retailers: ["CVS"], months: fcRange("2027-04", "2027-10"), driver: "launch", impact: 0, confidence: "confirmed", quote: "We're adding the night repair serum to our prestige skincare set at launch, all stores.", rationale: "Already in the launch plan; confirms full distribution, no change to the number.", supersedes: null },
  ],
};
const KIND_IC = { call: "call", slack: "slack", email: "email", doc: "doc", web: "web" };

function highlight(text, quotes) {
  const qs = quotes.filter((q) => q && text.includes(q));
  if (!qs.length) return text;
  const parts = []; let rest = text, k = 0;
  while (rest) {
    let best = null; for (const q of qs) { const i = rest.indexOf(q); if (i >= 0 && (best === null || i < best.i)) best = { i, q }; }
    if (!best) { parts.push(rest); break; }
    parts.push(rest.slice(0, best.i)); parts.push(<mark key={k++}>{best.q}</mark>); rest = rest.slice(best.i + best.q.length);
  }
  return parts;
}

export default function Capture({ go }) {
  const S = useStore();
  const [showNew, setShowNew] = useState(false);
  const caps = [...S.captures].sort((a, b) => (a.status === "shared") - (b.status === "shared") || b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const cur = capById(S.ui.cap) || caps[0];
  function simulate() {
    update((s) => { const id = "C" + s.nextC++; s.captures.push({ id, ...INCOMING, date: TODAY, status: "new" }); s.ui.cap = id; });
    toast("New Zoom transcript: CVS buyer call (Dana Ortiz).");
  }
  return (
    <>
      <div className="ph">
        <div><h1>Capture</h1><p className="sub">Conversations arrive from calls, chat, email and the web. Texere finds what changes unit sales of a SKU at a retailer in a month, and the person who was in the conversation decides what to share.</p></div>
        <div className="ph-a"><Btn icon="zap" onClick={simulate}>Simulate a Zoom call ending</Btn><Btn kind="primary" icon="plus" onClick={() => setShowNew(true)}>Add a conversation</Btn></div>
      </div>
      <div className="sources">
        {SOURCES.map(([n, ic, d, st, on]) => (
          <div className="source" key={n}><div className="row between"><span className="row nw" style={{ gap: 8 }}><Icon name={ic} size={16} /><b>{n}</b></span><span className={on ? "on" : "off"} title={on ? "Connected" : "Not connected"} /></div><span className="xs muted">{d}</span><span className="xs">{st}</span></div>
        ))}
      </div>
      <p className="xs muted" style={{ marginTop: -8 }}><Sim /> Live connections are simulated in this prototype. Uploading or pasting a real transcript works, and extraction uses {aiModeLabel()}.</p>
      {showNew && <NewCapture onClose={() => setShowNew(false)} />}
      <div className="inbox" style={{ minHeight: 560 }}>
        <div className="ib-list">
          <div className="ib-head"><div className="row between"><b className="small">Conversations</b><Badge t="saffron">{S.captures.filter((c) => c.status === "new").length} new</Badge></div></div>
          <div className="ib-items">
            {caps.map((c) => (
              <div key={c.id} className={cx("ib-it", cur?.id === c.id && "on")} onClick={() => update((s) => { s.ui.cap = c.id; })} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") update((s) => { s.ui.cap = c.id; }); }}>
                <span className="avatar" style={{ width: 28, height: 28, background: "var(--sunk)", color: "var(--ink-2)" }}><Icon name={KIND_IC[c.kind] || "doc"} size={14} /></span>
                <div className="grow">
                  <div className="row nw between"><span className="xs muted">{c.person} · {relDay(c.date)}</span>{c.status === "new" ? <Badge t="saffron">New</Badge> : c.status === "review" ? <Badge t="warn">Ready to share</Badge> : <Badge t="good">Shared</Badge>}</div>
                  <div className="t">{c.title}</div>
                  <div className="m">{c.team}{c.auto ? " · via " + c.auto : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="ib-detail">{cur ? <CapDetail key={cur.id} c={cur} go={go} /> : <Empty>Add a conversation to get started.</Empty>}</div>
      </div>
    </>
  );
}

let ctl = null;
function CapDetail({ c, go }) {
  const S = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const shared = S.assumptions.filter((a) => a.capture === c.id);
  const items = c.items || [];
  async function extract() {
    setErr(null);
    const useExample = () => update((s) => { const x = s.captures.find((y) => y.id === c.id); x.items = c.example.map((i) => ({ ...i, share: true })); x.mode = "example"; x.status = "review"; });
    if (!aiAvailable()) { if (c.example) useExample(); return; }
    setBusy(true); ctl = new AbortController();
    try {
      const res = await askJSON(extractPrompt(c), { signal: ctl.signal });
      const its = normalize(res);
      update((s) => { const x = s.captures.find((y) => y.id === c.id); x.items = its; x.mode = "ai"; x.status = "review"; });
    } catch (e) {
      if (e?.code === "cancelled" || e?.name === "AbortError") { /* stopped */ }
      else if (c.example) { useExample(); toast(aiError(e) + " Showing the prepared example."); }
      else setErr(aiError(e));
    } finally { setBusy(false); ctl = null; }
  }
  function share() {
    const sel = items.filter((i) => i.share);
    const ids = sel.map(({ share: _s, ...rest }) => addAssumption(rest, c.id));
    update((s) => { s.captures.find((y) => y.id === c.id).status = "shared"; });
    toast(sel.length ? `${plural(sel.length, "item")} sent to ${ROLES.bm.person} for approval.` : "Marked as reviewed.", sel.length ? ["inbox", "Open approvals"] : null);
    if (ids[0]) update((s) => { s.ui.inboxSel = ids[0]; s.ui.inboxTab = "pending"; });
  }
  const setItem = (i, patch) => update((s) => { Object.assign(s.captures.find((y) => y.id === c.id).items[i], patch); });
  const quotes = [...items.map((i) => i.quote), ...shared.map((a) => a.quote)];
  return (
    <>
      <div className="ib-dh">
        <div className="row"><span className="eyebrow">{KINDS[c.kind]}{c.auto ? ` · captured automatically from ${c.auto}` : ""}</span></div>
        <h2>{c.title}</h2>
        <div className="row small muted"><Avatar name={c.person} size={20} />{c.person} · {c.team} · {fDate(c.date)}, 2026</div>
      </div>
      <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="transcript" tabIndex={0} aria-label="Transcript">{highlight(c.text, quotes)}</div>
        {c.status === "shared" ? (
          <div className="stack"><div className="eyebrow">Shared from this conversation</div>
            {shared.length ? shared.map((a) => (
              <button key={a.id} type="button" className="xitem" style={{ background: "none", textAlign: "left", cursor: "pointer" }} onClick={() => openAssm(a.id)}>
                <div className="row between"><span className="row"><span className="num small muted">{a.id}</span><StatusBadge a={a} /><DriverTag d={a.driver} /></span><span className="num small">{a.impact > 0 ? "+" : ""}{a.impact}%</span></div>
                <b style={{ fontWeight: 500 }}>{a.summary}</b>
              </button>
            )) : <p className="muted small">Nothing in this conversation changed the forecast.</p>}
          </div>
        ) : busy ? (
          <div className="banner"><Spinner /><span>Reading the conversation and matching it to your SKUs, retailers and months.</span><Btn size="sm" onClick={() => ctl?.abort()}>Stop</Btn></div>
        ) : c.status === "review" ? (
          <div className="stack">
            <div className="row between"><div><b>Texere found {plural(items.length, "thing")} that affect the forecast</b><p className="xs muted">{c.mode === "example" ? "Prepared example (Claude isn't connected in this view)." : "Extracted by Claude."} You decide what to share. Anything kept private never leaves this inbox.</p></div>
              {aiAvailable() && <Btn size="sm" icon="refresh" onClick={extract}>Run again</Btn>}</div>
            {items.map((it, i) => (
              <div className={cx("xitem", !it.share && "off")} key={i}>
                <div className="row between nw" style={{ alignItems: "flex-start" }}>
                  <div className="grow"><b style={{ fontWeight: 550 }}>{it.summary}</b>
                    <div className="chips" style={{ marginTop: 6 }}><DriverTag d={it.driver} /><ConfTag c={it.confidence} /><span className="chip">{skuNames(it.skus)}</span><span className="chip">{retNames(it.retailers)}</span><span className="chip">{mRange(it.months)}</span></div></div>
                  <label className="row small" style={{ gap: 6, whiteSpace: "nowrap" }}><input type="checkbox" checked={it.share} onChange={(e) => setItem(i, { share: e.target.checked })} />Share</label>
                </div>
                <div className="quote">“{it.quote}”</div>
                <div className="row small"><span>Impact</span><input className="impact-in" type="number" aria-label="Impact percent" value={it.impact} onChange={(e) => setItem(i, { impact: Math.max(-100, Math.min(300, Number(e.target.value) || 0)) })} /><span>% in those months</span><span className="muted">· {it.rationale}</span></div>
                {it.supersedes && assm(it.supersedes) && <div className="banner" style={{ padding: "6px 10px" }}><Icon name="merge" size={14} />Revises <b>{it.supersedes}</b>: {assm(it.supersedes).summary} ({assm(it.supersedes).impact}% → {it.impact}%)</div>}
              </div>
            ))}
            {items.length === 0 && <Empty>Nothing here changes unit sales.</Empty>}
            <div className="row between"><span className="small muted">{items.filter((i) => i.share).length} of {items.length} selected</span>
              <Btn kind="primary" icon="send" onClick={share}>{items.length ? `Send ${items.filter((i) => i.share).length} to ${ROLES.bm.person}` : "Mark as reviewed"}</Btn></div>
          </div>
        ) : (
          <div className="row between" style={{ border: "1px dashed var(--line-2)", borderRadius: 10, padding: 14 }}>
            <div className="grow"><b>Find what affects the forecast</b><p className="small muted">{aiAvailable() ? "Claude reads the conversation, matches it to your SKUs, retailers and months, and estimates the impact from your NielsenIQ history." : c.example ? "Claude isn't connected, so Texere uses an example prepared for this conversation. Connect Claude in Settings to extract from your own text." : "Connect Claude in Settings to extract from your own text."}</p></div>
            <Btn kind="primary" icon="spark" onClick={extract} disabled={!aiAvailable() && !c.example}>Extract assumptions</Btn>
            {err && <p className="small dn" style={{ width: "100%" }}>{err}</p>}
          </div>
        )}
      </div>
    </>
  );
}

function NewCapture({ onClose }) {
  const [f, setF] = useState({ kind: "call", team: "Customer strategy", person: "", date: TODAY, title: "", text: "" });
  const [fname, setFname] = useState("");
  const fileRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  function onFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => { setF((p) => ({ ...p, text: parseTranscript(String(rd.result || "")), title: p.title || file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ") })); setFname(file.name); };
    rd.readAsText(file);
  }
  function save() {
    const text = parseTranscript(f.text || "");
    if (!text) { toast("Paste or upload the conversation first."); return; }
    update((s) => { const id = "C" + s.nextC++; s.captures.push({ id, ...f, text, title: f.title || "Untitled conversation", person: f.person || ROLES[s.role].person, status: "new" }); s.ui.cap = id; });
    onClose(); toast("Added to Capture.");
  }
  return (
    <Card id="nc" title="Add a conversation" actions={<Btn size="sm" kind="ghost" onClick={onClose}>Cancel</Btn>}>
      <div className="kv">
        <label className="f">Type<select className="plain" value={f.kind} onChange={set("kind")}>{Object.entries(KINDS).filter(([k]) => k !== "web").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="f">Team<select className="plain" value={f.team} onChange={set("team")}>{TEAMS.filter((t) => t !== "Market signal").map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="f">Your name<input type="text" value={f.person} onChange={set("person")} placeholder="e.g. Dana Ortiz" /></label>
        <label className="f">Date<input type="date" value={f.date} onChange={set("date")} /></label>
      </div>
      <label className="f">Title<input type="text" value={f.title} onChange={set("title")} placeholder="e.g. Walgreens buyer call" /></label>
      <div className="row"><Btn size="sm" icon="upload" onClick={() => fileRef.current?.click()}>Upload transcript (.vtt, .txt, .md)</Btn>
        <input ref={fileRef} type="file" accept=".vtt,.txt,.md,.srt,text/plain" hidden onChange={onFile} />
        <span className="xs muted">{fname ? fname + " loaded." : "Zoom and Teams save .vtt transcripts; timestamps are removed automatically."}</span></div>
      <label className="f">Transcript or message<textarea rows={7} value={f.text} onChange={set("text")} placeholder="Paste the conversation. Mention SKUs, retailers and months the way people actually talk." /></label>
      <div className="row" style={{ justifyContent: "flex-end" }}><Btn kind="primary" onClick={save}>Add</Btn></div>
    </Card>
  );
}
