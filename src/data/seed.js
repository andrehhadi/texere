// Example working state for the demo: conversations already captured this cycle,
// the assumptions they produced, discussion threads and market signals. All fictional.
import { ALL_R, fcRange } from "./catalog.js";

export function seedState() {
  const A = [
    { id: "A1", summary: "Walmart endcap in all stores in March for both gel sizes", skus: ["GEL17", "GEL34"], retailers: ["WMT"], months: ["2027-03"], driver: "display", impact: 20, confidence: "confirmed", status: "approved", createdAt: "2026-10-03", decidedAt: "2026-10-03", seq: 1, capture: "C1",
      quote: "We can give you the March endcap in all stores, both gel sizes.", rationale: "Last full-chain endcap (March 2025) lifted volume about 45%; this one has less secondary placement, so 20%." },
    { id: "A2", summary: "List price up 6% from January 1 on both gel moisturizers", skus: ["GEL17", "GEL34"], retailers: ALL_R, months: fcRange("2027-01", "2027-10"), driver: "price", impact: -8, confidence: "confirmed", status: "approved", createdAt: "2026-10-09", decidedAt: "2026-10-09", seq: 2, capture: "C2",
      quote: "The committee approved plus six percent on the gels, effective January first, and all four accounts have accepted.", rationale: "Measured price elasticity on this line is about -1.4, so +6% price costs about 8% of volume." },
    { id: "A3", summary: "Pump component shortage cuts December fill rate on the 1.7 oz gel to about 85%", skus: ["GEL17"], retailers: ALL_R, months: ["2026-12"], driver: "supply", impact: -12, confidence: "confirmed", status: "approved", createdAt: "2026-10-12", decidedAt: "2026-10-12", seq: 3, capture: "C3",
      quote: "Realistically we ship 85 percent of demand on the 1.7 in December.", rationale: "Volume follows fill rate: about 12% of orders go unfilled." },
    { id: "A4", summary: "Walmart cut the March endcap to about 60% of stores; the rest get a side-cap", skus: ["GEL17", "GEL34"], retailers: ["WMT"], months: ["2027-03"], driver: "display", impact: 12, confidence: "confirmed", status: "approved", createdAt: "2026-10-14", decidedAt: "2026-10-14", seq: 4, capture: "C4", supersedes: "A1",
      quote: "We're keeping the March endcap, but it'll only be in roughly sixty percent of doors. Remaining stores get a side-cap.", rationale: "Partial endcap plus side-caps: roughly 60% of the full-chain lift." },
    { id: "A5", summary: "Competitor Clearwell launches a cheaper gel moisturizer at Walmart in February", skus: ["GEL17", "GEL34"], retailers: ["WMT"], months: fcRange("2027-02", "2027-04"), driver: "competition", impact: -5, confidence: "likely", status: "pending", createdAt: "2026-10-15", capture: "C5",
      quote: "Clearwell's HydraGel will roll into Walmart in February at $9.97.", rationale: "A lower-priced direct competitor usually takes 3 to 8% in its first quarter." },
    { id: "A6", summary: "Night Repair Serum launch slips from February to April", skus: ["SER10"], retailers: ALL_R, months: ["2027-02", "2027-03"], driver: "launch", impact: -100, confidence: "confirmed", status: "approved", createdAt: "2026-10-20", decidedAt: "2026-10-20", seq: 5, capture: "C6",
      quote: "Packaging artwork failed the second proof, so first ship is now the first week of April.", rationale: "No shipments in the slipped months." },
    { id: "A7", summary: "Target's March skincare reset may cut the foaming cleanser to one facing", skus: ["CLN65"], retailers: ["TGT"], months: fcRange("2027-03", "2027-10"), driver: "distribution", impact: -15, confidence: "mentioned", status: "pending", createdAt: "2026-10-22", capture: "C7",
      quote: "They're tightening the face wash set in March, so the cleanser might lose a facing.", rationale: "Losing one of two facings typically costs 10 to 20% of volume." },
    { id: "A8", summary: "CVS runs a buy-one-get-one 40% off on the SPF 30 lotion in May", skus: ["SPF30"], retailers: ["CVS"], months: ["2027-05"], driver: "promotion", impact: 50, confidence: "confirmed", status: "approved", createdAt: "2026-10-28", decidedAt: "2026-10-28", seq: 6, capture: "C8",
      quote: "CVS confirmed the BOGO 40 on SPF 30 for the May sun care event.", rationale: "Last May's CVS event lifted volume about 48% in the Nielsen data." },
    { id: "A9", summary: "Walgreens plans to drop the 3.4 oz gel from about 30% of stores from April", skus: ["GEL34"], retailers: ["WAG"], months: fcRange("2027-04", "2027-10"), driver: "distribution", impact: -28, confidence: "likely", status: "pending", createdAt: "2026-11-04", capture: "C9",
      quote: "The 3.4 is on the cut list for the smaller-format stores, about 30 percent of the chain, at the April review.", rationale: "At a distribution elasticity of 0.9, losing 30% of stores costs about 28% of volume." },
    { id: "A10", summary: "Target confirmed a December temporary price reduction on the 1.7 oz gel", skus: ["GEL17"], retailers: ["TGT"], months: ["2026-12"], driver: "promotion", impact: 32, confidence: "confirmed", status: "approved", createdAt: "2026-11-10", decidedAt: "2026-11-10", seq: 7, capture: "C10",
      quote: "December TPR on the small gel is approved, 20 percent off.", rationale: "Last December's 20%-off TPR at Target lifted volume about 32%." },
  ];
  const C = [
    { id: "C1", kind: "call", title: "Walmart buyer call", team: "Customer strategy", person: "Dana Ortiz", date: "2026-10-03", status: "shared", auto: "Zoom", text: "Walmart buyer: We can give you the March endcap in all stores, both gel sizes.\nDana: That's great news, thank you." },
    { id: "C2", kind: "call", title: "Finance price review", team: "Finance", person: "Marcus Lee", date: "2026-10-09", status: "shared", auto: "Teams", text: "Marcus: The committee approved plus six percent on the gels, effective January first, and all four accounts have accepted." },
    { id: "C3", kind: "call", title: "Supply planning sync", team: "Supply planning", person: "Ken Watanabe", date: "2026-10-12", status: "shared", auto: "Teams", text: "Ken: Realistically we ship 85 percent of demand on the 1.7 in December. The pump component is the constraint." },
    { id: "C4", kind: "call", title: "Walmart buyer call", team: "Customer strategy", person: "Dana Ortiz", date: "2026-10-14", status: "shared", auto: "Zoom", text: "Walmart buyer: We're keeping the March endcap, but it'll only be in roughly sixty percent of doors. Remaining stores get a side-cap.\nDana: Understood. Is the side-cap for both gel sizes?\nWalmart buyer: Yes, both sizes, same as the endcap." },
    { id: "C5", kind: "web", title: "Trade press: Clearwell HydraGel launch", team: "Market signal", person: "Texere web monitor", date: "2026-10-15", status: "shared", text: "Clearwell's HydraGel will roll into Walmart in February at $9.97, undercutting leading gel moisturizers." },
    { id: "C6", kind: "call", title: "Innovation pipeline review", team: "Innovation", person: "Sofia Ramos", date: "2026-10-20", status: "shared", auto: "Zoom", text: "Sofia: Packaging artwork failed the second proof, so first ship is now the first week of April." },
    { id: "C7", kind: "call", title: "Target buyer call", team: "Customer strategy", person: "Dana Ortiz", date: "2026-10-22", status: "shared", auto: "Zoom", text: "Target buyer: They're tightening the face wash set in March, so the cleanser might lose a facing. Nothing final yet." },
    { id: "C8", kind: "email", title: "CVS promo calendar", team: "Sales", person: "Jordan Kim", date: "2026-10-28", status: "shared", auto: "Email", text: "CVS confirmed the BOGO 40 on SPF 30 for the May sun care event." },
    { id: "C9", kind: "call", title: "Walgreens buyer call", team: "Customer strategy", person: "Dana Ortiz", date: "2026-11-04", status: "shared", auto: "Zoom", text: "Walgreens buyer: The 3.4 is on the cut list for the smaller-format stores, about 30 percent of the chain, at the April review.\nDana: Is the 1.7 affected too?\nWalgreens buyer: No, the 1.7 stays everywhere." },
    { id: "C10", kind: "slack", title: "Message in #lumen-target", team: "Customer strategy", person: "Dana Ortiz", date: "2026-11-10", status: "shared", auto: "Slack", text: "Dana Ortiz: December TPR on the small gel is approved, 20 percent off. Heads up for supply." },
    { id: "C11", kind: "call", title: "Target buyer call", team: "Customer strategy", person: "Dana Ortiz", date: "2026-11-12", status: "new", auto: "Zoom",
      text: "Dana (Lumen): Thanks for making time. Quick check on the holiday plan.\nPriya (Target buyer): Sure. The December TPR on the small gel moisturizer is locked, 20% off, all stores.\nDana: Great. And the March skincare reset?\nPriya: That's confirmed now. The foaming cleanser goes from two facings to one in every store, starting with the March reset.\nDana: Understood. Anything on sun care?\nPriya: Yes, good news there. We're putting your SPF 30 lotion on the summer endcap, June and July, in roughly half the chain.\nDana: That's huge. We'll make sure supply is ready.\nPriya: Also, unrelated, our holiday party is on the 18th if your team is around.",
      example: [
        { summary: "Target confirmed the March reset: the foaming cleanser drops to one facing in every store", skus: ["CLN65"], retailers: ["TGT"], months: fcRange("2027-03", "2027-10"), driver: "distribution", impact: -18, confidence: "confirmed", quote: "The foaming cleanser goes from two facings to one in every store, starting with the March reset.", rationale: "Halving shelf facings typically costs 15 to 20% of volume.", supersedes: "A7" },
        { summary: "Target puts the SPF 30 lotion on the summer endcap in June and July, about half the chain", skus: ["SPF30"], retailers: ["TGT"], months: ["2027-06", "2027-07"], driver: "display", impact: 22, confidence: "confirmed", quote: "We're putting your SPF 30 lotion on the summer endcap, June and July, in roughly half the chain.", rationale: "Last summer's half-chain display at Target lifted volume about 22%.", supersedes: null },
      ] },
    { id: "C12", kind: "call", title: "Finance pricing sync", team: "Finance", person: "Marcus Lee", date: "2026-11-13", status: "new", auto: "Teams",
      text: "Marcus (Finance): Two updates from the pricing committee. First, the SPF price increase is now effective April 1, not January.\nLena (Brand): OK. Was that in the forecast already?\nMarcus: No, it wasn't loaded anywhere yet. It's plus 7% on the SPF 30 lotion, all retailers, from April.\nLena: Got it. And the cleanser?\nMarcus: Walmart accepted funding for an April rollback on the foaming cleanser. About 15% off for the whole month.\nLena: Nice, that should give us a decent lift.",
      example: [
        { summary: "SPF 30 lotion list price up 7% at all retailers from April 1", skus: ["SPF30"], retailers: ALL_R, months: fcRange("2027-04", "2027-10"), driver: "price", impact: -9, confidence: "confirmed", quote: "It's plus 7% on the SPF 30 lotion, all retailers, from April.", rationale: "At a price elasticity of about -1.4, +7% price costs about 9% of volume.", supersedes: null },
        { summary: "Walmart April rollback on the foaming cleanser, about 15% off", skus: ["CLN65"], retailers: ["WMT"], months: ["2027-04"], driver: "promotion", impact: 22, confidence: "confirmed", quote: "Walmart accepted funding for an April rollback on the foaming cleanser. About 15% off for the whole month.", rationale: "The April 2025 rollback at the same depth lifted volume about 22%.", supersedes: null },
      ] },
    { id: "C13", kind: "slack", title: "Message in #lumen-supply", team: "Supply planning", person: "Ken Watanabe", date: "2026-11-13", status: "new", auto: "Slack",
      text: "Ken Watanabe (Supply planning), 9:41 AM\nUpdate on the pump shortage for the 1.7 oz gel: second supplier qualified yesterday. We now expect fill rate around 95% in December instead of 85%. Should be fully back to normal by January.",
      example: [
        { summary: "Second pump supplier qualified: December fill rate on the 1.7 oz gel improves to about 95%", skus: ["GEL17"], retailers: ALL_R, months: ["2026-12"], driver: "supply", impact: -5, confidence: "confirmed", quote: "We now expect fill rate around 95% in December instead of 85%.", rationale: "About 5% of December orders still go unfilled.", supersedes: "A3" },
      ] },
  ];
  const threads = {
    A5: { status: "resolved", messages: [
      { by: "bm", name: "Lena Park", at: "2026-10-16 09:12", text: "Is HydraGel going into every Walmart store, or a test? That changes how big this is." },
      { by: "cs", name: "Dana Ortiz", at: "2026-10-16 11:40", text: "The buyer said a full-chain rollout, but on the bottom shelf. I'd keep the impact small for now." },
    ] },
    A9: { status: "open", waitingOn: "Dana Ortiz", messages: [
      { by: "bm", name: "Lena Park", at: "2026-11-05 10:02", text: "Dana, is the Walgreens cut final, or still a proposal for the April review? I don't want to take 28% out of the 3.4 oz if they might reverse it." },
    ] },
  };
  const signals = [
    { id: "S1", date: "2026-10-15", source: "Retail trade press", title: "Clearwell launches HydraGel at Walmart in February at $9.97", body: "Clearwell's HydraGel will roll into Walmart in February at $9.97, undercutting leading gel moisturizers.", skus: ["GEL17", "GEL34"], retailers: ["WMT"], added: "A5" },
    { id: "S2", date: "2026-11-10", source: "Retailer price scan", title: "Bramble Labs cuts its barrier cream price 15% at Target", body: "Bramble Labs reduced its 1.7 oz barrier cream from $14.99 to $12.79 at Target, effective this week, with no end date posted.", skus: ["GEL17"], retailers: ["TGT"], added: null,
      suggest: { summary: "Bramble Labs cut its barrier cream price 15% at Target", skus: ["GEL17"], retailers: ["TGT"], months: fcRange("2026-12", "2027-03"), driver: "competition", impact: -3, confidence: "likely", rationale: "An adjacent product's price cut usually takes 2 to 4%." } },
    { id: "S3", date: "2026-11-08", source: "Search and social trends", title: "Searches for “gel cream” up about 40% year over year", body: "Category interest in lightweight gel-cream textures keeps rising, led by short-form video reviews.", skus: ["GEL17", "GEL34"], retailers: ALL_R, added: null,
      suggest: { summary: "Rising interest in gel textures lifts the gel moisturizers in spring", skus: ["GEL17", "GEL34"], retailers: ALL_R, months: fcRange("2027-03", "2027-06"), driver: "other", impact: 3, confidence: "mentioned", rationale: "Category trends this size usually add a few points of growth." } },
  ];
  return {
    v: 3, role: "bm", seq: 7, nextA: 11, nextC: 14, assumptions: A, captures: C, threads, signals,
    lastSync: "2026-11-01#999", syncLog: [{ at: "2026-11-01", by: "Demand planning", note: "Monthly S&OP forecast published to supply", cells: 240 }], acks: {},
    engine: "texere", nielsenSource: "simulated", nielsenFile: null,
    ui: { sku: "GEL17", ret: "ALL", month: "2027-03", cap: "C11", fcGroup: "sku", fcPending: false, fcSku: "ALL", reviewFilter: "all", repSku: "ALL", repRet: "ALL", repPeriod: "ly", deck: "mbr" },
  };
}
