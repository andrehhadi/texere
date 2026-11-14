import React from "react";

// Stroke icons, 24px grid, drawn for Texere.
const P = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  inbox: "M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z",
  timeline: "M3 6h4M10 6h11M3 12h9M15 12h6M3 18h2M8 18h13M7 4v4M12 10v4M5 16v4",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  compete: "M12 3v18M5 8h4M5 12h4M5 16h4M15 6h4M15 10h4M15 14h4M15 18h4",
  forecast: "M3 17l5-5 4 3 8-8M15 7h5v5",
  supply: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  capture: "M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  present: "M3 4h18M4 4v11h16V4M12 15v5M8 20h8",
  data: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5",
  bell: "M18 16V11a6 6 0 1 0-12 0v5l-2 2h16zM10 21h4",
  check: "M5 12.5 10 17 19 7",
  x: "M6 6l12 12M18 6 6 18",
  chat: "M4 5h16v11H9l-5 4z",
  filter: "M3 5h18l-7 8v6l-4-2v-4z",
  down: "M6 9l6 6 6-6",
  right: "M9 6l6 6-6 6",
  left: "M15 6l-6 6 6 6",
  up: "M6 15l6-6 6 6",
  plus: "M12 5v14M5 12h14",
  upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
  download: "M12 4v12M7 11l5 5 5-5M4 20h16",
  spark: "M12 3l2 5.5L19.5 10 14 12l-2 6-2-6-5.5-2L10 8.5z",
  call: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  slack: "M9 3a2 2 0 0 0 0 4h2V5a2 2 0 0 0-2-2zM3 9a2 2 0 0 0 2 2h6V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2zM15 21a2 2 0 0 0 0-4h-2v2a2 2 0 0 0 2 2zM21 15a2 2 0 0 0-2-2h-6v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2zM21 9a2 2 0 0 0-4 0v2h2a2 2 0 0 0 2-2zM3 15a2 2 0 0 0 4 0v-2H5a2 2 0 0 0-2 2z",
  email: "M3 6h18v12H3zM3 7l9 6 9-6",
  doc: "M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6",
  web: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  alert: "M12 4 2.5 20h19zM12 10v4M12 17h.01",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  send: "M4 12 20 4l-4 16-4-7z",
  layers: "M12 3 2 8l10 5 10-5zM2 13l10 5 10-5",
  refresh: "M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  zap: "M13 2 4 14h7l-1 8 9-12h-7z",
  flag: "M5 21V4h11l-2 4 2 4H5",
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  merge: "M6 3v6a6 6 0 0 0 6 6h6M15 12l3 3-3 3M6 21v-4",
  cmd: "M9 6a3 3 0 1 0-3 3h3zm0 0v12m0-12h6M9 18a3 3 0 1 1-3-3h3zm0 0h6m0 0a3 3 0 1 0 3-3h-3zm0 0V6m0 0a3 3 0 1 1 3 3h-3",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  menu: "M4 6h16M4 12h16M4 18h16",
};
export function Icon({ name, size = 16, stroke = 1.75, className, style }) {
  const d = P[name] || P.info;
  return (
    <svg className={"ic " + (className || "")} style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// The Texere mark: three warp threads and two weft threads, woven over and under.
export function Mark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="mark">
      <rect width="32" height="32" rx="8" fill="var(--mark-bg)" />
      {[9, 16, 23].map((x, i) => <rect key={"w" + i} x={x - 2} y="6" width="4" height="20" rx="2" fill="var(--mark-warp)" />)}
      {[11.5, 20.5].map((y, j) => (
        <g key={"f" + j}>
          <rect x="5" y={y - 2} width="22" height="4" rx="2" fill="var(--mark-weft)" />
          {[9, 16, 23].map((x, i) => ((i + j) % 2 === 0 ? <rect key={i} x={x - 2} y={y - 2.6} width="4" height="5.2" fill="var(--mark-warp)" /> : null))}
        </g>
      ))}
    </svg>
  );
}
export function Wordmark({ size = 28 }) {
  return (
    <span className="wordmark"><Mark size={size} /><span className="wm-text">texere</span></span>
  );
}
