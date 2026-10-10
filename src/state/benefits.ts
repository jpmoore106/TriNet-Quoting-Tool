// Benefits quote data. Entered by hand or imported from a TriNet Benefit Strategy Summary (BSS).

export const TIERS = ["ee", "es", "ec", "ef"] as const;
export type Tier = (typeof TIERS)[number];
export type TierValues = Record<Tier, number>;
export const TIER_LABELS: Record<Tier, string> = {
  ee: "Employee only",
  es: "Employee + spouse",
  ec: "Employee + child(ren)",
  ef: "Family",
};
export const zeroTiers = (): TierValues => ({ ee: 0, es: 0, ec: 0, ef: 0 });

export type HealthPlan = {
  id: string;
  name: string;
  carrier: string;
  planType: string; // PPO, HMO, HDHP, EPO...
  hsaEligible: boolean;
  rates: TierValues; // monthly premium per enrollee, by tier
  enrollment: TierValues; // enrolled employees, by tier
};

// TriNet funding strategies: a percent of each plan (optionally capped at that percent of a limit plan) or a flat dollar amount.
export type FundingType = "percent" | "flat";
export const FUNDING_LABELS: Record<FundingType, string> = {
  percent: "Percent of plan premium",
  flat: "Flat dollar amount",
};
export type FundingStrategy = {
  type: FundingType;
  pct: TierValues; // percent
  limitPlanId: string; // percent: cap at this plan's premium × percent ("" = no limit)
  flat: TierValues; // flat monthly $ per tier
};

// Employer HSA contributions for HSA-eligible (HDHP) medical plans, monthly per enrollee.
export type HsaFunding = { enabled: boolean; monthly: TierValues };

export type HealthLine = {
  plans: HealthPlan[];
  funding: FundingStrategy;
  hsa: HsaFunding;
  currentPlans: HealthPlan[]; // incumbent plans, for comparison
};

// Group term life/AD&D, STD and LTD: premium = rate × (volume ÷ rate unit), unless a quoted monthly cost is imported.
export type RateBasis = "per1000" | "per10" | "per100" | "perEmployee";
export const RATE_BASIS: Record<RateBasis, { label: string; unit: number; volumeLabel: string }> = {
  per1000: { label: "per $1,000 of coverage", unit: 1000, volumeLabel: "Total covered volume ($)" },
  per10: { label: "per $10 of weekly benefit", unit: 10, volumeLabel: "Total weekly benefit ($)" },
  per100: { label: "per $100 of covered payroll", unit: 100, volumeLabel: "Monthly covered payroll ($)" },
  perEmployee: { label: "per employee", unit: 1, volumeLabel: "Covered employees" },
};
export type RiskCoverage = {
  id: "life" | "std" | "ltd";
  name: string;
  enabled: boolean;
  carrier: string;
  benefit: string; // e.g. "1x salary to $50,000"
  rate: number; // monthly rate per unit
  basis: RateBasis;
  volume: number;
  employerPct: number;
  quotedMonthly: number; // monthly cost from an imported quote (0 = calculate from rate × volume)
  employees: number;
};

export type VoluntaryProduct = { id: string; name: string; carrier: string; monthlyPremium: number; employerPct: number };

export type Retirement = {
  provider: string;
  eligibleEmployees: number;
  eligiblePayroll: number; // annual
  participationPct: number;
  avgDeferralPct: number;
  matchPct: number; // e.g. 100 (% of deferrals matched)
  matchUpToPct: number; // e.g. 4 (% of pay)
  adminFeeAnnual: number;
  perParticipantFeeAnnual: number;
  employerPaysFees: boolean;
};

// Current (incumbent) monthly benefits cost, for the current vs. TriNet comparison.
export type CostSplit = { employer: number; employee: number };
export const CURRENT_LINES = ["medical", "dental", "vision", "life", "disability"] as const;
export type CurrentLine = (typeof CURRENT_LINES)[number];
export type CurrentCosts = {
  noCurrentMedical: boolean;
  anticipatedRenewalPct: number; // expected increase at the current medical renewal
} & Record<CurrentLine, CostSplit>;

// One employee from an imported BSS census: tier, current medical plan/cost and proposed TriNet plans.
export type CensusEmployee = {
  id: string;
  name: string;
  state: string;
  tier: Tier;
  current: { plan: string; employer: number; employee: number } | null; // current medical
  medical: string; // proposed TriNet plan names ("" = not enrolled)
  dental: string;
  vision: string;
};

export type QuoteSource = {
  fileName: string;
  importedAt: string; // ISO timestamp
  proposalNumber: string;
  strategy: string;
  primaryCarrier: string;
  states: string;
  disabilityPackage: string;
};

export type BenefitsInputs = {
  effectiveDate: string; // yyyy-MM-dd
  medical: HealthLine;
  dental: HealthLine;
  vision: HealthLine;
  risk: RiskCoverage[];
  voluntary: VoluntaryProduct[];
  retirement: Retirement;
  current: CurrentCosts;
  census: CensusEmployee[];
  source: QuoteSource | null;
};

export const percentFunding = (pct: number): FundingStrategy => ({
  type: "percent", pct: { ee: pct, es: pct, ec: pct, ef: pct }, limitPlanId: "", flat: zeroTiers(),
});
const healthLine = (pct: number): HealthLine => ({
  plans: [], funding: percentFunding(pct), hsa: { enabled: false, monthly: zeroTiers() }, currentPlans: [],
});
const split = (): CostSplit => ({ employer: 0, employee: 0 });

export const emptyRisk = (): RiskCoverage[] => [
  { id: "life", name: "Basic Life / AD&D", enabled: false, carrier: "", benefit: "", rate: 0, basis: "per1000", volume: 0, employerPct: 100, quotedMonthly: 0, employees: 0 },
  { id: "std", name: "Short-Term Disability", enabled: false, carrier: "", benefit: "", rate: 0, basis: "per100", volume: 0, employerPct: 100, quotedMonthly: 0, employees: 0 },
  { id: "ltd", name: "Long-Term Disability", enabled: false, carrier: "", benefit: "", rate: 0, basis: "per100", volume: 0, employerPct: 100, quotedMonthly: 0, employees: 0 },
];

export const EMPTY_BENEFITS: BenefitsInputs = {
  effectiveDate: "",
  medical: healthLine(50),
  dental: healthLine(50),
  vision: healthLine(50),
  risk: emptyRisk(),
  voluntary: [],
  retirement: {
    provider: "", eligibleEmployees: 0, eligiblePayroll: 0, participationPct: 0, avgDeferralPct: 0,
    matchPct: 0, matchUpToPct: 0, adminFeeAnnual: 0, perParticipantFeeAnnual: 0, employerPaysFees: true,
  },
  current: { noCurrentMedical: false, anticipatedRenewalPct: 0, medical: split(), dental: split(), vision: split(), life: split(), disability: split() },
  census: [],
  source: null,
};

// Plans denoted HDHP are always HSA-eligible; other plans can be marked eligible by hand.
export const isHsaEligible = (p: HealthPlan) => p.hsaEligible || /\bHDHP\b/i.test(`${p.name} ${p.planType}`);

export const newHealthPlan = (): HealthPlan => ({
  id: crypto.randomUUID(), name: "", carrier: "", planType: "", hsaEligible: false, rates: zeroTiers(), enrollment: zeroTiers(),
});

// Fill in fields added since a quote was saved, and map older funding strategies onto percent/flat.
export function normalizeBenefits(saved: Partial<BenefitsInputs> | undefined): BenefitsInputs {
  const b = { ...EMPTY_BENEFITS, ...saved } as BenefitsInputs;
  const line = (l: Partial<HealthLine> | undefined, fallback: HealthLine): HealthLine => {
    const merged = { ...fallback, ...l } as HealthLine;
    const f = merged.funding as FundingStrategy & { type: string; basePlanId?: string; eeOnlyPct?: number };
    let funding: FundingStrategy;
    if (f.type === "percent" || f.type === "flat") funding = { ...fallback.funding, ...f, type: f.type };
    else if (f.type === "pctEeOnly") funding = percentFunding(f.eeOnlyPct ?? 0);
    else funding = { ...fallback.funding, pct: f.pct ?? fallback.funding.pct, limitPlanId: f.type === "basePlan" ? f.basePlanId ?? "" : "", type: f.type === "flat" ? "flat" : "percent" };
    return {
      ...merged,
      funding,
      hsa: merged.hsa ?? fallback.hsa,
      currentPlans: merged.currentPlans ?? [],
      plans: merged.plans.map((p) => ({ ...p, hsaEligible: p.hsaEligible ?? false })),
    };
  };
  return {
    ...b,
    medical: line(saved?.medical, EMPTY_BENEFITS.medical),
    dental: line(saved?.dental, EMPTY_BENEFITS.dental),
    vision: line(saved?.vision, EMPTY_BENEFITS.vision),
    risk: emptyRisk().map((d) => ({ ...d, ...(saved?.risk?.find((r) => r.id === d.id) ?? {}) })),
    current: { ...EMPTY_BENEFITS.current, ...saved?.current },
    census: saved?.census ?? [],
  };
}
