import type { QuoteInputs } from "../state/QuoteContext";
import { TIER_LABELS, type RateBand, type RateCard, type Tier } from "../data/rateCard";
import { feeSummary, usd } from "./pricing";

// Internal pricing guidance from the rate card and promotions. Never shown to clients.

export type Position = Tier | "below";
export type Check = { level: "ok" | "warn" | "stop"; text: string };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthList = (months: number[]) => months.map((m) => MONTHS[m - 1]).join(" or ");

export function bandFor(card: RateCard, q: QuoteInputs, headcount: number): RateBand {
  const bands = card.bands[q.pricingGuide.serviceLevel];
  return bands.find((b) => headcount >= b.min && (b.max === null || headcount <= b.max)) ?? bands[0];
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

export function promoPepm(card: RateCard, totalWse: number, direct: boolean): number | null {
  const tier = card.pepmPromo.find((t) => totalWse < t.headcountBelow);
  return tier ? (direct ? tier.direct : tier.price) : null;
}

export function pricingGuidance(card: RateCard, q: QuoteInputs) {
  const g = q.pricingGuide;
  const fees = feeSummary(q);
  const band = bandFor(card, q, fees.totalWse);
  const ftPepm = q.ftPepm || 0;
  const position = positionFor(ftPepm, band);
  const months = Math.max(0, Math.round(q.freeMonths || 0));
  const excluded = q.deck.benefitsModel === "oms" || g.tnxi;
  const checks: Check[] = [];

  const breaks = q.priceBreaks
    .filter((b) => b.headcount > 0 && b.pepm > 0)
    .sort((a, b) => a.headcount - b.headcount)
    .map((b) => {
      const bb = bandFor(card, q, b.headcount);
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
    const price = promoPepm(card, fees.totalWse, g.direct);
    if (price === null) checks.push({ level: "stop", text: "The PEPM promo isn't available at this headcount." });
    else if (ftPepm !== price) checks.push({ level: "warn", text: `The promo price is ${usd(price, 0)} PEPM${g.direct ? " (direct)" : ""}; the full-time PEPM is ${usd(ftPepm, 0)}.` });
    else checks.push({ level: "ok", text: `Full-time PEPM matches the ${usd(price, 0)} promo price.` });
    riskCheck("Red risk: only without an insurance investment.");
    exclusionCheck();
    if (months > 0) checks.push({ level: "warn", text: "Free months aren't part of the PEPM promo." });
    checks.push({ level: "ok", text: "Perpetual pricing, with the 12-month minimum waived." });
  }

  if (g.promotion === "credit") {
    const max = position === "below" ? 0 : card.creditMaxMonths[position];
    if (!months) checks.push({ level: "warn", text: "Enter the months free on the Professional Service Fee page." });
    else if (months > max) {
      checks.push({ level: "stop", text: max
        ? `${months} months free is over the ${max}-month maximum at ${TIER_LABELS[position as Tier]} pricing.`
        : "Below the DOR Floor, no promo credit is allowed." });
    } else checks.push({ level: "ok", text: `${months} of ${max} months free allowed at ${TIER_LABELS[position as Tier]} pricing.` });
    if (months > 0) checks.push({ level: "ok", text: `Requires a ${months >= card.creditTwoYearFrom ? "2-year" : "1-year"} commitment.` });
  }

  if (g.promotion === "investment") {
    if (!months) checks.push({ level: "warn", text: "Enter the months credited on the Professional Service Fee page." });
    else if (months > card.investmentMaxMonths) checks.push({ level: "stop", text: `The investment credit is up to ${card.investmentMaxMonths} months of admin fees.` });
    checks.push({ level: "warn", text: `Credit of ${usd(months * fees.monthly, 0)} must be no more than ${card.investmentMaxRevenuePct}% of total revenue.` });
    const d = q.chevron?.payroll.firstCheck;
    const when = monthList(card.investmentFirstCheckMonths);
    if (!d) checks.push({ level: "warn", text: `Add the first check date (from the Chevron proposal): it must fall in ${when}.` });
    else if (!card.investmentFirstCheckMonths.includes(new Date(d + "T00:00:00").getMonth() + 1)) checks.push({ level: "stop", text: `The first check date must fall in ${when}.` });
    else checks.push({ level: "ok", text: `First check date falls in ${when}.` });
    riskCheck(null);
    exclusionCheck();
  }

  return { band, position, approval: approvalFor(position), breaks, checks, totalWse: fees.totalWse };
}
