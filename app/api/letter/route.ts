import { z } from "zod";
import { findComplaint, storedResult } from "@/lib/cases";
import { letterTypeFor } from "@/lib/letter";
import { checkLetter } from "@/lib/letter-check";

export const dynamic = "force-dynamic";

// Same hostile-input rules as /api/verify: zod, size cap, ref looked up in memory, generic 400.
const Body = z.object({ ref: z.string().regex(/^CMP-\d{4}-\d{6}$/), text: z.string().min(1).max(3000) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const complaint = findComplaint(parsed.data.ref);
  const type = letterTypeFor(storedResult(parsed.data.ref)?.deadline ?? null);
  if (!complaint || !type) return Response.json({ error: "Invalid request" }, { status: 400 });
  return Response.json({ checks: [checkLetter(parsed.data.text, type, complaint.received)] });
}
