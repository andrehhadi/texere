import React, { useEffect, useState } from "react";
import { CONF, DRIVERS, BRAND, ROLES } from "../data/catalog.js";
import { statusOf, replacedBy, getState } from "../store.js";

const ICONS = {
  call: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  slack: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  today: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  capture: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  review: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
  portfolio: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  timeline: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  forecast: '<path d="M3 3v18h18"/><path d="M7 15h3v3H7zM12 10h3v8h-3zM17 6h3v12h-3z"/>',
  supply: '<path d="M3 7h13v10H3z"/><path d="M16 10h4l1 3v4h-5"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  reports: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  shareouts: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/>',
  data: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  competition: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
};
export function Icon({ name, size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[name] || ICONS.doc }} />;
}
export const Chip = ({ children, tone = "" }) => <span className={"chip " + tone}>{children}</span>;
export function StatusChip({ a }) {
  const s = statusOf(a);
  if (s === "approved") return <Chip tone="good">In forecast</Chip>;
  if (s === "pending") return <Chip tone="weft">Needs review</Chip>;
  if (s === "superseded") return <Chip>Replaced by {replacedBy(a)?.id}</Chip>;
  if (s === "replaced") return <Chip>Replaced</Chip>;
  return <Chip tone="bad">Rejected</Chip>;
}
export const ConfChip = ({ c }) => <Chip tone={c === "confirmed" ? "accent" : c === "likely" ? "" : "warn"}>{CONF[c] || c}</Chip>;
export const DriverChip = ({ d }) => <Chip tone="accent">{DRIVERS[d] || d}</Chip>;
export function Head({ title, sub, children }) {
  const S = getState();
  return (
    <div className="head">
      <div>
        <div className="eyebrow">{BRAND} · viewing as {ROLES[S.role].name}</div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}
export const Kpi = ({ label, value, sub, tone = "", vClass = "" }) => (
  <div className={"kpi " + tone}><div className="eyebrow">{label}</div><div className={"v " + vClass}>{value}</div>{sub && <div className="s">{sub}</div>}</div>
);
export const Empty = ({ children }) => <div className="empty">{children}</div>;
export const Spinner = () => <span className="spinner" aria-hidden="true" />;
export function Toggle({ value, options, onChange, label }) {
  return (
    <div className="toggle" role="group" aria-label={label}>
      {options.map(([k, l]) => <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>)}
    </div>
  );
}
export const SimTag = ({ children = "Simulated" }) => <span className="sim-tag">{children}</span>;

let toastSet = null;
export function toast(msg, link) { toastSet?.({ msg, link, t: Date.now() }); }
export function Toaster() {
  const [t, setT] = useState(null);
  useEffect(() => { toastSet = setT; return () => { toastSet = null; }; }, []);
  useEffect(() => { if (!t) return; const id = setTimeout(() => setT(null), 4500); return () => clearTimeout(id); }, [t]);
  if (!t) return null;
  return <div className="toast" role="status">{t.msg}{t.link && <a href={"#" + t.link[0]}>{t.link[1]}</a>}</div>;
}
