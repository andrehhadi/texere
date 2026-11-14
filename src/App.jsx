import React, { useEffect, useState } from "react";
import { useStore, update, resetAll, getState, openQuestionsFor } from "./store.js";
import { ROLES } from "./data/catalog.js";
import { Icon, Toaster, toast } from "./ui/common.jsx";
import { onAIChange, aiMode } from "./ai.js";
import Today from "./views/Today.jsx";
import Capture from "./views/Capture.jsx";
import Review from "./views/Review.jsx";
import Portfolio from "./views/Portfolio.jsx";
import Timeline from "./views/Timeline.jsx";
import Competition from "./views/Competition.jsx";
import Forecast from "./views/Forecast.jsx";
import Supply from "./views/Supply.jsx";
import Reports from "./views/Reports.jsx";
import Shareouts from "./views/Shareouts.jsx";
import DataSources from "./views/DataSources.jsx";
import Settings from "./views/Settings.jsx";
import About from "./views/About.jsx";

const ROUTES = [
  { id: "today", label: "Today", group: "Brand", C: Today },
  { id: "capture", label: "Capture", group: "Brand", C: Capture },
  { id: "review", label: "Review", group: "Brand", C: Review },
  { id: "portfolio", label: "Portfolio", group: "Brand", C: Portfolio },
  { id: "timeline", label: "SKU timeline", group: "Brand", C: Timeline },
  { id: "competition", label: "Competition", group: "Brand", C: Competition },
  { id: "forecast", label: "Forecast", group: "Forecast", C: Forecast },
  { id: "supply", label: "Supply handoff", group: "Forecast", C: Supply },
  { id: "reports", label: "Driver reports", group: "Insights", C: Reports },
  { id: "shareouts", label: "Shareouts", group: "Insights", C: Shareouts },
  { id: "data", label: "Data sources", group: "Setup", C: DataSources },
  { id: "settings", label: "Settings", group: "Setup", C: Settings },
  { id: "about", label: "About", group: "Setup", C: About },
];

function useRoute() {
  const get = () => { const h = location.hash.slice(1); return ROUTES.some((r) => r.id === h) ? h : ROLES[getState().role].home; };
  const [r, setR] = useState(get);
  useEffect(() => { const f = () => { setR(get()); window.scrollTo(0, 0); }; window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  return [r, setR, get];
}
import { go } from "./nav.js";

export default function App() {
  const S = useStore();
  const [route, , get] = useRoute();
  const [, force] = useState(0);
  useEffect(() => onAIChange(() => force((x) => x + 1)), []);
  const [confirmReset, setConfirmReset] = useState(false);
  const pend = S.assumptions.filter((a) => a.status === "pending").length;
  const caps = S.captures.filter((c) => c.status === "new" || c.status === "review").length;
  const qs = openQuestionsFor(S.role).length;
  const current = ROUTES.find((r) => r.id === route) || ROUTES[0];
  let g = "";
  return (
    <div className="app">
      <aside className="rail" aria-label="Texere navigation">
        <a className="brand" href="#today" aria-label="Texere home">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <rect x="6" y="1" width="4.5" height="24" rx="2.25" fill="var(--accent)" />
            <rect x="15.5" y="1" width="4.5" height="24" rx="2.25" fill="var(--accent)" />
            <rect x="1" y="6" width="24" height="4.5" rx="2.25" fill="var(--weft)" />
            <rect x="1" y="15.5" width="24" height="4.5" rx="2.25" fill="var(--weft)" />
            <rect x="15.5" y="4.5" width="4.5" height="7.5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="1.2" />
            <rect x="6" y="14" width="4.5" height="7.5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="1.2" />
          </svg>
          <div><b>Texere</b><small>Context, woven into the forecast</small></div>
        </a>
        <nav className="nav">
          {ROUTES.map((r) => {
            const head = r.group !== g ? <div className="nav-group" key={"g" + r.group}>{(g = r.group)}</div> : null;
            const badge = r.id === "review" && pend ? pend : r.id === "capture" && caps ? caps : r.id === "today" && qs ? qs : 0;
            return (
              <React.Fragment key={r.id}>
                {head}
                <a href={"#" + r.id} aria-current={route === r.id ? "page" : undefined}>
                  <Icon name={r.id} /><span>{r.label}</span>{badge ? <span className="count">{badge}</span> : null}
                </a>
              </React.Fragment>
            );
          })}
        </nav>
        <div className="role">
          <label htmlFor="role">Viewing as</label>
          <select id="role" value={S.role} onChange={(e) => { const v = e.target.value; update((s) => { s.role = v; }); go(ROLES[v].home); }}>
            {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.name} ({r.person})</option>)}
          </select>
        </div>
        <div className="rail-foot">
          <span className="demo-pill">Prototype · example data</span>
          <span className={"ai-pill " + aiMode()}>{aiMode() === "offline" ? "Claude not connected" : "Claude connected"}</span>
          <button className="btn sm" type="button" onClick={() => { if (confirmReset) { resetAll(); setConfirmReset(false); toast("Demo data restored."); } else { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); } }}>
            {confirmReset ? "Select again to confirm" : "Reset demo data"}
          </button>
        </div>
      </aside>
      <main id="main"><div className="wrap"><current.C /></div></main>
      <Toaster />
    </div>
  );
}
