import { addMonths, differenceInCalendarMonths, format } from "date-fns";
import {
  RATE_BASIS, TIERS, TIER_LABELS, isHsaEligible,
  type BenefitsInputs, type HealthLine, type HealthPlan, type RiskCoverage, type Tier,
} from "../state/benefits";

// Employer's monthly contribution for one enrollee in a plan tier, never more than the premium.
// Percent strategies can be capped at the same percent of a limit plan's premium.
export function employerContribution(plan: HealthPlan, line: HealthLine, tier: Tier) {
  const premium = plan.rates[tier] || 0;
  const f = line.funding;
  let amount: number;
  if (f.type === "flat") amount = f.flat[tier] || 0;
  else {
    const pct = (f.pct[tier] || 0) / 100;
    amount = premium * pct;
    // The limit plan can be any plan in the BSS appendix, not just a quoted one.
    const limit = f.limitPlanId ? [...line.plans, ...(line.appendix ?? [])].find((p) => p.id === f.limitPlanId) : undefined;
    if (limit) amount = Math.min(amount, (limit.rates[tier] || 0) * pct);
  }
  return Math.max(0, Math.min(premium, amount));
}

// Employer HSA contribution per enrollee per month (HSA-eligible plans only).
export function hsaContribution(plan: HealthPlan, line: HealthLine, tier: Tier) {
  return line.hsa?.enabled && isHsaEligible(plan) ? line.hsa.monthly[tier] || 0 : 0;
}

export function planTotals(plan: HealthPlan, line: HealthLine) {
  let premium = 0, employer = 0, hsa = 0, enrolled = 0;
  for (const t of TIERS) {
    const n = plan.enrollment[t] || 0;
    premium += (plan.rates[t] || 0) * n;
    employer += employerContribution(plan, line, t) * n;
    hsa += hsaContribution(plan, line, t) * n;
    enrolled += n;
  }
  return { premium, employer, employee: premium - employer, hsa, enrolled };
}

// Line totals; employer HSA contributions are an employer cost on top of premium.
export function healthLineTotals(line: HealthLine) {
  return line.plans.reduce(
    (acc, p) => {
      const t = planTotals(p, line);
      return {
        premium: acc.premium + t.premium,
        employer: acc.employer + t.employer + t.hsa,
        employee: acc.employee + t.employee,
        hsa: acc.hsa + t.hsa,
        enrolled: acc.enrolled + t.enrolled,
      };
    },
    { premium: 0, employer: 0, employee: 0, hsa: 0, enrolled: 0 },
  );
}

// Current (incumbent) plan totals from rates × enrollment.
export function currentPlanTotals(plans: HealthPlan[]) {
  return plans.reduce((a, p) => {
    for (const t of TIERS) { a.premium += (p.rates[t] || 0) * (p.enrollment[t] || 0); a.enrolled += p.enrollment[t] || 0; }
    return a;
  }, { premium: 0, enrolled: 0 });
}

export function riskPremium(c: RiskCoverage) {
  if (!c.enabled) return { premium: 0, employer: 0, employee: 0 };
  const premium = c.quotedMonthly > 0 ? c.quotedMonthly : (c.rate || 0) * ((c.volume || 0) / RATE_BASIS[c.basis].unit);
  const employer = c.employeePaid ? 0 : (premium * Math.min(100, Math.max(0, c.employerPct || 0))) / 100;
  return { premium, employer, employee: premium - employer };
}

// 401(k) employer cost: matching contributions plus plan fees (if the employer pays them).
export function retirementCosts(b: BenefitsInputs) {
  const r = b.retirement;
  const participants = Math.round((r.eligibleEmployees || 0) * (r.participationPct || 0) / 100);
  const participatingPayroll = (r.eligiblePayroll || 0) * (r.participationPct || 0) / 100;
  const matchedPct = Math.min(r.avgDeferralPct || 0, r.matchUpToPct || 0);
  const matchAnnual = participatingPayroll * (matchedPct / 100) * ((r.matchPct || 0) / 100);
  const feesAnnual = (r.adminFeeAnnual || 0) + (r.perParticipantFeeAnnual || 0) * participants;
  const deferralsAnnual = participatingPayroll * ((r.avgDeferralPct || 0) / 100);
  const employerAnnual = matchAnnual + (r.employerPaysFees ? feesAnnual : 0);
  return { participants, matchAnnual, feesAnnual, deferralsAnnual, employerAnnual, employerMonthly: employerAnnual / 12 };
}

const usdShort = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export type LineSummary = { key: string; label: string; path: string; premium: number; employer: number; employee: number; note?: string };

// Monthly totals for every benefit line, for the financial summary.
export function benefitsSummary(b: BenefitsInputs) {
  const lines: LineSummary[] = [];
  const health = (key: "medical" | "dental" | "vision", label: string) => {
    if (key === "medical" && b.medicalCarvedOut) {
      lines.push({ key, label, path: key, premium: 0, employer: 0, employee: 0, note: "Carved out: the company keeps its current medical plan" });
      return;
    }
    const t = healthLineTotals(b[key]);
    const notes = [t.enrolled ? `${t.enrolled} enrolled` : "", t.hsa ? `incl. ${usdShort(t.hsa)} HSA` : ""].filter(Boolean);
    lines.push({ key, label, path: key, premium: t.premium + t.hsa, employer: t.employer, employee: t.employee, note: notes.join(" · ") || undefined });
  };
  health("medical", "Medical");
  health("dental", "Dental");
  health("vision", "Vision");
  for (const id of ["std", "ltd", "life"] as const) {
    const c = b.risk.find((r) => r.id === id)!;
    const label = id === "std" ? "STD" : id === "ltd" ? "LTD" : "Life / AD&D";
    const note = c.enabled ? [c.benefit, c.employeePaid ? "Employee paid" : ""].filter(Boolean).join(" · ") : "";
    lines.push({ key: id, label, path: "disability-life", ...riskPremium(c), note: note || undefined });
  }
  const vol = b.voluntary.reduce((a, v) => {
    const employer = (v.monthlyPremium || 0) * Math.min(100, Math.max(0, v.employerPct || 0)) / 100;
    return { premium: a.premium + (v.monthlyPremium || 0), employer: a.employer + employer, employee: a.employee + (v.monthlyPremium || 0) - employer };
  }, { premium: 0, employer: 0, employee: 0 });
  lines.push({ key: "voluntary", label: "Voluntary", path: "voluntary", ...vol });
  const k = retirementCosts(b);
  lines.push({ key: "401k", label: "401(k)", path: "401k", premium: k.employerMonthly, employer: k.employerMonthly, employee: 0, note: "Employer match and fees" });

  const total = lines.reduce((a, l) => ({ premium: a.premium + l.premium, employer: a.employer + l.employer, employee: a.employee + l.employee }), { premium: 0, employer: 0, employee: 0 });
  return { lines, total, medicalEnrolled: b.medicalCarvedOut ? 0 : healthLineTotals(b.medical).enrolled };
}

// Current (incumbent) vs. TriNet monthly cost by line. TriNet figures follow the current funding strategy.
export function currentVsTrinet(b: BenefitsInputs, currentRenewalDate = "") {
  const renewal = renewalProjection(currentRenewalDate, b.effectiveDate, b.current.anticipatedRenewalPct);
  const factor = renewal && b.current.anticipatedRenewalPct ? renewal.factor : 1;
  const med = healthLineTotals(b.medical);
  const den = healthLineTotals(b.dental);
  const vis = healthLineTotals(b.vision);
  const life = riskPremium(b.risk.find((r) => r.id === "life")!);
  const dis = b.risk.filter((r) => r.id !== "life").map(riskPremium).reduce((a, r) => ({ employer: a.employer + r.employer, employee: a.employee + r.employee }), { employer: 0, employee: 0 });
  const c = b.current;
  const all = [
    { key: "medical" as const, label: "Medical", current: c.noCurrentMedical ? { employer: 0, employee: 0 } : { employer: c.medical.employer * factor, employee: c.medical.employee * factor }, trinet: { employer: med.employer, employee: med.employee } },
    { key: "dental" as const, label: "Dental", current: c.dental, trinet: { employer: den.employer, employee: den.employee } },
    { key: "vision" as const, label: "Vision", current: c.vision, trinet: { employer: vis.employer, employee: vis.employee } },
    { key: "life" as const, label: "Life / AD&D", current: c.life, trinet: { employer: life.employer, employee: life.employee } },
    { key: "disability" as const, label: "Disability", current: c.disability, trinet: dis },
  ];
  // A carved-out medical plan stays the same either way, so it's left out of the comparison.
  const rows = b.medicalCarvedOut ? all.filter((r) => r.key !== "medical") : all;
  const sum = (k: "current" | "trinet") => rows.reduce((a, r) => ({ employer: a.employer + r[k].employer, employee: a.employee + r[k].employee }), { employer: 0, employee: 0 });
  return { rows, current: sum("current"), trinet: sum("trinet"), renewal, factor };
}

// Funding rule: the employer must contribute at least 50% of the lowest-cost plan (employee-only rate).
export const MIN_FUNDING_PCT = 50;
export function fundingCheck(line: HealthLine) {
  const priced = line.plans.filter((p) => (p.rates.ee || 0) > 0);
  if (priced.length === 0) return null;
  const lowest = priced.reduce((a, p) => (p.rates.ee < a.rates.ee ? p : a));
  const minimum = (lowest.rates.ee * MIN_FUNDING_PCT) / 100;
  const contributions = priced.map((p) => ({ plan: p, amount: employerContribution(p, line, "ee") }));
  const short = contributions.filter((c) => c.amount + 0.005 < minimum);
  return { ok: short.length === 0, lowest, minimum, short };
}

// Anticipated renewal: TriNet medical renews quarterly (Jan, Apr, Jul, Oct 1), so TriNet's quoted rate holds from
// the start date to the last quarterly renewal within 12 months. Months in that window after the current plan's
// renewal get the anticipated increase.
export function renewalProjection(currentRenewal: string, trinetStart: string, pct: number) {
  if (!currentRenewal || !trinetStart) return null;
  const start = new Date(trinetStart + "T00:00:00");
  const yearOut = addMonths(start, 12);
  let trinetRenewal = new Date(yearOut.getFullYear(), Math.floor(yearOut.getMonth() / 3) * 3, 1);
  if (trinetRenewal <= start) trinetRenewal = addMonths(trinetRenewal, 3);
  const windowMonths = differenceInCalendarMonths(trinetRenewal, start);
  let renewal = new Date(currentRenewal + "T00:00:00");
  while (renewal < start) renewal = addMonths(renewal, 12);
  while (addMonths(renewal, -12) >= start) renewal = addMonths(renewal, -12);
  const increaseMonths = Math.max(0, Math.min(windowMonths, differenceInCalendarMonths(trinetRenewal, renewal)));
  const factor = 1 + ((pct || 0) / 100) * (windowMonths ? increaseMonths / windowMonths : 0);
  return {
    trinetRenewal: format(trinetRenewal, "MMM d, yyyy"),
    currentRenewal: format(renewal, "MMM d, yyyy"),
    windowMonths, increaseMonths, factor,
  };
}

// Per-employee monthly costs under the current funding strategy, from an imported census.
export function employeeCosts(b: BenefitsInputs) {
  const cost = (key: "medical" | "dental" | "vision", planName: string, tier: Tier) => {
    const line = b[key];
    const plan = planName ? line.plans.find((p) => p.name === planName) : undefined;
    if (!plan) return null;
    const employer = employerContribution(plan, line, tier) + hsaContribution(plan, line, tier);
    const premium = plan.rates[tier] || 0;
    return { plan: plan.name, employer, employee: premium - employerContribution(plan, line, tier) };
  };
  return b.census.map((e) => {
    const medical = b.medicalCarvedOut ? null : cost("medical", e.medical, e.tier);
    const dental = cost("dental", e.dental, e.tier);
    const vision = cost("vision", e.vision, e.tier);
    const employer = (medical?.employer ?? 0) + (dental?.employer ?? 0) + (vision?.employer ?? 0);
    const employee = (medical?.employee ?? 0) + (dental?.employee ?? 0) + (vision?.employee ?? 0);
    return { ...e, tierLabel: TIER_LABELS[e.tier], medicalCost: medical, dentalCost: dental, visionCost: vision, employer, employee };
  });
}

export type CensusLine = "medical" | "dental" | "vision";

// Move one employee to another plan (or waive, with planName ""), keeping plan enrollment counts in step.
// A plan picked from the BSS appendix is added to the quote.
export function remapEmployee(b: BenefitsInputs, employeeId: string, key: CensusLine, planName: string): BenefitsInputs {
  const e = b.census.find((x) => x.id === employeeId);
  if (!e || e[key] === planName) return b;
  let plans = b[key].plans.map((p) => (p.name === e[key] ? { ...p, enrollment: { ...p.enrollment, [e.tier]: Math.max(0, (p.enrollment[e.tier] || 0) - 1) } } : p));
  if (planName) {
    if (!plans.some((p) => p.name === planName)) {
      const fromAppendix = b[key].appendix.find((p) => p.name === planName);
      if (!fromAppendix) return b;
      plans = [...plans, { ...fromAppendix, id: crypto.randomUUID(), enrollment: { ee: 0, es: 0, ec: 0, ef: 0 } }];
    }
    plans = plans.map((p) => (p.name === planName ? { ...p, enrollment: { ...p.enrollment, [e.tier]: (p.enrollment[e.tier] || 0) + 1 } } : p));
  }
  return {
    ...b,
    [key]: { ...b[key], plans },
    census: b.census.map((x) => (x.id === employeeId ? { ...x, [key]: planName } : x)),
  };
}

// Change an employee's coverage tier, moving their enrollment in each plan they're in.
export function retierEmployee(b: BenefitsInputs, employeeId: string, tier: Tier): BenefitsInputs {
  const e = b.census.find((x) => x.id === employeeId);
  if (!e || e.tier === tier) return b;
  const move = (key: CensusLine) => ({
    ...b[key],
    plans: b[key].plans.map((p) => p.name !== e[key] ? p : {
      ...p,
      enrollment: { ...p.enrollment, [e.tier]: Math.max(0, (p.enrollment[e.tier] || 0) - 1), [tier]: (p.enrollment[tier] || 0) + 1 },
    }),
  });
  return {
    ...b,
    medical: e.medical ? move("medical") : b.medical,
    dental: e.dental ? move("dental") : b.dental,
    vision: e.vision ? move("vision") : b.vision,
    census: b.census.map((x) => (x.id === employeeId ? { ...x, tier } : x)),
  };
}
