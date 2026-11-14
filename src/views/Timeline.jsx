import React, { useMemo, useState } from "react";
import { useStore, update, activeAt, NOW, PLAN, key, statusOf, capById, replacedBy, assm } from "../store.js";
import { HIST_MONTHS, FC_MONTHS, DRIVERS, DRIVER_COLOR, mLabel, weeksInMonth, retById, skuById, shiftYM, WEEKS, NH } from "../data/catalog.js";
import { units } from "../engine/analytics.js";
import { ACV_EVENTS, PRICE_EVENTS, COMP_EVENTS, PROMOS, DISPLAYS, row } from "../engine/sim.js";
import { impactUnits } from "../engine/stories.js";
import { openAssm } from "../actions.js";
import { useScope, FilterBar } from "../ui/filters.jsx";
import { Card, Badge, StatusBadge, DriverTag, ConfTag, Avatar, Btn, Delta, Seg, Empty, cx } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { useWidth, niceTicks } from "../ui/charts.jsx";
import { ImpactBox, Facts } from "../ui/assm.jsx";
import { fK, sg, sp, mRange, skuNames, retNames, fDate, fDateTime, lcFirst } from "../ui/format.js";
import { recentEvents } from "./Home.jsx";

const H_MONTHS = HIST_MONTHS.slice(-6);
const MONTHS = [...H_MONTHS, ...FC_MONTHS];
const LANES = ["promotion", "display", "distribution", "price", "launch", "supply", "competition", "other"];
const G = 168; // lane label gutter

const inScope = (a, skus, rets) => a.skus.some((s) => skus.includes(s)) && a.retailers.some((r) => rets.includes(r));
const mOf = (d) => d.slice(0, 7);
const addWeeks = (d, w) => new Date(Date.parse(d + "T00:00:00Z") + w * 7 * 864e5).toISOString().slice(0, 10);

// Events NielsenIQ actually measured in the last six months, so the past and the plan sit on one timeline.
function observed(skus, rets) {
  const out = [], first = H_MONTHS[0], last = H_MONTHS[H_MONTHS.length - 1];
  const inWin = (a, b) => b >= first && a <= last;
  const lift = (sku, ret, start, wks) => {
    let u = 0, b = 0; for (const w of WEEKS.slice(0, NH)) if (w.end >= start && w.end < addWeeks(start, wks)) { const r = row(sku, ret, w.i); if (r) { u += r.units; b += r.baseUnits; } }
    return b ? (u / b - 1) * 100 : 0;
  };
  for (const p of PROMOS) if (skus.includes(p.sku) && rets.includes(p.ret) && inWin(mOf(p.start), mOf(addWeeks(p.start, p.wks - 1)))) out.push({ id: "P" + p.sku + p.ret + p.start, driver: "promotion", label: `${retById(p.ret).short} ${Math.round(p.depth * 100)}% off · ${skuById(p.sku).short}`, from: mOf(p.start), to: mOf(addWeeks(p.start, p.wks - 1)), v: lift(p.sku, p.ret, p.start, p.wks), detail: `${retById(p.ret).name} ran ${Math.round(p.depth * 100)}% off on ${skuById(p.sku).name} for ${p.wks} weeks from ${fDate(p.start)}, in ${Math.round(p.acv * 100)}% of stores${p.feat ? `, featured in ${Math.round(p.feat * 100)}%` : ""}.` });
  for (const p of DISPLAYS) if (skus.includes(p.sku) && rets.includes(p.ret) && inWin(mOf(p.start), mOf(addWeeks(p.start, p.wks - 1)))) out.push({ id: "D" + p.sku + p.ret + p.start, driver: "display", label: `${retById(p.ret).short} display · ${skuById(p.sku).short}`, from: mOf(p.start) < first ? first : mOf(p.start), to: mOf(addWeeks(p.start, p.wks - 1)) > last ? last : mOf(addWeeks(p.start, p.wks - 1)), v: lift(p.sku, p.ret, p.start, p.wks), detail: `${retById(p.ret).name} put ${skuById(p.sku).name} on display in ${Math.round(p.acv * 100)}% of stores for ${p.wks} weeks from ${fDate(p.start)}.` });
  for (const [s, r, d, acv, note] of ACV_EVENTS) if (d && skus.includes(s) && rets.includes(r) && inWin(mOf(d), mOf(d))) out.push({ id: "A" + s + r + d, driver: "distribution", label: note, from: mOf(d), to: last, v: null, detail: `${note}. %ACV moved to ${acv}.` });
  for (const [s, d, m, note] of PRICE_EVENTS) if (skus.includes(s) && inWin(mOf(d), mOf(d))) out.push({ id: "R" + s + d, driver: "price", label: `${skuById(s).short}: ${lcFirst(note)}`, from: mOf(d), to: last, v: null, detail: `${note} on ${skuById(s).name} from ${fDate(d)}.` });
  for (const c of COMP_EVENTS) if (c.skus.some((s) => skus.includes(s)) && rets.includes(c.ret) && inWin(mOf(c.from), last)) out.push({ id: "C" + c.comp + c.ret, driver: "competition", label: c.note, from: mOf(c.from) < first ? first : mOf(c.from), to: last, v: (c.factor - 1) * 100, detail: `${c.note} (${fDate(c.from)}). Measured effect on our affected SKUs: ${((c.factor - 1) * 100).toFixed(0)}%.` });
  return out;
}

function stack(items) {
  const rows = [];
  for (const it of items.sort((a, b) => a.c0 - b.c0 || b.c1 - a.c1)) {
    let r = rows.findIndex((end) => end < it.c0);
    if (r === -1) { r = rows.length; rows.push(-1); }
    rows[r] = it.c1; it.row = r;
  }
  return rows.length;
}

export default function Timeline() {
  const { S, skus, rets, label } = useScope();
  const [showOld, setShowOld] = useState(false);
  const [showPend, setShowPend] = useState(true);
  const [sel, setSel] = useState(null);
  const [ref, W] = useWidth(600);
  const month = S.ui.tlMonth || FC_MONTHS[4];
  const setMonth = (m) => update((s) => { s.ui.tlMonth = m; });
  const now = activeAt(NOW()), plan = activeAt(PLAN), withP = activeAt(NOW(), true);

  const series = useMemo(() => MONTHS.map((m) => {
    const w = weeksInMonth(m), hist = H_MONTHS.includes(m);
    const ly = units(skus, rets, weeksInMonth(shiftYM(m, -1)), now);
    return { m, hist, actual: hist ? units(skus, rets, w, now) : null, plan: hist ? null : units(skus, rets, w, plan), cur: hist ? null : units(skus, rets, w, now), pend: hist ? null : units(skus, rets, w, withP), ly };
  }), [skus.join(), rets.join(), S.assumptions, S.assumptions.length, JSON.stringify(S.assumptions.map((a) => [a.status, a.impact]))]);

  // Lanes: context assumptions (future) and NielsenIQ-observed events (past)
  const items = [];
  for (const a of S.assumptions) {
    if (!inScope(a, skus, rets)) continue;
    const st = statusOf(a);
    if (st === "rejected" || (st === "superseded" && !showOld)) continue;
    const ms = [...a.months].sort(); const c0 = MONTHS.indexOf(ms[0]), c1 = MONTHS.indexOf(ms[ms.length - 1]);
    if (c0 < 0) continue;
    items.push({ kind: "a", id: a.id, a, st, driver: LANES.includes(a.driver) ? a.driver : "other", c0, c1, changed: (a.history || []).some((h) => h.action === "edited") || !!a.supersedes });
  }
  const obs = observed(skus, rets);
  for (const d of LANES) obs.filter((o) => o.driver === d).sort((a, b) => Math.abs(b.v || 50) - Math.abs(a.v || 50)).slice(0, 4).forEach((o) => items.push({ kind: "o", ...o, c0: MONTHS.indexOf(o.from), c1: MONTHS.indexOf(o.to) }));
  const lanes = LANES.map((d) => { const its = items.filter((x) => x.driver === d && x.c0 >= 0); return { d, its, rows: stack(its) }; }).filter((l) => l.its.length);

  // Geometry
  const n = MONTHS.length, w = Math.max(200, W - G - 8), cw = w / n, cx0 = (i) => G + i * cw + cw / 2;
  const CH = 200, VB = 64, T = 16;
  const vals = series.flatMap((s) => [s.actual, s.plan, s.cur, showPend ? s.pend : null, s.ly]).filter((v) => v != null);
  const tk = niceTicks(Math.min(...vals) * 0.92, Math.max(...vals) * 1.03);
  const lo = tk[0], hi = tk[tk.length - 1], y = (v) => T + CH - ((v - lo) / (hi - lo)) * CH;
  const path = (k, joinLast) => { let d = "", on = false; series.forEach((s, i) => { let v = s[k]; if (v == null && joinLast && i === H_MONTHS.length - 1) v = s.actual; if (v == null) { on = false; return; } d += (on ? "L" : "M") + cx0(i).toFixed(1) + " " + y(v).toFixed(1); on = true; }); return d; };
  const gaps = series.map((s) => (s.hist ? null : s.cur - s.plan));
  const gMax = Math.max(1, ...gaps.filter((g) => g != null).map(Math.abs));
  const VY = T + CH + 26, vMid = VY + VB / 2;
  const mi = MONTHS.indexOf(month);
  const todayX = G + H_MONTHS.length * cw;
  const pendCount = S.assumptions.filter((a) => a.status === "pending" && inScope(a, skus, rets)).length;
  const tN = series.reduce((t, s) => t + (s.cur || 0), 0), tP = series.reduce((t, s) => t + (s.plan || 0), 0);
  const selItem = sel && items.find((x) => x.id === sel);

  return (
    <>
      <div className="ph">
        <div><h1>Context timeline</h1><p className="sub">Every event behind the numbers on one calendar: what NielsenIQ measured in the past six months and what your teams expect for the next twelve. Click an item to inspect it, double-click to open its comments and full change history.</p></div>
        <div className="ph-a"><Badge t="brand">Next 12 months {sp((tN / tP - 1) * 100)} vs plan · {sg(tN - tP)} units</Badge></div>
      </div>
      <FilterBar />
      <Card pad={false} id="tl" title={label} sub="Units by month: actuals, the September consensus plan and the forecast now"
        actions={<>
          <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={showPend} onChange={(e) => setShowPend(e.target.checked)} />Show pending ({pendCount})</label>
          <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={showOld} onChange={(e) => setShowOld(e.target.checked)} />Show replaced items</label>
        </>}>
        <div style={{ overflowX: "auto" }}><div className="tl-wrap chart" ref={ref} style={{ padding: "12px 0 0", minWidth: 760 }}>
          {W > 0 && <>
            <div className="legend" style={{ paddingLeft: G }}>
              <span><i style={{ background: "var(--ink-2)" }} />Actual</span><span><i style={{ background: "var(--faint)", opacity: .6 }} />Year ago</span>
              <span><i className="dash" style={{ background: "none", backgroundImage: "repeating-linear-gradient(90deg, var(--muted) 0 4px, transparent 4px 7px)" }} />Plan (Sep 28)</span>
              <span><i style={{ background: "var(--brand)" }} />Forecast now</span>{showPend && <span><i className="dash" style={{ background: "none", backgroundImage: "repeating-linear-gradient(90deg, var(--saffron) 0 3px, transparent 3px 6px)" }} />If pending items are approved</span>}
              <span><i style={{ background: "var(--good)", height: 8, width: 8 }} /><i style={{ background: "var(--bad)", height: 8, width: 8, marginLeft: -4 }} />Forecast vs plan</span>
            </div>
            <svg width={W} height={VY + VB + 34} role="img" aria-label="Plan, forecast and actual units by month">
              <rect x={todayX} y={T} width={G + w - todayX} height={CH} className="fc-band" style={{ fill: "var(--brand)", opacity: .04 }} />
              {mi >= 0 && <rect x={G + mi * cw} y={T - 6} width={cw} height={VY + VB - T + 30} className="sel-col" rx="6" />}
              {tk.map((t) => <g key={t}><line x1={G} x2={G + w} y1={y(t)} y2={y(t)} stroke="var(--line)" /><text x={G - 10} y={y(t) + 4} textAnchor="end" className="ax" style={{ fontSize: 10.5, fill: "var(--muted)", fontFamily: "var(--mono)" }}>{fK(t)}</text></g>)}
              <text x={14} y={T + 10} style={{ fontSize: 11, fill: "var(--muted)", fontWeight: 600 }}>UNITS</text>
              <line x1={todayX} x2={todayX} y1={T - 8} y2={VY + VB + 6} stroke="var(--saffron)" strokeWidth="2" />
              <text x={todayX + 6} y={T - 1} style={{ fontSize: 10.5, fill: "var(--saffron-ink)", fontWeight: 600 }}>TODAY · NOV 13</text>
              <path d={path("ly")} fill="none" stroke="var(--faint)" strokeWidth="1.5" opacity=".55" />
              <path d={path("plan")} fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeDasharray="5 4" />
              {showPend && <path d={path("pend")} fill="none" stroke="var(--saffron)" strokeWidth="2" strokeDasharray="3 3" />}
              <path d={path("cur", true)} fill="none" stroke="var(--brand)" strokeWidth="2.6" strokeLinejoin="round" />
              <path d={path("actual")} fill="none" stroke="var(--ink-2)" strokeWidth="2.4" strokeLinejoin="round" />
              {series.map((s, i) => s.cur != null && <circle key={i} cx={cx0(i)} cy={y(s.cur)} r={i === mi ? 5 : 3} fill={i === mi ? "var(--brand)" : "var(--surface)"} stroke="var(--brand)" strokeWidth="2" />)}
              {series.map((s, i) => s.actual != null && <circle key={"a" + i} cx={cx0(i)} cy={y(s.actual)} r="3" fill="var(--surface)" stroke="var(--ink-2)" strokeWidth="2" />)}
              {/* variance vs plan */}
              <text x={14} y={vMid - 4} style={{ fontSize: 11, fill: "var(--muted)", fontWeight: 600 }}>FORECAST</text>
              <text x={14} y={vMid + 10} style={{ fontSize: 11, fill: "var(--muted)", fontWeight: 600 }}>VS PLAN</text>
              <line x1={G} x2={G + w} y1={vMid} y2={vMid} stroke="var(--line-2)" />
              {series.map((s, i) => {
                if (s.hist) { const d = s.actual / s.ly - 1; return <text key={i} x={cx0(i)} y={vMid + 4} textAnchor="middle" style={{ fontSize: 10.5, fontFamily: "var(--mono)", fill: "var(--faint)" }}>{sp(d * 100, 0)} YA</text>; }
                const g = gaps[i], h = (Math.abs(g) / gMax) * (VB / 2 - 4);
                return <g key={i}>
                  <rect x={cx0(i) - cw * 0.3} y={g >= 0 ? vMid - h : vMid} width={cw * 0.6} height={Math.max(1, h)} rx="2" fill={g >= 0 ? "var(--good)" : "var(--bad)"} opacity={i === mi ? 1 : .75} />
                  <text x={cx0(i)} y={g >= 0 ? vMid + 13 : vMid - 5} textAnchor="middle" style={{ fontSize: 10.5, fontFamily: "var(--mono)", fill: g >= 0 ? "var(--good)" : "var(--bad)", fontWeight: 500 }}>{sp((g / s.plan) * 100, 1)}</text>
                </g>;
              })}
              {MONTHS.map((m, i) => <text key={m} x={cx0(i)} y={VY + VB + 22} textAnchor="middle" style={{ fontSize: 11, fill: i === mi ? "var(--ink)" : "var(--muted)", fontWeight: i === mi ? 650 : 500 }}>{mLabel(m)}</text>)}
              {MONTHS.map((m, i) => <rect key={"h" + m} x={G + i * cw} y={0} width={cw} height={VY + VB + 34} fill="transparent" style={{ cursor: "pointer" }} onClick={() => setMonth(m)}><title>{mLabel(m)}: click for the month bridge</title></rect>)}
            </svg>
            <div className="lanes">
              {lanes.length === 0 && <Empty>No events for this selection.</Empty>}
              {lanes.map((l) => (
                <div className="lane" key={l.d} style={{ gridTemplateColumns: `${G}px minmax(0, 1fr)` }}>
                  <div className="lane-l" style={{ "--c": DRIVER_COLOR[l.d] }}><i />{DRIVERS[l.d]}<span className="n">{l.its.length}</span></div>
                  <div className="lane-t" style={{ height: l.rows * 32 + 10 }}>
                    {MONTHS.map((m, i) => <span key={m} className={cx("mgrid", i === H_MONTHS.length && "now")} style={{ left: i * cw }} />)}
                    {mi >= 0 && <span style={{ position: "absolute", left: mi * cw, width: cw, top: 0, bottom: 0, background: "var(--saffron)", opacity: .08 }} />}
                    {l.its.map((it) => {
                      const left = it.c0 * cw + 3, width = (it.c1 - it.c0 + 1) * cw - 6;
                      if (it.kind === "o") return (
                        <div key={it.id} className={cx("pill obs", sel === it.id && "on")} style={{ left, width, top: 5 + it.row * 32, "--c": "#8C8FA6" }} onClick={() => setSel(it.id)} title={it.detail}>
                          <Icon name="data" size={12} /><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</span>{it.v != null && <span className={cx("pv", it.v >= 0 ? "up" : "dn")}>{sp(it.v, 0)}</span>}
                        </div>
                      );
                      const a = it.a;
                      return (
                        <div key={it.id} className={cx("pill", it.st, sel === it.id && "on")} style={{ left, width, top: 5 + it.row * 32, "--c": DRIVER_COLOR[a.driver] || DRIVER_COLOR.other }}
                          onClick={() => setSel(it.id)} onDoubleClick={() => openAssm(a.id, "history")} title={`${a.id}: ${a.summary} (double-click for comments and history)`} tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter") openAssm(a.id, "history"); }}>
                          {it.changed && <span className="chg" title="Changed since first shared" />}
                          <span className="num" style={{ opacity: .6, fontSize: 10.5 }}>{a.id}</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{a.summary}</span>
                          <span className={cx("pv", a.impact >= 0 ? "up" : "dn")}>{a.impact > 0 ? "+" : ""}{a.impact}%</span>
                          {S.threads[a.id]?.status === "open" && <Icon name="chat" size={12} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>}
        </div></div>
        <div className="row between" style={{ padding: "10px 18px", borderTop: "1px solid var(--line)" }}>
          <div className="tl-hint"><Icon name="info" size={14} />Gray items were measured in NielsenIQ. Colored items are forecast assumptions; striped ones are pending, and a saffron dot means the number changed after it was first shared.</div>
          <div className="tl-hint">Click a month for its bridge</div>
        </div>
      </Card>
      <div className="grid2">
        <MonthBridge month={month} skus={skus} rets={rets} setMonth={setMonth} />
        {selItem ? <Inspector it={selItem} onClear={() => setSel(null)} /> : (
          <Card title="Inspect an event" sub="Click any item on the timeline" id="insp"><Empty icon="timeline">Select a bar to see the quote, owner and impact here. Double-click opens the full record with every comment and edit.</Empty></Card>
        )}
      </div>
      <ChangeLog skus={skus} rets={rets} />
    </>
  );
}

function MonthBridge({ month, skus, rets, setMonth }) {
  const S = useStore();
  const isHist = !FC_MONTHS.includes(month);
  const w = weeksInMonth(month);
  if (isHist) {
    const a = units(skus, rets, w, []), ly = units(skus, rets, weeksInMonth(shiftYM(month, -1)), []);
    return <Card title={`${mLabel(month)}: actuals`} sub="This month is already in the NielsenIQ data" id="br"><div className="row"><span className="imp-big">{fK(a)}</span><Delta v={a - ly}>{sp((a / ly - 1) * 100)} vs year ago</Delta></div><p className="small muted">Pick a forecast month to see how it moved from the September plan to today, step by step.</p></Card>;
  }
  const steps = []; let prev = units(skus, rets, w, activeAt(PLAN));
  const p0 = prev;
  const changes = S.assumptions.filter((a) => a.status !== "pending" && a.decidedAt && key(a) > PLAN && a.status !== "rejected").sort((a, b) => key(a).localeCompare(key(b)));
  for (const a of changes) {
    const v = units(skus, rets, w, activeAt(key(a))); const d = v - prev;
    if (Math.abs(d) >= 1) steps.push({ a, d, replaced: a.supersedes ? assm(a.supersedes) : null });
    prev = v;
  }
  const cur = units(skus, rets, w, activeAt(NOW())), pend = units(skus, rets, w, activeAt(NOW(), true));
  const pendItems = S.assumptions.filter((a) => a.status === "pending" && a.months.includes(month) && inScope(a, skus, rets));
  const i = FC_MONTHS.indexOf(month);
  return (
    <Card title={`${mLabel(month)}: plan to forecast`} sub="How this month moved since the September consensus, one decision at a time" id="br"
      actions={<div className="row nw"><Btn size="sm" kind="ghost" icon="left" aria-label="Previous month" disabled={i <= 0} onClick={() => setMonth(FC_MONTHS[i - 1])} /><Btn size="sm" kind="ghost" icon="right" aria-label="Next month" disabled={i >= FC_MONTHS.length - 1} onClick={() => setMonth(FC_MONTHS[i + 1])} /></div>}>
      <div className="bridge">
        <div className="br tot"><span>September plan</span><span className="num">{fK(p0)}</span></div>
        {steps.length === 0 && <p className="small muted" style={{ padding: "4px 10px" }}>No approved changes touch this month.</p>}
        {steps.map(({ a, d, replaced }) => (
          <div className="br" key={a.id} onClick={() => openAssm(a.id, "history")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") openAssm(a.id, "history"); }}>
            <span className="row nw" style={{ minWidth: 0 }}><DriverTag d={a.driver} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span className="num muted">{a.id}</span> {replaced ? <>replaced {replaced.id}: </> : ""}{a.summary}</span></span>
            <span className={cx("num", d >= 0 ? "up" : "dn")}>{sg(d)}</span>
          </div>
        ))}
        <div className="br tot"><span>Forecast now</span><span className="num">{fK(cur)} <Delta v={cur - p0} small>{sp((cur / p0 - 1) * 100)}</Delta></span></div>
        {pendItems.length > 0 && <>
          {pendItems.map((a) => <div className="br" key={a.id} onClick={() => openAssm(a.id)} style={{ opacity: .85 }}><span className="row nw" style={{ minWidth: 0 }}><Badge t="warn">Pending</Badge><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span className="num muted">{a.id}</span> {a.summary}</span></span><span className="num muted">{sg(units(skus, rets, w, [...activeAt(NOW()).filter((x) => x.id !== a.supersedes), a]) - cur)}</span></div>)}
          <div className="br tot" style={{ background: "var(--saffron-soft)" }}><span>If pending items are approved</span><span className="num">{fK(pend)}</span></div>
        </>}
      </div>
    </Card>
  );
}

function Inspector({ it, onClear }) {
  if (it.kind === "o") return (
    <Card title="Measured in NielsenIQ" sub={`${mLabel(it.from)}${it.to !== it.from ? " – " + mLabel(it.to) : ""}`} id="insp" actions={<Btn size="sm" kind="ghost" icon="x" onClick={onClear} aria-label="Clear selection" />}>
      <div className="row"><DriverTag d={it.driver} /><Badge t="outline">Observed</Badge></div>
      <p style={{ fontWeight: 500 }}>{it.label}</p>
      <p className="small">{it.detail}</p>
      {it.v != null && <div className="imp-box"><div className="eyebrow">Measured effect</div><span className={cx("imp-big", it.v >= 0 ? "up" : "dn")}>{sp(it.v, 0)}</span><span className="small muted">{it.driver === "competition" ? "on our affected SKUs" : "units vs the base (no-promotion) estimate during the event"}</span></div>}
      <p className="xs muted">Texere uses events like this to estimate the impact of similar plans in the future.</p>
    </Card>
  );
  const a = it.a; const c = capById(a.capture);
  return (
    <Card id="insp" eyebrow={a.id} title={a.summary} actions={<><Btn size="sm" icon="chat" onClick={() => openAssm(a.id, "discussion")}>Comments</Btn><Btn size="sm" icon="clock" onClick={() => openAssm(a.id, "history")}>History</Btn><Btn size="sm" kind="ghost" icon="x" onClick={onClear} aria-label="Clear selection" /></>}>
      <div className="row"><StatusBadge a={a} /><DriverTag d={a.driver} /><ConfTag c={a.confidence} /></div>
      {a.quote && <div className="quote">“{a.quote}”<span className="src">{c?.person} · {c?.title} · {fDate(c?.date || a.createdAt)}</span></div>}
      <ImpactBox a={a} />
    </Card>
  );
}

const VERB = { created: "shared", edited: "changed", approved: "approved", rejected: "rejected", superseded: "replaced", comment: "commented on", reopened: "reopened" };
function ChangeLog({ skus, rets }) {
  const S = useStore();
  const [kind, setKind] = useState("decisions");
  const ev = recentEvents(S, 400).filter((e) => inScope(e.a, skus, rets) && (kind === "all" || (kind === "decisions" ? e.h.action !== "comment" : e.h.action === "comment")));
  return (
    <Card pad={false} title="Change log" sub="Every edit, decision and comment, newest first" id="log" actions={<Seg size="sm" value={kind} onChange={setKind} options={[["decisions", "Changes"], ["comments", "Comments"], ["all", "All"]]} label="Show" />}>
      <div className="log">
        {ev.length === 0 && <Empty>Nothing yet for this selection.</Empty>}
        {ev.slice(0, 40).map((e, i) => (
          <div className="log-r" key={i} onClick={() => openAssm(e.a.id, e.h.action === "comment" ? "discussion" : "history")} role="button" tabIndex={0} onKeyDown={(k) => { if (k.key === "Enter") openAssm(e.a.id, "history"); }}>
            <span className="log-d">{fDateTime(e.h.at).replace(" · ", " ")}</span>
            <Avatar name={e.h.by} size={24} />
            <div style={{ minWidth: 0 }}><span className="muted small"><b style={{ color: "var(--ink)" }}>{e.h.by}</b> {VERB[e.h.action] || e.h.action} <span className="num">{e.a.id}</span>{" "}</span>
              <span className="small">{e.h.action === "comment" ? "“" + e.h.note + "”" : e.a.summary}</span>
              {e.h.field && e.h.from != null && e.h.to != null && e.h.from !== e.h.to && <span className="diff" style={{ marginLeft: 8, marginTop: 0 }}><s>{e.h.from}{e.h.field === "impact" ? "%" : ""}</s><Icon name="right" size={10} /><ins>{e.h.to}{e.h.field === "impact" ? "%" : ""}</ins></span>}
              {e.h.note && e.h.action !== "comment" && <div className="xs muted">{e.h.note}</div>}
            </div>
            <DriverTag d={e.a.driver} />
          </div>
        ))}
      </div>
    </Card>
  );
}
