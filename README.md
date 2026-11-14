# Texere

Texere captures what every team and the market say about each product, turns it into dated, sourced forecast assumptions, and runs the CPG sales forecast from NielsenIQ history plus that context. This repository is a working prototype with a fictional company (Lumen Beauty Co.: 2 brands, 5 sub-brands, 11 SKUs, 4 retailers, 5 competitors) and 104 weeks of simulated NielsenIQ data.

## What's in the app

- **Home**: what changed since you last looked, what needs you, KPIs, forecast vs plan.
- **Approvals**: inbox to approve, reject or edit assumptions, with a discussion thread per item (ask the contributor, get answers, ask Texere to check it) and bulk actions.
- **Context timeline**: plan vs forecast vs actual by month with the variance vs plan, driver swimlanes of past NielsenIQ events and future assumptions. Click to inspect, double-click for comments and full change history. Month bridges from plan to forecast, and a change log with diffs.
- **Performance**: LW, L4W, L13W, L52W, YTD, N13W, N52W; YoY or period over period (WoW, QoQ). Filters for category, brand, sub-brand, platform, SKU and retailer. KPIs for sales, units, share, TDPs, velocity, price, TPR, feature, display and incrementality; driver waterfall with drill-down; weekly trend; scorecard by any hierarchy level.
- **Competition**: share, price and promotion by competitor, share trend, measured competitive events and web signals you can send for approval.
- **Forecast**: SKU by month or week grid vs plan or LY, accuracy backtest, publish to supply, o9 export (Path B: o9 as the engine).
- **Supply view**: frozen, slushy and liquid demand changes since the last publish, 26-week projected inventory vs safety stock, first risk week, acknowledgement and expedite requests.
- **Capture**: Zoom, Teams, Slack, email and web sources; upload or paste transcripts and extract assumptions with Claude.
- **Shareouts**: weekly VP note, three decks with PowerPoint download, Ask Texere.
- **Data sources**: the NielsenIQ pipeline and fields, weekly CSV download and upload.

## Real vs simulated

Live Zoom/Teams/Slack connections, the web monitor, the o9 connection and the NielsenIQ dataset are simulated. Transcript upload, extraction with Claude, the forecast model, reports, decks and CSV import/export all work.

## Claude

Inside the Claude app, Texere uses the viewer's Claude account. Anywhere else, add an Anthropic API key in **Settings**; it's stored only in that browser and sent only to `api.anthropic.com`. Without Claude, prepared examples and generated text keep the demo working.

## Run it

```bash
npm install
npm run dev      # local development
npm run build    # static site in dist/
```

Pushing to `main` deploys the site to GitHub Pages through `.github/workflows/pages.yml` (enable Pages with source "GitHub Actions" in the repository settings).
