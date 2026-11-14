import React, { useState } from "react";
import { useStore, update } from "../store.js";
import { Head, toast } from "../ui/common.jsx";
import { getAIConfig, setAIConfig, aiMode, aiModeLabel, askText, aiError } from "../ai.js";

export default function Settings() {
  const S = useStore();
  const cfg = getAIConfig();
  const [key, setKey] = useState(cfg.apiKey || "");
  const [model, setModel] = useState(cfg.model || "claude-sonnet-5-5");
  const [testing, setTesting] = useState(false);
  async function test() {
    setTesting(true);
    try { const t = await askText("Reply with the single word: connected"); toast("Claude replied: " + t.trim().slice(0, 40)); }
    catch (e) { toast(aiError(e)); } finally { setTesting(false); }
  }
  return (
    <>
      <Head title="Settings" sub="How Texere forecasts and how it reaches Claude." />
      <section className="card stack" aria-labelledby="eng-h">
        <h2 id="eng-h">Forecast engine</h2>
        <div className="radio-cards">
          <label className={S.engine === "texere" ? "on" : ""}>
            <input type="radio" name="engine" checked={S.engine === "texere"} onChange={() => update((s) => { s.engine = "texere"; })} />
            <b>Texere forecast</b><span className="small">Texere runs the forecast end to end: a driver model fit on NielsenIQ history plus your teams' assumptions. Publishes straight to supply planning. The default, and the only option for brands without a planning platform.</span>
          </label>
          <label className={S.engine === "o9" ? "on" : ""}>
            <input type="radio" name="engine" checked={S.engine === "o9"} onChange={() => update((s) => { s.engine = "o9"; })} />
            <b>Texere context + o9 forecast</b><span className="small">For companies already on o9 (or Kinaxis, SAP IBP): Texere captures and structures the context and sends it to o9 as demand assumptions; o9 computes the final numbers. Texere's own forecast stays visible as a reference. Simulated here.</span>
          </label>
        </div>
      </section>
      <section className="card stack" aria-labelledby="ai-h">
        <h2 id="ai-h">Claude connection</h2>
        <p>Status: <b>{aiModeLabel()}</b></p>
        {aiMode() === "claude-app" ? <p className="small muted">You're running Texere inside the Claude app, so it uses your Claude account. Nothing to set up.</p> : (
          <>
            <p className="small">Outside the Claude app, add an Anthropic API key to turn on extraction, discussion answers, write-ups and Ask Texere. The key is stored only in this browser and sent only to api.anthropic.com. Use a key with a low spending limit for demos.</p>
            <div className="kv">
              <div><label htmlFor="api-key" className="eyebrow">Anthropic API key</label><input id="api-key" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-..." /></div>
              <div><label htmlFor="api-model" className="eyebrow">Model</label><input id="api-model" type="text" value={model} onChange={(e) => setModel(e.target.value)} /></div>
            </div>
            <div className="row">
              <button className="btn primary" type="button" onClick={() => { setAIConfig({ apiKey: key.trim(), model: model.trim() || "claude-sonnet-5-5" }); toast(key.trim() ? "Saved. Claude is connected." : "Key removed."); }}>Save</button>
              <button className="btn" type="button" onClick={test} disabled={testing || aiMode() === "offline"}>Test connection</button>
              {cfg.apiKey && <button className="btn ghost" type="button" onClick={() => { setKey(""); setAIConfig({}); toast("Key removed."); }}>Remove key</button>}
            </div>
            <p className="small muted">Without Claude, Texere still works: the example conversations use prepared extractions, and reports and shareouts use generated text.</p>
          </>
        )}
      </section>
    </>
  );
}
