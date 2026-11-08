// Shared data model, as specified in docs/03-architecture.md.

export type Clause = { id: string; doc: string; title: string; section: string; text: string }; // id e.g. "POL-04 §2.1"; title = document title

export type Complaint = {
  ref: string; // "CMP-2026-104712"
  received: string; // ISO date
  channel: "Phone" | "Email" | "Web form" | "App chat" | "Branch" | "Letter";
  product: string;
  customer: { name: string; account?: string; sortCode?: string; email?: string; phone?: string; postcode?: string }; // synthetic, never sent to the model
  text: string; // raw complaint text (contains synthetic personal data)
  caseNotes: { id: string; date: string; author: string; text: string }[];
  labels: GoldLabels; // human labels for evaluation, never shown to the model
};

export type GoldLabels = {
  category: Category;
  vulnerable: boolean;
  paymentServices: boolean; // decides 15 business days vs 8 weeks
  summaryResolutionEligible: boolean;
  route: "Handler" | "Senior" | "Fraud & Disputes" | "Lending Support" | "Vulnerability Team" | "Complaints Management";
  expectedClauses: string[]; // clause IDs a good answer should rely on
  adversarial?: "injection" | "fabricated_policy" | "obfuscated_pii" | "redress_bait" | "hidden_vulnerability" | "off_topic";
  maxRedress?: number; // the correct maximum in £, if any
};

export type Category =
  | "Unauthorised payment"
  | "APP scam"
  | "Charges and interest"
  | "Service and conduct"
  | "Card delivery and access"
  | "Account administration"
  | "Lending and affordability"
  | "Bereavement";

// The four drivers of vulnerability in FCA FG21/1 (Table 1).
export type VulnerabilityDriver = "Health" | "Life events" | "Resilience" | "Capability";

export type TriageOutput = {
  category: Category;
  categoryConfidence: number; // 0..1
  vulnerable: boolean;
  vulnerabilityIndicators: { driver: VulnerabilityDriver; indicator: string }[]; // FG21/1 Table 1 drivers
  paymentServices: boolean;
  summaryResolutionEligible: boolean;
  injectionSuspected: boolean;
  summary: string;
  keyFacts: string[];
};

export type DraftOutput = {
  response: { text: string; citations: string[] }[]; // one entry per sentence or short paragraph
  proposedRedress: { amount: number; basis: string; clause: string } | null;
  handover?: HandoverPack;
};

export type HandoverPack = {
  team: string;
  issue: string;
  actionsTaken: { text: string; source: string }[]; // source = case note ID or clause ID
  decisionsRequired: { question: string; clause: string }[];
  missingInformation: string[];
};

export type Check = { id: string; label: string; result: "Pass" | "Fail" | "Refer"; detail: string };

export type PipelineResult = {
  ref: string;
  mode: "demo" | "live";
  maskedText: string;
  tokenCount: number;
  triage: TriageOutput;
  retrieved: (Clause & { score: number })[];
  draft: DraftOutput | null;
  checks: Check[];
  route: GoldLabels["route"];
  requiresSeniorCoApproval: boolean;
  deadline: { basis: string; total: number; used: number; unit: string };
  audit: AuditEvent[];
  usage: { inputTokens: number; outputTokens: number; costGbp: number; ms: number };
  promptVersion: string;
  policyVersion: string;
  model: { triage: string; draft: string };
};

export type AuditEvent = { ts: string; ref: string; actor: string; event: string; detail: string };
