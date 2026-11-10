"use client";
// Numbers here come only from data/eval-results.json (npm run eval) and this browser session. Nothing is hard-coded.
import { adoption, type Session } from "@/lib/audit";
import { fmtDateTime, gbp, pctText } from "@/lib/format";
import type { EvalResults, EvalRun } from "@/lib/eval-types";
import { Box, Pill } from "./ui";

export function AssuranceView({ results, session }: { results: EvalResults | null; session: Session }) {
  const latest = results?.runs.at(-1) ?? null;
  return (
    <div className="panel">
      {latest ? (
        <p className="banner info">
          Evaluation run {fmtDateTime(latest.timestamp)} · commit <code>{latest.commit}</code> · triage {latest.models.triage} · draft {latest.models.draft} · prompt {latest.promptVersion} · {latest.cases} labelled synthetic cases.
          {results!.runs.length > 1 && ` ${results!.runs.length} runs recorded; the model is not fully deterministic, so all are shown below.`}
        </p>
      ) : (
        <p className="banner"><b>Not yet run.</b> No evaluation results exist. Run <code>npm run eval</code> with an API key; results then appear here exactly as measured.</p>
      )}
      {latest && <RunDetail run={latest} runs={results!.runs} />}
      <Adoption session={session} />
    </div>
  );
}

function RunDetail({ run, runs }: { run: EvalRun; runs: EvalRun[] }) {
  const targeted = run.metrics.filter((m) => m.target !== null);
  const cal = run.calibration;
  const timed = run.batch ? [...runs].reverse().find((r) => !r.batch) : run; // batch timings are queue time, not model time
  const rate = (x: { n: number; correct: number }) => (x.n ? `${x.correct} / ${x.n} (${((x.correct / x.n) * 100).toFixed(1)}%)` : "no cases");
  return (
    <>
      <div className="grid3">
        {targeted.map((m) => (
          <div className="kpi" key={m.id}>
            <span>{m.label}</span>
            <b>{m.value === null ? "n/a" : m.id === "redress" ? m.display : pctText(m.value)}</b>
            <span>Target {m.target}. {m.pass === null ? "Not measured in this run" : <Pill tone={m.pass ? "ok" : "bad"}>{m.pass ? "Met" : "Missed"}</Pill>}</span>
          </div>
        ))}
      </div>

      <Box title="All metrics" label={<span className="note">Target vs result{runs.length > 1 ? " · every run" : ""}</span>}>
        <div className="tw">
          <table className="dt">
            <thead><tr><th>Metric</th><th>Target</th>{runs.map((r, i) => <th key={r.timestamp}>Run {i + 1} · {fmtDateTime(r.timestamp).slice(0, 10)}</th>)}<th>Note</th></tr></thead>
            <tbody>
              {run.metrics.map((m) => (
                <tr key={m.id}>
                  <td>{m.label}</td>
                  <td>{m.target ?? "Report only"}</td>
                  {runs.map((r) => {
                    const x = r.metrics.find((y) => y.id === m.id);
                    return <td key={r.timestamp}>{x ? x.display : "—"} {x?.pass === false && <Pill tone="bad">Missed</Pill>}</td>;
                  })}
                  <td className="note">{m.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>

      <div className="grid2">
        <Box title="Calibration" label={<span className="note">Is self-reported confidence any use?</span>}>
          <dl className="kv">
            <dt>Accuracy, confidence ≥ {cal.threshold}</dt><dd>{rate(cal.high)}</dd>
            <dt>Accuracy, confidence &lt; {cal.threshold}</dt><dd>{rate(cal.low)}</dd>
          </dl>
          <p className="note">If accuracy is similar in both groups, the confidence threshold is not separating good classifications from bad ones, and the CONF-01 control adds less than it appears to.</p>
        </Box>
        <Box title="Cost and latency" label={<span className="note">From the evaluation run</span>}>
          <dl className="kv">
            <dt>Average cost per case</dt><dd>{gbp(run.cost.meanGbp, 4)}</dd>
            <dt>Total cost, {run.cases} cases</dt><dd>{gbp(run.cost.totalGbp, 4)}</dd>
            <dt>Average time per case</dt><dd>{timed ? `${timed.latency.meanS.toFixed(1)} seconds` : "Not measured"}</dd>
            <dt>95th percentile</dt><dd>{timed ? `${timed.latency.p95S.toFixed(1)} seconds` : "Not measured"}</dd>
          </dl>
          <p className="note">Costs use list prices and an assumed USD to GBP rate set in the code; they depend on current model pricing.{run.batch && ` This run used the Batch API, which bills at half these prices. Times are from the last run that was not batched (prompt ${timed?.promptVersion ?? "none"}), because batch timings measure the queue, not the model.`}</p>
        </Box>
      </div>

      <Box title="Complaint category confusion matrix" label={<span className="note">Rows: human label · columns: AI category</span>}>
        <div className="tw">
          <table className="dt matrix">
            <thead><tr><th>Human label</th>{run.confusion.labels.map((l) => <th key={l} title={l}>{abbr(l)}</th>)}</tr></thead>
            <tbody>
              {run.confusion.labels.map((row, i) => (
                <tr key={row}>
                  <th scope="row">{row}</th>
                  {run.confusion.matrix[i].map((n, j) => <td key={j} className={n ? (i === j ? "hit" : "miss") : ""}>{n || "·"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>

      <Box title="Adversarial tests" label={<span className="note">{run.adversarial.filter((a) => a.pass).length} / {run.adversarial.length} passed</span>}>
        <div className="tw">
          <table className="dt">
            <thead><tr><th>Case</th><th>Test</th><th>Expected</th><th>Actual</th><th>Result</th></tr></thead>
            <tbody>
              {run.adversarial.map((a) => (
                <tr key={a.ref}><td className="mono">{a.ref}</td><td>{a.type.replace(/_/g, " ")}</td><td>{a.expected}</td><td>{a.actual}</td><td><Pill tone={a.pass ? "ok" : "bad"}>{a.pass ? "Pass" : "Fail"}</Pill></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>

      <Box title="Known failures" label={<span className="note">Every case the system got wrong in the latest run · {run.failures.length}</span>}>
        {run.failures.length ? (
          <div className="tw">
            <table className="dt">
              <thead><tr><th>Case</th><th>Area</th><th>Expected (human label)</th><th>Actual</th></tr></thead>
              <tbody>{run.failures.map((f, i) => <tr key={i}><td className="mono">{f.ref}</td><td>{f.area}</td><td>{f.expected}</td><td>{f.actual}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="note">No failures recorded in this run.</p>}
        <p className="note">Limitations: synthetic data and labels written by one person and not independently reviewed; 60 cases, so each case is about 1.7 percentage points; no measurement of real handler behaviour.</p>
      </Box>
    </>
  );
}

function Adoption({ session }: { session: Session }) {
  const a = adoption(session.events);
  const tiles: [string, number][] = [
    ["Drafts approved unchanged", a.approvedUnchanged],
    ["Drafts amended", a.amended],
    ["Approved after amendment", a.approvedAmended],
    ["Escalated to a specialist", a.escalated],
    ["Over-reliance prompts shown", a.overReliancePrompts],
    ["Handovers returned by specialists", a.handoverReturns],
  ];
  return (
    <Box title="Adoption · this browser session" label={<span className="note">Workforce measures, counted from your actions</span>}>
      <div className="grid3">{tiles.map(([label, n]) => <div className="kpi" key={label}><span>{label}</span><b>{n}</b></div>)}</div>
      <p className="note">A high share of drafts approved unchanged, fast approvals or rising handover returns are early signs of over-reliance or quiet reversion. A pilot would measure these across teams over time, alongside reason codes and time to decision.</p>
    </Box>
  );
}

function abbr(label: string): string {
  return label.split(/\s+/).filter((w) => !["and", "of"].includes(w)).map((w) => w[0].toUpperCase()).join("");
}
