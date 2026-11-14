// One interface for Claude, whichever way it is reachable:
// 1) inside the Claude app (artifact "sample" capability), 2) the Anthropic API with a key
// the user pastes in Settings (stored only in this browser), or 3) offline, where the app
// falls back to prepared examples and templated text.
let sampleFn = null;
let downloadsCap = null;
let ready = false;
const listeners = new Set();
export const onAIChange = (f) => { listeners.add(f); return () => listeners.delete(f); };
const notify = () => listeners.forEach((f) => f());

if (typeof window !== "undefined" && window.claude && typeof window.claude.use === "function") {
  window.claude.use("sample").then((s) => { sampleFn = s; ready = true; notify(); }).catch(() => { ready = true; notify(); });
  window.claude.use("downloads").then((d) => { downloadsCap = d; }).catch(() => {});
} else ready = true;

const LS = "texere-ai";
export function getAIConfig() {
  try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch { return {}; }
}
export function setAIConfig(c) {
  try { localStorage.setItem(LS, JSON.stringify(c)); } catch { /* ignore */ }
  notify();
}
export function aiMode() {
  if (sampleFn) return "claude-app";
  if (getAIConfig().apiKey) return "api";
  return "offline";
}
export const aiAvailable = () => aiMode() !== "offline";
export const aiReady = () => ready;
export const aiModeLabel = () => ({ "claude-app": "Claude (via the Claude app)", api: "Claude (via your API key)", offline: "Offline: prepared examples and templates" }[aiMode()]);

async function callAPI(prompt, onText, signal) {
  const cfg = getAIConfig();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model: cfg.model || "claude-sonnet-5-5", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) {
    let msg = `The Claude API returned ${res.status}.`;
    try { const j = await res.json(); if (j?.error?.message) msg = j.error.message; } catch { /* ignore */ }
    const e = new Error(msg); e.code = res.status === 401 ? "bad_key" : res.status === 429 ? "rate_limited" : "upstream_error"; throw e;
  }
  const j = await res.json();
  const text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  onText?.({ text });
  return text;
}

export async function askText(prompt, { onText, signal } = {}) {
  if (sampleFn) { const r = await sampleFn(prompt, { onText, signal, cache: false }); return r.text; }
  if (getAIConfig().apiKey) return callAPI(prompt, onText, signal);
  const e = new Error("Claude isn't connected."); e.code = "offline"; throw e;
}
export function parseJSON(text) {
  try { return JSON.parse(text); } catch { /* try harder */ }
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch { /* continue */ } }
  const a = text.indexOf("["), o = text.indexOf("{");
  const start = a === -1 ? o : o === -1 ? a : Math.min(a, o);
  const end = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  const e = new Error("Claude's answer couldn't be read."); e.code = "invalid_json"; throw e;
}
export async function askJSON(prompt, opts = {}) {
  if (sampleFn) return sampleFn.json(prompt, { signal: opts.signal, cache: false });
  return parseJSON(await askText(prompt, opts));
}
export function aiError(e) {
  const c = e?.code;
  return ({
    offline: "Connect Claude in Settings to use this.", not_granted: "Claude access wasn't allowed for this page.", bad_key: "That API key was rejected. Check it in Settings.",
    rate_limited: "Too many requests just now. Try again in a minute.", invalid_json: "Claude's answer couldn't be read. Try again.", refused: "Claude declined this text. Try different text.",
    prompt_too_large: "That text is too long. Use a shorter excerpt.", cancelled: "Stopped.",
  })[c] || e?.message || "Claude couldn't answer just now. Try again.";
}

// Save a file: Claude app downloads capability when present, otherwise a normal browser download
export async function saveFile(filename, data, mime = "application/octet-stream") {
  if (downloadsCap) {
    try { await downloadsCap.save({ filename, data }); return "saved"; }
    catch (e) { if (e?.code === "declined") return "declined"; }
  }
  try {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return "saved";
  } catch { return "failed"; }
}
