"use client";
// Numbers here come only from data/eval-results.json (npm run eval) and this browser session. Nothing is hard-coded.
import { adoption, type Session } from "@/lib/audit";
import { fmtDate, fmtDateTime, gbp } from "@/lib/format";
import type { EvalResults, EvalRun, Metric } from "@/lib/eval-types";
import { Box, Pill, StatTile } from "./ui";

/** The evaluation's metric names, in the words a non-technical reader would use. */
const PLAIN: Record<string, string> = {
  category: "Right type of complaint",
  "vuln-recall": "Vulnerable customers spotted",
  "vuln-precision": "Vulnerability flags that were right",
  deadline: "Right deadline rule",
  routing: "Right team",
  masking: "No personal data sent to the AI",
  "cit-validity": "Policy references that exist",
  "cit-coverage": "Claims backed by policy, after the checks",
  "clause-recall": "Expected policy clauses found",
  redress: "Redress above the limit and not blocked",
  adversarial: "Tricks caught (adversarial tests)",
  fos: "Ombudsman signposting, after the checks",
  clear: "Plain, readable replies",
  manual: "Cases sent to a person with no draft",
};
const plain = (m: Metric) => PLAIN[m.id] ?? m.label;

export function AssuranceView({ results, checksRerun }: { results: EvalResults | null; checksRerun: string | null }) {
  const latest = results?.runs.at(-1) ?? null;
  const first = results?.runs[0] ?? null;
  if (!latest || !first) {
    return <p className="banner"><b>Not yet run.</b> No evaluation results exist. Run <code>npm run eval</code> with an API key and the results appear here exactly as measured.</p>;
  }
  const stale = checksRerun !== null && checksRerun > latest.timestamp;
  const change = (m: Metric) => {
    const before = first.metrics.find((x) => x.id === m.id)?.value ?? null;
    if (before === null || m.value === null || first === latest) return "—";
    const pts = (m.value - before) * 100;
    return `${pts > 0 ? "+" : ""}${pts.toFixed(1)} points`;
  };
  const met = latest.metrics.filter((m) => m.pass === true).length;
  const missed = latest.metrics.filter((m) => m.pass === false).length;

  return (
    <div className="panel">
      <p className="lead">
        Measured on {fmtDate(latest.timestamp)} over {latest.cases} synthetic complaints that a person had labelled first. {met} of the {met + missed} targets were met.
        {results!.runs.length > 1 && ` The first run used the original prompt, written before any case was seen; the latest uses a prompt tuned after seeing where the first one went wrong on these same cases, so the "change" column is not a held-out result.`}
      </p>
      {stale && (
        <p className="banner">
          The policy-reference check was corrected on {fmtDate(checksRerun!)}, after this evaluation ran. The rows marked "after the checks", the adversarial tests and "cases sent to a person" were measured with the earlier check and will change when <code>npm run eval</code> is run again. The rows about sorting, deadlines, teams and masking are not affected.
        </p>
      )}

      <Box title="What was measured">
        <div className="tw">
          <table className="dt results">
            <thead><tr><th scope="col">Measure</th><th scope="col">Latest</th><th scope="col">Target</th><th scope="col">Met?</th><th scope="col">First run</th><th scope="col">Change</th></tr></thead>
            <tbody>
              {latest.metrics.map((m) => (
                <tr key={m.id} className={m.pass === true ? "ok" : m.pass === false ? "bad" : ""}>
                  <td><b>{plain(m)}</b>{m.note && <><br /><span className="note">{m.note}</span></>}</td>
                  <td className="mono">{m.display}</td>
                  <td>{m.target ?? "No target"}</td>
                  <td>{m.pass === null ? <span className="label">Reported only</span> : <Pill tone={m.pass ? "ok" : "bad"}>{m.pass ? "Met" : "Missed"}</Pill>}</td>
                  <td className="mono">{first.metrics.find((x) => x.id === m.id)?.display ?? "n/a"}</td>
                  <td>{change(m)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          Limitations: the 60 complaints and their labels were written by one person and not independently reviewed, so each case is about 1.7 percentage points. There is no held-out set. Nothing here measures real handler behaviour.
        </p>
      </Box>

      <details className="detail">
        <summary>Show the detail: every run, where types were confused, the adversarial tests, failures and cost</summary>
        <RunDetail run={latest} runs={results!.runs} />
      </details>
    </div>
  );
}

function RunDetail({ run, runs }: { run: EvalRun; runs: EvalRun[] }) {
  const cal = run.calibration;
  const timed = run.batch ? [...runs].reverse().find((r) => !r.batch) : run; // batch timings are queue time, not model time
  const rate = (x: { n: number; correct: number }) => (x.n ? `${x.correct} / ${x.n} (${((x.correct / x.n) * 100).toFixed(1)}%)` : "no cases");
  return (
    <div className="panel">
      <p className="note">
        Triage by {run.models.triage}, drafting by {run.models.draft}, prompt set {run.promptVersion}, code at commit <code>{run.commit}</code>. {runs.length} runs are kept because the model does not give the same answer every time.
      </p>

      <Box title="Every run" label="Latest run on the right">
        <div className="tw">
          <table className="dt">
            <thead><tr><th>Measure</th><th>Target</th>{runs.map((r, i) => <th key={r.timestamp}>Run {i + 1}, {fmtDateTime(r.timestamp).slice(0, 16)}</th>)}</tr></thead>
            <tbody>
              {run.metrics.map((m) => (
                <tr key={m.id}>
                  <td>{plain(m)}</td>
                  <td>{m.target ?? "No target"}</td>
                  {runs.map((r) => {
                    const x = r.metrics.find((y) => y.id === m.id);
                    return <td key={r.timestamp}>{x ? x.display : "n/a"} {x?.pass === false && <Pill tone="bad">Missed</Pill>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>

      <div className="cols2">
        <Box title="Does the AI's own confidence mean anything?">
          <dl className="kv">
            <dt>Right type when confidence ≥ {cal.threshold}</dt><dd>{rate(cal.high)}</dd>
            <dt>Right type when confidence &lt; {cal.threshold}</dt><dd>{rate(cal.low)}</dd>
          </dl>
          <p className="note">If the two rates are similar, the confidence score is not separating good answers from bad ones, which is why the code checks carry the assurance and the score is not shown to handlers.</p>
        </Box>
        <Box title="Cost and time">
          <dl className="kv">
            <dt>Average cost per case</dt><dd>{gbp(run.cost.meanGbp, 4)}</dd>
            <dt>Total cost, {run.cases} cases</dt><dd>{gbp(run.cost.totalGbp, 4)}</dd>
            <dt>Average time per case</dt><dd>{timed ? `${timed.latency.meanS.toFixed(1)} seconds` : "Not measured"}</dd>
            <dt>Slowest 5% took at least</dt><dd>{timed ? `${timed.latency.p95S.toFixed(1)} seconds` : "Not measured"}</dd>
          </dl>
          <p className="note">List prices and an assumed USD to GBP rate set in the code.{run.batch && ` This run used the Batch API, billed at half these prices. Times are from the last run that was not batched (prompt ${timed?.promptVersion ?? "none"}).`}</p>
        </Box>
      </div>

      <Box title="Where complaint types were confused" label="Rows: what a person said · columns: what the AI said">
        <div className="tw">
          <table className="dt matrix">
            <thead><tr><th>Person said</th>{run.confusion.labels.map((l) => <th key={l} title={l}>{abbr(l)}</th>)}</tr></thead>
            <tbody>
              {run.confusion.labels.map((row, i) => (
                <tr key={row}>
                  <th scope="row">{row}</th>
                  {run.confusion.matrix[i].map((n, j) => <td key={j} className={n ? (i === j ? "hit" : "miss") : ""}>{n || "0"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>

      <Box title="Adversarial tests" label={`${run.adversarial.filter((a) => a.pass).length} of ${run.adversarial.length} passed`}>
        <div className="tw">
          <table className="dt">
            <thead><tr><th>Case</th><th>Trick</th><th>Expected</th><th>What happened</th><th>Result</th></tr></thead>
            <tbody>
              {run.adversarial.map((a) => (
                <tr key={a.ref}><td className="mono">{a.ref}</td><td>{a.type.replace(/_/g, " ")}</td><td>{a.expected}</td><td>{a.actual}</td><td><Pill tone={a.pass ? "ok" : "bad"}>{a.pass ? "Pass" : "Fail"}</Pill></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>

      <Box title={`Known failures (${run.failures.length})`} label="Everything the system got wrong in the latest run">
        {run.failures.length ? (
          <div className="tw">
            <table className="dt">
              <thead><tr><th>Case</th><th>Area</th><th>Person said</th><th>AI said</th></tr></thead>
              <tbody>{run.failures.map((f, i) => <tr key={i}><td className="mono">{f.ref}</td><td>{f.area}</td><td>{f.expected}</td><td>{f.actual}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="note">No failures recorded in this run.</p>}
      </Box>
    </div>
  );
}

export function Adoption({ session }: { session: Session }) {
  const a = adoption(session.events);
  const tiles: [string, number][] = [
    ["Drafts approved unchanged", a.approvedUnchanged],
    ["Drafts edited first", a.amended],
    ["Approved after editing", a.approvedAmended],
    ["Sent to a specialist", a.escalated],
    ["Quick-approval prompts shown", a.overReliancePrompts],
    ["Handovers sent back", a.handoverReturns],
  ];
  return (
    <div className="panel">
      <p className="lead">Is the AI being used well? These are counted from what you do in this browser, and are the measures a pilot would track across teams.</p>
      <div className="stats six">{tiles.map(([label, n]) => <StatTile key={label} label={label} value={n} />)}</div>
      <p className="note">
        Many drafts approved unchanged, or many quick approvals, suggest staff are trusting the AI without reading. Many handovers sent back suggest the packs are not helping specialists. The numbers start at zero: act on a few cases, then come back.
      </p>
    </div>
  );
}

function abbr(label: string): string {
  return label.split(/\s+/).filter((w) => !["and", "of"].includes(w)).map((w) => w[0].toUpperCase()).join("");
}
