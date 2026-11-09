"use client";
import type { RegulatorySource } from "@/lib/regulation";
import type { Check } from "@/lib/types";
import { BasisList, Box, Pill } from "./ui";

const TONE = { Pass: "ok", Fail: "bad", Refer: "warn" } as const;

export function ChecksPanel({ checks, basis, amended, draftWithheld }: { checks: Check[]; basis: Record<string, RegulatorySource[]>; amended: boolean; draftWithheld: boolean }) {
  const fails = checks.filter((c) => c.result === "Fail").length;
  const refers = checks.filter((c) => c.result === "Refer").length;
  return (
    <Box title="Pre-release checks" label={<span className="note">{amended ? "Re-run on the amended draft" : "Run by code, not by the AI"}</span>}>
      <p className="note">{fails} fail · {refers} refer · {checks.length - fails - refers} pass. A Fail blocks approval.</p>
      <ul className="checks">
        {checks.map((c) => (
          <li key={c.id}>
            <Pill tone={TONE[c.result]}>{c.result}</Pill>
            <span>
              <span className="cid">{c.id}</span> {c.label}
              <br />
              <span className="note">{c.detail}</span>
              <br />
              <BasisList basis={basis[c.id] ?? []} />
            </span>
          </li>
        ))}
      </ul>
      {draftWithheld && <p className="note">Draft checks (citations, redress, FOS wording, plain language) did not run because there is no draft.</p>}
    </Box>
  );
}
