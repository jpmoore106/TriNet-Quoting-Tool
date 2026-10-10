// Parses a TriNet Benefit Strategy Summary (BSS) PDF, already split into text lines per page.
// Employee-level census rows are aggregated into plans (rates × enrollment by tier); employee names are not kept.
import {
  TIERS, zeroTiers, percentFunding, emptyRisk,
  type CostSplit, type CurrentCosts, type FundingStrategy, type HealthPlan, type RiskCoverage, type Tier, type TierValues,
} from "../../state/benefits";

const MONEY = /\$([\d,]+\.\d{2})/g;
const money = (s: string) => parseFloat(s.replace(/[$,]/g, ""));
const moneyAll = (line: string) => [...line.matchAll(MONEY)].map((m) => money(m[1]));
const TIER_CODES: Record<string, Tier> = { "EE": "ee", "EE+S": "es", "EE+C": "ec", "FAM": "ef" };

export type BssLine = "medical" | "dental" | "vision";

export type ParsedLine = {
  plans: HealthPlan[];
  currentPlans: HealthPlan[];
  funding: (FundingStrategy & { limitPlanName: string }) | null;
  proposedTotal: CostSplit | null; // "Proposed Group Total" from the report
  currentTotal: CostSplit | null;
  employees: number;
};

export type BssResult = {
  effectiveDate: string; // yyyy-MM-dd
  planYear: string;
  proposalNumber: string;
  strategy: string;
  primaryCarrier: string;
  states: string;
  lines: Record<BssLine, ParsedLine>;
  risk: RiskCoverage[];
  disabilityPackage: string;
  current: Omit<CurrentCosts, "noCurrentMedical">;
  trinetSummary: Partial<Record<"medical" | "dental" | "vision" | "life" | "disability", CostSplit>>;
  checks: { label: string; expected: number; actual: number; ok: boolean }[];
  warnings: string[];
};

type PlanAgg = { name: string; rates: Partial<TierValues>; enrollment: TierValues };

function planType(name: string) {
  const m = name.match(/\b(HDHP|PPO|HMO|EPO|POS|HSA)\b/i);
  return m ? m[1].toUpperCase() : "";
}

function toPlan(a: PlanAgg, carrierHint: string): HealthPlan {
  const type = planType(a.name);
  const firstWord = a.name.split(" ")[0];
  const carrier = /^(aetna|guardian|delta|vsp|eyemed|kaiser|cigna|uhc|united|anthem|blue)/i.test(firstWord) ? firstWord.replace(/^AETNA$/, "Aetna") : carrierHint;
  return {
    id: crypto.randomUUID(), name: a.name, carrier, planType: type, hsaEligible: type === "HDHP" || type === "HSA",
    rates: { ...zeroTiers(), ...a.rates }, enrollment: a.enrollment,
  };
}

function addRow(map: Map<string, PlanAgg>, name: string, tier: Tier, total: number) {
  const key = name.trim();
  const agg = map.get(key) ?? { name: key, rates: {}, enrollment: zeroTiers() };
  agg.enrollment[tier] += 1;
  agg.rates[tier] ??= total;
  map.set(key, agg);
}

// Rates for every tier (including tiers with nobody enrolled) from the plan comparison and attribute tables.
function rateTable(pages: string[][]) {
  const rows: { name: string; rates: number[] }[] = [];
  for (const page of pages) {
    const text = page.join("\n");
    if (!/Plan Comparison|Plan Attributes & Rates/.test(text)) continue;
    for (const line of page) {
      const values = moneyAll(line);
      const firstDollar = line.indexOf("$");
      if (values.length < 4 || firstDollar <= 0) continue;
      const name = line.slice(0, firstDollar).replace(/^Current Plan\s+/, "").replace(/^Sponsored Plans\s+/, "").trim();
      if (!name || /^(Plan Name|Deductible)/.test(name)) continue;
      rows.push({ name, rates: values.slice(-4) });
    }
  }
  return rows;
}

// Fill unknown tier rates from the rate table, matching on plan name prefix and the tiers we already know.
function fillRates(agg: PlanAgg, table: { name: string; rates: number[] }[]) {
  const known = TIERS.filter((t) => agg.rates[t] != null);
  if (known.length === 4) return;
  const candidates = table
    .filter((r) => agg.name.toLowerCase().startsWith(r.name.toLowerCase()))
    .filter((r) => known.every((t) => Math.abs(r.rates[TIERS.indexOf(t)] - (agg.rates[t] as number)) < 0.01))
    .sort((a, b) => b.name.length - a.name.length);
  if (candidates[0]) TIERS.forEach((t, i) => { agg.rates[t] ??= candidates[0].rates[i]; });
}

function parseFunding(lines: string[]) {
  const head = lines.find((l) => l.startsWith("Contribution Type"));
  if (!head) return null;
  const type = /Flat|Dollar/i.test(head) ? "flat" : "percent";
  const limit = head.match(/Contribution Limit\s+(.+)$/)?.[1]?.trim() ?? "None";
  const tiersLine = lines[lines.indexOf(head) + 1] ?? "";
  const grab = (label: string) => {
    const m = tiersLine.match(new RegExp(`${label.replace("+", "\\+")}\\s+\\$?([\\d,.]+)%?`));
    return m ? parseFloat(m[1].replace(/,/g, "")) : 0;
  };
  const values: TierValues = { ee: grab("EE"), es: grab("EE+Spouse"), ec: grab("EE+Children"), ef: grab("EE+Family") };
  const f = percentFunding(0);
  return type === "flat"
    ? { ...f, type: "flat" as const, flat: values, limitPlanName: "" }
    : { ...f, pct: values, limitPlanName: /^none$/i.test(limit) ? "" : limit };
}

const ROW = /^(.+?) ([A-Z]{2}) (EE\+S|EE\+C|EE|FAM) (.+)$/;

function parseCensus(pages: string[][], line: BssLine, table: { name: string; rates: number[] }[]): ParsedLine {
  const proposed = new Map<string, PlanAgg>();
  const current = new Map<string, PlanAgg>();
  let funding: ParsedLine["funding"] = null;
  let proposedTotal: CostSplit | null = null;
  let currentTotal: CostSplit | null = null;
  let employees = 0;
  const title = new RegExp(`^Employee-Level Cost Comparison(: )?${line}`, "i");
  for (const page of pages) {
    const isSection = page.some((l, i) => title.test(l) || (l === "Employee-Level Cost Comparison" && page[i + 1]?.toLowerCase() === line));
    if (!isSection) continue;
    const hasCurrent = page.some((l) => l.includes("Current Strategy"));
    funding ??= parseFunding(page);
    for (const l of page) {
      const pt = l.match(/Proposed Group Total: ER \$([\d,]+\.\d{2}) EE \$([\d,]+\.\d{2})/);
      if (pt) proposedTotal = { employer: money(pt[1]), employee: money(pt[2]) };
      const ct = l.match(/Current Group Total: ER \$([\d,]+\.\d{2}) EE \$([\d,]+\.\d{2})/);
      if (ct) currentTotal = { employer: money(ct[1]), employee: money(ct[2]) };
      const m = l.match(ROW);
      if (!m || l.startsWith("Name State")) continue;
      const tier = TIER_CODES[m[3]];
      // Plan name, then ER, EE, Total — once for the current plan (if shown) and once for the proposed plan.
      const groups = [...m[4].matchAll(/(.+?) \$([\d,]+\.\d{2}) \$([\d,]+\.\d{2}) \$([\d,]+\.\d{2})/g)];
      if (groups.length === 0) continue;
      employees++;
      const prop = groups[hasCurrent && groups.length > 1 ? 1 : 0];
      addRow(proposed, prop[1], tier, money(prop[4]));
      if (hasCurrent && groups.length > 1) addRow(current, groups[0][1], tier, money(groups[0][4]));
    }
  }
  for (const a of [...proposed.values(), ...current.values()]) fillRates(a, table);
  const carrier = [...proposed.keys()][0]?.split(" ")[0] ?? "";
  return {
    plans: [...proposed.values()].map((a) => toPlan(a, carrier)),
    currentPlans: [...current.values()].map((a) => toPlan(a, "")),
    funding, proposedTotal, currentTotal, employees,
  };
}

function parseSummaryTable(pages: string[][]) {
  const current: Record<string, CostSplit> = {};
  const trinet: Record<string, CostSplit> = {};
  const page = pages.find((p) => p.some((l) => l.includes("Current Benefits Costs vs TriNet")));
  const keys: Record<string, string> = { "Medical": "medical", "Dental": "dental", "Vision": "vision", "Life / AD&D": "life", "Disability": "disability" };
  for (const l of page ?? []) {
    const label = Object.keys(keys).find((k) => l.startsWith(k + " "));
    if (!label) continue;
    const v = moneyAll(l);
    if (v.length < 5) continue;
    const curTotal = v[v.length - 4];
    current[keys[label]] = { employer: v[0], employee: Math.max(0, curTotal - v[0]) };
    trinet[keys[label]] = { employer: v[v.length - 3], employee: v[v.length - 2] };
  }
  return { current, trinet };
}

function parseRisk(pages: string[][]) {
  const risk = emptyRisk();
  let pkg = "";
  const page = pages.find((p) => p[0]?.startsWith("Selected Plans") && p.some((l) => l.includes("Disability")));
  if (!page) return { risk, pkg };
  const std = risk.find((r) => r.id === "std")!;
  const ltd = risk.find((r) => r.id === "ltd")!;
  const life = risk.find((r) => r.id === "life")!;
  for (const l of page) {
    const p = l.match(/^W2 - (.+?) \$([\d,]+\.\d{2})$/);
    if (p) pkg = p[1];
    const d = l.match(/^(STD|LTD) (.+?) \$([\d.]+) \$(1,000|100|10) of covered(?: payroll)? (\d+) \$([\d,]+\.\d{2}) \$([\d,]+\.\d{2})/);
    if (d) {
      const c = d[1] === "STD" ? std : ltd;
      const plan = d[2].split(/ (?:Other States|All States|[A-Z]{2},)/)[0].trim();
      if (!c.enabled) {
        Object.assign(c, { enabled: true, carrier: "TriNet", benefit: plan, rate: parseFloat(d[3]), basis: d[4] === "1,000" ? "per1000" : d[4] === "10" ? "per10" : "per100", volume: 0, quotedMonthly: 0, employees: 0, employerPct: /employee paid/i.test(plan) ? 0 : 100 });
      }
      c.volume += money(d[6]);
      c.quotedMonthly += money(d[7]);
      c.employees += parseInt(d[5], 10);
    }
    const lf = l.match(/^(.+?Life & AD&D) \$([\d.]+) \$1,000 of covered(?: payroll)? (\d+) \$([\d,]+\.\d{2}) \$([\d,]+\.\d{2})/);
    if (lf && !life.enabled) {
      Object.assign(life, { enabled: true, carrier: "TriNet", benefit: lf[1], rate: parseFloat(lf[2]), basis: "per1000", volume: money(lf[4]), quotedMonthly: money(lf[5]), employees: parseInt(lf[3], 10), employerPct: 100 });
    }
  }
  for (const c of risk) c.quotedMonthly = Math.round(c.quotedMonthly * 100) / 100;
  return { risk, pkg };
}

export function parseBss(pages: string[][]): BssResult {
  const all = pages.flat();
  const text = all.join("\n");
  if (!/Benefit Strategy Summary|Current Benefits Costs vs TriNet|Employee-Level Cost Comparison/.test(text)) {
    throw new Error("This doesn't look like a TriNet Benefit Strategy Summary.");
  }
  const footer = all.find((l) => l.includes("Proposal Number")) ?? "";
  const eff = footer.match(/Effective: (\d{2})\/(\d{2})\/(\d{4})/);
  const table = rateTable(pages);
  const lines = {
    medical: parseCensus(pages, "medical", table),
    dental: parseCensus(pages, "dental", table),
    vision: parseCensus(pages, "vision", table),
  };
  const { risk, pkg } = parseRisk(pages);
  const summary = parseSummaryTable(pages);
  const zero = { employer: 0, employee: 0 };

  // Check our aggregation against the report's own totals.
  const checks: BssResult["checks"] = [];
  (Object.keys(lines) as BssLine[]).forEach((k) => {
    const l = lines[k];
    const premium = l.plans.reduce((a, p) => a + TIERS.reduce((s, t) => s + p.rates[t] * p.enrollment[t], 0), 0);
    const expected = l.proposedTotal ? l.proposedTotal.employer + l.proposedTotal.employee : summary.trinet[k] ? summary.trinet[k].employer + summary.trinet[k].employee : NaN;
    if (!Number.isNaN(expected)) checks.push({ label: `${k[0].toUpperCase()}${k.slice(1)} premium`, expected, actual: premium, ok: Math.abs(expected - premium) < 1 });
  });
  const warnings: string[] = [];
  (Object.keys(lines) as BssLine[]).forEach((k) => {
    if (lines[k].plans.length === 0) warnings.push(`No ${k} plans found.`);
    lines[k].plans.forEach((p) => {
      const missing = TIERS.filter((t) => !p.rates[t]);
      if (missing.length) warnings.push(`${p.name}: no rate found for ${missing.length} tier(s) with nobody enrolled.`);
    });
  });

  return {
    effectiveDate: eff ? `${eff[3]}-${eff[1]}-${eff[2]}` : "",
    planYear: text.match(/Plan Year ?(\d{2}\/\d{2}\/\d{4} - \d{2}\/\d{2}\/\d{4})/)?.[1] ?? "",
    proposalNumber: footer.match(/Proposal Number: ([\w-]+)/)?.[1] ?? "",
    strategy: footer.match(/Strategy: (.+?)(?: States:| \.|$)/)?.[1]?.trim() ?? "",
    primaryCarrier: all.find((l) => l.startsWith("Primary Medical Carrier:"))?.replace("Primary Medical Carrier:", "").trim() ?? "",
    states: footer.match(/States: ([A-Z, ]+)/)?.[1]?.replace(/[ ,]+$/, "").trim() ?? "",
    lines,
    risk,
    disabilityPackage: pkg,
    current: {
      medical: summary.current.medical ?? lines.medical.currentTotal ?? zero,
      dental: summary.current.dental ?? zero,
      vision: summary.current.vision ?? zero,
      life: summary.current.life ?? zero,
      disability: summary.current.disability ?? zero,
    },
    trinetSummary: summary.trinet,
    checks,
    warnings,
  };
}
