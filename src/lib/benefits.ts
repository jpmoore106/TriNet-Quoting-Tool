import {
  RATE_BASIS, TIERS,
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
    const limit = f.limitPlanId ? line.plans.find((p) => p.id === f.limitPlanId) : undefined;
    if (limit) amount = Math.min(amount, (limit.rates[tier] || 0) * pct);
  }
  return Math.max(0, Math.min(premium, amount));
}

// Employer HSA contribution per enrollee per month (HSA-eligible plans only).
export function hsaContribution(plan: HealthPlan, line: HealthLine, tier: Tier) {
  return line.hsa?.enabled && plan.hsaEligible ? line.hsa.monthly[tier] || 0 : 0;
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
  const employer = (premium * Math.min(100, Math.max(0, c.employerPct || 0))) / 100;
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
    const t = healthLineTotals(b[key]);
    const notes = [t.enrolled ? `${t.enrolled} enrolled` : "", t.hsa ? `incl. ${usdShort(t.hsa)} HSA` : ""].filter(Boolean);
    lines.push({ key, label, path: key, premium: t.premium + t.hsa, employer: t.employer, employee: t.employee, note: notes.join(" · ") || undefined });
  };
  health("medical", "Medical");
  health("dental", "Dental");
  health("vision", "Vision");
  const risk = b.risk.map(riskPremium).reduce((a, r) => ({ premium: a.premium + r.premium, employer: a.employer + r.employer, employee: a.employee + r.employee }), { premium: 0, employer: 0, employee: 0 });
  lines.push({ key: "risk", label: "STD / LTD / Life AD&D", path: "disability-life", ...risk });
  const vol = b.voluntary.reduce((a, v) => {
    const employer = (v.monthlyPremium || 0) * Math.min(100, Math.max(0, v.employerPct || 0)) / 100;
    return { premium: a.premium + (v.monthlyPremium || 0), employer: a.employer + employer, employee: a.employee + (v.monthlyPremium || 0) - employer };
  }, { premium: 0, employer: 0, employee: 0 });
  lines.push({ key: "voluntary", label: "Voluntary", path: "voluntary", ...vol });
  const k = retirementCosts(b);
  lines.push({ key: "401k", label: "401(k)", path: "401k", premium: k.employerMonthly, employer: k.employerMonthly, employee: 0, note: "Employer match and fees" });

  const total = lines.reduce((a, l) => ({ premium: a.premium + l.premium, employer: a.employer + l.employer, employee: a.employee + l.employee }), { premium: 0, employer: 0, employee: 0 });
  return { lines, total, medicalEnrolled: healthLineTotals(b.medical).enrolled };
}

// Current (incumbent) vs. TriNet monthly cost by line. TriNet figures follow the current funding strategy.
export function currentVsTrinet(b: BenefitsInputs) {
  const med = healthLineTotals(b.medical);
  const den = healthLineTotals(b.dental);
  const vis = healthLineTotals(b.vision);
  const life = riskPremium(b.risk.find((r) => r.id === "life")!);
  const dis = b.risk.filter((r) => r.id !== "life").map(riskPremium).reduce((a, r) => ({ employer: a.employer + r.employer, employee: a.employee + r.employee }), { employer: 0, employee: 0 });
  const c = b.current;
  const rows = [
    { key: "medical" as const, label: "Medical", current: c.noCurrentMedical ? { employer: 0, employee: 0 } : c.medical, trinet: { employer: med.employer, employee: med.employee } },
    { key: "dental" as const, label: "Dental", current: c.dental, trinet: { employer: den.employer, employee: den.employee } },
    { key: "vision" as const, label: "Vision", current: c.vision, trinet: { employer: vis.employer, employee: vis.employee } },
    { key: "life" as const, label: "Life / AD&D", current: c.life, trinet: { employer: life.employer, employee: life.employee } },
    { key: "disability" as const, label: "Disability", current: c.disability, trinet: dis },
  ];
  const sum = (k: "current" | "trinet") => rows.reduce((a, r) => ({ employer: a.employer + r[k].employer, employee: a.employee + r[k].employee }), { employer: 0, employee: 0 });
  return { rows, current: sum("current"), trinet: sum("trinet") };
}
