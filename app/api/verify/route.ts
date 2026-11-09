import { reverify } from "@/lib/reverify";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const checks = reverify(body);
  // Generic message: no stack traces or validation internals are returned.
  return checks ? Response.json({ checks }) : Response.json({ error: "Invalid request" }, { status: 400 });
}
