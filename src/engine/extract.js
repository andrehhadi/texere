import { SKUS, RETAILERS, FC, TODAY, BRAND, KINDS, DRIVERS, CONF, skuById, retById } from "../data/catalog.js";
import { getState, statusOf, assm } from "../store.js";

export function extractPrompt(c) {
  const S = getState();
  const sk = SKUS.map((s) => `${s.id}: ${s.name}${s.launch ? " (new, launches " + s.launch + ")" : ""}; people may say: ${s.aliases}`).join("\n");
  const rt = RETAILERS.map((r) => `${r.id}: ${r.name}`).join("\n");
  const ex = S.assumptions.filter((a) => ["approved", "pending"].includes(statusOf(a)))
    .map((a) => `${a.id}: ${a.summary} | SKUs ${a.skus.join(",")} | retailers ${a.retailers.join(",")} | months ${a.months[0]} to ${a.months[a.months.length - 1]} | impact ${a.impact}% | ${a.status}`).join("\n");
  return `You are Texere, which turns CPG business conversations into sales forecast assumptions for the brand "${BRAND}".
Today is ${TODAY}. Forecast months run from ${FC[0]} to ${FC[FC.length - 1]} (format YYYY-MM).

SKUs (id: name; how people refer to it):
${sk}

Retailers (id: name):
${rt}

Assumptions already on file (id: summary | details):
${ex}

Measured effects from this brand's NielsenIQ history: price elasticity about -1.4; distribution elasticity about 0.9 (volume moves 0.9% per 1% of stores); a temporary price reduction lifts volume about 1.6 x discount x share of stores (20% off in all stores = +32%); a full-chain display lifts about 45% (scale by share of stores).

Read the conversation below (${KINDS[c.kind] || c.kind}: "${c.title}", ${c.team}, ${c.date}). Find every statement that would change unit sales of a listed SKU at a listed retailer in a forecast month. Ignore small talk, statements already fully covered by an assumption on file with the same impact, and anything that does not change volume.
For each, estimate the effect on unit volume in the affected months as a percent using the measured effects above (supply shortfall = the unfilled share of orders; launch slip = -100 for slipped months; new cheaper competitor = -3 to -8).
If a statement revises an assumption on file (same SKUs, retailers and event), set "supersedes" to that id and give the full new impact, not the difference.

Reply with only a JSON array (empty if nothing applies). Each element:
{"summary": "one plain sentence", "skus": ["SKU ids"], "retailers": ["retailer ids"], "months": ["YYYY-MM"], "driver": "promotion|price|distribution|display|supply|launch|competition|other", "impact": number, "confidence": "mentioned|likely|confirmed", "quote": "exact words copied from the conversation", "rationale": "one short sentence on the impact estimate", "supersedes": "assumption id or null"}

Conversation:
"""
${c.text.slice(0, 14000)}
"""`;
}

export function normalize(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const x of arr) {
    if (!x || typeof x !== "object") continue;
    const skus = (Array.isArray(x.skus) ? x.skus : []).map(String).filter((id) => skuById(id));
    const rets = (Array.isArray(x.retailers) ? x.retailers : []).map(String).filter((id) => retById(id));
    const months = (Array.isArray(x.months) ? x.months : []).map(String).filter((m) => FC.includes(m));
    if (!skus.length || !rets.length || !months.length) continue;
    let imp = Number(x.impact); if (!isFinite(imp)) imp = 0;
    imp = Math.max(-100, Math.min(300, Math.round(imp * 10) / 10));
    out.push({
      summary: String(x.summary || "Untitled change").slice(0, 240), skus, retailers: rets, months: [...new Set(months)].sort(),
      driver: DRIVERS[x.driver] ? x.driver : "other", impact: imp, confidence: CONF[x.confidence] ? x.confidence : "mentioned",
      quote: String(x.quote || "").slice(0, 400), rationale: String(x.rationale || "").slice(0, 240),
      supersedes: x.supersedes && assm(String(x.supersedes)) ? String(x.supersedes) : null, share: true,
    });
  }
  return out;
}

export function parseTranscript(t) {
  if (!/^\s*WEBVTT|-->/m.test(t)) return t.trim();
  return t.split(/\r?\n/)
    .filter((l) => l.trim() && !/^WEBVTT/.test(l) && !/-->/.test(l) && !/^\d+$/.test(l.trim()) && !/^NOTE/.test(l))
    .map((l) => l.replace(/<v ([^>]+)>/, "$1: ").replace(/<\/?[^>]+>/g, "").trim()).join("\n");
}

// Offline helper for "ask the transcript": sentences that share the most words with the question
export function findInText(text, q) {
  const words = q.toLowerCase().match(/[a-z0-9%]+/g)?.filter((w) => w.length > 2 && !["the", "and", "for", "are", "was", "this", "that", "with", "you", "what", "does", "did", "is"].includes(w)) || [];
  const sents = text.split(/(?<=[.!?])\s+|\n/).map((s) => s.trim()).filter(Boolean);
  return sents.map((s) => ({ s, n: words.filter((w) => s.toLowerCase().includes(w)).length })).filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 2).map((x) => x.s);
}
