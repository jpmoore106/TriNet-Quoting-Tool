// PEO Service Fee Rate Card and PEO Promotions: types and labels only. The rates and promotion values are
// CONFIDENTIAL – INTERNAL USE ONLY, so they live in the database (pricing_config, readable by TriNet users only),
// not in this public code or the site bundle. They're shown to reps on Setup, never on client-facing outputs.

export type ServiceLevel = "assigned" | "preferred";
export type RiskRating = "" | "green" | "yellow" | "red";
export type Promotion = "none" | "pepm" | "credit" | "investment";
export type Tier = "start" | "target" | "floor" | "dor";

export const SERVICE_LEVELS: Record<ServiceLevel, string> = {
  assigned: "Assigned / Service Plus",
  preferred: "Preferred",
};

export const TIER_LABELS: Record<Tier, string> = { start: "Start", target: "Target", floor: "Floor", dor: "DOR Floor" };

export const PROMOTIONS: Record<Promotion, string> = {
  none: "No promotion",
  pepm: "PEPM promo",
  credit: "Promo credit (GNP)",
  investment: "Investment credit",
};

// Rates are per employee per month; bands are by total employees (max null = no upper limit).
export type RateBand = { label: string; min: number; max: number | null; start: number; target: number; floor: number; dor: number };

export type RateCard = {
  effective: string;
  verticals: Record<ServiceLevel, string>;
  bands: Record<ServiceLevel, RateBand[]>;
  pepmPromo: { headcountBelow: number; price: number; direct: number }[]; // first matching tier wins
  creditMaxMonths: Record<Tier, number>; // most promo-credit free months by where the FT PEPM lands
  creditTwoYearFrom: number; // promo-credit months needing a 2-year commitment (fewer: 1-year)
  investmentMaxMonths: number;
  investmentMaxRevenuePct: number;
  investmentFirstCheckMonths: number[]; // 1-12
};
