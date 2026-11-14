import React, { useState } from "react";
import { useStore, update } from "../store.js";
import { TODAY } from "../data/catalog.js";
import { Head, Chip, SimTag, Spinner, toast } from "../ui/common.jsx";
import { sp, fDate, skuNames, retNames, mRange } from "../ui/format.js";
import { extractPrompt, normalize } from "../engine/extract.js";
import { askJSON, aiAvailable, aiError } from "../ai.js";

export default function Competition() {
  const S = useStore();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  function add(sig) {
    update((s) => {
      const cid = "C" + s.nextC++;
      s.captures.push({ id: cid, kind: "web", title: sig.title, team: "Market signal", person: "Texere web monitor", date: sig.date, status: "shared", text: sig.body });
      const id = "A" + s.nextA++;
      s.assumptions.push({ id, ...sig.suggest, status: "pending", createdAt: TODAY, capture: cid, quote: sig.body, supersedes: null });
      s.signals.find((x) => x.id === sig.id).added = id;
    });
    toast("Added for review.", ["review", "Open Review"]);
  }
  async function analyze() {
    if (!text.trim()) { toast("Paste an article or post first."); return; }
    setBusy(true);
    const c = { id: "tmp", kind: "web", title: "Pasted market signal", team: "Market signal", person: "You", date: TODAY, text };
    try {
      const items = normalize(await askJSON(extractPrompt(c)));
      update((s) => {
        const cid = "C" + s.nextC++;
        s.captures.push({ ...c, id: cid, status: "shared" });
        for (const it of items) { const { share: _x, ...rest } = it; s.assumptions.push({ id: "A" + s.nextA++, ...rest, status: "pending", createdAt: TODAY, capture: cid }); }
        s.signals.push({ id: "S" + (s.signals.length + 1), date: TODAY, source: "Pasted by you", title: items[0]?.summary || "No impact on your SKUs", body: text.slice(0, 400), skus: items[0]?.skus || [], retailers: items[0]?.retailers || [], added: items.length ? "review" : null });
      });
      setText("");
      toast(items.length ? `${items.length} item${items.length === 1 ? "" : "s"} sent to Review.` : "Nothing in that text affects your SKUs.", items.length ? ["review", "Open Review"] : null);
    } catch (e) { toast(aiError(e)); } finally { setBusy(false); }
  }
  return (
    <>
      <Head title="Competition and market signals" sub="Competitor launches, price moves and category trends, matched to your SKUs. Add the ones that matter as assumptions." />
      <p className="small muted">In the real product a monitor scans retailer sites, trade press and search trends daily. The signals below are examples <SimTag />. Pasting a real article works when Claude is connected.</p>
      <div className="stack">{[...S.signals].sort((a, b) => b.date.localeCompare(a.date)).map((s) => (
        <article className="card stack" key={s.id}>
          <div className="row between" style={{ alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}><div className="eyebrow">{s.source} · {fDate(s.date)}</div><h3 style={{ fontSize: 15, marginTop: 4 }}>{s.title}</h3></div>
            {s.added ? <Chip tone="good">{s.added === "review" ? "Sent to review" : "Added as " + s.added}</Chip> : s.suggest ? <button className="btn sm" type="button" onClick={() => add(s)}>Add as assumption</button> : null}
          </div>
          <p className="small">{s.body}</p>
          <div className="chips">{s.skus.length ? <Chip>{skuNames(s.skus)}</Chip> : null}{s.retailers.length ? <Chip>{retNames(s.retailers)}</Chip> : null}{s.suggest && !s.added ? <Chip tone="weft">Suggested {sp(s.suggest.impact)} in {mRange(s.suggest.months)}</Chip> : null}</div>
        </article>
      ))}</div>
      <section className="card stack" aria-labelledby="paste-h">
        <h2 id="paste-h">Analyze an article or post</h2>
        <label className="sr" htmlFor="sig-text">Article or post</label>
        <textarea id="sig-text" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a news article, a retailer listing or a social post about a competitor." />
        <div className="row between"><span className="small muted">{aiAvailable() ? "Claude matches it to your SKUs and retailers and sends anything relevant to Review." : "Connect Claude in Settings to analyze your own text."}</span>
          <button className="btn primary" type="button" onClick={analyze} disabled={!aiAvailable() || busy}>{busy ? <><Spinner /> Analyzing</> : "Analyze"}</button></div>
      </section>
    </>
  );
}
