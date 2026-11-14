// Example working state: conversations captured this cycle, the assumptions they produced
// (with their change history), discussion threads and market signals. All fictional.
import { ALL_R, fcRange } from "./catalog.js";

const H = (at, by, action, note, extra = {}) => ({ at, by, action, note, ...extra });

export function seedState() {
  const A = [
    { id: "A1", summary: "Walmart gives both Hydra Gel sizes an endcap in all stores in March", skus: ["GEL17", "GEL34"], retailers: ["WMT"], months: ["2027-03"], driver: "display", impact: 20, confidence: "confirmed", status: "approved", createdAt: "2026-10-03", decidedAt: "2026-10-03", seq: 1, capture: "C1",
      quote: "We can give you the March endcap in all stores, both gel sizes.", rationale: "The March 2025 full-chain endcap lifted volume about 45%; this one has less secondary placement, so 20%.",
      history: [H("2026-10-03 14:20", "Dana Ortiz", "created", "Captured from the Walmart buyer call"), H("2026-10-03 16:05", "Lena Park", "approved", "Matches what Walmart told us last spring.")] },
    { id: "A2", summary: "List price up 6% from January 1 on both Hydra Gel sizes", skus: ["GEL17", "GEL34"], retailers: ALL_R, months: fcRange("2027-01", "2027-10"), driver: "price", impact: -8, confidence: "confirmed", status: "approved", createdAt: "2026-10-09", decidedAt: "2026-10-09", seq: 2, capture: "C2",
      quote: "The committee approved plus six percent on the gels, effective January first, and all four accounts have accepted.", rationale: "Measured price elasticity on this line is about -1.4, so +6% price costs about 8% of volume.",
      history: [H("2026-10-09 10:40", "Marcus Lee", "created", "Captured from the finance price review", { from: null, to: -6 }), H("2026-10-09 11:15", "Lena Park", "edited", "Used our measured elasticity (-1.4) instead of 1:1.", { field: "impact", from: -6, to: -8 }), H("2026-10-09 11:16", "Lena Park", "approved", "")] },
    { id: "A3", summary: "Pump component shortage cuts December fill rate on Hydra Gel 1.7 oz to about 85%", skus: ["GEL17"], retailers: ALL_R, months: ["2026-12"], driver: "supply", impact: -12, confidence: "confirmed", status: "approved", createdAt: "2026-10-12", decidedAt: "2026-10-12", seq: 3, capture: "C3",
      quote: "Realistically we ship 85 percent of demand on the 1.7 in December.", rationale: "Volume follows fill rate: about 12% of orders go unfilled.",
      history: [H("2026-10-12 09:05", "Ken Watanabe", "created", "Captured from the supply planning sync", { from: null, to: -15 }), H("2026-10-12 15:30", "Ken Watanabe", "edited", "Supplier confirmed partial December delivery, so 85% fill instead of 80%.", { field: "impact", from: -15, to: -12 }), H("2026-10-12 16:00", "Lena Park", "approved", "")] },
    { id: "A4", summary: "Walmart cut the March endcap to about 60% of stores; the rest get a side-cap", skus: ["GEL17", "GEL34"], retailers: ["WMT"], months: ["2027-03"], driver: "display", impact: 12, confidence: "confirmed", status: "approved", createdAt: "2026-10-14", decidedAt: "2026-10-14", seq: 4, capture: "C4", supersedes: "A1",
      quote: "We're keeping the March endcap, but it'll only be in roughly sixty percent of doors. Remaining stores get a side-cap.", rationale: "Partial endcap plus side-caps: roughly 60% of the full-chain lift.",
      history: [H("2026-10-14 13:10", "Dana Ortiz", "created", "Captured from the Walmart buyer call. Revises A1."), H("2026-10-14 17:45", "Lena Park", "approved", "Replaces A1; endcap lift goes from +20% to +12%.", { field: "impact", from: 20, to: 12 })] },
    { id: "A5", summary: "Competitor Clearwell launches a cheaper gel moisturizer at Walmart in February", skus: ["GEL17", "GEL34"], retailers: ["WMT"], months: fcRange("2027-02", "2027-04"), driver: "competition", impact: -5, confidence: "likely", status: "pending", createdAt: "2026-10-15", capture: "C5",
      quote: "Clearwell's HydraGel will roll into Walmart in February at $9.97.", rationale: "A lower-priced direct competitor usually takes 3 to 8% in its first quarter.",
      history: [H("2026-10-15 08:00", "Texere monitor", "created", "Found in retail trade press")] },
    { id: "A6", summary: "Renew Night Serum launch slips from February to April", skus: ["SER10"], retailers: ALL_R, months: ["2027-02", "2027-03"], driver: "launch", impact: -100, confidence: "confirmed", status: "approved", createdAt: "2026-10-20", decidedAt: "2026-10-20", seq: 5, capture: "C6",
      quote: "Packaging artwork failed the second proof, so first ship is now the first week of April.", rationale: "No shipments in the slipped months.",
      history: [H("2026-10-20 11:30", "Sofia Ramos", "created", "Captured from the innovation pipeline review"), H("2026-10-20 12:10", "Lena Park", "approved", "Moving launch volume to April.")] },
    { id: "A7", summary: "Target's March skincare reset may cut Clear Foaming Cleanser to one facing", skus: ["FOM65"], retailers: ["TGT"], months: fcRange("2027-03", "2027-10"), driver: "distribution", impact: -15, confidence: "mentioned", status: "pending", createdAt: "2026-10-22", capture: "C7",
      quote: "They're tightening the face wash set in March, so the cleanser might lose a facing.", rationale: "Losing one of two facings typically costs 10 to 20% of volume.",
      history: [H("2026-10-22 15:00", "Dana Ortiz", "created", "Captured from the Target buyer call")] },
    { id: "A8", summary: "CVS runs a buy-one-get-one 40% off on Shield SPF 30 in May", skus: ["SPF30"], retailers: ["CVS"], months: ["2027-05"], driver: "promotion", impact: 50, confidence: "confirmed", status: "approved", createdAt: "2026-10-28", decidedAt: "2026-10-28", seq: 6, capture: "C8",
      quote: "CVS confirmed the BOGO 40 on SPF 30 for the May sun care event.", rationale: "Last May's CVS event lifted volume about 48% in the NielsenIQ data.",
      history: [H("2026-10-28 09:20", "Jordan Kim", "created", "Captured from the CVS promo calendar email"), H("2026-10-28 10:00", "Lena Park", "approved", "")] },
    { id: "A12", summary: "Paid social campaign on Renew Vitamin C Serum in January and February", skus: ["VTC10"], retailers: ALL_R, months: ["2027-01", "2027-02"], driver: "promotion", impact: 8, confidence: "confirmed", status: "approved", createdAt: "2026-11-02", decidedAt: "2026-11-02", seq: 7, capture: "C14",
      quote: "We're putting $400k behind Vitamin C on TikTok and Instagram, January through February.", rationale: "Last spring's $250k flight lifted velocity about 5%; scaled to the bigger budget.",
      history: [H("2026-11-02 10:00", "Lena Park", "created", "From the media plan review"), H("2026-11-02 10:01", "Lena Park", "approved", "")] },
    { id: "A9", summary: "Walgreens plans to drop Hydra Gel 3.4 oz from about 30% of stores from April", skus: ["GEL34"], retailers: ["WAG"], months: fcRange("2027-04", "2027-10"), driver: "distribution", impact: -28, confidence: "likely", status: "pending", createdAt: "2026-11-04", capture: "C9",
      quote: "The 3.4 is on the cut list for the smaller-format stores, about 30 percent of the chain, at the April review.", rationale: "At a distribution elasticity of 0.9, losing 30% of stores costs about 28% of volume.",
      history: [H("2026-11-04 16:30", "Dana Ortiz", "created", "Captured from the Walgreens buyer call")] },
    { id: "A11", summary: "Walmart adds Derm Barrier Cream to about 1,000 more stores from February", skus: ["BAR17"], retailers: ["WMT"], months: fcRange("2027-02", "2027-10"), driver: "distribution", impact: 14, confidence: "confirmed", status: "approved", createdAt: "2026-11-06", decidedAt: "2026-11-06", seq: 8, capture: "C15",
      quote: "We're expanding the barrier cream from about 3,800 to 4,800 stores with the February mod.", rationale: "About 16% more stores at a distribution elasticity of 0.9.",
      history: [H("2026-11-06 14:00", "Dana Ortiz", "created", "Captured from the Walmart line review"), H("2026-11-06 15:20", "Lena Park", "approved", "")] },
    { id: "A10", summary: "Target confirmed a December temporary price reduction on Hydra Gel 1.7 oz", skus: ["GEL17"], retailers: ["TGT"], months: ["2026-12"], driver: "promotion", impact: 32, confidence: "confirmed", status: "approved", createdAt: "2026-11-10", decidedAt: "2026-11-10", seq: 9, capture: "C10",
      quote: "December TPR on the small gel is approved, 20 percent off.", rationale: "Last December's 20%-off TPR at Target lifted volume about 32%.",
      history: [H("2026-11-10 09:40", "Dana Ortiz", "created", "Posted in #lumen-target"), H("2026-11-10 11:00", "Lena Park", "approved", "")] },
  ];
  const C = [
    { id: "C1", kind: "call", title: "Walmart buyer call", team: "Customer strategy", person: "Dana Ortiz", date: "2026-10-03", status: "shared", auto: "Zoom", text: "Walmart buyer: We can give you the March endcap in all stores, both gel sizes.\nDana: That's great news, thank you." },
    { id: "C2", kind: "call", title: "Finance price review", team: "Finance", person: "Marcus Lee", date: "2026-10-09", status: "shared", auto: "Teams", text: "Marcus: The committee approved plus six percent on the gels, effective January first, and all four accounts have accepted." },
    { id: "C3", kind: "call", title: "Supply planning sync", team: "Supply planning", person: "Ken Watanabe", date: "2026-10-12", status: "shared", auto: "Teams", text: "Ken: Realistically we ship 85 percent of demand on the 1.7 in December. The pump component is the constraint." },
    { id: "C4", kind: "call", title: "Walmart buyer call", team: "Customer strategy", person: "Dana Ortiz", date: "2026-10-14", status: "shared", auto: "Zoom", text: "Walmart buyer: We're keeping the March endcap, but it'll only be in roughly sixty percent of doors. Remaining stores get a side-cap.\nDana: Understood. Is the side-cap for both gel sizes?\nWalmart buyer: Yes, both sizes, same as the endcap." },
    { id: "C5", kind: "web", title: "Trade press: Clearwell HydraGel launch", team: "Market signal", person: "Texere monitor", date: "2026-10-15", status: "shared", text: "Clearwell's HydraGel will roll into Walmart in February at $9.97, undercutting leading gel moisturizers." },
    { id: "C6", kind: "call", title: "Innovation pipeline review", team: "Innovation", person: "Sofia Ramos", date: "2026-10-20", status: "shared", auto: "Zoom", text: "Sofia: Packaging artwork failed the second proof, so first ship is now the first week of April." },
    { id: "C7", kind: "call", title: "Target buyer call", team: "Customer strategy", person: "Dana Ortiz", date: "2026-10-22", status: "shared", auto: "Zoom", text: "Target buyer: They're tightening the face wash set in March, so the cleanser might lose a facing. Nothing final yet." },
    { id: "C8", kind: "email", title: "CVS promo calendar", team: "Sales", person: "Jordan Kim", date: "2026-10-28", status: "shared", auto: "Email", text: "CVS confirmed the BOGO 40 on SPF 30 for the May sun care event." },
    { id: "C14", kind: "doc", title: "Media plan review", team: "Brand", person: "Lena Park", date: "2026-11-02", status: "shared", auto: "Google Docs", text: "Lena: We're putting $400k behind Vitamin C on TikTok and Instagram, January through February." },
    { id: "C9", kind: "call", title: "Walgreens buyer call", team: "Customer strategy", person: "Dana Ortiz", date: "2026-11-04", status: "shared", auto: "Zoom", text: "Walgreens buyer: The 3.4 is on the cut list for the smaller-format stores, about 30 percent of the chain, at the April review.\nDana: Is the 1.7 affected too?\nWalgreens buyer: No, the 1.7 stays everywhere." },
    { id: "C15", kind: "call", title: "Walmart line review", team: "Customer strategy", person: "Dana Ortiz", date: "2026-11-06", status: "shared", auto: "Zoom", text: "Walmart buyer: We're expanding the barrier cream from about 3,800 to 4,800 stores with the February mod. The derm set is our fastest-growing space." },
    { id: "C10", kind: "slack", title: "#lumen-target", team: "Customer strategy", person: "Dana Ortiz", date: "2026-11-10", status: "shared", auto: "Slack", text: "Dana Ortiz: December TPR on the small gel is approved, 20 percent off. Heads up for supply." },
    { id: "C11", kind: "call", title: "Target buyer call", team: "Customer strategy", person: "Dana Ortiz", date: "2026-11-12", status: "new", auto: "Zoom",
      text: "Dana (Lumen): Thanks for making time. Quick check on the holiday plan.\nPriya (Target buyer): Sure. The December TPR on the small gel moisturizer is locked, 20% off, all stores.\nDana: Great. And the March skincare reset?\nPriya: That's confirmed now. The foaming cleanser goes from two facings to one in every store, starting with the March reset.\nDana: Understood. Anything on sun care?\nPriya: Yes, good news there. We're putting your SPF 30 lotion on the summer endcap, June and July, in roughly half the chain.\nDana: That's huge. We'll make sure supply is ready.\nPriya: Also, unrelated, our holiday party is on the 18th if your team is around.",
      example: [
        { summary: "Target confirmed the March reset: Clear Foaming Cleanser drops to one facing in every store", skus: ["FOM65"], retailers: ["TGT"], months: fcRange("2027-03", "2027-10"), driver: "distribution", impact: -18, confidence: "confirmed", quote: "The foaming cleanser goes from two facings to one in every store, starting with the March reset.", rationale: "Halving shelf facings typically costs 15 to 20% of volume.", supersedes: "A7" },
        { summary: "Target puts Shield SPF 30 on the summer endcap in June and July, about half the chain", skus: ["SPF30"], retailers: ["TGT"], months: ["2027-06", "2027-07"], driver: "display", impact: 22, confidence: "confirmed", quote: "We're putting your SPF 30 lotion on the summer endcap, June and July, in roughly half the chain.", rationale: "Last summer's half-chain display at Target lifted volume about 22%.", supersedes: null },
      ] },
    { id: "C12", kind: "call", title: "Finance pricing sync", team: "Finance", person: "Marcus Lee", date: "2026-11-13", status: "new", auto: "Teams",
      text: "Marcus (Finance): Two updates from the pricing committee. First, the SPF price increase is now effective April 1, not January.\nLena (Brand): OK. Was that in the forecast already?\nMarcus: No, it wasn't loaded anywhere yet. It's plus 7% on the SPF 30 lotion, all retailers, from April.\nLena: Got it. And the cleanser?\nMarcus: Walmart accepted funding for an April rollback on the foaming cleanser. About 15% off for the whole month.\nLena: Nice, that should give us a decent lift.",
      example: [
        { summary: "Shield SPF 30 list price up 7% at all retailers from April 1", skus: ["SPF30"], retailers: ALL_R, months: fcRange("2027-04", "2027-10"), driver: "price", impact: -9, confidence: "confirmed", quote: "It's plus 7% on the SPF 30 lotion, all retailers, from April.", rationale: "At a price elasticity of about -1.4, +7% price costs about 9% of volume.", supersedes: null },
        { summary: "Walmart April rollback on Clear Foaming Cleanser, about 15% off", skus: ["FOM65"], retailers: ["WMT"], months: ["2027-04"], driver: "promotion", impact: 22, confidence: "confirmed", quote: "Walmart accepted funding for an April rollback on the foaming cleanser. About 15% off for the whole month.", rationale: "The April 2025 rollback at the same depth lifted volume about 22%.", supersedes: null },
      ] },
    { id: "C13", kind: "slack", title: "#lumen-supply", team: "Supply planning", person: "Ken Watanabe", date: "2026-11-13", status: "new", auto: "Slack",
      text: "Ken Watanabe (Supply planning), 9:41 AM\nUpdate on the pump shortage for the 1.7 oz gel: second supplier qualified yesterday. We now expect fill rate around 95% in December instead of 85%. Should be fully back to normal by January.",
      example: [
        { summary: "Second pump supplier qualified: December fill rate on Hydra Gel 1.7 oz improves to about 95%", skus: ["GEL17"], retailers: ALL_R, months: ["2026-12"], driver: "supply", impact: -5, confidence: "confirmed", quote: "We now expect fill rate around 95% in December instead of 85%.", rationale: "About 5% of December orders still go unfilled.", supersedes: "A3" },
      ] },
  ];
  const threads = {
    A2: { status: "resolved", messages: [
      { by: "bm", name: "Lena Park", at: "2026-10-09 11:12", text: "Marcus, are all four accounts on the new cost from Jan 1, or does Walgreens lag a month?" },
      { by: "fin", name: "Marcus Lee", at: "2026-10-09 11:14", text: "All four from Jan 1. Walgreens signed last week." },
    ] },
    A5: { status: "resolved", messages: [
      { by: "bm", name: "Lena Park", at: "2026-10-16 09:12", text: "Is HydraGel going into every Walmart store, or a test? That changes how big this is." },
      { by: "cs", name: "Dana Ortiz", at: "2026-10-16 11:40", text: "The buyer said a full-chain rollout, but on the bottom shelf. I'd keep the impact small for now." },
    ] },
    A9: { status: "open", waitingOn: "Dana Ortiz", messages: [
      { by: "bm", name: "Lena Park", at: "2026-11-05 10:02", text: "Dana, is the Walgreens cut final, or still a proposal for the April review? I don't want to take 28% out of the 3.4 oz if they might reverse it." },
    ] },
  };
  const signals = [
    { id: "S1", date: "2026-10-15", source: "Retail trade press", comp: "CLW", title: "Clearwell launches HydraGel at Walmart in February at $9.97", body: "Clearwell's HydraGel will roll into Walmart in February at $9.97, undercutting leading gel moisturizers.", skus: ["GEL17", "GEL34"], retailers: ["WMT"], added: "A5" },
    { id: "S2", date: "2026-11-10", source: "Retailer price scan", comp: "BRM", title: "Bramble Labs cuts its barrier cream price 15% at Target", body: "Bramble Labs reduced its 1.7 oz barrier cream from $14.99 to $12.79 at Target, effective this week, with no end date posted.", skus: ["BAR17", "GEL17"], retailers: ["TGT"], added: null,
      suggest: { summary: "Bramble Labs cut its barrier cream price 15% at Target", skus: ["BAR17"], retailers: ["TGT"], months: fcRange("2026-12", "2027-03"), driver: "competition", impact: -4, confidence: "likely", rationale: "A direct competitor's 15% price cut usually takes 3 to 5%." } },
    { id: "S3", date: "2026-11-08", source: "Search and social trends", comp: null, title: "Searches for “gel cream” up about 40% year over year", body: "Category interest in lightweight gel-cream textures keeps rising, led by short-form video reviews.", skus: ["GEL17", "GEL34"], retailers: ALL_R, added: null,
      suggest: { summary: "Rising interest in gel textures lifts Hydra Gel in spring", skus: ["GEL17", "GEL34"], retailers: ALL_R, months: fcRange("2027-03", "2027-06"), driver: "other", impact: 3, confidence: "mentioned", rationale: "Category trends this size usually add a few points of growth." } },
    { id: "S4", date: "2026-11-05", source: "Retailer site scan", comp: "NOV", title: "Novaré sun care listed on Walmart.com for spring", body: "Novaré's SPF 30 and SPF 50 lotions now show “coming March 2027” on Walmart.com.", skus: ["SPF30", "SPF50"], retailers: ["WMT"], added: null,
      suggest: { summary: "Novaré sun care enters Walmart in March", skus: ["SPF30", "SPF50"], retailers: ["WMT"], months: fcRange("2027-03", "2027-08"), driver: "competition", impact: -6, confidence: "likely", rationale: "Novaré's Target launch took about 8% from Shield at Target." } },
  ];
  const inventory = {
    GEL17: { onHand: 64000, safetyWks: 3, leadWks: 6, plant: "Plant A, Ohio" }, GEL34: { onHand: 82000, safetyWks: 3, leadWks: 6, plant: "Plant A, Ohio" },
    CRM17: { onHand: 51000, safetyWks: 3, leadWks: 8, plant: "Plant A, Ohio" }, FOM65: { onHand: 210000, safetyWks: 2, leadWks: 4, plant: "Co-packer, Texas" },
    MIC13: { onHand: 70000, safetyWks: 2, leadWks: 4, plant: "Co-packer, Texas" }, VTC10: { onHand: 39000, safetyWks: 4, leadWks: 10, plant: "Plant B, New Jersey" },
    SER10: { onHand: 0, safetyWks: 4, leadWks: 10, plant: "Plant B, New Jersey" }, SPF30: { onHand: 95000, safetyWks: 4, leadWks: 8, plant: "Co-packer, Florida" },
    SPF50: { onHand: 52000, safetyWks: 4, leadWks: 8, plant: "Co-packer, Florida" }, BAR17: { onHand: 44000, safetyWks: 3, leadWks: 8, plant: "Plant B, New Jersey" },
    DCL80: { onHand: 36000, safetyWks: 2, leadWks: 4, plant: "Co-packer, Texas" },
  };
  return {
    v: 5, role: "bm", seq: 9, nextA: 13, nextC: 16, assumptions: A, captures: C, threads, signals, inventory,
    lastSync: "2026-11-01#999", syncLog: [{ at: "2026-11-01", by: "Ravi Shah", note: "October S&OP forecast published to supply", cells: 2288 }], acks: {}, supplyActions: [],
    engine: "texere", nielsenSource: "simulated", nielsenFile: null, seen: "2026-11-09",
    filter: { category: "ALL", brand: "ALL", subbrand: "ALL", platform: "ALL", sku: "ALL", retailer: "ALL" },
    period: "L13W", comp: "YA",
    ui: { cap: "C11", inboxTab: "pending", inboxSel: "A9", tlMonth: "2027-03", deck: "mbr", groupBy: "subbrand", fcGrain: "month", fcPending: false },
  };
}
