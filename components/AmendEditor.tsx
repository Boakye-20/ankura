"use client";
import { textToDraft } from "@/lib/case-helpers";
import type { ClauseInfo } from "@/lib/stored-types";
import { CitationChip } from "./ui";

type Props = { text: string; onText: (t: string) => void; redress: string; onRedress: (r: string) => void; clauses: Record<string, ClauseInfo> };

export function AmendEditor({ text, onText, redress, onRedress, clauses }: Props) {
  const cited = [...new Set(textToDraft(text).flatMap((p) => p.citations))];
  return (
    <div className="decision">
      <label className="sub" htmlFor="amend-text">Reply: one paragraph per line, with its clause references in square brackets at the end</label>
      <textarea id="amend-text" className="editor" value={text} onChange={(e) => onText(e.target.value)} maxLength={3000} />
      <span className="note">Clauses cited: {cited.length ? cited.map((id) => <span key={id}><CitationChip id={id} clauses={clauses} /> </span>) : "none"}</span>
      <label className="sub" htmlFor="amend-redress">Proposed redress in £ (leave blank for none)</label>
      <input id="amend-redress" type="number" min="0" step="0.01" inputMode="decimal" value={redress} onChange={(e) => onRedress(e.target.value)} />
      <span className="note">Saving runs every check again on the server. A handler can offer up to £250, a senior up to £1,000, and anything above that is blocked.</span>
    </div>
  );
}
