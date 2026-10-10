// Benefits quote data. Filled in by hand today; a TriNet benefits quote import will populate the same shape.

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
  rates: TierValues; // monthly premium per enrollee, by tier
  enrollment: TierValues; // enrolled employees, by tier
};

// How the employer funds medical, dental or vision premiums.
export type FundingType = "pctTier" | "pctEeOnly" | "flat" | "basePlan";
export const FUNDING_LABELS: Record<FundingType, string> = {
  pctTier: "% of each tier's premium",
  pctEeOnly: "% of the employee-only rate, for every tier",
  flat: "Flat $ per tier",
  basePlan: "% of a base plan (employees pay any buy-up)",
};
export type FundingStrategy = {
  type: FundingType;
  pct: TierValues; // pctTier and basePlan
  eeOnlyPct: number; // pctEeOnly
  flat: TierValues; // flat monthly $ per tier
  basePlanId: string; // basePlan
};

export type HealthLine = { plans: HealthPlan[]; funding: FundingStrategy };

// Group term life/AD&D, STD and LTD: premium = rate × (volume ÷ rate unit).
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

export type BenefitsInputs = {
  effectiveDate: string; // yyyy-MM-dd
  medical: HealthLine;
  dental: HealthLine;
  vision: HealthLine;
  risk: RiskCoverage[];
  voluntary: VoluntaryProduct[];
  retirement: Retirement;
};

const funding = (pct: number): FundingStrategy => ({
  type: "pctTier", pct: { ee: pct, es: pct, ec: pct, ef: pct }, eeOnlyPct: pct, flat: zeroTiers(), basePlanId: "",
});

export const EMPTY_BENEFITS: BenefitsInputs = {
  effectiveDate: "",
  medical: { plans: [], funding: funding(50) },
  dental: { plans: [], funding: funding(50) },
  vision: { plans: [], funding: funding(50) },
  risk: [
    { id: "life", name: "Basic Life / AD&D", enabled: false, carrier: "", benefit: "", rate: 0, basis: "per1000", volume: 0, employerPct: 100 },
    { id: "std", name: "Short-Term Disability", enabled: false, carrier: "", benefit: "", rate: 0, basis: "per10", volume: 0, employerPct: 100 },
    { id: "ltd", name: "Long-Term Disability", enabled: false, carrier: "", benefit: "", rate: 0, basis: "per100", volume: 0, employerPct: 100 },
  ],
  voluntary: [],
  retirement: {
    provider: "", eligibleEmployees: 0, eligiblePayroll: 0, participationPct: 0, avgDeferralPct: 0,
    matchPct: 0, matchUpToPct: 0, adminFeeAnnual: 0, perParticipantFeeAnnual: 0, employerPaysFees: true,
  },
};

export const newHealthPlan = (): HealthPlan => ({
  id: crypto.randomUUID(), name: "", carrier: "", planType: "", rates: zeroTiers(), enrollment: zeroTiers(),
});
