// Words from data: driver stories, the VP note and presentation decks.
import { ALL_S, ALL_R, FC_MONTHS, HIST_MONTHS, COMPANY, TODAY, ROLES, skuById, retById, mLabel, shiftYM, weeksInMonth } from "../data/catalog.js";
import { PERIODS, compWeeks, decompose, decompSteps, topCells, driverNote, DECOMP_LABEL, kpis, units, shareOf, accuracy, monthUnits, periodLabel, competitorTable } from "./analytics.js";
import { getState, activeAt, NOW, PLAN, statusOf, capById, key } from "../store.js";
import { allSupply } from "./supply.js";
import { fK, fU, sp, sg, fMoney, mRange, fDate, lcFirst, pts } from "../ui/format.js";

const mapDriver = (d) => ({ promotion: "promotion", price: "price", distribution: "distribution", display: "display", supply: "supply", launch: "launch", competition: "competition" }[d] || "context");

export function impactUnits(a, act) {
  const without = act.filter((x) => x.id !== a.id && x.id !== a.supersedes), withA = [...without, a];
  let d = 0; for (const m of a.months) d += units(a.skus, a.retailers, weeksInMonth(m), withA) - units(a.skus, a.retailers, weeksInMonth(m), without);
  return d;
}

export function driverStory(dec, period, skus = ALL_S, rets = ALL_R) {
  const d = dec.B - dec.A, pct = dec.A ? (d / dec.A) * 100 : 0;
  const fc = period.startsWith("N");
  const headline = `${fc ? "Units are forecast to " + (d >= 0 ? "grow " : "fall ") : "Units " + (d >= 0 ? "grew " : "fell ")}${Math.abs(pct).toFixed(1)}% (${sg(d)})`;
  const bullets = [];
  const steps = decompSteps(dec).filter((s) => s.key !== "other").sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 4);
  for (const st of steps) {
    let why = "";
    if (fc) {
      const ctx = activeAt(NOW()).filter((a) => a.skus.some((s) => skus.includes(s)) && a.retailers.some((r) => rets.includes(r)) && mapDriver(a.driver) === st.key);
      if (ctx.length) why = ctx.slice(0, 2).map((a) => `${lcFirst(a.summary)} (${a.id})`).join("; ");
    }
    if (!why) {
      const tops = topCells(dec, st.key, 2).filter((t) => Math.abs(t.v) > Math.abs(st.v) * 0.2);
      if (tops.length) why = "mostly " + tops.map((t) => { const n = driverNote(st.key, t.sku, t.ret); return `${skuById(t.sku).short} at ${retById(t.ret).name}${n ? " (" + lcFirst(n) + ")" : ""}`; }).join(" and ");
    }
    bullets.push({ key: st.key, v: st.v, text: `${st.label}: ${sg(st.v)} units${why ? ", " + why : ""}.` });
  }
  return { headline, bullets, delta: d, pct };
}

export function vpNote() {
  const S = getState();
  const now = activeAt(NOW()), plan = activeAt(PLAN);
  const fcW = PERIODS.N52W.weeks;
  const tN = units(ALL_S, ALL_R, fcW, now), tP = units(ALL_S, ALL_R, fcW, plan);
  const k1 = kpis(ALL_S, ALL_R, PERIODS.L13W.weeks), k0 = kpis(ALL_S, ALL_R, compWeeks("L13W", "YA"));
  const sh1 = shareOf(ALL_S, ALL_R, PERIODS.L13W.weeks), sh0 = shareOf(ALL_S, ALL_R, compWeeks("L13W", "YA"));
  const wk = S.assumptions.filter((a) => a.status === "approved" && a.decidedAt >= "2026-11-06").sort((a, b) => Math.abs(impactUnits(b, now)) - Math.abs(impactUnits(a, now)));
  const pend = S.assumptions.filter((a) => a.status === "pending");
  const risks = allSupply().filter((x) => x.firstRisk);
  const dec = decompose(ALL_S, ALL_R, compWeeks("L13W", "YA"), PERIODS.L13W.weeks);
  const top = decompSteps(dec).filter((s) => s.key !== "other").sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0];
  const body = [
    `Last 13 weeks: ${fMoney(k1.dollars)} in sales, ${sp((k1.dollars / k0.dollars - 1) * 100)} vs a year ago, with dollar share ${pts((sh1 - sh0) * 100)} to ${(sh1 * 100).toFixed(1)}%. The biggest driver was ${DECOMP_LABEL[top.key].toLowerCase()} (${sg(top.v)} units).`,
    `The next-52-week forecast is ${fK(tN)} units, ${sp((tN / tP - 1) * 100)} vs the September consensus.`,
    wk.length ? `This week's biggest change: ${lcFirst(wk[0].summary)} (${sg(impactUnits(wk[0], now))} units, from ${capById(wk[0].capture)?.person}).` : "",
    risks.length ? `Supply is watching ${risks.length} SKU${risks.length === 1 ? "" : "s"}; ${skuById(risks[0].sku).short} drops below safety stock in the week of ${fDate(weekEndOf(risks[0].firstRisk.i))}.` : "No supply risks in the next 26 weeks.",
    pend.length ? `${pend.length} item${pend.length === 1 ? " is" : "s are"} still under review, worth ${sg(pend.reduce((t, a) => t + impactUnits(a, now), 0))} units if accepted.` : "",
  ].filter(Boolean).join(" ");
  return { subject: `${COMPANY} forecast update, week of ${fDate(TODAY)}`, body, bullets: wk.slice(0, 3).map((a) => `${a.summary} (${sg(impactUnits(a, now))} units)`) };
}
import { WEEKS } from "../data/catalog.js";
const weekEndOf = (i) => WEEKS[i].end;

export const DECKS = {
  mbr: { name: "Monthly business review", for: "VP Marketing", desc: "Results, what drove them, share, the forecast and decisions needed. 9 slides." },
  sop: { name: "S&OP pre-read", for: "Demand and supply planning", desc: "Changes since the last publish, inventory risks and open decisions. 4 slides." },
  retailer: { name: "Walmart account review", for: "Customer strategy", desc: "Walmart performance, drivers and the agreed plan for the next buyer meeting. 4 slides." },
};
function trend(skus, rets) {
  const now = activeAt(NOW()), plan = activeAt(PLAN);
  const months = [...HIST_MONTHS.slice(-12), ...FC_MONTHS];
  return { months, series: [
    { name: "Actual", values: months.map((m) => (HIST_MONTHS.includes(m) ? monthUnits(skus, rets, m, now) : null)) },
    { name: "Forecast", values: months.map((m, i) => (FC_MONTHS.includes(m) || i === 11 ? monthUnits(skus, rets, m, now) : null)) },
    { name: "Plan", values: months.map((m) => (FC_MONTHS.includes(m) ? monthUnits(skus, rets, m, plan) : null)) },
    { name: "Year ago", values: months.map((m) => monthUnits(skus, rets, shiftYM(m, -1), now) || null) },
  ] };
}
function kpiSlide(title, skus, rets, note) {
  const k1 = kpis(skus, rets, PERIODS.L13W.weeks), k0 = kpis(skus, rets, compWeeks("L13W", "YA"));
  const s1 = shareOf(skus, rets, PERIODS.L13W.weeks), s0 = shareOf(skus, rets, compWeeks("L13W", "YA"));
  return { type: "kpis", title, kicker: "Last 13 weeks vs year ago", kpis: [
    ["Dollar sales", fMoney(k1.dollars), sp((k1.dollars / k0.dollars - 1) * 100)], ["Units", fK(k1.units), sp((k1.units / k0.units - 1) * 100)],
    ["Dollar share", (s1 * 100).toFixed(1) + "%", pts((s1 - s0) * 100)], ["TDPs", k1.tdp.toFixed(0), sp((k1.tdp / k0.tdp - 1) * 100)],
    ["Avg price", "$" + k1.avgPrice.toFixed(2), sp((k1.avgPrice / k0.avgPrice - 1) * 100)], ["%ACV on promotion", k1.promoAcv.toFixed(1), pts(k1.promoAcv - k0.promoAcv)],
  ], note };
}
export function buildDeck(kind) {
  const S = getState();
  const now = activeAt(NOW()), plan = activeAt(PLAN);
  const N = PERIODS.N52W.weeks;
  if (kind === "retailer") {
    const r = ["WMT"], rn = "Walmart";
    const dec = decompose(ALL_S, r, compWeeks("L13W", "YA"), PERIODS.L13W.weeks), st = driverStory(dec, "L13W", ALL_S, r);
    const agreed = now.filter((a) => a.retailers.includes("WMT"));
    return [
      { type: "title", title: `${COMPANY} × ${rn}`, sub: `Account review prepared by Texere for ${ROLES.cs.person} · ${fDate(TODAY)}, 2026` },
      kpiSlide(`${rn}: ${st.headline.toLowerCase()} in the last 13 weeks`, ALL_S, r, "Source: NielsenIQ, Walmart, weekly (simulated)."),
      { type: "waterfall", title: `What drove ${rn} in the last 13 weeks`, start: dec.A, end: dec.B, steps: decompSteps(dec), startLabel: "Year ago", endLabel: "L13W", bullets: st.bullets.slice(0, 3).map((b) => b.text) },
      { type: "table", title: `What we've agreed with ${rn} for the year ahead`, head: ["ID", "Plan", "Months", "Units"], rows: agreed.map((a) => ({ cells: [a.id, a.summary, mRange(a.months), sg(impactUnits(a, now))] })), empty: "No agreed events yet." },
    ];
  }
  const decQ = decompose(ALL_S, ALL_R, compWeeks("L13W", "YA"), PERIODS.L13W.weeks), stQ = driverStory(decQ, "L13W");
  const decF = decompose(ALL_S, ALL_R, PERIODS.L52W.weeks, N, now), stF = driverStory(decF, "N52W");
  const tN = units(ALL_S, ALL_R, N, now), tP = units(ALL_S, ALL_R, N, plan);
  const pend = S.assumptions.filter((a) => a.status === "pending");
  const sup = allSupply();
  const risks = sup.filter((x) => x.firstRisk || x.excess);
  if (kind === "sop") {
    const changed = sup.filter((x) => Math.abs(x.d13) >= 1).sort((a, b) => Math.abs(b.d13) - Math.abs(a.d13));
    return [
      { type: "title", title: `${COMPANY} S&OP pre-read`, sub: `Demand review · ${fDate(TODAY)}, 2026 · prepared by Texere` },
      { type: "bullets", kicker: "Summary", title: `Forecast moved ${sg(tN - tP)} units (${sp((tN / tP - 1) * 100)}) vs the September consensus`, bullets: [stF.headline + " in the next 52 weeks vs the last 52.", ...stF.bullets.map((b) => b.text)].slice(0, 5) },
      { type: "table", title: `${changed.length} SKUs changed in the next 13 weeks since the last publish`, head: ["SKU", "Published 13 wk", "Change", "First risk", "Why"], rows: changed.map((x) => ({ cells: [skuById(x.sku).short, fK(x.pub13), sg(x.d13) + " (" + sp(x.pct13 * 100) + ")", x.firstRisk ? "w/e " + fDate(weekEndOf(x.firstRisk.i)) : x.excess ? "Excess" : "None", x.reasons.map((a) => a.id).join(", ") || "–"], tone: x.firstRisk ? "bad" : x.excess ? "warn" : "" })), empty: "No changes since the last publish." },
      { type: "table", title: `${pend.length} decision${pend.length === 1 ? "" : "s"} needed before we lock the forecast`, head: ["ID", "Pending item", "Months", "Units if accepted", "Raised by"], rows: pend.map((a) => ({ cells: [a.id, a.summary, mRange(a.months), sg(impactUnits(a, now)), capById(a.capture)?.person || ""] })), empty: "Nothing pending." },
    ];
  }
  const ct = competitorTable(ALL_S, ALL_R, compWeeks("L13W", "YA"), PERIODS.L13W.weeks).sort((a, b) => b.share - a.share);
  const acc = accuracy(ALL_S, ALL_R);
  const changes = S.assumptions.filter((a) => a.status === "approved" && key(a) > "2026-09-28").sort((a, b) => key(b).localeCompare(key(a)));
  const tr = trend(ALL_S, ALL_R);
  return [
    { type: "title", title: `${COMPANY} monthly business review`, sub: `October 2026 close · prepared by Texere for ${ROLES.lead.person}` },
    { type: "bullets", kicker: "Executive summary", title: `${stQ.headline} in the last 13 weeks; the forecast is ${sp((tN / tP - 1) * 100)} vs plan`, bullets: [stQ.bullets[0]?.text, stQ.bullets[1]?.text, `Next 52 weeks: ${fK(tN)} units. ${stF.bullets[0]?.text || ""}`, `${pend.length} decision${pend.length === 1 ? "" : "s"} pending and ${risks.length} SKU${risks.length === 1 ? "" : "s"} on supply watch (slide 9).`].filter(Boolean) },
    kpiSlide("Sales, share and the drivers behind them", ALL_S, ALL_R, "Source: NielsenIQ retail measurement, 4 retailers, weekly (simulated in this prototype)."),
    { type: "waterfall", title: "What drove the last 13 weeks vs a year ago", start: decQ.A, end: decQ.B, steps: decompSteps(decQ), startLabel: "Year ago", endLabel: "L13W", bullets: stQ.bullets.slice(0, 3).map((b) => b.text) },
    { type: "table", kicker: "Competition", title: "Dollar share in our segments, last 13 weeks", head: ["Brand", "Share", "vs YA", "Avg price", "Weeks on promo"], rows: ct.map((c) => ({ cells: [c.name, (c.share * 100).toFixed(1) + "%", pts((c.share - c.shareA) * 100), "$" + c.price.toFixed(2), (c.promo * 100).toFixed(0) + "%"] })) },
    { type: "trend", title: `Forecast: ${fK(tN)} units over the next 52 weeks`, ...tr, labels: tr.months.map((m) => mLabel(m)), note: `Backtest accuracy (last 13 weeks): ${(acc.withContext * 100).toFixed(0)}% with captured context vs ${(acc.noContext * 100).toFixed(0)}% from history alone.` },
    { type: "waterfall", title: "What drives the next 52 weeks vs the last 52", start: decF.A, end: decF.B, steps: decompSteps(decF), startLabel: "L52W", endLabel: "N52W", bullets: stF.bullets.slice(0, 3).map((b) => b.text) },
    { type: "table", title: `${changes.length} forecast changes this cycle, each traced to its source`, head: ["ID", "What changed", "Months", "Units", "Source"], rows: changes.slice(0, 8).map((a) => ({ cells: [a.id, a.summary, mRange(a.months), sg(impactUnits(a, now)), `${capById(a.capture)?.person}, ${fDate(a.decidedAt)}`] })), empty: "No changes yet this cycle." },
    { type: "table", title: "Decisions and risks", head: ["Item", "Detail", "When", "Units", "Owner"], rows: [
      ...pend.map((a) => ({ cells: ["Decide", a.summary, mRange(a.months), sg(impactUnits(a, now)), capById(a.capture)?.person || ""], tone: "warn" })),
      ...risks.map((x) => ({ cells: ["Supply", `${skuById(x.sku).short}: ${x.status.toLowerCase()}`, x.firstRisk ? "w/e " + fDate(weekEndOf(x.firstRisk.i)) : "w/e " + fDate(weekEndOf(x.excess.i)), sg(x.d13), ROLES.sp.person], tone: x.firstRisk ? "bad" : "" })),
    ], empty: "No open decisions or risks." },
  ];
}
