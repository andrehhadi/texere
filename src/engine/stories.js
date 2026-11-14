// Turns the data into words: driver stories, the VP note and presentation decks.
import { ALL_S, ALL_R, LY12, PY12, FC, HIST, BRAND, TODAY, ROLES, skuById, retById, DRIVERS, mLabel } from "../data/catalog.js";
import { decompose, topCells, driverNote, DECOMP_ORDER, DECOMP_LABEL, kpis, sumUnits, sumDollars, backtest } from "./model.js";
import { getState, activeAt, NOW, PLAN, statusOf, recent, supplyRows, capById, unitImpact, key } from "../store.js";
import { fK, fU, sp, sg, fMoney, mRange, skuNames, retNames, fDate, lcFirst, pts } from "../ui/format.js";

export const PERIODS = {
  ly: { label: "Last 12 months vs a year ago", a: PY12, b: LY12, aLabel: "Nov ’24 to Oct ’25", bLabel: "Nov ’25 to Oct ’26" },
  fc: { label: "Next 12 months (forecast) vs last 12 months", a: LY12, b: FC, aLabel: "Last 12 months", bLabel: "Next 12 months" },
  q: { label: "Latest quarter vs a year ago", a: PY12.slice(-3), b: LY12.slice(-3), aLabel: "Aug to Oct ’25", bLabel: "Aug to Oct ’26" },
};

export function driverSteps(dec) {
  return DECOMP_ORDER.map((k) => ({ key: k, label: DECOMP_LABEL[k], v: dec.total[k] })).filter((s) => Math.abs(s.v) >= 1);
}

export function driverStory(dec, period, skus = ALL_S, rets = ALL_R) {
  const S = getState();
  const d = dec.B - dec.A, pct = dec.A ? (d / dec.A) * 100 : 0;
  const what = period === "fc" ? "Units are forecast to " + (d >= 0 ? "grow " : "fall ") : "Units " + (d >= 0 ? "grew " : "fell ");
  const headline = `${what}${sp(Math.abs(pct)).replace(/^[+−]/, "")} (${sg(d)}) ${period === "fc" ? "in the next 12 months versus the last 12" : period === "q" ? "in the latest quarter versus a year ago" : "in the last 12 months versus a year ago"}.`;
  const bullets = [];
  const steps = driverSteps(dec).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 4);
  for (const st of steps) {
    let why = "";
    const tops = topCells(dec, st.key, 2).filter((t) => Math.abs(t.v) > Math.abs(st.v) * 0.2);
    if (period === "fc" && !["trend"].includes(st.key)) {
      const ctx = activeAt(NOW()).filter((a) => a.skus.some((s) => skus.includes(s)) && a.retailers.some((r) => rets.includes(r)) && mapDriver(a.driver) === st.key);
      if (ctx.length) why = "from " + ctx.slice(0, 2).map((a) => `${lcFirst(a.summary)} (${a.id})`).join("; ");
    }
    if (!why && tops.length) {
      why = "mostly " + tops.map((t) => { const n = driverNote(st.key, t.sku, t.ret); return `${skuById(t.sku).short} at ${retById(t.ret).name}${n ? " (" + lcFirst(n) + ")" : ""}`; }).join(" and ");
    }
    if (st.key === "trend" && !why) why = "underlying growth in velocity";
    bullets.push({ key: st.key, text: `${st.label} ${st.v >= 0 ? "added" : "took away"} ${fK(Math.abs(st.v))} units${why ? ", " + why : ""}.` });
  }
  return { headline, bullets, delta: d, pct };
}
const mapDriver = (drv) => ({ promotion: "promotion", price: "price", distribution: "distribution", display: "display", supply: "supply", launch: "launch", competition: "competition" }[drv] || "other");

export function vpNote() {
  const S = getState();
  const now = activeAt(NOW()), plan = activeAt(PLAN);
  const tN = sumUnits(ALL_S, ALL_R, FC, now), tP = sumUnits(ALL_S, ALL_R, FC, plan), tLY = sumUnits(ALL_S, ALL_R, LY12, now);
  const wk = recent(7).filter((a) => ["approved", "pending"].includes(statusOf(a)));
  const appr = wk.filter((a) => a.status === "approved").sort((a, b) => Math.abs(unitImpact(b, now)) - Math.abs(unitImpact(a, now)));
  const pend = S.assumptions.filter((a) => a.status === "pending");
  const risks = supplyRows().filter((r) => r.risk);
  const decLY = decompose(ALL_S, ALL_R, PY12, LY12, now);
  const top = driverSteps(decLY).sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0];
  const sentences = [
    `Next-12-month forecast is ${fK(tN)} units, ${sp(((tN / tP) - 1) * 100)} versus the September consensus and ${sp(((tN / tLY) - 1) * 100)} versus the last 12 months of actuals.`,
    appr.length ? `This week's biggest change: ${lcFirst(appr[0].summary)} (${sg(unitImpact(appr[0], now))} units, from ${capById(appr[0].capture)?.team.toLowerCase() || "the team"}).` : `No new changes were accepted this week.`,
    `Over the last 12 months, ${DECOMP_LABEL[top.key].toLowerCase()} was the biggest driver of performance (${sg(top.v)} units).`,
    risks.length ? `Supply has ${risks.length} SKU-month${risks.length === 1 ? "" : "s"} moving 10% or more since the last publish; the largest is ${skuById(risks[0].sku).short} in ${mLabel(risks[0].m)} (${sg(risks[0].diff)}).` : `No supply risks above 10% since the last publish.`,
    pend.length ? `${pend.length} item${pend.length === 1 ? " is" : "s are"} still under review, worth ${sg(pend.reduce((t, a) => t + unitImpact(a, now), 0))} units if accepted.` : "",
  ].filter(Boolean);
  return { subject: `${BRAND} forecast update, week of ${fDate(TODAY)}`, body: sentences.join(" "), bullets: appr.slice(0, 3).map((a) => `${a.summary} (${sg(unitImpact(a, now))} units)`) };
}

// ---- Decks ----
export const DECKS = {
  mbr: { name: "Monthly business review", for: "Marketing leadership", desc: "Performance, what drove it, the forecast and the decisions needed. 8 slides." },
  sop: { name: "S&OP pre-read", for: "Demand and supply planning", desc: "What changed since the last cycle, supply risks and open decisions. 4 slides." },
  retailer: { name: "Walmart account review", for: "Customer strategy", desc: "Walmart performance and drivers for the next buyer meeting. 4 slides." },
};

function trendSeries(skus, rets) {
  const now = activeAt(NOW()), plan = activeAt(PLAN);
  const months = [...LY12, ...FC];
  return {
    months,
    series: [
      { name: "Actual", values: months.map((m) => (HIST.includes(m) ? sumUnits(skus, rets, [m], now) : null)) },
      { name: "Forecast", values: months.map((m, i) => (FC.includes(m) || i === LY12.length - 1 ? sumUnits(skus, rets, [m], now) : null)) },
      { name: "Year ago", values: months.map((m) => sumUnits(skus, rets, [(+m.slice(0, 4) - 1) + m.slice(4)], now) || null) },
    ],
  };
}

export function buildDeck(kind) {
  const S = getState();
  const now = activeAt(NOW()), plan = activeAt(PLAN);
  if (kind === "retailer") return retailerDeck("WMT");
  const decLY = decompose(ALL_S, ALL_R, PY12, LY12, now), decFC = decompose(ALL_S, ALL_R, LY12, FC, now);
  const stLY = driverStory(decLY, "ly"), stFC = driverStory(decFC, "fc");
  const k1 = kpis(ALL_S, ALL_R, LY12), k0 = kpis(ALL_S, ALL_R, PY12);
  const tN = sumUnits(ALL_S, ALL_R, FC, now), tP = sumUnits(ALL_S, ALL_R, FC, plan);
  const changes = S.assumptions.filter((a) => a.status === "approved" && key(a) > "2026-09-28").sort((a, b) => key(b).localeCompare(key(a)));
  const pend = S.assumptions.filter((a) => a.status === "pending");
  const risks = supplyRows().filter((r) => r.risk);
  const bt = backtest(ALL_S, ALL_R);
  const change = (a) => ({ cells: [a.id, a.summary, mRange(a.months), sg(unitImpact(a, now)), `${capById(a.capture)?.person || ""}, ${fDate(a.decidedAt || a.createdAt)}`] });
  if (kind === "sop") {
    const rows = supplyRows();
    return [
      { type: "title", title: `${BRAND} S&OP pre-read`, sub: `Demand review · ${fDate(TODAY)}, 2026 · prepared by Texere` },
      { type: "bullets", title: `Forecast moved ${sg(tN - tP)} units (${sp((tN / tP - 1) * 100)}) since the September consensus`, bullets: [stFC.headline, ...stFC.bullets.map((b) => b.text)].slice(0, 5) },
      { type: "table", title: `${rows.length} SKU-months changed since the last publish on ${fDate(S.lastSync.slice(0, 10))}`, head: ["SKU", "Month", "Published", "Now", "Change", "Why"], rows: rows.slice(0, 8).map((r) => ({ cells: [skuById(r.sku).short, mLabel(r.m), fU(r.sync), fU(r.now), sg(r.diff), r.reasons.map((a) => a.id).join(", ") || "Earlier change"], tone: r.risk ? (r.diff > 0 ? "warn" : "bad") : "" })), empty: "No changes since the last publish." },
      { type: "table", title: `${pend.length} decision${pend.length === 1 ? "" : "s"} needed before we lock the forecast`, head: ["ID", "Pending item", "Months", "Units if accepted", "Raised by"], rows: pend.map((a) => ({ cells: [a.id, a.summary, mRange(a.months), sg(unitImpact(a, now)), capById(a.capture)?.person || ""] })), empty: "Nothing pending." },
    ];
  }
  return [
    { type: "title", title: `${BRAND} monthly business review`, sub: `${mLabel(LY12[LY12.length - 1])} close · prepared by Texere for ${ROLES.lead.person}` },
    { type: "bullets", title: stLY.headline.replace(/\.$/, ""), kicker: "Executive summary", bullets: [
      `${stLY.bullets[0]?.text || ""}`,
      `Next 12 months: ${fK(tN)} units, ${sp((tN / tP - 1) * 100)} vs the September consensus. ${stFC.bullets[0]?.text || ""}`,
      risks.length ? `${risks.length} supply risk${risks.length === 1 ? "" : "s"} flagged; ${pend.length} decision${pend.length === 1 ? "" : "s"} pending (slide 8).` : `${pend.length} decision${pend.length === 1 ? "" : "s"} pending (slide 8).`,
    ] },
    { type: "kpis", title: "Last 12 months vs a year ago", kpis: [
      ["Units", fK(k1.units), sp((k1.units / k0.units - 1) * 100)], ["Dollar sales", fMoney(k1.dollars), sp((k1.dollars / k0.dollars - 1) * 100)],
      ["Avg %ACV distribution", k1.acv.toFixed(1), pts(k1.acv - k0.acv)], ["Avg price", "$" + k1.avgPrice.toFixed(2), sp((k1.avgPrice / k0.avgPrice - 1) * 100)],
      ["%ACV on promotion", k1.promoAcv.toFixed(1), pts(k1.promoAcv - k0.promoAcv)], ["%ACV on display", k1.dispAcv.toFixed(1), pts(k1.dispAcv - k0.dispAcv)],
    ], note: "Source: NielsenIQ retail measurement, by retailer (simulated in this prototype)." },
    { type: "trend", title: `Forecast ${fK(tN)} units for the next 12 months`, ...trendSeries(ALL_S, ALL_R), note: `Forecast accuracy in backtest: ${(bt.withContext * 100).toFixed(0)}% with captured context vs ${(bt.noContext * 100).toFixed(0)}% from the trade calendar alone.` },
    { type: "waterfall", title: "What drove the last 12 months", start: decLY.A, end: decLY.B, steps: driverSteps(decLY), startLabel: "Year ago", endLabel: "Last 12 mo", bullets: stLY.bullets.slice(0, 3).map((b) => b.text) },
    { type: "waterfall", title: "What drives the next 12 months", start: decFC.A, end: decFC.B, steps: driverSteps(decFC), startLabel: "Last 12 mo", endLabel: "Next 12 mo", bullets: stFC.bullets.slice(0, 3).map((b) => b.text) },
    { type: "table", title: `${changes.length} forecast changes this cycle, each traced to its source`, head: ["ID", "What changed", "Months", "Units", "Source"], rows: changes.slice(0, 7).map(change), empty: "No changes yet this cycle." },
    { type: "table", title: "Decisions and risks", head: ["Item", "Detail", "Months", "Units", "Owner"], rows: [
      ...pend.map((a) => ({ cells: ["Decide", a.summary, mRange(a.months), sg(unitImpact(a, now)), capById(a.capture)?.person || ""], tone: "warn" })),
      ...risks.slice(0, 3).map((r) => ({ cells: ["Supply risk", `${skuById(r.sku).short}: ${r.risk.toLowerCase()}`, mLabel(r.m), sg(r.diff), ROLES.sp.person], tone: "bad" })),
    ], empty: "No open decisions or risks." },
  ];
}

function retailerDeck(ret) {
  const now = activeAt(NOW());
  const rn = retById(ret).name;
  const decLY = decompose(ALL_S, [ret], PY12, LY12, now), decFC = decompose(ALL_S, [ret], LY12, FC, now);
  const st = driverStory(decLY, "ly", ALL_S, [ret]), stF = driverStory(decFC, "fc", ALL_S, [ret]);
  const k1 = kpis(ALL_S, [ret], LY12), k0 = kpis(ALL_S, [ret], PY12);
  const upcoming = activeAt(NOW()).filter((a) => a.retailers.includes(ret));
  return [
    { type: "title", title: `${BRAND} × ${rn} account review`, sub: `Prepared by Texere for ${ROLES.cs.person}, ${fDate(TODAY)}, 2026` },
    { type: "kpis", title: `${rn}: ${st.headline.replace(/\.$/, "").toLowerCase()}`, kpis: [
      ["Units", fK(k1.units), sp((k1.units / k0.units - 1) * 100)], ["Dollar sales", fMoney(k1.dollars), sp((k1.dollars / k0.dollars - 1) * 100)],
      ["%ACV distribution", k1.acv.toFixed(1), pts(k1.acv - k0.acv)], ["Avg price", "$" + k1.avgPrice.toFixed(2), sp((k1.avgPrice / k0.avgPrice - 1) * 100)],
      ["%ACV on promotion", k1.promoAcv.toFixed(1), pts(k1.promoAcv - k0.promoAcv)], ["%ACV on display", k1.dispAcv.toFixed(1), pts(k1.dispAcv - k0.dispAcv)],
    ], note: "Source: NielsenIQ retail measurement, Walmart (simulated in this prototype)." },
    { type: "waterfall", title: `What drove ${rn} in the last 12 months`, start: decLY.A, end: decLY.B, steps: driverSteps(decLY), startLabel: "Year ago", endLabel: "Last 12 mo", bullets: st.bullets.slice(0, 3).map((b) => b.text) },
    { type: "table", title: `What we've agreed with ${rn} for the next 12 months`, head: ["ID", "Plan", "Months", "Units"], rows: upcoming.map((a) => ({ cells: [a.id, a.summary, mRange(a.months), sg(unitImpact(a, now))] })), empty: "No agreed events yet.", note: stF.headline },
  ];
}
