import React from "react";
import { Head } from "../ui/common.jsx";

const ROWS = [
  ["Meeting capture", "Upload a Zoom or Teams .vtt transcript, or paste text from Meet, Slack or email. “Simulate a Zoom call ending” shows how auto-capture would feel.", "Zoom, Teams and Meet apps that receive transcripts automatically; Slack and email connectors"],
  ["Finding assumptions", "Works with Claude connected: reads the text and maps it to SKUs, retailers, months and impact. Prepared examples otherwise.", "The same, tuned on each company's catalog and history"],
  ["Contributor approval", "Works: share or keep private per item, edit the impact", "Plus redaction inside quotes and team permissions"],
  ["Discussion threads", "Works: ask the person who raised an assumption, reply as them by switching roles, or ask the transcript", "Notifications in Slack, Teams and email"],
  ["NielsenIQ data", "Simulated 24-month dataset with real NielsenIQ fields; uploading your own CSV works", "Scheduled pull from NielsenIQ's data delivery"],
  ["Forecast engine", "Works: driver model (distribution, price, promotion, display, seasonality, trend) plus assumptions; backtest accuracy", "Elasticities estimated per brand and retailer with proper statistics"],
  ["Driver reports", "Works: waterfalls for actuals and forecast, scorecard, contributors", "The same, with weekly data"],
  ["Shareouts", "Works: VP note, three deck templates with live charts, PowerPoint download", "Scheduled sends and company templates"],
  ["o9 option", "Simulated send", "Write through o9's API or import files"],
  ["Data storage", "Saved only in your browser; “Reset demo data” restores it", "Secure multi-user database with SSO and SOC 2"],
];

export default function About() {
  return (
    <>
      <Head title="About this prototype" sub="What works, what is simulated, and what an engineer would build next. Lumen Skincare and every person and number here are fictional." />
      <div className="tbl-wrap"><table>
        <thead><tr><th>Part</th><th>In this prototype</th><th>In the real product</th></tr></thead>
        <tbody>{ROWS.map(([a, b, c]) => <tr key={a}><td><b>{a}</b></td><td>{b}</td><td>{c}</td></tr>)}</tbody>
      </table></div>
      <section className="card stack"><h2>Try the full loop in five minutes</h2>
        <ol className="steps-plain">
          <li>Switch “Viewing as” to <b>Customer strategy (Dana)</b>. On Today, answer Lena's open question about the Walgreens cut.</li>
          <li>In <b>Capture</b>, open the <b>Target buyer call</b> from Nov 12, extract assumptions, and send both to Lena.</li>
          <li>Switch to <b>Brand manager (Lena)</b>. In <b>Review</b>, open the discussion on the cleanser item, select <b>Ask the transcript</b>, then accept it. It replaces the earlier “might lose a facing” item.</li>
          <li>Open <b>SKU timeline</b> for the foaming cleanser at Target, select March, and read the history.</li>
          <li>Open <b>Driver reports</b>, switch to <b>Next 12 months</b>, and see the distribution bar grow.</li>
          <li>Switch to <b>Supply planner (Ken)</b>: the change is in the handoff with its reason. Publish it.</li>
          <li>Finish in <b>Shareouts</b>: copy the VP note and download the monthly business review deck.</li>
        </ol>
      </section>
    </>
  );
}
