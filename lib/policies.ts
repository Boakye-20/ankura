import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Clause } from "./types";

const POLICY_DIR = path.join(process.cwd(), "data", "policies");

// Document title: "# POL-05: Redress and goodwill payments"
const TITLE_LINE = /^#\s+[^:]+:\s*(.+)$/;
// Section heading: "## §2 Approval limits"
const SECTION_LINE = /^##\s+§\d+\s+(.+)$/;
// Clause: "§2.1 Complaint handler: ..."
const CLAUSE_LINE = /^(§\d+\.\d+)\s+(.+)$/;

export function parsePolicyDoc(doc: string, markdown: string): Clause[] {
  let title = "";
  let section = "";
  const clauses: Clause[] = [];

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    const titleMatch = TITLE_LINE.exec(line);
    const sectionMatch = SECTION_LINE.exec(line);
    const clauseMatch = CLAUSE_LINE.exec(line);

    if (titleMatch && !title) title = titleMatch[1];
    else if (sectionMatch) section = sectionMatch[1];
    else if (clauseMatch) clauses.push({ id: `${doc} ${clauseMatch[1]}`, doc, title, section, text: clauseMatch[2] });
  }
  return clauses;
}

let cache: Clause[] | null = null;

export function loadClauses(): Clause[] {
  if (cache) return cache;
  cache = readdirSync(POLICY_DIR)
    .filter((file) => file.endsWith(".md") && file !== "README.md")
    .sort()
    .flatMap((file) => parsePolicyDoc(file.replace(/\.md$/, ""), readFileSync(path.join(POLICY_DIR, file), "utf8")));
  return cache;
}
