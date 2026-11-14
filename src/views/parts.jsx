import React, { useState } from "react";
import { getState, update, capById, activeAt, NOW, unitImpact } from "../store.js";
import { ROLES, TODAY } from "../data/catalog.js";
import { Icon, StatusChip, Spinner, toast } from "../ui/common.jsx";
import { sg, fDate, skuNames, retNames, mRange, dcls } from "../ui/format.js";
import { askText, aiAvailable, aiError } from "../ai.js";
import { findInText } from "../engine/extract.js";

export function FeedItem({ a, onOpen }) {
  const c = capById(a.capture) || {};
  const act = activeAt(NOW(), a.status === "pending");
  const u = unitImpact(a, act);
  const t = getState().threads?.[a.id];
  return (
    <div className="feed-item">
      <div className="src-ico"><Icon name={c.kind} /></div>
      <div>
        <div style={{ fontWeight: 500 }}>{a.summary}</div>
        <div className="meta">{skuNames(a.skus)} · {retNames(a.retailers)} · {mRange(a.months)}</div>
        <div className="meta">{c.title} · {c.person} ({c.team}) · {fDate(a.decidedAt || a.createdAt)}{t ? ` · ${t.messages.length} message${t.messages.length === 1 ? "" : "s"}` : ""}</div>
      </div>
      <div className="stack" style={{ alignItems: "flex-end", gap: 6 }}>
        <span className={"num " + dcls(u)}>{sg(u)}</span>
        <StatusChip a={a} />
      </div>
    </div>
  );
}

const nowStamp = () => TODAY + " " + new Date().toTimeString().slice(0, 5);

// Discussion on one assumption: ask the person who raised it, reply, or ask the transcript
export function Thread({ a, compact = false }) {
  const S = getState();
  const me = ROLES[S.role];
  const c = capById(a.capture) || {};
  const t = S.threads?.[a.id] || { status: "none", messages: [] };
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const contributor = c.kind === "web" ? ROLES.cs.person : c.person || "the contributor";
  const iAmContributor = me.person === contributor;
  const contributorIsRole = Object.values(ROLES).some((r) => r.person === contributor);

  function post(by, name, msg, waitingOn) {
    update((s) => {
      s.threads = s.threads || {};
      const th = s.threads[a.id] || { status: "open", messages: [] };
      th.messages.push({ by, name, at: nowStamp(), text: msg });
      th.status = waitingOn ? "open" : th.status === "none" ? "open" : th.status;
      th.waitingOn = waitingOn || null;
      if (!waitingOn) th.status = "resolved";
      s.threads[a.id] = th;
    });
  }
  function send(asWho) {
    const msg = text.trim(); if (!msg) return;
    if (asWho === "contributor") { post("cs", contributor, msg, null); toast(`Reply sent to ${ROLES.bm.person}.`); }
    else if (iAmContributor) { post(S.role, me.person, msg, null); toast("Reply sent."); }
    else { post(S.role, me.person, msg, contributor); toast(`Question sent to ${contributor}.`); }
    setText("");
  }
  async function askTranscript() {
    const q = text.trim() || t.messages.filter((m) => m.by !== "bot").slice(-1)[0]?.text;
    if (!q) { toast("Type a question first."); return; }
    setBusy(true);
    try {
      let answer;
      if (aiAvailable()) {
        answer = await askText(`Answer the question using only the source conversation below. Quote the exact words that support the answer. If the conversation doesn't answer it, say so in one sentence and suggest asking ${contributor}. At most 60 words.\n\nQuestion: ${q}\n\nAssumption: ${a.summary}\n\nSource (${c.title}, ${c.date}):\n"""\n${c.text}\n"""`);
      } else {
        const hits = findInText(c.text || "", q);
        answer = hits.length ? `From the ${c.title.toLowerCase()} on ${fDate(c.date)}: “${hits.join(" ")}”` : `The ${c.title.toLowerCase()} doesn't cover this. Ask ${contributor} directly.`;
      }
      update((s) => { s.threads = s.threads || {}; const th = s.threads[a.id] || { status: "open", messages: [] }; th.messages.push({ by: "bot", name: "Texere", at: nowStamp(), text: answer.trim(), q }); if (th.status === "none") th.status = "open"; s.threads[a.id] = th; });
      setText("");
    } catch (e) { toast(aiError(e)); } finally { setBusy(false); }
  }
  return (
    <div className={"thread" + (compact ? " compact" : "")}>
      <div className="row between">
        <h4 className="row" style={{ gap: 6 }}><Icon name="chat" size={16} /> Discussion</h4>
        {t.status === "open" && t.waitingOn && <span className="chip warn">Waiting on {t.waitingOn}</span>}
        {t.status === "resolved" && <span className="chip good">Answered</span>}
      </div>
      {t.messages.length ? (
        <ol className="msgs">
          {t.messages.map((m, i) => (
            <li key={i} className={"msg " + (m.by === "bot" ? "bot" : m.by === S.role || m.name === me.person ? "mine" : "")}>
              <div className="who">{m.name}{m.by === "bot" ? " (from the source)" : ""} · <span className="muted">{m.at.slice(5)}</span></div>
              <div>{m.text}</div>
            </li>
          ))}
        </ol>
      ) : <p className="small muted">No questions yet. Ask {iAmContributor ? "the team" : contributor} for more context before accepting.</p>}
      <div className="composer">
        <label className="sr" htmlFor={"msg-" + a.id}>Message</label>
        <textarea id={"msg-" + a.id} rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={iAmContributor ? "Reply with more context" : `Ask ${contributor} a question about this`} />
        <div className="row between">
          <button className="btn sm ghost" type="button" onClick={askTranscript} disabled={busy}>{busy ? <><Spinner /> Checking</> : "Ask the transcript"}</button>
          <div className="row" style={{ gap: 6 }}>
            {!iAmContributor && t.waitingOn === contributor && !contributorIsRole && <button className="btn sm" type="button" onClick={() => send("contributor")} disabled={!text.trim()}>Reply as {contributor} (demo)</button>}
            <button className="btn sm primary" type="button" onClick={() => send()} disabled={!text.trim()}>{iAmContributor ? "Reply" : `Ask ${contributor.split(" ")[0]}`}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
