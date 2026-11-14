import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore, update, openQuestionsFor, statusOf, NOW } from "./store.js";
import { ROLES, SKUS, TODAY, COMPANY, mLabel } from "./data/catalog.js";
import { Icon, Wordmark } from "./ui/icons.jsx";
import { Toaster, Avatar, cx } from "./ui/kit.jsx";
import { AssumptionDrawer } from "./ui/assm.jsx";
import { openAssm } from "./actions.js";
import { fDate } from "./ui/format.js";
import Home from "./views/Home.jsx";
import Inbox from "./views/Inbox.jsx";
import Timeline from "./views/Timeline.jsx";
import Performance from "./views/Performance.jsx";
import Competition from "./views/Competition.jsx";
import Forecast from "./views/Forecast.jsx";
import Supply from "./views/Supply.jsx";
import Capture from "./views/Capture.jsx";
import Shareouts from "./views/Shareouts.jsx";
import Data from "./views/Data.jsx";
import Settings from "./views/Settings.jsx";

export const VIEWS = {
  home: { label: "Home", icon: "home", C: Home, g: "Workspace" },
  inbox: { label: "Approvals", icon: "inbox", C: Inbox, g: "Workspace" },
  timeline: { label: "Context timeline", icon: "timeline", C: Timeline, g: "Workspace" },
  performance: { label: "Performance", icon: "chart", C: Performance, g: "Analyze" },
  competition: { label: "Competition", icon: "compete", C: Competition, g: "Analyze" },
  forecast: { label: "Forecast", icon: "forecast", C: Forecast, g: "Plan" },
  supply: { label: "Supply view", icon: "supply", C: Supply, g: "Plan" },
  capture: { label: "Capture", icon: "capture", C: Capture, g: "Context" },
  shareouts: { label: "Shareouts", icon: "present", C: Shareouts, g: "Context" },
  data: { label: "Data sources", icon: "data", C: Data, g: "Admin" },
  settings: { label: "Settings", icon: "settings", C: Settings, g: "Admin" },
};
const parse = () => { const h = (location.hash || "").replace(/^#\/?/, ""); return VIEWS[h] ? h : null; };
export const go = (v) => { location.hash = "/" + v; };

export default function App() {
  const S = useStore();
  const [view, setView] = useState(() => parse() || ROLES[S.role].home);
  const [navOpen, setNavOpen] = useState(false);
  const [cmd, setCmd] = useState(false);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem("texere-theme") || "light"; } catch { return "light"; } });
  useEffect(() => { const f = () => { const v = parse(); if (v) { setView(v); setNavOpen(false); window.scrollTo(0, 0); } }; window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem("texere-theme", theme); } catch { /* ignore */ } }, [theme]);
  useEffect(() => { const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((c) => !c); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  const pending = S.assumptions.filter((a) => a.status === "pending").length;
  const qs = openQuestionsFor(ROLES[S.role].person).length;
  const newCaps = S.captures.filter((c) => c.status === "new").length;
  const V = VIEWS[view];
  const groups = [...new Set(Object.values(VIEWS).map((v) => v.g))];
  const count = { inbox: [pending, qs], capture: [newCaps, 0] };
  const role = ROLES[S.role];
  return (
    <div className="app">
      <nav className={cx("side", navOpen && "open")} aria-label="Main">
        <div className="brand"><Wordmark size={26} /><span className="sim" style={{ background: "rgba(240,165,39,.16)", color: "#F6C66A" }}>Prototype</span></div>
        <div className="ws"><span className="ws-logo">LB</span><div><b>{COMPANY}</b><span>US · NielsenIQ RMS</span></div></div>
        {groups.map((g) => (
          <React.Fragment key={g}>
            <div className="nav-g">{g}</div>
            {Object.entries(VIEWS).filter(([, v]) => v.g === g).map(([k, v]) => (
              <button key={k} type="button" className={cx("nav", view === k && "on")} onClick={() => go(k)} aria-current={view === k ? "page" : undefined}>
                <Icon name={v.icon} size={17} />{v.label}
                {count[k]?.[0] > 0 && <span className="cnt" title={k === "inbox" ? "Waiting for approval" : "New conversations"}>{count[k][0]}</span>}
                {count[k]?.[1] > 0 && <span className="cnt q" title="Questions waiting for you" style={{ marginLeft: count[k]?.[0] ? 4 : "auto" }}>{count[k][1]}?</span>}
              </button>
            ))}
          </React.Fragment>
        ))}
        <div className="side-foot">
          <div className="sync"><span className="live" /><div><b>NielsenIQ synced</b><br />Data through Oct 31 · loaded Nov 3</div></div>
          <div className="sync"><Icon name="refresh" size={13} style={{ marginTop: 2 }} /><div><b>Last publish to supply</b><br />{fDate(S.lastSync)} by {S.syncLog[0]?.by}</div></div>
        </div>
      </nav>
      {navOpen && <div className="drawer-wrap" style={{ zIndex: 65 }} onClick={() => setNavOpen(false)} />}
      <div className="main">
        <header className="top">
          <button className="icon-btn menu-btn" type="button" aria-label="Open menu" onClick={() => setNavOpen(true)}><Icon name="menu" /></button>
          <div className="crumbs">{V.g}<Icon name="right" size={12} /><b>{V.label}</b></div>
          <button className="search" type="button" onClick={() => setCmd(true)} aria-label="Search"><Icon name="search" size={15} /><span className="lbl">Search assumptions, SKUs, pages</span><span className="kbd">⌘K</span></button>
          <button className="icon-btn" type="button" aria-label={theme === "dark" ? "Light mode" : "Dark mode"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><Icon name={theme === "dark" ? "sun" : "moon"} /></button>
          <button className="icon-btn" type="button" aria-label="Approvals and questions" onClick={() => go("inbox")}><Icon name="bell" />{(pending + qs) > 0 && <span className="pip" />}</button>
          <label className="me" title="Switch the person you're viewing as">
            <Avatar name={role.person} size={28} />
            <select value={S.role} aria-label="View as" onChange={(e) => { const r = e.target.value; update((s) => { s.role = r; }); go(ROLES[r].home); }}>
              {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.person} · {r.name}</option>)}
            </select>
            <Icon name="down" size={13} />
          </label>
        </header>
        <main className="page" id="main"><V.C go={go} /></main>
      </div>
      <AssumptionDrawer />
      {cmd && <Command onClose={() => setCmd(false)} />}
      <Toaster go={go} />
    </div>
  );
}

function Command({ onClose }) {
  const S = useStore();
  const [q, setQ] = useState(""); const [i, setI] = useState(0);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const items = useMemo(() => {
    const ql = q.toLowerCase();
    const m = (s) => !ql || s.toLowerCase().includes(ql);
    const out = [];
    for (const [k, v] of Object.entries(VIEWS)) if (m(v.label)) out.push({ g: "Pages", icon: v.icon, label: v.label, run: () => go(k) });
    for (const a of [...S.assumptions].reverse()) if (m(a.id + " " + a.summary)) out.push({ g: "Assumptions", icon: "flag", label: a.summary, hint: a.id + " · " + statusOf(a), run: () => openAssm(a.id) });
    for (const s of SKUS) if (m(s.name + " " + s.aliases + " " + s.code)) out.push({ g: "SKUs", icon: "layers", label: s.name, hint: "Show performance", run: () => { update((x) => { x.filter = { ...x.filter, category: "ALL", brand: "ALL", subbrand: "ALL", platform: "ALL", sku: s.id }; }); go("performance"); } });
    for (const c of S.captures) if (ql && m(c.title + " " + c.person + " " + c.text)) out.push({ g: "Conversations", icon: c.kind === "slack" ? "slack" : c.kind === "email" ? "email" : "call", label: c.title, hint: c.person + " · " + fDate(c.date), run: () => { update((x) => { x.ui.cap = c.id; }); go("capture"); } });
    return out.slice(0, 40);
  }, [q, S]);
  const run = (it) => { onClose(); it.run(); };
  let lastG = null;
  return (
    <div className="cmdk-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cmdk" role="dialog" aria-label="Search">
        <input ref={ref} type="search" placeholder="Search assumptions, SKUs, conversations, pages" value={q} onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(items.length - 1, x + 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(0, x - 1)); } if (e.key === "Enter" && items[i]) run(items[i]); }} />
        <div className="cmdk-l">
          {items.length === 0 && <div className="empty">Nothing matches “{q}”.</div>}
          {items.map((it, n) => {
            const head = it.g !== lastG ? <div className="cmdk-g">{it.g}</div> : null; lastG = it.g;
            return <React.Fragment key={n}>{head}<button type="button" className={cx("cmdk-i", n === i && "on")} onMouseEnter={() => setI(n)} onClick={() => run(it)}><Icon name={it.icon} size={15} /><span className="grow" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>{it.hint && <span className="h">{it.hint}</span>}</button></React.Fragment>;
          })}
        </div>
      </div>
    </div>
  );
}
