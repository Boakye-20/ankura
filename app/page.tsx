import { Workbench } from "@/components/Workbench";
import { caseViews, checkBasis, clauseLibrary, loadDemoOutputs, loadEvalResults } from "@/lib/cases";
import { REGULATORY_MAP } from "@/lib/regulation";
import { POLICY_VERSION, PROMPT_VERSION, RELEASE } from "@/lib/versions";
import type { WorkbenchData } from "@/lib/stored-types";

// Rendered at build time from the stored outputs: the hosted app never calls the model.
export default function Home() {
  const outputs = loadDemoOutputs();
  const data: WorkbenchData = {
    cases: caseViews(),
    run: outputs ? { runDate: outputs.runDate, models: outputs.models, promptVersion: outputs.promptVersion, policyVersion: outputs.policyVersion } : null,
    clauses: clauseLibrary(),
    checkBasis: checkBasis(),
    evalResults: loadEvalResults(),
    versions: { release: RELEASE, policyVersion: POLICY_VERSION, promptVersion: PROMPT_VERSION },
    regulatory: {
      asOf: REGULATORY_MAP.asOf,
      sources: Object.entries(REGULATORY_MAP.sources).map(([ref, s]) => ({ ref, ...s })),
    },
  };
  return <Workbench data={data} />;
}
