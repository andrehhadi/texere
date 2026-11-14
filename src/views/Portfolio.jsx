import React from "react";
import { useStore, update, activeAt, NOW, PLAN } from "../store.js";
import { SKUS, RETAILERS, FC, LY12, mLabel } from "../data/catalog.js";
import { sumUnits } from "../engine/model.js";
import { Head } from "../ui/common.jsx";
import { Spark } from "../ui/charts.jsx";
import { fK, sp, dcls } from "../ui/format.js";
import { go } from "../nav.js";

export default function Portfolio() {
  const S = useStore();
  const now = activeAt(NOW()), plan = activeAt(PLAN);
  const open = (sku, ret) => { update((s) => { s.ui.sku = sku; s.ui.ret = ret; }); go("timeline"); };
  const rows = SKUS.map((s) => {
    const cells = RETAILERS.map((r) => ({ r, n: sumUnits([s.id], [r.id], FC, now), ly: sumUnits([s.id], [r.id], LY12, now), p: sumUnits([s.id], [r.id], FC, plan) }));
    const t = (k) => cells.reduce((a, c) => a + c[k], 0);
    return { s, cells, n: t("n"), ly: t("ly"), p: t("p"), series: [...LY12, ...FC].map((m) => sumUnits([s.id], RETAILERS.map((r) => r.id), [m], now)), changes: S.assumptions.filter((a) => a.skus.includes(s.id) && a.status !== "rejected").length };
  });
  return (
    <>
      <Head title="Portfolio" sub="Next 12 months of forecast for every SKU and retailer, against the last 12 months of actuals and the September consensus. Select a row or cell to open its timeline." />
      <div className="tbl-wrap"><table>
        <thead><tr><th className="sticky">SKU</th><th>Last 12 + next 12 months</th>{RETAILERS.map((r) => <th key={r.id} className="n">{r.name}</th>)}<th className="n">Next 12 mo</th><th className="n">vs last 12</th><th className="n">vs Sep plan</th><th className="n">Assumptions</th></tr></thead>
        <tbody>{rows.map((x) => (
          <tr key={x.s.id} className="click" tabIndex={0} onClick={() => open(x.s.id, "ALL")} onKeyDown={(e) => e.key === "Enter" && open(x.s.id, "ALL")}>
            <td className="sticky" style={{ minWidth: 200 }}><b>{x.s.short}</b><div className="small muted mono">{x.s.code}{x.s.launch ? " · launches " + mLabel(x.s.launch) : ""}</div></td>
            <td><Spark values={x.series} /></td>
            {x.cells.map((c) => (
              <td key={c.r.id} className="n" onClick={(e) => { e.stopPropagation(); open(x.s.id, c.r.id); }}>{fK(c.n)}<div className={"small " + dcls(c.n - c.ly)}>{c.ly ? sp((c.n / c.ly - 1) * 100) : c.n ? "new" : "–"}</div></td>
            ))}
            <td className="n"><b>{fK(x.n)}</b></td><td className={"n " + dcls(x.n - x.ly)}>{x.ly ? sp((x.n / x.ly - 1) * 100) : "new"}</td><td className={"n " + dcls(x.n - x.p)}>{x.p ? sp((x.n / x.p - 1) * 100) : "–"}</td><td className="n">{x.changes}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <p className="small muted">Retailer cells show the next 12 months and the change versus the last 12 months of NielsenIQ actuals.</p>
    </>
  );
}
