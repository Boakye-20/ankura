import { getStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(getStatus(process.env));
}
