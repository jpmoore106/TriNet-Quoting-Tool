import { addMonths, format } from "date-fns";
import type { QuoteInputs } from "../state/QuoteContext";

export const WORKDAYS_PER_YEAR = 260;

export const usd = (n: number, digits = 2) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });

export const formatDate = (iso: string, pattern = "MMM d, yyyy") =>
  iso ? format(new Date(iso + "T00:00:00"), pattern) : "";

export function feeSummary(q: QuoteInputs) {
  const ft = q.ftWse || 0;
  const pt = q.ptWse || 0;
  const totalWse = ft + pt;
  const ftMonthly = ft * (q.ftPepm || 0);
  const ptMonthly = pt > 0 ? pt * (q.ptPepm || 0) : 0;
  const monthly = ftMonthly + ptMonthly;
  // Blended PEPM: total monthly fee spread across every WSE (FT and PT).
  const pepm = totalWse > 0 ? monthly / totalWse : q.ftPepm || 0;
  return {
    ft, pt, totalWse, hasPt: pt > 0,
    ftMonthly, ptMonthly, monthly, annual: monthly * 12, pepm,
    perWorkday: (pepm * 12) / WORKDAYS_PER_YEAR,
    ftShare: monthly > 0 ? (ftMonthly / monthly) * 100 : 0,
  };
}

// Growth pricing: cost at each future headcount, compared with today's PEPM.
export function priceBreakRows(q: QuoteInputs) {
  const { pepm: currentPepm } = feeSummary(q);
  return q.priceBreaks
    .filter((b) => b.headcount > 0 && b.pepm > 0)
    .sort((a, b) => a.headcount - b.headcount)
    .map((b) => ({
      ...b,
      monthly: b.headcount * b.pepm,
      annual: b.headcount * b.pepm * 12,
      savingsPerEmployee: currentPepm > 0 ? currentPepm - b.pepm : 0,
      savingsPercent: currentPepm > 0 ? ((currentPepm - b.pepm) / currentPepm) * 100 : 0,
    }));
}

// Highest PEPM allowed each year under the rate cap (year 1 is today's PEPM).
export function rateCapSchedule(q: QuoteInputs) {
  if (!q.rateCap.enabled) return [];
  const { pepm } = feeSummary(q);
  const years = Math.max(1, Math.min(10, Math.round(q.rateCap.years || 1)));
  const rate = (q.rateCap.percent || 0) / 100;
  return Array.from({ length: years }, (_, i) => ({ year: i + 1, maxPepm: pepm * Math.pow(1 + rate, i) }));
}

// Setup fee net of discount, split into equal installments (the last absorbs rounding).
export function setupFeeSchedule(q: QuoteInputs) {
  const { amount, discount, installments, firstInvoiceDate } = q.setupFee;
  const gross = Math.max(0, amount || 0);
  const net = Math.max(0, gross - Math.max(0, discount || 0));
  const count = Math.max(1, Math.min(24, Math.round(installments || 1)));
  const cents = Math.round(net * 100);
  const base = Math.floor(cents / count);
  const schedule = Array.from({ length: count }, (_, i) => {
    const amountCents = i === count - 1 ? cents - base * (count - 1) : base;
    const date = firstInvoiceDate ? format(addMonths(new Date(firstInvoiceDate + "T00:00:00"), i), "MMM yyyy") : "";
    return { number: i + 1, amount: amountCents / 100, date };
  });
  return { gross, discount: gross - net, net, count, schedule };
}
