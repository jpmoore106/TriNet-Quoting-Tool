// PEO Service Fee Rate Card and PEO Promotions. CONFIDENTIAL – INTERNAL USE ONLY: shown to reps on Setup, never on
// client-facing outputs (executive summary, prospect link, decks or the Professional Service Fee page).

export const RATE_CARD_EFFECTIVE = "9/1/2026 (replaces 5/6/2024)";

export type ServiceLevel = "assigned" | "preferred";
export type RiskRating = "" | "green" | "yellow" | "red";
export type Promotion = "none" | "pepm" | "credit" | "investment";
export type Tier = "start" | "target" | "floor" | "dor";

export const SERVICE_LEVELS: Record<ServiceLevel, string> = {
  assigned: "Assigned / Service Plus",
  preferred: "Preferred",
};
export const SERVICE_LEVEL_VERTICALS: Record<ServiceLevel, string> = {
  assigned: "Professional Services, Technology, Life Sciences, Main Street, Nonprofit, Financial Services Assigned",
  preferred: "Financial Services Preferred",
};

export const TIER_LABELS: Record<Tier, string> = { start: "Start", target: "Target", floor: "Floor", dor: "DOR Floor" };

export type RateBand = { label: string; min: number; max: number; start: number; target: number; floor: number; dor: number };

const band = (label: string, min: number, max: number, [start, target, floor, dor]: number[]): RateBand =>
  ({ label, min, max, start, target, floor, dor });

// Rates are per employee per month; bands are by total employees.
export const RATE_CARD: Record<ServiceLevel, RateBand[]> = {
  assigned: [
    band("<20", 0, 19, [244, 222, 200, 178]),
    band("20-49", 20, 49, [169, 154, 139, 123]),
    band("50-99", 50, 99, [132, 120, 108, 96]),
    band("100-149", 100, 149, [102, 93, 84, 74]),
    band("150-249", 150, 249, [89, 81, 73, 65]),
    band("250+", 250, Infinity, [77, 70, 63, 56]),
  ],
  preferred: [
    band("<20", 0, 19, [305, 278, 250, 222]),
    band("20-49", 20, 49, [212, 193, 173, 154]),
    band("50-99", 50, 99, [165, 150, 135, 120]),
    band("100-149", 100, 149, [128, 116, 105, 93]),
    band("150-249", 150, 249, [111, 101, 91, 81]),
    band("250+", 250, Infinity, [96, 88, 79, 70]),
  ],
};

export const PROMOTIONS: Record<Promotion, string> = {
  none: "No promotion",
  pepm: "PEPM promo",
  credit: "Promo credit (GNP)",
  investment: "Investment credit",
};

// Most free months a promo credit allows, by where the full-time PEPM lands on the rate card.
export const PROMO_CREDIT_MAX_MONTHS: Record<Tier, number> = { start: 6, target: 4, floor: 3, dor: 2 };
