import { useSyncExternalStore } from "react";
import { seedState } from "./data/seed.js";
import { TODAY, ROLES } from "./data/catalog.js";
import { setRows, buildRows } from "./engine/sim.js";

const KEY = "texere-v5";
let S;
try { S = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { S = null; }
if (!S || S.v !== 5) S = seedState();
if (S.nielsenRows) setRows(S.nielsenRows);

const subs = new Set();
let version = 0;
export const getState = () => S;
export const getVersion = () => version;
export function update(fn) {
  fn(S);
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage may be blocked */ }
  version++;
  subs.forEach((f) => f());
}
export function resetAll() { S = seedState(); setRows(buildRows()); update(() => {}); }
export function useStore() {
  useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => version);
  return S;
}

export const assm = (id) => S.assumptions.find((a) => a.id === id);
export const capById = (id) => S.captures.find((c) => c.id === id);
export const key = (a) => a.decidedAt + "#" + String(a.seq).padStart(3, "0");
export const NOW = () => TODAY + "#999";
export const PLAN = "2026-09-28#999";
export const me = () => ROLES[S.role];

export function replacedBy(a) { return S.assumptions.find((b) => b.supersedes === a.id && b.status === "approved"); }
export function statusOf(a) { if (a.status === "approved" && replacedBy(a)) return "superseded"; return a.status; }
export function activeAt(at, pending = false) {
  const act = S.assumptions.filter((a) => {
    if (a.status === "approved") { if (key(a) > at) return false; const r = replacedBy(a); return !(r && key(r) <= at); }
    return pending && a.status === "pending";
  });
  if (pending) { const sup = new Set(act.filter((a) => a.status === "pending" && a.supersedes).map((a) => a.supersedes)); return act.filter((a) => !sup.has(a.id)); }
  return act;
}
export const openQuestionsFor = (person) => Object.entries(S.threads || {}).filter(([, t]) => t.status === "open" && t.waitingOn === person).map(([id]) => id);
export const openQuestions = () => Object.entries(S.threads || {}).filter(([, t]) => t.status === "open").map(([id]) => id);
export function stamp() { return TODAY + " " + new Date().toTimeString().slice(0, 5); }
export function logHistory(s, id, by, action, note, extra = {}) {
  const a = s.assumptions.find((x) => x.id === id); if (!a) return;
  a.history = a.history || [];
  a.history.push({ at: stamp(), by, action, note, ...extra });
}
