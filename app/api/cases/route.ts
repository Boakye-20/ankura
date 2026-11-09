import { caseViews } from "@/lib/cases";

// Masked text, masked case notes and stored results only: never raw text, customer fields or labels.
export function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref");
  const cases = caseViews();
  if (!ref) return Response.json(cases);
  const one = cases.find((c) => c.ref === ref);
  return one ? Response.json(one) : Response.json({ error: "Not found" }, { status: 404 });
}
