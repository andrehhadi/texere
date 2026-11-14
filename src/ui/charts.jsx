import React from "react";
import { fK, fU } from "./format.js";
import { mShort, mLabel } from "../data/catalog.js";

function niceTop(mx) {
  if (mx <= 0) return 1;
  const step = Math.pow(10, Math.floor(Math.log10(mx / 4)));
  const nice = [1, 2, 2.5, 5, 10].map((f) => f * step).find((s) => mx / s <= 5) || step * 10;
  return { top: Math.ceil((mx * 1.08) / nice) * nice, nice };
}

// Waterfall: start total, one floating bar per driver, end total
export function Waterfall({ start, end, steps, startLabel, endLabel, title }) {
  const W = 760, H = 320, L = 60, R = 16, T = 28, B = 64;
  const items = [{ label: startLabel, v: start, total: true }, ...steps.filter((s) => Math.abs(s.v) >= 0.5), { label: endLabel, v: end, total: true }];
  let run = start; const bars = [];
  for (const it of items) {
    if (it.total) bars.push({ ...it, y0: 0, y1: it.v });
    else { bars.push({ ...it, y0: run, y1: run + it.v }); run += it.v; }
  }
  const vals = bars.flatMap((b) => (b.total ? [b.y1] : [b.y0, b.y1]));
  const mn = Math.min(...vals), mx = Math.max(...vals);
  // Zoom the axis so driver bars are readable; totals are drawn with a broken base
  const lo = Math.max(0, mn - (mx - mn) * 0.6), { top, nice } = niceTop(mx);
  const floor = Math.floor(lo / nice) * nice;
  const Y = (v) => T + (1 - (v - floor) / (top - floor)) * (H - T - B);
  const bw = (W - L - R) / bars.length;
  const grid = [];
  for (let v = floor; v <= top + 1e-6; v += nice) grid.push(v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title || "Driver waterfall"} className="chart">
      {grid.map((v) => <g key={v}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--grid)" /><text x={L - 8} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)" fontFamily="var(--mono)">{fK(v)}</text></g>)}
      {bars.map((b, i) => {
        const x = L + i * bw + bw * 0.18, w = bw * 0.64;
        const yTop = Y(Math.max(b.y0, b.y1)), yBot = Y(Math.max(floor, Math.min(b.y0, b.y1)));
        const fill = b.total ? "var(--accent)" : b.v >= 0 ? "var(--good)" : "var(--bad)";
        const next = bars[i + 1];
        return (
          <g key={i}>
            <rect x={x} y={yTop} width={w} height={Math.max(1.5, yBot - yTop)} rx="3" fill={fill} opacity={b.total ? 0.9 : 0.85} />
            {next && <line x1={x + w} x2={x + bw} y1={Y(b.y1)} y2={Y(b.y1)} stroke="var(--line-2)" strokeDasharray="3 3" />}
            <text x={x + w / 2} y={yTop - 6} textAnchor="middle" fontSize="11.5" fontFamily="var(--mono)" fill={b.total ? "var(--ink)" : b.v >= 0 ? "var(--good)" : "var(--bad)"} fontWeight="500">{b.total ? fK(b.v) : (b.v >= 0 ? "+" : "−") + fK(Math.abs(b.v))}</text>
            <foreignObject x={L + i * bw} y={H - B + 8} width={bw} height={B - 8}>
              <div className="wf-label">{b.label}</div>
            </foreignObject>
          </g>
        );
      })}
      {floor > 0 && <text x={W - R} y={T - 12} textAnchor="end" fontSize="10.5" fill="var(--ink-3)">Axis starts at {fK(floor)} to show the drivers</text>}
    </svg>
  );
}

// Monthly trend: actuals, forecast, last year and plan
export function TrendChart({ months, series, todayIdx, onPick, selected, markers = new Set(), height = 300 }) {
  const W = 760, H = height, L = 56, R = 16, T = 20, B = 36;
  const all = series.flatMap((s) => s.values.filter((v) => v != null));
  const { top, nice } = niceTop(Math.max(...all, 1));
  const n = months.length;
  const X = (i) => L + (i * (W - L - R)) / (n - 1), Y = (v) => T + (1 - v / top) * (H - T - B);
  const grid = []; for (let v = 0; v <= top + 1e-6; v += nice) grid.push(v);
  const path = (vals) => { let d = "", pen = false; vals.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + X(i).toFixed(1) + "," + Y(v).toFixed(1); pen = true; }); return d; };
  const every = n > 18 ? 3 : 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Monthly units" className="chart">
      {grid.map((v) => <g key={v}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--grid)" /><text x={L - 8} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)" fontFamily="var(--mono)">{fK(v)}</text></g>)}
      {todayIdx != null && <g><rect x={X(todayIdx) + (X(1) - X(0)) / 2} y={T} width={W - R - X(todayIdx) - (X(1) - X(0)) / 2} height={H - T - B} fill="var(--accent-soft)" opacity="0.35" /><text x={X(todayIdx) + (X(1) - X(0)) / 2 + 6} y={T + 12} fontSize="11" fill="var(--ink-3)">Forecast</text></g>}
      {selected != null && <rect x={X(selected) - 14} y={T - 4} width="28" height={H - T - B + 8} rx="6" fill="var(--accent-soft)" />}
      {series.map((s) => <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={s.width || 2} strokeDasharray={s.dash || "none"} strokeLinejoin="round" />)}
      {months.map((m, i) => {
        const main = series[0].values[i];
        return (
          <g key={m} onClick={onPick ? () => onPick(m) : undefined} style={{ cursor: onPick ? "pointer" : "default" }}>
            <rect x={X(i) - (W - L - R) / (n - 1) / 2} y={T} width={(W - L - R) / (n - 1)} height={H - T} fill="transparent" />
            {i % every === 0 && <text x={X(i)} y={H - 12} textAnchor="middle" fontSize="11" fill={selected === i ? "var(--ink)" : "var(--ink-3)"} fontWeight={selected === i ? 600 : 400}>{mShort(m)}{m.endsWith("-01") || i === 0 ? " ’" + m.slice(2, 4) : ""}</text>}
            {markers.has(m) && main != null && <circle cx={X(i)} cy={Y(main)} r={selected === i ? 6.5 : 5} fill="var(--weft)" stroke="var(--surface)" strokeWidth="2" />}
            <title>{mLabel(m)}: {series.map((s) => s.values[i] != null ? `${s.name} ${fU(s.values[i])}` : null).filter(Boolean).join(" · ")}</title>
          </g>
        );
      })}
    </svg>
  );
}
export function Spark({ values, w = 120, h = 30 }) {
  const mx = Math.max(...values, 1), mn = Math.min(...values, 0);
  const p = values.map((v, i) => `${((i / (values.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 3 - ((v - mn) / (mx - mn || 1)) * (h - 6)).toFixed(1)}`).join(" ");
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={p} fill="none" stroke="var(--accent)" strokeWidth="1.6" /></svg>;
}
export function Legend({ items }) {
  return <div className="legend">{items.map((it) => <span key={it.name}><i style={{ borderColor: it.color, borderTopStyle: it.dash ? "dashed" : "solid", borderTopWidth: it.width || 2 }} />{it.name}</span>)}</div>;
}
