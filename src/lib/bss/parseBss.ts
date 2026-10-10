// Parses a TriNet Benefit Strategy Summary (BSS) PDF, already split into text lines per page.
// Employee-level census rows are aggregated into plans (rates × enrollment by tier) and kept per employee.
import {
  TIERS, zeroTiers, percentFunding, emptyRisk,
  riskDesignFromName,
  type CensusEmployee, type CostSplit, type CurrentCosts, type FundingStrategy, type HealthPlan, type PlanDesign, type RateBasis,
  type RiskCoverage, type RiskOptions, type Tier, type TierValues,
} from "../../state/benefits";

const MONEY = /\$([\d,]+\.\d{2})/g;
const money = (s: string) => parseFloat(s.replace(/[$,]/g, ""));
const moneyAll = (line: string) => [...line.matchAll(MONEY)].map((m) => money(m[1]));
const TIER_CODES: Record<string, Tier> = { "EE": "ee", "EE+S": "es", "EE+C": "ec", "FAM": "ef" };

export type BssLine = "medical" | "dental" | "vision";

export type ParsedLine = {
  plans: HealthPlan[];
  appendix: HealthPlan[]; // every plan in the BSS "Plan Attributes & Rates" appendix
  currentPlans: HealthPlan[];
  funding: (FundingStrategy & { limitPlanName: string }) | null;
  proposedTotal: CostSplit | null; // "Proposed Group Total" from the report
  currentTotal: CostSplit | null;
  employees: number;
  rows: { name: string; state: string; tier: Tier; plan: string; current: CensusEmployee["current"] }[];
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
  riskOptions: RiskOptions;
  disabilityPackage: string;
  current: Omit<CurrentCosts, "noCurrentMedical" | "anticipatedRenewalPct">;
  census: CensusEmployee[];
  companyName: string;
  employeeCount: number;
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

// In-network plan design from an appendix row's attribute text (everything between the plan name and the rates).
function planDesign(line: BssLine, attrs: string): PlanDesign {
  const d = (label: string, value: string | undefined) => ({ label, value: (value ?? "").trim() });
  if (line === "medical") {
    const m = attrs.match(/^(\$[\d,]+ \/ \$[\d,]+) (\$[\d,]+ \/ \$[\d,]+) (\d+%) (.+)$/);
    if (m) {
      // Copays (PCP / specialist / urgent care / ER) then Rx tiers 1 / 2 / 3, all separated by " / ".
      const parts = m[4].split(" / ");
      const erRx = parts[3]?.match(/^(\S+(?: \*)?) (.+)$/);
      if (parts.length === 6 && erRx) {
        return [
          d("Deductible (single / family)", m[1]), d("Out-of-pocket max (single / family)", m[2]), d("Coinsurance", m[3]),
          d("Primary care", parts[0]), d("Specialist", parts[1]), d("Urgent care", parts[2]), d("Emergency room", erRx[1]),
          d("Rx tier 1 / 2 / 3", [erRx[2], parts[4], parts[5]].join(" / ")),
        ];
      }
    }
  }
  if (line === "dental") {
    const m = attrs.match(/^(\$[\d,]+ \/ \$[\d,]+) (\d+%) (\d+%) (\d+%) (\$[\d,]+) (.+?) (\S+\/\S+\/\S+)$/);
    if (m) {
      const ortho = m[6].match(/^(\$[\d,]+|N\/A|Not Covered)/i)?.[1] ?? m[6];
      return [
        d("Deductible (single / family)", m[1]), d("Preventive", m[2]), d("Basic", m[3]), d("Major", m[4]),
        d("Annual maximum", m[5]), d("Orthodontia", ortho), d("Endo / perio / oral surgery", m[7].replace(/\//g, " / ")),
      ];
    }
  }
  if (line === "vision") {
    const m = attrs.match(/^(\$\S+) (\$\S+) (\$\S+) (Every \d+ months) (Every \d+ months) (Every \d+ months)$/);
    if (m) {
      return [
        d("Exam copay", m[1]), d("Materials copay", m[2]), d("Frame allowance", m[3]),
        d("Exam frequency", m[4]), d("Frame frequency", m[5]), d("Lens or contacts frequency", m[6]),
      ];
    }
  }
  return attrs ? [d("Plan details", attrs)] : [];
}

// The "Plan Attributes & Rates" appendix: every available plan for each line, with rates for all four tiers.
function parseAppendix(pages: string[][]) {
  const out: Record<BssLine, HealthPlan[]> = { medical: [], dental: [], vision: [] };
  let current: BssLine | null = null;
  for (const page of pages) {
    const head = page.findIndex((l) => /^Plan Attributes & Rates/.test(l));
    if (head < 0) { current = null; continue; }
    const cont = page[head].match(/: (Medical|Dental|Vision) \(cont\.\)/)?.[1];
    const named = (cont ?? page[head + 1] ?? "").toLowerCase();
    if (named === "medical" || named === "dental" || named === "vision") current = named;
    if (!current) continue;
    for (const l of page.slice(head + 1)) {
      const rates = moneyAll(l);
      const first = l.indexOf("$");
      if (rates.length < 4 || first <= 0) continue;
      const name = l.slice(0, first).trim();
      // Attributes run from the first "$" to just before the last four rates.
      const tail = l.slice(first);
      const lastFour = [...tail.matchAll(MONEY)].slice(-4);
      const attrs = tail.slice(0, lastFour[0].index).trim();
      const [ee, es, ec, ef] = lastFour.map((x) => money(x[1]));
      const plan = toPlan({ name, rates: { ee, es, ec, ef }, enrollment: zeroTiers() }, "");
      plan.design = planDesign(current, attrs);
      if (!out[current].some((p) => p.name === name)) out[current].push(plan);
    }
  }
  return out;
}

// Match a quoted plan to its appendix row: same name, or the appendix name is the start of the quoted name.
function findInAppendix(name: string, appendix: HealthPlan[]) {
  const n = name.toLowerCase();
  return appendix.find((p) => p.name.toLowerCase() === n)
    ?? appendix.filter((p) => n.startsWith(p.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length)[0];
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
  const rows: ParsedLine["rows"] = [];
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
      const cur = hasCurrent && groups.length > 1 ? groups[0] : null;
      if (cur) addRow(current, cur[1], tier, money(cur[4]));
      rows.push({
        name: m[1].trim(), state: m[2], tier, plan: prop[1].trim(),
        current: cur ? { plan: cur[1].trim(), employer: money(cur[2]), employee: money(cur[3]) } : null,
      });
    }
  }
  for (const a of [...proposed.values(), ...current.values()]) fillRates(a, table);
  const carrier = [...proposed.keys()][0]?.split(" ")[0] ?? "";
  return {
    appendix: [],
    plans: [...proposed.values()].map((a) => toPlan(a, carrier)),
    currentPlans: [...current.values()].map((a) => toPlan(a, "")),
    funding, proposedTotal, currentTotal, employees, rows,
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

const BASIS: Record<string, RateBasis> = { "1,000": "per1000", "100": "per100", "10": "per10" };

// "Disability - All Plan Options" packages and "Life and AD&D - All Plan Options".
function parseRiskOptions(pages: string[][]): RiskOptions {
  const disability: RiskOptions["disability"] = [];
  const life: RiskOptions["life"] = [];
  let section: "disability" | "life" | null = null;
  for (const page of pages) {
    if (page.some((l) => /Disability - All Plan Options/.test(l))) section = "disability";
    else if (page.some((l) => /Life and AD&D - All Plan Options/.test(l))) section = "life";
    else if (!page.some((l) => /^Plan Rates & Attributes/.test(l))) section = null;
    if (!section) continue;
    for (const l of page) {
      if (section === "disability") {
        const pkg = l.match(/^W2 - (.+?) \$([\d,]+\.\d{2})$/);
        if (pkg) { disability.push({ name: pkg[1], monthly: money(pkg[2]), rows: [] }); continue; }
        const r = l.match(/^(STD|LTD) (.+?) \$([\d.]+) \$(1,000|100|10) of covered(?: payroll)? (\d+) \$([\d,]+\.\d{2}) \$([\d,]+\.\d{2})/);
        if (r && disability.length) {
          const plan = r[2].split(/ (?:Other States|All States|[A-Z]{2},)/)[0].trim();
          const states = r[2].slice(plan.length).trim();
          disability[disability.length - 1].rows.push({
            type: r[1] as "STD" | "LTD", plan, states, rate: parseFloat(r[3]), basis: BASIS[r[4]],
            employees: parseInt(r[5], 10), volume: money(r[6]), monthly: money(r[7]),
          });
        }
      } else {
        const lf = l.match(/^(.+?Life & AD&D) \$([\d.]+) \$1,000 of covered(?: payroll)? (\d+) \$([\d,]+\.\d{2}) \$([\d,]+\.\d{2})/);
        if (lf && !life.some((x) => x.plan === lf[1])) {
          life.push({ plan: lf[1], rate: parseFloat(lf[2]), employees: parseInt(lf[3], 10), volume: money(lf[4]), monthly: money(lf[5]) });
        }
      }
    }
  }
  return { disability, life };
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
  const appendix = parseAppendix(pages);
  (Object.keys(lines) as BssLine[]).forEach((k) => {
    lines[k].appendix = appendix[k];
    for (const p of lines[k].plans) p.design = findInAppendix(p.name, appendix[k])?.design ?? p.design;
  });
  const { risk, pkg } = parseRisk(pages);
  for (const c of risk) {
    c.employeePaid = c.enabled && /employee paid/i.test(c.benefit);
    if (c.employeePaid) c.employerPct = 0;
    c.design = riskDesignFromName(c.id, c.benefit);
  }
  const riskOptions = parseRiskOptions(pages);
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

  // One record per employee across medical, dental and vision (matched on name and state).
  const people = new Map<string, CensusEmployee>();
  (["medical", "dental", "vision"] as const).forEach((k) => {
    const seen = new Map<string, number>();
    for (const r of lines[k].rows) {
      // Same name and state can belong to two people; rows are listed in the same order on every census page.
      const base = `${r.name}|${r.state}`;
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      const key = `${base}|${n}`;
      const e = people.get(key) ?? { id: crypto.randomUUID(), name: r.name, state: r.state, tier: r.tier, current: null, medical: "", dental: "", vision: "" };
      e[k] = r.plan;
      if (k === "medical") { e.tier = r.tier; e.current = r.current; }
      people.set(key, e);
    }
  });
  const census = [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
  const title = all.findIndex((l) => l.startsWith("Benefit Strategy Summary for"));
  const companyName = title >= 0
    ? (all[title].replace("Benefit Strategy Summary for", "").trim() || (!/Plan Year|Contingent/.test(all[title + 1] ?? "") ? all[title + 1] ?? "" : "")).trim()
    : "";
  const employeeCount = Math.max(census.length, ...risk.map((c) => c.employees));

  return {
    census, companyName, employeeCount,
    effectiveDate: eff ? `${eff[3]}-${eff[1]}-${eff[2]}` : "",
    planYear: text.match(/Plan Year ?(\d{2}\/\d{2}\/\d{4} - \d{2}\/\d{2}\/\d{4})/)?.[1] ?? "",
    proposalNumber: footer.match(/Proposal Number: ([\w-]+)/)?.[1] ?? "",
    strategy: footer.match(/Strategy: (.+?)(?: States:| \.|$)/)?.[1]?.trim() ?? "",
    primaryCarrier: all.find((l) => l.startsWith("Primary Medical Carrier:"))?.replace("Primary Medical Carrier:", "").trim() ?? "",
    states: footer.match(/States: ([A-Z, ]+)/)?.[1]?.replace(/[ ,]+$/, "").trim() ?? "",
    lines,
    risk,
    riskOptions,
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
