# Texere

Texere captures what every team and the market say about each product, turns it into dated, sourced forecast assumptions, and runs the CPG sales forecast from NielsenIQ history plus that context. This repository is a working prototype with a fictional brand (Lumen Skincare) and example data.

## What's in the app

- **Capture**: upload Zoom/Teams `.vtt` transcripts or paste Meet, Slack or email text. Claude extracts assumptions by SKU, retailer and month; the contributor approves what's shared.
- **Review and discussion**: the brand manager asks questions on any assumption, gets answers from the contributor or from the source transcript, then accepts or rejects.
- **SKU timeline**: every change to the forecast, when, why and who said it.
- **Forecast**: driver model (distribution, price, promotion, display, seasonality, trend) fit on NielsenIQ-style history, plus accepted assumptions. Optional mode sends assumptions to o9 instead (simulated).
- **Supply handoff**: changes since the last publish, risks, acknowledgement, CSV export.
- **Driver reports**: waterfalls that explain actuals and the forecast by driver.
- **Shareouts**: VP note, three deck templates with a PowerPoint download, and Ask Texere.
- **Data sources**: the NielsenIQ fields used, coverage, and CSV upload of your own export.

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
