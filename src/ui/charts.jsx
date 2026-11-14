import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fK } from "./format.js";

export function useWidth(min = 280) {
  const ref = useRef(null); const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const set = () => setW(Math.max(min, el.clientWidth));
    set();
    const ro = new ResizeObserver(set); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
export function niceTicks(lo, hi, n = 4) {
  if (hi === lo) hi = lo + 1;
  const step0 = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) || step0;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step;
  const t = []; for (let v = a; v <= b + step / 2; v += step) t.push(+v.toFixed(6));
  return t;
}

export function Spark({ values, color = "var(--brand)", h = 28, w = 96, fill = true, splitAt }) {
  const v = values.filter((x) => x != null); if (v.length < 2) return null;
  const lo = Math.min(...v), hi = Math.max(...v), r = hi - lo || 1;
  const pts = values.map((x, i) => [(i / (values.length - 1)) * w, h - 2 - ((x - lo) / r) * (h - 4)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="spark" aria-hidden="true">
      {fill && <path d={d + `L${w} ${h}L0 ${h}Z`} fill={color} opacity=".1" />}
      <path d={splitAt ? pts.slice(0, splitAt + 1).map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join("") : d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      {splitAt && <path d={pts.slice(splitAt).map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join("")} fill="none" stroke={color} strokeWidth="1.6" strokeDasharray="2 2.5" />}
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} />
    </svg>
  );
}

// Multi-series line chart with optional hover, highlighted forecast region and selected column.
export function Lines({ labels, series, height = 240, fmt = fK, splitAt, selected, onPick, yZero = false, legend = true, tipExtra }) {
  const [ref, W] = useWidth();
  const [hov, setHov] = useState(null);
  const L = 48, R = 12, T = 12, B = 26, w = W - L - R, h = height - T - B;
  const all = series.flatMap((s) => s.values.filter((x) => x != null));
  const lo0 = Math.min(...all), hi0 = Math.max(...all);
  const ticks = niceTicks(yZero ? 0 : lo0 - (hi0 - lo0) * 0.08, hi0 + (hi0 - lo0) * 0.05);
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const n = labels.length, x = (i) => L + (n === 1 ? w / 2 : (i / (n - 1)) * w), y = (v) => T + h - ((v - lo) / (hi - lo)) * h;
  const every = Math.ceil(n / Math.max(3, Math.floor(w / 64)));
  const path = (vals) => { let d = "", on = false; vals.forEach((v, i) => { if (v == null) { on = false; return; } d += (on ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); on = true; }); return d; };
  return (
    <div className="chart" ref={ref}>
      {legend && <div className="legend">{series.filter((s) => !s.hideLegend).map((s) => <span key={s.name}><i style={{ background: s.color, ...(s.dash ? { backgroundImage: `repeating-linear-gradient(90deg, ${s.color} 0 4px, transparent 4px 7px)`, background: "none" } : {}) }} className={s.dash ? "dash" : ""} />{s.name}</span>)}</div>}
      {W > 0 && (
        <svg width={W} height={height} role="img" aria-label={series.map((s) => s.name).join(", ")} onMouseLeave={() => setHov(null)}>
          {splitAt != null && <rect x={x(splitAt)} y={T} width={L + w - x(splitAt)} height={h} className="fc-band" />}
          {splitAt != null && <text x={x(splitAt) + 6} y={T + 12} className="ax-note">Forecast</text>}
          {ticks.map((t) => <g key={t}><line x1={L} x2={L + w} y1={y(t)} y2={y(t)} className="grid" /><text x={L - 8} y={y(t) + 4} textAnchor="end" className="ax">{fmt(t)}</text></g>)}
          {labels.map((l, i) => (i % every === 0 || i === n - 1) && <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className="ax">{l}</text>)}
          {selected != null && <rect x={x(selected) - w / n / 2} y={T} width={w / n} height={h} className="sel-col" />}
          {series.map((s) => <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={s.width || 2} strokeDasharray={s.dash || undefined} strokeLinejoin="round" strokeLinecap="round" opacity={s.opacity || 1} />)}
          {series.filter((s) => s.dots).map((s) => s.values.map((v, i) => v != null && <circle key={s.name + i} cx={x(i)} cy={y(v)} r="2.6" fill="var(--surface)" stroke={s.color} strokeWidth="1.6" />))}
          {hov != null && <line x1={x(hov)} x2={x(hov)} y1={T} y2={T + h} className="hov-line" />}
          {hov != null && series.map((s) => s.values[hov] != null && <circle key={s.name} cx={x(hov)} cy={y(s.values[hov])} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="2" />)}
          {labels.map((_, i) => <rect key={i} x={x(i) - w / Math.max(1, n - 1) / 2} y={T} width={w / Math.max(1, n - 1)} height={h + B} fill="transparent" onMouseEnter={() => setHov(i)} onClick={() => onPick?.(i)} style={{ cursor: onPick ? "pointer" : "default" }} />)}
        </svg>
      )}
      {hov != null && W > 0 && (
        <div className="tip" style={{ left: Math.min(W - 190, Math.max(0, x(hov) + 12)), top: 34 }}>
          <b>{labels[hov]}</b>
          {series.filter((s) => s.values[hov] != null && !s.hideTip).map((s) => <div key={s.name} className="tip-r"><i style={{ background: s.color }} />{s.name}<span className="num">{fmt(s.values[hov])}</span></div>)}
          {tipExtra?.(hov)}
        </div>
      )}
    </div>
  );
}

// Waterfall bridge: start bar, driver steps, end bar.
export function Waterfall({ start, end, steps, startLabel = "Before", endLabel = "After", height = 260, onPick, picked, fmt = fK }) {
  const [ref, W] = useWidth();
  const [hov, setHov] = useState(null);
  const bars = []; let run = start;
  bars.push({ k: "_s", label: startLabel, a: 0, b: start, total: true });
  for (const s of steps) { bars.push({ k: s.key, label: s.label, a: run, b: run + s.v, v: s.v }); run += s.v; }
  bars.push({ k: "_e", label: endLabel, a: 0, b: end, total: true });
  const edges = bars.filter((b) => !b.total).flatMap((b) => [b.a, b.b]);
  const tops = [start, end];
  const lo0 = Math.min(...edges, ...tops) , hi0 = Math.max(...edges, ...tops);
  const pad = (hi0 - lo0) * 0.25 || hi0 * 0.05;
  const ticks = niceTicks(Math.max(0, lo0 - pad), hi0 + pad * 0.4);
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const L = 48, R = 8, T = 22, B = 46, w = W - L - R, h = height - T - B;
  const bw = w / bars.length, y = (v) => T + h - ((v - lo) / (hi - lo)) * h;
  const short = (s) => s.replace(" (TDPs)", "").replace(" (TPR)", "").replace("Base velocity", "Velocity");
  return (
    <div className="chart" ref={ref}>
      {W > 0 && (
        <svg width={W} height={height} role="img" aria-label={`Bridge from ${fmt(start)} to ${fmt(end)}`} onMouseLeave={() => setHov(null)}>
          {ticks.map((t) => <g key={t}><line x1={L} x2={L + w} y1={y(t)} y2={y(t)} className="grid" /><text x={L - 8} y={y(t) + 4} textAnchor="end" className="ax">{fmt(t)}</text></g>)}
          {lo > 0 && <text x={L + w} y={12} textAnchor="end" className="ax-note">Axis starts at {fmt(lo)}</text>}
          {bars.map((b, i) => {
            const top = y(Math.max(b.a, b.b)), bot = b.total ? y(lo) : y(Math.min(b.a, b.b));
            const cls = b.total ? "wf-total" : b.v >= 0 ? "wf-up" : "wf-dn";
            const on = picked === b.k;
            return (
              <g key={b.k} onMouseEnter={() => setHov(i)} onClick={() => !b.total && onPick?.(b.k)} style={{ cursor: !b.total && onPick ? "pointer" : "default" }}>
                <rect x={L + i * bw} y={T} width={bw} height={h + B} fill="transparent" />
                <rect x={L + i * bw + bw * 0.16} y={top} width={bw * 0.68} height={Math.max(1.5, bot - top)} rx="3" className={cx2(cls, on && "on", hov === i && "hov")} />
                {i < bars.length - 1 && <line x1={L + i * bw + bw * 0.84} x2={L + (i + 1) * bw + bw * 0.16} y1={y(b.total ? b.b : b.b)} y2={y(b.total ? b.b : b.b)} className="wf-link" />}
                <text x={L + i * bw + bw / 2} y={top - 6} textAnchor="middle" className={"wf-v " + (b.total ? "" : b.v >= 0 ? "up" : "dn")}>{b.total ? fmt(b.b) : (b.v >= 0 ? "+" : "−") + fmt(Math.abs(b.v))}</text>
                <foreignObject x={L + i * bw + 1} y={T + h + 6} width={bw - 2} height={B - 6}><div className={"wf-l" + (on ? " on" : "")}>{short(b.label)}</div></foreignObject>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
const cx2 = (...a) => a.filter(Boolean).join(" ");

// Supply: projected inventory vs safety stock, demand bars underneath
export function InventoryChart({ rows, labels, height = 260 }) {
  const [ref, W] = useWidth();
  const [hov, setHov] = useState(null);
  const L = 52, R = 12, T = 14, B = 26, w = W - L - R, h = height - T - B;
  const hiV = Math.max(...rows.map((r) => Math.max(r.onHand, r.safety)), 1), loV = Math.min(0, ...rows.map((r) => r.onHand));
  const ticks = niceTicks(loV, hiV * 1.05); const lo = ticks[0], hi = ticks[ticks.length - 1];
  const n = rows.length, bw = w / n, x = (i) => L + i * bw + bw / 2, y = (v) => T + h - ((v - lo) / (hi - lo)) * h;
  const area = rows.map((r, i) => (i ? "L" : "M") + x(i) + " " + y(r.onHand)).join("") + `L${x(n - 1)} ${y(0)}L${x(0)} ${y(0)}Z`;
  const line = (k) => rows.map((r, i) => (i ? "L" : "M") + x(i) + " " + y(r[k])).join("");
  const every = Math.ceil(n / Math.max(3, Math.floor(w / 60)));
  return (
    <div className="chart" ref={ref}>
      <div className="legend"><span><i style={{ background: "var(--brand)" }} />Projected on hand</span><span><i className="dash" style={{ background: "none", backgroundImage: "repeating-linear-gradient(90deg, var(--bad) 0 4px, transparent 4px 7px)" }} />Safety stock</span><span><i style={{ background: "var(--zone-f)" }} />Frozen zone</span></div>
      {W > 0 && (
        <svg width={W} height={height} onMouseLeave={() => setHov(null)} role="img" aria-label="Projected inventory">
          <rect x={L} y={T} width={bw * 4} height={h} className="zone-f" />
          <rect x={L + bw * 4} y={T} width={bw * 9} height={h} className="zone-s" />
          <text x={L + 4} y={T + 11} className="ax-note">Frozen</text><text x={L + bw * 4 + 4} y={T + 11} className="ax-note">Slushy</text><text x={L + bw * 13 + 4} y={T + 11} className="ax-note">Liquid</text>
          {ticks.map((t) => <g key={t}><line x1={L} x2={L + w} y1={y(t)} y2={y(t)} className={t === 0 ? "grid zero" : "grid"} /><text x={L - 8} y={y(t) + 4} textAnchor="end" className="ax">{fK(t)}</text></g>)}
          {rows.map((r, i) => (r.status === "below" || r.status === "stockout") && <rect key={i} x={L + i * bw} y={T} width={bw} height={h} className="risk-col" />)}
          <path d={area} className="inv-area" />
          <path d={line("onHand")} fill="none" stroke="var(--brand)" strokeWidth="2" />
          <path d={line("safety")} fill="none" stroke="var(--bad)" strokeWidth="1.5" strokeDasharray="4 3" />
          {rows.map((r, i) => (i % every === 0) && <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className="ax">{labels[i]}</text>)}
          {hov != null && <line x1={x(hov)} x2={x(hov)} y1={T} y2={T + h} className="hov-line" />}
          {rows.map((_, i) => <rect key={i} x={L + i * bw} y={T} width={bw} height={h} fill="transparent" onMouseEnter={() => setHov(i)} />)}
        </svg>
      )}
      {hov != null && W > 0 && (
        <div className="tip" style={{ left: Math.min(W - 200, x(hov) + 12), top: 30 }}>
          <b>w/e {labels[hov]} · {rows[hov].zone}</b>
          <div className="tip-r">Demand now<span className="num">{fK(rows[hov].current)}</span></div>
          <div className="tip-r">Published<span className="num">{fK(rows[hov].published)}</span></div>
          <div className="tip-r">On hand<span className="num">{fK(rows[hov].onHand)}</span></div>
          <div className="tip-r">Weeks of supply<span className="num">{rows[hov].wos.toFixed(1)}</span></div>
        </div>
      )}
    </div>
  );
}

// Horizontal bar list (share, contributions)
export function HBars({ rows, fmt = (v) => v, max }) {
  const m = max || Math.max(...rows.map((r) => Math.abs(r.v)), 1e-9);
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div className="hb" key={r.k}>
          <span className="hb-l">{r.label}</span>
          <span className="hb-t"><i style={{ width: (Math.abs(r.v) / m) * 100 + "%", background: r.color || "var(--brand)" }} /></span>
          <span className="hb-v num">{fmt(r.v)}</span>
        </div>
      ))}
    </div>
  );
}
