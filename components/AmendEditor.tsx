"use client";
import { textToDraft } from "@/lib/case-helpers";
import type { ClauseInfo } from "@/lib/stored-types";
import { CitationChip } from "./ui";

type Props = { text: string; onText: (t: string) => void; redress: string; onRedress: (r: string) => void; clauses: Record<string, ClauseInfo> };

export function AmendEditor({ text, onText, redress, onRedress, clauses }: Props) {
  const cited = [...new Set(textToDraft(text).flatMap((p) => p.citations))];
  return (
    <div className="decision">
      <label className="ptitle" htmlFor="amend-text">Amended draft: one part per line, clause IDs in square brackets</label>
      <textarea id="amend-text" className="editor" value={text} onChange={(e) => onText(e.target.value)} maxLength={3000} />
      <span className="note">Clauses cited: {cited.length ? cited.map((id) => <span key={id}><CitationChip id={id} clauses={clauses} /> </span>) : "none"}</span>
      <label className="ptitle" htmlFor="amend-redress">Proposed redress in £ (blank for none)</label>
      <input id="amend-redress" type="number" min="0" step="0.01" inputMode="decimal" value={redress} onChange={(e) => onRedress(e.target.value)} />
      <span className="note">On submit the verifier runs again on the server. Handler limit £250; above that needs a senior; above £1,000 is blocked.</span>
    </div>
  );
}
