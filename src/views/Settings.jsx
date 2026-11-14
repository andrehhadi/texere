import React, { useEffect, useState } from "react";
import { useStore, update, resetAll } from "../store.js";
import { getAIConfig, setAIConfig, aiMode, aiModeLabel, onAIChange } from "../ai.js";
import { Card, Btn, Badge, cx, toast } from "../ui/kit.jsx";
import { Icon, Wordmark } from "../ui/icons.jsx";

export default function Settings() {
  const S = useStore();
  const [, force] = useState(0);
  useEffect(() => onAIChange(() => force((x) => x + 1)), []);
  const cfg = getAIConfig();
  const [k, setK] = useState(cfg.apiKey || "");
  const [model, setModel] = useState(cfg.model || "claude-sonnet-5-5");
  const opt = (id, title, body, badge) => (
    <label className={cx("kpi click", S.engine === id && "on")} style={{ gap: 6, cursor: "pointer" }}>
      <span className="row between"><span className="row nw"><input type="radio" name="engine" checked={S.engine === id} onChange={() => update((s) => { s.engine = id; })} /><b>{title}</b></span>{badge}</span>
      <span className="small muted">{body}</span>
    </label>
  );
  return (
    <>
      <div className="ph"><div><h1>Settings</h1><p className="sub">How Texere forecasts, how it reaches Claude, and the demo data.</p></div></div>
      <Card id="eng" title="Forecast engine" sub="Texere can run the forecast itself, or feed context into the planning system you already have">
        <div className="grid2">
          {opt("texere", "Texere runs the forecast", "NielsenIQ driver baseline plus approved context, published to supply planning. The full loop in one place.", <Badge t="brand">Default</Badge>)}
          {opt("o9", "Path B: feed o9", "o9 keeps the statistical baseline. Texere sends every approved assumption as a dated, sourced override and reads the forecast back. A lighter way to start.", <Badge t="outline">Start option</Badge>)}
        </div>
      </Card>
      <Card id="ai" title="Claude" sub={"Used to extract assumptions from conversations, check items before approval, write notes and answer questions. Now: " + aiModeLabel()}>
        {aiMode() === "claude-app" ? <div className="banner"><Icon name="check" size={15} />Running inside the Claude app, so Claude is available without a key.</div> : (
          <div className="stack">
            <div className="row">
              <input type="password" className="grow" style={{ minWidth: 260 }} placeholder="Anthropic API key (sk-ant-…)" value={k} onChange={(e) => setK(e.target.value)} aria-label="Anthropic API key" />
              <input type="text" style={{ width: 200 }} value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model" />
              <Btn kind="primary" onClick={() => { setAIConfig({ apiKey: k.trim(), model: model.trim() }); toast(k.trim() ? "Key saved in this browser." : "Key removed."); }}>Save</Btn>
              {cfg.apiKey && <Btn kind="ghost" onClick={() => { setK(""); setAIConfig({}); toast("Key removed."); }}>Remove</Btn>}
            </div>
            <p className="xs muted">The key stays in this browser's storage and is sent only to api.anthropic.com. Without it, Texere uses prepared examples and template answers.</p>
          </div>
        )}
      </Card>
      <Card id="demo" title="Demo data" sub="Lumen Beauty Co. and everything in it is fictional. NielsenIQ data is simulated with the same fields as a real RMS extract.">
        <div className="row"><Btn kind="danger" icon="refresh" onClick={() => { resetAll(); toast("Demo reset to the starting state."); }}>Reset the demo</Btn><span className="small muted">Restores the original assumptions, conversations and approvals.</span></div>
      </Card>
      <Card id="about" title="About Texere">
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <div style={{ background: "var(--side)", padding: "12px 16px", borderRadius: 12 }}><Wordmark size={34} /></div>
        </div>
        <p className="small"><b>Texere</b> is Latin for "to weave", the root of <i>context</i> (con-texere, woven together) and <i>textile</i>. The mark is three warp threads crossed by two weft threads: NielsenIQ history and your teams' context, woven into one forecast.</p>
        <p className="small muted">Prototype built for exploration. Not affiliated with NielsenIQ, o9 Solutions or any retailer named.</p>
      </Card>
    </>
  );
}
