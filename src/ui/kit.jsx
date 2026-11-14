import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "./icons.jsx";
import { PEOPLE, DRIVERS, DRIVER_COLOR, CONF } from "../data/catalog.js";
import { statusOf } from "../store.js";
import { tone } from "./format.js";

export const cx = (...a) => a.filter(Boolean).join(" ");

export function Badge({ t = "neutral", children, dot, title, className }) {
  return <span className={cx("badge", "b-" + t, className)} title={title}>{dot && <i className="dot" />}{children}</span>;
}
export function DriverTag({ d }) {
  return <span className="dtag" style={{ "--c": DRIVER_COLOR[d] || DRIVER_COLOR.other }}><i />{DRIVERS[d] || d}</span>;
}
export function ConfTag({ c }) {
  const n = { mentioned: 1, likely: 2, confirmed: 3 }[c] || 1;
  return <span className="conf" title={"Confidence: " + CONF[c]}><span className="bars">{[1, 2, 3].map((i) => <i key={i} className={i <= n ? "on" : ""} />)}</span>{CONF[c]}</span>;
}
const ST = { approved: ["good", "Approved"], pending: ["warn", "Needs review"], rejected: ["bad", "Rejected"], superseded: ["neutral", "Superseded"] };
export function StatusBadge({ a, s }) {
  const st = s || statusOf(a); const [t, l] = ST[st] || ["neutral", st];
  return <Badge t={t} dot>{l}</Badge>;
}
export function Avatar({ name, size = 24 }) {
  const p = PEOPLE[name] || { initials: (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2), color: "#5B5F7A" };
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4, background: p.color }} title={name}>{p.initials}</span>;
}
export function Delta({ v, kind = "pct", invert, children, small }) {
  const t = tone(invert ? -v : v);
  return <span className={cx("delta", "d-" + t, small && "sm")}>{t !== "flat" && <Icon name={v > 0 ? "arrowUp" : "arrowDown"} size={small ? 11 : 12} stroke={2.2} />}{children}</span>;
}
export function Seg({ value, options, onChange, size, label }) {
  return (
    <div className={cx("seg", size)} role="radiogroup" aria-label={label}>
      {options.map(([v, l, title]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? "on" : ""} title={title} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}
export function Select({ label, value, onChange, options, id, wide }) {
  const active = value !== "ALL";
  return (
    <label className={cx("sel", active && "active", wide && "wide")}>
      <span className="sel-l">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <Icon name="down" size={13} />
    </label>
  );
}
export function Btn({ children, kind = "", icon, size, ...p }) {
  return <button type="button" className={cx("btn", kind, size)} {...p}>{icon && <Icon name={icon} size={size === "sm" ? 14 : 15} />}{children}</button>;
}
export function Card({ title, sub, actions, children, className, pad = true, id, eyebrow }) {
  return (
    <section className={cx("card", !pad && "np", className)} aria-labelledby={title && id ? id + "-h" : undefined}>
      {(title || actions) && (
        <header className="card-h">
          <div className="card-t">{eyebrow && <div className="eyebrow">{eyebrow}</div>}{title && <h2 id={id ? id + "-h" : undefined}>{title}</h2>}{sub && <p className="sub">{sub}</p>}</div>
          {actions && <div className="card-a">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
export function Empty({ children, icon = "inbox" }) {
  return <div className="empty"><Icon name={icon} size={22} /><div>{children}</div></div>;
}
export function Spinner() { return <span className="spin" role="status" aria-label="Working" />; }
export function Sim() { return <span className="sim" title="Simulated in this prototype">Simulated</span>; }

// ---------- Drawer
export function Drawer({ open, onClose, children, width = 560, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    const prev = document.activeElement; setTimeout(() => ref.current?.focus(), 30);
    return () => { window.removeEventListener("keydown", k); prev?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="drawer-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="drawer" style={{ width }} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref}>{children}</aside>
    </div>
  );
}
export function Tabs({ value, onChange, tabs }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(([v, l, n]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>{l}{n != null && n !== 0 && <span className="tab-n">{n}</span>}</button>
      ))}
    </div>
  );
}

// ---------- Toasts
let toasts = []; const tsubs = new Set(); let tid = 0;
const tnotify = () => tsubs.forEach((f) => f());
export function toast(text, action) {
  const id = ++tid; toasts = [...toasts, { id, text, action }]; tnotify();
  setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); tnotify(); }, 5200);
}
export function Toaster({ go }) {
  const list = useSyncExternalStore((f) => { tsubs.add(f); return () => tsubs.delete(f); }, () => toasts);
  return (
    <div className="toaster" role="status" aria-live="polite">
      {list.map((t) => (
        <div className="toast" key={t.id}><Icon name="check" size={15} /><span>{t.text}</span>
          {t.action && <button type="button" onClick={() => { go(t.action[0]); toasts = toasts.filter((x) => x.id !== t.id); tnotify(); }}>{t.action[1]}</button>}</div>
      ))}
    </div>
  );
}

// ---------- KPI tile
export function Kpi({ label, value, delta, deltaText, invert, spark, foot, onClick, active }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} className={cx("kpi", onClick && "click", active && "on")} onClick={onClick}>
      <div className="kpi-l">{label}</div>
      <div className="kpi-v num">{value}</div>
      <div className="kpi-f">{delta != null && <Delta v={delta} invert={invert} small>{deltaText}</Delta>}{foot && <span className="muted">{foot}</span>}</div>
      {spark && <div className="kpi-s">{spark}</div>}
    </Tag>
  );
}
export function useLocal(key, init) {
  const [v, setV] = useState(() => { try { const s = localStorage.getItem(key); return s == null ? init : JSON.parse(s); } catch { return init; } });
  return [v, (x) => { setV(x); try { localStorage.setItem(key, JSON.stringify(x)); } catch { /* ignore */ } }];
}
