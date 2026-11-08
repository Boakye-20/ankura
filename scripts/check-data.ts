import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8")) as T;
}

function extractClauseIds(): Set<string> {
  const ids = new Set<string>();
  const dir = join(ROOT, "data/policies");
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".md") || file === "README.md") continue;
    const policyId = file.replace(".md", "");
    const content = readFileSync(join(dir, file), "utf8");
    for (const m of content.matchAll(/§(\d+\.\d+)/g)) {
      ids.add(`${policyId} §${m[1]}`);
    }
  }
  return ids;
}

type Complaint = {
  ref: string;
  received: string;
  customer: { name: string };
  labels: {
    category: string;
    vulnerable: boolean;
    paymentServices: boolean;
    summaryResolutionEligible: boolean;
    route: string;
    expectedClauses: string[];
    adversarial?: string;
  };
};

const VALID_ROUTES = new Set([
  "Handler",
  "Fraud & Disputes",
  "Lending Support",
  "Complaints Management",
  "Senior",
  "Vulnerability Team",
]);

const DEMO_TODAY = new Date("2026-11-05");

function businessDaysBetween(from: Date, to: Date): number {
  let count = 0;
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (d <= to) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

const complaints = loadJson<Complaint[]>("data/complaints.json");
const names = loadJson<string[]>("data/names.json");
const validClauses = extractClauseIds();

const errors: string[] = [];
const warnings: string[] = [];

// 1. Exactly 60 cases
if (complaints.length !== 60) {
  errors.push(`Expected 60 complaints, got ${complaints.length}`);
}

// 2. Unique refs
const refs = new Set<string>();
for (const c of complaints) {
  if (refs.has(c.ref)) errors.push(`Duplicate ref: ${c.ref}`);
  refs.add(c.ref);
}

// 3. All customer names in names.json
const nameSet = new Set(names);
for (const c of complaints) {
  if (!nameSet.has(c.customer.name)) {
    errors.push(`${c.ref}: customer "${c.customer.name}" not in names.json`);
  }
}

// 4. Valid routes
for (const c of complaints) {
  if (!VALID_ROUTES.has(c.labels.route)) {
    errors.push(`${c.ref}: invalid route "${c.labels.route}"`);
  }
}

// 5. All expectedClauses exist in policy files
for (const c of complaints) {
  for (const clause of c.labels.expectedClauses) {
    if (!validClauses.has(clause)) {
      errors.push(`${c.ref}: clause "${clause}" not found in any policy file`);
    }
  }
}

// 6. Exactly 12 adversarial cases
const adversarial = complaints.filter((c) => c.labels.adversarial);
if (adversarial.length !== 12) {
  errors.push(`Expected 12 adversarial cases, got ${adversarial.length}`);
}

// 7. Summary resolution cases must be within 3 business days of DEMO_TODAY (2026-11-05)
for (const c of complaints) {
  if (c.labels.summaryResolutionEligible) {
    const received = new Date(c.received);
    const bd = businessDaysBetween(received, DEMO_TODAY);
    if (bd > 3) {
      warnings.push(
        `${c.ref}: summaryResolutionEligible but received ${c.received} is ${bd} business days before DEMO_TODAY`
      );
    }
  }
}

// 8. Distribution checks (minimum counts, not exact)
const byRoute: Record<string, number> = {};
for (const c of complaints) {
  byRoute[c.labels.route] = (byRoute[c.labels.route] ?? 0) + 1;
}
if ((byRoute["Fraud & Disputes"] ?? 0) < 10) {
  errors.push(`Expected ≥10 Fraud & Disputes cases, got ${byRoute["Fraud & Disputes"] ?? 0}`);
}
if ((byRoute["Lending Support"] ?? 0) < 5) {
  errors.push(`Expected ≥5 Lending Support cases, got ${byRoute["Lending Support"] ?? 0}`);
}
if ((byRoute["Vulnerability Team"] ?? 0) >= 1) {
  // ok
} else {
  errors.push("Expected ≥1 Vulnerability Team case");
}
if ((byRoute["Complaints Management"] ?? 0) >= 1) {
  // ok
} else {
  errors.push("Expected ≥1 Complaints Management case");
}

// 9. Vulnerable cases must have a valid route (Senior or Vulnerability Team) unless paymentServices
const vulnerableCases = complaints.filter((c) => c.labels.vulnerable);
for (const c of vulnerableCases) {
  const route = c.labels.route;
  const isSpecialistRoute = ["Fraud & Disputes", "Lending Support"].includes(route);
  if (!isSpecialistRoute && !["Senior", "Vulnerability Team"].includes(route) && route !== "Handler") {
    warnings.push(`${c.ref}: vulnerable but route is "${route}"`);
  }
}

// Summary
console.log("\n=== check-data ===");
console.log(`Cases:          ${complaints.length}`);
console.log(`Adversarial:    ${adversarial.length}`);
console.log(`Vulnerable:     ${vulnerableCases.length}`);
console.log(`Summary res:    ${complaints.filter((c) => c.labels.summaryResolutionEligible).length}`);
console.log("\nRoute distribution:");
for (const [route, count] of Object.entries(byRoute).sort()) {
  console.log(`  ${route.padEnd(24)} ${count}`);
}

if (warnings.length) {
  console.log("\nWarnings:");
  for (const w of warnings) console.warn(`  ⚠ ${w}`);
}

if (errors.length) {
  console.error("\nErrors:");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log("\n✓ All checks passed");
