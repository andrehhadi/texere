// Exports a deck spec (from stories.js) to a real PowerPoint file.
import PptxGenJS from "pptxgenjs";
import { mShort } from "../data/catalog.js";

const C = { ink: "15162B", ink2: "3B3D55", ink3: "6B6D82", accent: "2A2FB8", weft: "F0A527", good: "0E8F6E", bad: "D0442F", warn: "B7791F", line: "E4E3DC", soft: "ECEDFD", bg: "FFFFFF" };
const FONT = "Calibri";

export async function deckToPptx(slides, filename) {
  const p = new PptxGenJS();
  p.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  p.title = slides[0]?.title || "Texere deck";
  slides.forEach((s, i) => {
    const sl = p.addSlide();
    sl.background = { color: C.bg };
    if (s.type === "title") {
      sl.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: 7.5, fill: { color: C.accent } });
      sl.addShape(p.ShapeType.rect, { x: 0.35, y: 0, w: 0.12, h: 7.5, fill: { color: C.weft } });
      sl.addText(s.title, { x: 1.0, y: 2.5, w: 11, h: 1.4, fontFace: FONT, fontSize: 36, bold: true, color: C.ink });
      sl.addText(s.sub || "", { x: 1.0, y: 3.9, w: 11, h: 0.6, fontFace: FONT, fontSize: 16, color: C.ink3 });
      sl.addText("texere", { x: 1.0, y: 6.6, w: 4, h: 0.4, fontFace: FONT, fontSize: 12, bold: true, color: C.accent });
      return;
    }
    if (s.kicker) sl.addText(s.kicker.toUpperCase(), { x: 0.6, y: 0.35, w: 12, h: 0.3, fontFace: FONT, fontSize: 11, bold: true, color: C.ink3, charSpacing: 2 });
    sl.addText(s.title, { x: 0.6, y: 0.6, w: 12.1, h: 0.9, fontFace: FONT, fontSize: 24, bold: true, color: C.ink, valign: "top" });
    sl.addText(`${i + 1}`, { x: 12.3, y: 7.0, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 10, color: C.ink3, align: "right" });
    sl.addText("Prepared by Texere · example data", { x: 0.6, y: 7.0, w: 6, h: 0.3, fontFace: FONT, fontSize: 10, color: C.ink3 });
    if (s.type === "bullets") {
      sl.addText(s.bullets.map((b) => ({ text: b, options: { bullet: true, paraSpaceAfter: 14 } })), { x: 0.8, y: 1.8, w: 11.6, h: 4.8, fontFace: FONT, fontSize: 18, color: C.ink, valign: "top" });
    }
    if (s.type === "kpis") {
      s.kpis.forEach(([label, v, d], j) => {
        const x = 0.6 + (j % 3) * 4.1, y = 1.8 + Math.floor(j / 3) * 2.2;
        sl.addShape(p.ShapeType.roundRect, { x, y, w: 3.8, h: 1.9, fill: { color: "F4F5F8" }, line: { color: C.line }, rectRadius: 0.08 });
        sl.addText(label.toUpperCase(), { x: x + 0.25, y: y + 0.2, w: 3.3, h: 0.3, fontFace: FONT, fontSize: 11, bold: true, color: C.ink3 });
        sl.addText(v, { x: x + 0.25, y: y + 0.55, w: 3.3, h: 0.7, fontFace: FONT, fontSize: 30, color: C.ink });
        sl.addText(d + " vs year ago", { x: x + 0.25, y: y + 1.25, w: 3.3, h: 0.4, fontFace: FONT, fontSize: 13, color: d.startsWith("+") ? C.good : d.startsWith("−") ? C.bad : C.ink3 });
      });
    }
    if (s.type === "trend") {
      const labels = s.labels || s.months.map((m) => mShort(m) + " " + m.slice(2, 4));
      const data = s.series.map((se) => ({ name: se.name, labels, values: se.values.map((v) => (v == null ? null : Math.round(v))) }));
      sl.addChart(p.ChartType.line, data, { x: 0.6, y: 1.6, w: 12.1, h: 4.9, chartColors: [C.ink, C.accent, "A7ACB8"], lineSize: 2, lineDataSymbol: "none", showLegend: true, legendPos: "b", valAxisLabelFormatCode: "#,##0", catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, legendFontSize: 11, displayBlanksAs: "gap" });
    }
    if (s.type === "waterfall") {
      const items = [{ label: s.startLabel, v: s.start, total: true }, ...s.steps, { label: s.endLabel, v: s.end, total: true }];
      let run = s.start; const base = [], up = [], down = [], tot = [];
      for (const it of items) {
        if (it.total) { base.push(0); up.push(0); down.push(0); tot.push(Math.round(it.v)); continue; }
        const lo = Math.min(run, run + it.v);
        base.push(Math.round(lo)); tot.push(0);
        if (it.v >= 0) { up.push(Math.round(it.v)); down.push(0); } else { down.push(Math.round(-it.v)); up.push(0); }
        run += it.v;
      }
      const labels = items.map((it) => it.label);
      sl.addChart(p.ChartType.bar, [
        { name: "base", labels, values: base }, { name: "Total", labels, values: tot }, { name: "Increase", labels, values: up }, { name: "Decrease", labels, values: down },
      ], { x: 0.6, y: 1.6, w: 7.6, h: 5.0, barGrouping: "stacked", chartColors: ["FFFFFF", C.accent, C.good, C.bad], showLegend: false, valAxisLabelFormatCode: "#,##0", catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, barGapWidthPct: 40 });
      sl.addText((s.bullets || []).map((b) => ({ text: b, options: { bullet: true, paraSpaceAfter: 10 } })), { x: 8.5, y: 1.7, w: 4.3, h: 4.9, fontFace: FONT, fontSize: 14, color: C.ink, valign: "top" });
    }
    if (s.type === "table") {
      if (!s.rows.length) sl.addText(s.empty || "Nothing to show.", { x: 0.6, y: 2, w: 12, h: 0.6, fontFace: FONT, fontSize: 16, color: C.ink3 });
      else {
        const head = s.head.map((h) => ({ text: h, options: { bold: true, color: C.ink3, fontSize: 11, fill: { color: "F4F5F8" } } }));
        const body = s.rows.map((r) => r.cells.map((c, j) => ({ text: String(c), options: { fontSize: 12, color: j === 0 && r.tone ? (r.tone === "bad" ? C.bad : C.warn) : C.ink } })));
        sl.addTable([head, ...body], { x: 0.6, y: 1.7, w: 12.1, fontFace: FONT, border: { type: "solid", color: C.line, pt: 0.75 }, autoPage: false, valign: "middle", rowH: 0.42 });
      }
    }
    if (s.note) sl.addText(s.note, { x: 0.6, y: 6.6, w: 12, h: 0.35, fontFace: FONT, fontSize: 11, color: C.ink3, italic: true });
  });
  return p.write({ outputType: "blob" });
}
