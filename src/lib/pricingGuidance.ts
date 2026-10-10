import type { QuoteInputs } from "../state/QuoteContext";
import { PROMO_CREDIT_MAX_MONTHS, RATE_CARD, TIER_LABELS, type RateBand, type Tier } from "../data/rateCard";
import { feeSummary, usd } from "./pricing";

// Internal pricing guidance from the rate card and promotions. Never shown to clients.

export type Position = Tier | "below";
export type Check = { level: "ok" | "warn" | "stop"; text: string };

export function bandFor(q: QuoteInputs, headcount: number): RateBand {
  const bands = RATE_CARD[q.pricingGuide.serviceLevel];
  return bands.find((b) => headcount >= b.min && headcount <= b.max) ?? bands[0];
}

// Where a PEPM lands in its band: at or above Start, Target, Floor or the DOR Floor, or below it.
export function positionFor(pepm: number, band: RateBand): Position {
  if (pepm >= band.start) return "start";
  if (pepm >= band.target) return "target";
  if (pepm >= band.floor) return "floor";
  if (pepm >= band.dor) return "dor";
  return "below";
}

export const positionLabel = (p: Position) => (p === "below" ? "Below DOR Floor" : `At or above ${TIER_LABELS[p]}`);

export function approvalFor(p: Position): Check {
  if (p === "dor") return { level: "warn", text: "DOR approval required" };
  if (p === "below") return { level: "stop", text: "Below the DOR Floor: needs a pricing exception" };
  return { level: "ok", text: "No approval needed" };
}

// The PEPM promo price: under 50 employees $119 ($109 direct); 50–99 employees $99 ($89 direct); none at 100+.
export function promoPepm(totalWse: number, direct: boolean): number | null {
  if (totalWse < 50) return direct ? 109 : 119;
  if (totalWse < 100) return direct ? 89 : 99;
  return null;
}

// First check month for the investment credit (January or June only).
const firstCheckMonth = (q: QuoteInputs) => {
  const d = q.chevron?.payroll.firstCheck;
  return d ? new Date(d + "T00:00:00").getMonth() : null;
};

export function pricingGuidance(q: QuoteInputs) {
  const g = q.pricingGuide;
  const fees = feeSummary(q);
  const band = bandFor(q, fees.totalWse);
  const ftPepm = q.ftPepm || 0;
  const position = positionFor(ftPepm, band);
  const months = Math.max(0, Math.round(q.freeMonths || 0));
  const excluded = q.deck.benefitsModel === "oms" || g.tnxi;
  const checks: Check[] = [];

  const breaks = q.priceBreaks
    .filter((b) => b.headcount > 0 && b.pepm > 0)
    .sort((a, b) => a.headcount - b.headcount)
    .map((b) => {
      const bb = bandFor(q, b.headcount);
      const p = positionFor(b.pepm, bb);
      return { ...b, band: bb, position: p, approval: approvalFor(p) };
    });

  const riskCheck = (redAllowed: string | null) => {
    if (!g.risk) checks.push({ level: "warn", text: "Set the risk rating to check eligibility." });
    else if (g.risk === "red") checks.push(redAllowed ? { level: "warn", text: redAllowed } : { level: "stop", text: "Not available for Red risk." });
  };
  const exclusionCheck = () => {
    if (excluded) checks.push({ level: "stop", text: "Not available for OMS or TNXI deals." });
  };

  if (g.promotion === "none" && months > 0) {
    checks.push({ level: "warn", text: `${months} free month${months === 1 ? "" : "s"} entered without a promotion. Pick the promo credit or investment credit.` });
  }

  if (g.promotion === "pepm") {
    const price = promoPepm(fees.totalWse, g.direct);
    if (price === null) checks.push({ level: "stop", text: "The PEPM promo is for under 100 employees." });
    else if (ftPepm !== price) checks.push({ level: "warn", text: `The promo price is ${usd(price, 0)} PEPM${g.direct ? " (direct)" : ""}; the full-time PEPM is ${usd(ftPepm, 0)}.` });
    else checks.push({ level: "ok", text: `Full-time PEPM matches the ${usd(price, 0)} promo price.` });
    riskCheck("Red risk: only without an insurance investment.");
    exclusionCheck();
    if (months > 0) checks.push({ level: "warn", text: "Free months aren't part of the PEPM promo." });
    checks.push({ level: "ok", text: "Perpetual pricing, with the 12-month minimum waived." });
  }

  if (g.promotion === "credit") {
    const max = position === "below" ? 0 : PROMO_CREDIT_MAX_MONTHS[position];
    if (!months) checks.push({ level: "warn", text: "Enter the months free on the Professional Service Fee page." });
    else if (months > max) {
      checks.push({ level: "stop", text: max
        ? `${months} months free is over the ${max}-month maximum at ${TIER_LABELS[position as Tier]} pricing.`
        : "Below the DOR Floor, no promo credit is allowed." });
    } else checks.push({ level: "ok", text: `${months} of ${max} months free allowed at ${TIER_LABELS[position as Tier]} pricing.` });
    if (months > 0) checks.push({ level: "ok", text: `Requires a ${months >= 5 ? "2-year" : "1-year"} commitment.` });
  }

  if (g.promotion === "investment") {
    if (!months) checks.push({ level: "warn", text: "Enter the months credited on the Professional Service Fee page." });
    else if (months > 12) checks.push({ level: "stop", text: "The investment credit is up to 12 months of admin fees." });
    checks.push({ level: "warn", text: `Credit of ${usd(months * fees.monthly, 0)} must be no more than 10% of total revenue.` });
    const m = firstCheckMonth(q);
    if (m === null) checks.push({ level: "warn", text: "Add the first check date (from the Chevron proposal): it must fall in January or June." });
    else if (m !== 0 && m !== 5) checks.push({ level: "stop", text: "The first check date must fall in January or June." });
    else checks.push({ level: "ok", text: "First check date falls in January or June." });
    riskCheck(null);
    exclusionCheck();
  }

  return { band, position, approval: approvalFor(position), breaks, checks, totalWse: fees.totalWse };
}
