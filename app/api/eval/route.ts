import { loadEvalResults } from "@/lib/cases";

// Results come only from data/eval-results.json (npm run eval). Missing file: the app shows "Not yet run".
export function GET() {
  return Response.json(loadEvalResults());
}
