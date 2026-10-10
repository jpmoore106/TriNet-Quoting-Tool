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
  design?: PlanDesign; // in-network plan design, e.g. deductible and copays
};

// Plan design fields shown for hand-entered plans; imported plans carry the BSS appendix's details.
export const HEALTH_DESIGN_FIELDS: Record<"medical" | "dental" | "vision", string[]> = {
  medical: ["Deductible (single / family)", "Out-of-pocket max (single / family)", "Coinsurance", "Primary care", "Specialist", "Urgent care", "Emergency room", "Rx tier 1 / 2 / 3"],
  dental: ["Deductible (single / family)", "Preventive", "Basic", "Major", "Annual maximum", "Orthodontia", "Endo / perio / oral surgery"],
  vision: ["Exam copay", "Materials copay", "Frame allowance", "Exam frequency", "Frame frequency", "Lens or contacts frequency"],
};
export const designOrBlank = (design: PlanDesign | undefined, fields: string[]): PlanDesign =>
  design?.length ? design : fields.map((label) => ({ label, value: "" }));

// Plan design details as label → value, in display order (e.g. "Deductible (single / family)" → "$500 / $1,500").
export type PlanDesign = { label: string; value: string }[];

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
  appendix: HealthPlan[]; // every plan offered in the BSS plan appendix, with rates and design (none enrolled)
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
  employeePaid: boolean; // voluntary: employees pay the full premium
  design: PlanDesign; // e.g. benefit percent, maximum, elimination period
};

// Disability packages and life options listed in the BSS ("All Plan Options").
export type RiskOptionRow = { type: "STD" | "LTD"; plan: string; states: string; rate: number; basis: RateBasis; employees: number; volume: number; monthly: number };
export type DisabilityOption = { name: string; monthly: number; rows: RiskOptionRow[] };
export type LifeOption = { plan: string; rate: number; employees: number; volume: number; monthly: number };
export type RiskOptions = { disability: DisabilityOption[]; life: LifeOption[] };

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
  riskOptions: RiskOptions;
  medicalCarvedOut: boolean; // the client keeps its own medical plan; TriNet medical isn't part of the deal
};

export const percentFunding = (pct: number): FundingStrategy => ({
  type: "percent", pct: { ee: pct, es: pct, ec: pct, ef: pct }, limitPlanId: "", flat: zeroTiers(),
});
const healthLine = (pct: number): HealthLine => ({
  plans: [], funding: percentFunding(pct), hsa: { enabled: false, monthly: zeroTiers() }, currentPlans: [], appendix: [],
});
const split = (): CostSplit => ({ employer: 0, employee: 0 });

export const emptyRisk = (): RiskCoverage[] => [
  { id: "life", name: "Basic Life / AD&D", enabled: false, carrier: "", benefit: "", rate: 0, basis: "per1000", volume: 0, employerPct: 100, quotedMonthly: 0, employees: 0, employeePaid: false, design: [] },
  { id: "std", name: "Short-Term Disability", enabled: false, carrier: "", benefit: "", rate: 0, basis: "per100", volume: 0, employerPct: 100, quotedMonthly: 0, employees: 0, employeePaid: false, design: [] },
  { id: "ltd", name: "Long-Term Disability", enabled: false, carrier: "", benefit: "", rate: 0, basis: "per100", volume: 0, employerPct: 100, quotedMonthly: 0, employees: 0, employeePaid: false, design: [] },
];

// Plan design fields for STD, LTD and Life, filled in where the plan name says (e.g. "60% STD Company Paid $750").
export const RISK_DESIGN_FIELDS: Record<RiskCoverage["id"], string[]> = {
  std: ["Benefit percentage", "Weekly maximum", "Elimination period", "Benefit duration"],
  ltd: ["Benefit percentage", "Monthly maximum", "Elimination period", "Benefit duration"],
  life: ["Life benefit", "AD&D benefit", "Age reduction"],
};
export function riskDesignFromName(id: RiskCoverage["id"], plan: string): PlanDesign {
  const pct = plan.match(/(\d+(?:\.\d+)?)%/)?.[1];
  const max = plan.match(/\$([\d,]+)(?!.*Life)/)?.[1];
  const life = plan.match(/^(\$[\d,]+|\dX Earnings)/i)?.[1];
  const values: Record<string, string> = {
    "Benefit percentage": pct ? `${pct}% of earnings` : "",
    "Weekly maximum": id === "std" && max ? `$${max}` : "",
    "Monthly maximum": id === "ltd" && max ? `$${max}` : "",
    "Life benefit": life ?? "",
    "AD&D benefit": life ? `Matches life benefit (${life})` : "",
  };
  return RISK_DESIGN_FIELDS[id].map((label) => ({ label, value: values[label] ?? "" }));
}

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
  riskOptions: { disability: [], life: [] },
  medicalCarvedOut: false,
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
      appendix: merged.appendix ?? [],
      plans: merged.plans.map((p) => ({ ...p, hsaEligible: p.hsaEligible ?? false })),
    };
  };
  return {
    ...b,
    medical: line(saved?.medical, EMPTY_BENEFITS.medical),
    dental: line(saved?.dental, EMPTY_BENEFITS.dental),
    vision: line(saved?.vision, EMPTY_BENEFITS.vision),
    risk: emptyRisk().map((d) => {
      const r = { ...d, ...(saved?.risk?.find((x) => x.id === d.id) ?? {}) };
      return { ...r, design: r.design?.length ? r.design : riskDesignFromName(r.id, r.benefit) };
    }),
    riskOptions: { ...EMPTY_BENEFITS.riskOptions, ...saved?.riskOptions },
    current: { ...EMPTY_BENEFITS.current, ...saved?.current },
    census: saved?.census ?? [],
  };
}
