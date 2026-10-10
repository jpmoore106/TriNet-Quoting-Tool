import {
  RATE_BASIS, TIERS,
  type BenefitsInputs, type HealthLine, type HealthPlan, type RiskCoverage, type Tier,
} from "../state/benefits";

// Employer's monthly contribution for one enrollee in a plan tier, never more than the premium.
export function employerContribution(plan: HealthPlan, line: HealthLine, tier: Tier) {
  const premium = plan.rates[tier] || 0;
  const f = line.funding;
  let amount = 0;
  if (f.type === "pctTier") amount = (premium * (f.pct[tier] || 0)) / 100;
  else if (f.type === "pctEeOnly") amount = ((plan.rates.ee || 0) * (f.eeOnlyPct || 0)) / 100;
  else if (f.type === "flat") amount = f.flat[tier] || 0;
  else {
    const base = line.plans.find((p) => p.id === f.basePlanId) ?? plan;
    amount = ((base.rates[tier] || 0) * (f.pct[tier] || 0)) / 100;
  }
  return Math.max(0, Math.min(premium, amount));
}

export function planTotals(plan: HealthPlan, line: HealthLine) {
  let premium = 0, employer = 0, enrolled = 0;
  for (const t of TIERS) {
    const n = plan.enrollment[t] || 0;
    premium += (plan.rates[t] || 0) * n;
    employer += employerContribution(plan, line, t) * n;
    enrolled += n;
  }
  return { premium, employer, employee: premium - employer, enrolled };
}

export function healthLineTotals(line: HealthLine) {
  return line.plans.reduce(
    (acc, p) => {
      const t = planTotals(p, line);
      return { premium: acc.premium + t.premium, employer: acc.employer + t.employer, employee: acc.employee + t.employee, enrolled: acc.enrolled + t.enrolled };
    },
    { premium: 0, employer: 0, employee: 0, enrolled: 0 },
  );
}

export function riskPremium(c: RiskCoverage) {
  if (!c.enabled) return { premium: 0, employer: 0, employee: 0 };
  const premium = (c.rate || 0) * ((c.volume || 0) / RATE_BASIS[c.basis].unit);
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

export type LineSummary = { key: string; label: string; path: string; premium: number; employer: number; employee: number; note?: string };

// Monthly totals for every benefit line, for the financial summary.
export function benefitsSummary(b: BenefitsInputs) {
  const lines: LineSummary[] = [];
  const health = (key: "medical" | "dental" | "vision", label: string) => {
    const t = healthLineTotals(b[key]);
    lines.push({ key, label, path: key, ...t, note: t.enrolled ? `${t.enrolled} enrolled` : undefined });
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
