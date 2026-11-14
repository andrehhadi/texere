// Everything that changes the working state goes through here, so the change history stays complete.
import { update, getState, logHistory, stamp, assm, me, NOW, activeAt } from "./store.js";
import { TODAY, ROLES, PEOPLE } from "./data/catalog.js";
import { toast } from "./ui/kit.jsx";

// ---------- Global UI: which assumption drawer is open (not persisted)
let drawer = null; const dsubs = new Set();
export const getDrawer = () => drawer;
export const subDrawer = (f) => { dsubs.add(f); return () => dsubs.delete(f); };
export function openAssm(id, tab = "details") { drawer = { id, tab }; dsubs.forEach((f) => f()); }
export function closeAssm() { drawer = null; dsubs.forEach((f) => f()); }

export function approve(id, note = "") {
  const a = assm(id); const who = me().person;
  update((s) => {
    const x = s.assumptions.find((y) => y.id === id);
    x.status = "approved"; x.decidedAt = TODAY; x.seq = ++s.seq; x.decidedBy = who;
    logHistory(s, id, who, "approved", note);
    if (x.supersedes) logHistory(s, x.supersedes, who, "superseded", `Replaced by ${id}`, { field: "impact", from: s.assumptions.find((y) => y.id === x.supersedes)?.impact, to: x.impact });
    const t = s.threads[id]; if (t && t.status !== "resolved") t.status = "resolved";
  });
  toast(`${id} approved and added to the forecast.`, ["timeline", "See it on the timeline"]);
  return a;
}
export function reject(id, note = "") {
  const who = me().person;
  update((s) => {
    const x = s.assumptions.find((y) => y.id === id);
    x.status = "rejected"; x.decidedAt = TODAY; x.seq = ++s.seq; x.decidedBy = who;
    logHistory(s, id, who, "rejected", note);
  });
  toast(`${id} rejected. The forecast is unchanged.`);
}
export function reopen(id) {
  const who = me().person;
  update((s) => { const x = s.assumptions.find((y) => y.id === id); x.status = "pending"; delete x.decidedAt; logHistory(s, id, who, "reopened", "Moved back to review"); });
}
export function editImpact(id, to, note = "") {
  const who = me().person; const a = assm(id); const from = a.impact;
  if (to === from) return;
  update((s) => {
    const x = s.assumptions.find((y) => y.id === id); x.impact = to;
    if (x.status === "approved") { x.decidedAt = TODAY; x.seq = ++s.seq; }
    logHistory(s, id, who, "edited", note, { field: "impact", from, to });
  });
  toast(`${id} impact changed from ${from}% to ${to}%.`);
}
export function editMonths(id, months, note = "") {
  const who = me().person; const a = assm(id); const from = a.months[0] + "…" + a.months[a.months.length - 1];
  update((s) => {
    const x = s.assumptions.find((y) => y.id === id); x.months = months;
    if (x.status === "approved") { x.decidedAt = TODAY; x.seq = ++s.seq; }
    logHistory(s, id, who, "edited", note, { field: "months", from, to: months[0] + "…" + months[months.length - 1] });
  });
}

// ---------- Discussion threads
const REPLIES = {
  A9: { from: "Dana Ortiz", text: "Just spoke with the Walgreens buyer. The cut is approved for the April review, but only in the smaller-format stores, about 25% of the chain, not 30%. I'd take it to about -24%." },
  A7: { from: "Dana Ortiz", text: "Nothing final from Target yet. They'll confirm the March set by the end of November. I'd hold it as pending." },
  A5: { from: "Dana Ortiz", text: "Walmart confirmed the rollout is full chain, bottom shelf. -5% still feels right." },
};
export function ask(id, text, to) {
  const who = me();
  update((s) => {
    const t = s.threads[id] || (s.threads[id] = { status: "open", messages: [] });
    t.messages.push({ by: s.role, name: who.person, at: stamp(), text });
    if (to && to !== who.person) { t.status = "open"; t.waitingOn = to; t.askedBy = who.person; }
    logHistory(s, id, who.person, "comment", text.length > 90 ? text.slice(0, 88) + "…" : text);
  });
  if (to && to !== who.person) {
    toast(`Question sent to ${to}.`);
    const canned = REPLIES[id];
    if (canned && canned.from === to) setTimeout(() => reply(id, canned.text, canned.from, true), 2600);
  }
}
export function reply(id, text, name = me().person, simulated = false) {
  update((s) => {
    const t = s.threads[id] || (s.threads[id] = { status: "open", messages: [] });
    const role = Object.entries(ROLES).find(([, r]) => r.person === name)?.[0] || "other";
    t.messages.push({ by: role, name, at: stamp(), text, simulated });
    if (t.waitingOn === name) { t.status = "answered"; t.waitingOn = t.askedBy || ROLES.bm.person; }
    logHistory(s, id, name, "comment", text.length > 90 ? text.slice(0, 88) + "…" : text);
  });
  if (simulated) toast(`${name} replied on ${id}.`, ["inbox", "Open"]);
}
export function resolve(id) { update((s) => { if (s.threads[id]) s.threads[id].status = "resolved"; }); }
export const threadOf = (id) => getState().threads[id];
export const personRole = (name) => PEOPLE[name]?.role || "";

export function markSeen() { update((s) => { s.seen = TODAY + " 23:59"; }); }

export function publish() {
  const who = me().person;
  update((s) => { s.lastSync = NOW(); s.syncLog.unshift({ at: TODAY, by: who, note: "Forecast published to supply planning", cells: 2288 }); s.acks = {}; });
  toast("Forecast published. Supply planning now sees this version.", ["supply", "Open supply view"]);
}
export function addAssumption(x, captureId) {
  let id;
  update((s) => {
    id = "A" + s.nextA++;
    s.assumptions.push({ id, ...x, status: "pending", createdAt: TODAY, capture: captureId, history: [{ at: stamp(), by: (captureId && s.captures.find((c) => c.id === captureId)?.person) || me().person, action: "created", note: captureId ? "Shared from " + (s.captures.find((c) => c.id === captureId)?.title || "a capture") : "Added from a market signal" }] });
  });
  return id;
}
export { activeAt };
