import React, { useState, useRef } from "react";
import { useStore, update, capById, assm, statusOf } from "../store.js";
import { KINDS, TEAMS, TODAY, DRIVERS, ROLES, ALL_R, fcRange } from "../data/catalog.js";
import { Head, Icon, Chip, ConfChip, DriverChip, Empty, Spinner, Toggle, SimTag, toast } from "../ui/common.jsx";
import { sp, dcls, fDate, skuNames, retNames, mRange } from "../ui/format.js";
import { extractPrompt, normalize, parseTranscript } from "../engine/extract.js";
import { askJSON, aiAvailable, aiError, aiMode } from "../ai.js";
import { FeedItem } from "./parts.jsx";

const SOURCES = [
  ["Zoom", "Joins approved meetings and receives the transcript when the call ends", "3 meetings captured this week"],
  ["Microsoft Teams", "Same as Zoom, through the Teams meeting app", "1 meeting captured this week"],
  ["Google Meet", "Transcripts from Google Docs after each meeting", "Not connected"],
  ["Slack", "Channels the team chooses, like #lumen-target", "2 channels watched"],
  ["Email", "Forward promo calendars and buyer emails to a Texere address", "1 email this week"],
];
// A prepared call that "arrives" from Zoom when you press the demo button
const INCOMING = {
  kind: "call", title: "CVS buyer call", team: "Customer strategy", person: "Dana Ortiz", auto: "Zoom",
  text: "Dana (Lumen): Hi Mia, thanks for the time. Anything new on the spring plan?\nMia (CVS buyer): A couple of things. We're adding the night repair serum to our prestige skincare set at launch, all stores.\nDana: Great. Still April?\nMia: Yes, we're planning around your April ship date. And the 3.4 oz gel is coming off the every-other-month promotion starting in January. We're moving that money to the serum launch.\nDana: Understood. So January onward, no more 3.4 oz deals?\nMia: Correct, at least through the summer.",
  example: [
    { summary: "CVS stops the every-other-month promotion on the 3.4 oz gel from January through summer", skus: ["GEL34"], retailers: ["CVS"], months: ["2027-02", "2027-04", "2027-06", "2027-08"], driver: "promotion", impact: -21, confidence: "confirmed", quote: "The 3.4 oz gel is coming off the every-other-month promotion starting in January.", rationale: "These deals (20% off in 80% of stores) lifted volume about 26%; removing them takes back about 21%.", supersedes: null },
    { summary: "CVS confirms the night repair serum in all stores at the April launch", skus: ["SER10"], retailers: ["CVS"], months: fcRange("2027-04", "2027-10"), driver: "launch", impact: 0, confidence: "confirmed", quote: "We're adding the night repair serum to our prestige skincare set at launch, all stores.", rationale: "Already in the launch plan; confirms full distribution, no change to the number.", supersedes: null },
  ],
};

export default function Capture() {
  const S = useStore();
  const [showNew, setShowNew] = useState(false);
  const caps = [...S.captures].sort((a, b) => (a.status === "shared") - (b.status === "shared") || b.date.localeCompare(a.date));
  const cur = capById(S.ui.cap) || caps[0];
  function simulateIncoming() {
    update((s) => { const id = "C" + s.nextC++; s.captures.push({ id, ...INCOMING, date: TODAY, status: "new" }); s.ui.cap = id; });
    toast("New Zoom transcript received: CVS buyer call.");
  }
  return (
    <>
      <Head title="Capture" sub="Conversations arrive from calls, chats and email. Texere finds what affects sales of each SKU, and the person who was in the conversation approves what gets shared.">
        <button className="btn" type="button" onClick={simulateIncoming}>Simulate a Zoom call ending</button>
        <button className="btn primary" type="button" onClick={() => setShowNew(true)}>Add a conversation</button>
      </Head>
      <section className="card stack" aria-labelledby="src-h">
        <div className="row between"><h2 id="src-h">Connected sources</h2><span className="small muted">Live connections are simulated. Uploading or pasting real transcripts works.</span></div>
        <div className="sources">
          {SOURCES.map(([n, d, st]) => (
            <div className="source" key={n}><div className="row between"><b>{n}</b><SimTag /></div><span className="small muted">{d}</span><span className="small">{st}</span></div>
          ))}
        </div>
      </section>
      {showNew && <NewCapture onClose={() => setShowNew(false)} />}
      <div className="split">
        <div className="inbox" role="list" aria-label="Captured conversations">
          {caps.map((c) => (
            <button key={c.id} type="button" role="listitem" aria-pressed={cur && c.id === cur.id} onClick={() => update((s) => { s.ui.cap = c.id; })}>
              <span className="row" style={{ gap: 8 }}><Icon name={c.kind} size={15} /><span className="t">{c.title}</span></span>
              <span className="small muted">{c.person} · {c.team} · {fDate(c.date)}{c.auto ? ` · ${c.auto}` : ""}</span>
              <span>{c.status === "new" ? <Chip tone="weft">New</Chip> : c.status === "review" ? <Chip tone="warn">Ready to share</Chip> : <Chip tone="good">Shared</Chip>}</span>
            </button>
          ))}
        </div>
        <div className="stack">{cur ? <CapDetail c={cur} /> : <Empty>Add a conversation to get started.</Empty>}</div>
      </div>
    </>
  );
}

let ctl = null;
function CapDetail({ c }) {
  const S = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  async function extract() {
    setErr(null);
    if (!aiAvailable()) {
      if (c.example) { update((s) => { const x = s.captures.find((y) => y.id === c.id); x.items = c.example.map((i) => ({ ...i, share: true })); x.mode = "example"; x.status = "review"; }); }
      return;
    }
    setBusy(true); ctl = new AbortController();
    try {
      const res = await askJSON(extractPrompt(c), { signal: ctl.signal });
      const items = normalize(res);
      update((s) => { const x = s.captures.find((y) => y.id === c.id); x.items = items; x.mode = "ai"; x.status = "review"; });
    } catch (e) {
      if (e?.code === "cancelled" || e?.name === "AbortError") { /* stopped */ }
      else if (c.example) { update((s) => { const x = s.captures.find((y) => y.id === c.id); x.items = c.example.map((i) => ({ ...i, share: true })); x.mode = "example"; x.status = "review"; }); toast(aiError(e) + " Showing the prepared example instead."); }
      else setErr(aiError(e));
    } finally { setBusy(false); ctl = null; }
  }
  function share() {
    const sel = (c.items || []).filter((i) => i.share);
    update((s) => {
      for (const it of sel) { const { share: _s, ...rest } = it; s.assumptions.push({ id: "A" + s.nextA++, ...rest, status: "pending", createdAt: TODAY, capture: c.id }); }
      s.captures.find((y) => y.id === c.id).status = "shared";
    });
    toast(sel.length ? `${sel.length} item${sel.length === 1 ? "" : "s"} sent to ${ROLES.bm.person} for review.` : "Marked as reviewed.", sel.length ? ["review", "Open Review"] : null);
  }
  const setItem = (i, patch) => update((s) => { Object.assign(s.captures.find((y) => y.id === c.id).items[i], patch); });
  const items = c.items || [];
  return (
    <>
      <div className="card stack">
        <div><div className="eyebrow">{KINDS[c.kind] || c.kind}{c.auto ? ` · captured automatically from ${c.auto}` : ""}</div><h2 style={{ marginTop: 3 }}>{c.title}</h2><p className="small muted">{c.person} · {c.team} · {fDate(c.date)}, 2026</p></div>
        <div className="transcript" tabIndex={0} aria-label="Transcript">{c.text}</div>
      </div>
      {c.status === "shared" ? (
        <div className="card stack"><h3>Shared with the brand team</h3>
          {S.assumptions.filter((a) => a.capture === c.id).length ? <div className="feed">{S.assumptions.filter((a) => a.capture === c.id).map((a) => <FeedItem key={a.id} a={a} />)}</div> : <p className="muted">Nothing in this conversation affected the forecast.</p>}
        </div>
      ) : busy ? (
        <div className="card row"><Spinner /><span>Reading the conversation and matching it to your SKUs, retailers and months. This takes up to a minute.</span><button className="btn sm" type="button" onClick={() => ctl?.abort()}>Stop</button></div>
      ) : c.status === "review" ? (
        <div className="card stack">
          <div className="row between"><div><h3>Texere found {items.length} thing{items.length === 1 ? "" : "s"} that affect the forecast</h3>
            <p className="small muted">{c.mode === "example" ? "Prepared example (Claude isn't connected in this view)." : "Extracted by Claude from this conversation."} Approve what to share. Anything kept private never leaves this inbox.</p></div>
            {aiAvailable() && <button className="btn sm" type="button" onClick={extract}>Run again</button>}</div>
          {items.length ? items.map((it, i) => (
            <div className={"assm" + (it.share ? "" : " flat")} key={i}>
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}><b>{it.summary}</b>
                  <div className="chips" style={{ marginTop: 6 }}><DriverChip d={it.driver} /><ConfChip c={it.confidence} /><Chip>{skuNames(it.skus)}</Chip><Chip>{retNames(it.retailers)}</Chip><Chip>{mRange(it.months)}</Chip></div></div>
                <Toggle label="Share this item" value={it.share ? "1" : "0"} options={[["1", "Share"], ["0", "Keep private"]]} onChange={(v) => setItem(i, { share: v === "1" })} />
              </div>
              <p className="quote">“{it.quote}”</p>
              <div className="row small"><span>Suggested impact</span>
                <input className="impact-in num" type="number" aria-label="Suggested impact percent" value={it.impact} onChange={(e) => setItem(i, { impact: Math.max(-100, Math.min(300, Number(e.target.value) || 0)) })} />
                <span>% in those months.</span><span className="muted">{it.rationale}</span></div>
              {it.supersedes && assm(it.supersedes) && <p className="small">Revises <b>{it.supersedes}</b>: {assm(it.supersedes).summary}</p>}
            </div>
          )) : <Empty>Nothing here changes unit sales.</Empty>}
          <div className="row between"><span className="small muted">{items.filter((i) => i.share).length} of {items.length} selected to share</span>
            <button className="btn primary" type="button" onClick={share}>{items.length ? `Send ${items.filter((i) => i.share).length} to ${ROLES.bm.person}` : "Mark as reviewed"}</button></div>
        </div>
      ) : (
        <div className="card stack"><div className="row between"><div><h3>Find what affects the forecast</h3>
          <p className="small muted">{aiAvailable() ? "Claude reads the conversation, matches it to your SKUs, retailers and months, and estimates the impact from your NielsenIQ history." : c.example ? "Claude isn't connected, so Texere will use an example prepared for this conversation. Connect Claude in Settings to extract from your own text." : "Connect Claude in Settings to extract assumptions from your own text."}</p></div>
          <button className="btn primary" type="button" onClick={extract} disabled={!aiAvailable() && !c.example}>Extract assumptions</button></div>
          {err && <p className="small" style={{ color: "var(--bad)" }}>{err}</p>}
        </div>
      )}
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
    onClose(); toast("Added to the inbox.");
  }
  return (
    <section className="card stack" aria-labelledby="nc-h">
      <div className="row between"><h2 id="nc-h">Add a conversation</h2><button className="btn ghost sm" type="button" onClick={onClose}>Cancel</button></div>
      <div className="kv">
        <div><label htmlFor="nc-kind" className="eyebrow">Type</label><select id="nc-kind" value={f.kind} onChange={set("kind")}>{Object.entries(KINDS).filter(([k]) => k !== "web").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label htmlFor="nc-team" className="eyebrow">Team</label><select id="nc-team" value={f.team} onChange={set("team")}>{TEAMS.filter((t) => t !== "Market signal").map((t) => <option key={t}>{t}</option>)}</select></div>
        <div><label htmlFor="nc-person" className="eyebrow">Your name</label><input id="nc-person" type="text" value={f.person} onChange={set("person")} placeholder="e.g. Dana Ortiz" /></div>
        <div><label htmlFor="nc-date" className="eyebrow">Date</label><input id="nc-date" type="date" value={f.date} onChange={set("date")} /></div>
      </div>
      <div><label htmlFor="nc-title" className="eyebrow">Title</label><input id="nc-title" type="text" style={{ width: "100%" }} value={f.title} onChange={set("title")} placeholder="e.g. Walgreens buyer call" /></div>
      <div className="row"><button type="button" className="btn sm" onClick={() => fileRef.current?.click()}>Upload transcript (.vtt, .txt, .md)</button>
        <input ref={fileRef} id="nc-file" type="file" accept=".vtt,.txt,.md,.srt,text/plain" hidden onChange={onFile} />
        <span className="small muted">{fname ? fname + " loaded." : "Zoom and Teams save .vtt transcripts. Timestamps are removed automatically."}</span></div>
      <div><label htmlFor="nc-text" className="eyebrow">Transcript or message</label><textarea id="nc-text" rows={8} value={f.text} onChange={set("text")} placeholder="Paste the conversation here. Mention SKUs, retailers and months the way people actually talk." /></div>
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn primary" type="button" onClick={save}>Add to inbox</button></div>
    </section>
  );
}
