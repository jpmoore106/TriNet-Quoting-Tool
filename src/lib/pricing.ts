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
  // The Professional Service Fee is subject to a monthly minimum, when one is quoted.
  const calculated = ftMonthly + ptMonthly;
  const minimumApplied = totalWse > 0 && calculated > 0 && calculated < (q.serviceFeeMinimum || 0);
  const monthly = minimumApplied ? q.serviceFeeMinimum : calculated;
  // Blended PEPM: total monthly fee spread across every WSE (FT and PT).
  const pepm = totalWse > 0 ? monthly / totalWse : q.ftPepm || 0;
  return {
    ft, pt, totalWse, hasPt: pt > 0, calculated, minimumApplied,
    ftMonthly, ptMonthly, monthly, annual: monthly * 12, pepm,
    perWorkday: (pepm * 12) / WORKDAYS_PER_YEAR,
    ftShare: monthly > 0 ? (ftMonthly / monthly) * 100 : 0,
  };
}

// Growth pricing: price breaks replace the full-time PEPM at a future headcount
// (part-time pricing is unchanged), so savings are measured against today's FT PEPM.
export function priceBreakRows(q: QuoteInputs) {
  const ftPepm = q.ftPepm || 0;
  return q.priceBreaks
    .filter((b) => b.headcount > 0 && b.pepm > 0)
    .sort((a, b) => a.headcount - b.headcount)
    .map((b) => ({
      ...b,
      monthly: b.headcount * b.pepm,
      annual: b.headcount * b.pepm * 12,
      savingsPerEmployee: ftPepm > 0 ? ftPepm - b.pepm : 0,
      savingsPercent: ftPepm > 0 ? ((ftPepm - b.pepm) / ftPepm) * 100 : 0,
    }));
}

// Rate cap: a not-to-exceed limit on the PEPM increase at the year 2 renewal only.
export function rateCapLimits(q: QuoteInputs) {
  if (!q.rateCap.enabled) return null;
  const fees = feeSummary(q);
  const factor = 1 + Math.max(0, q.rateCap.percent || 0) / 100;
  return {
    percent: Math.max(0, q.rateCap.percent || 0),
    ftMax: (q.ftPepm || 0) * factor,
    ptMax: fees.hasPt ? (q.ptPepm || 0) * factor : 0,
    pepmMax: fees.pepm * factor,
    monthlyMax: fees.monthly * factor,
  };
}

// Recommended setup fee: a percentage of the monthly fee (PEPM × WSE) that falls as the group grows.
export const SETUP_FEE_TIERS = [
  { maxWse: 25, percent: 70, label: "25 WSE or fewer" },
  { maxWse: 50, percent: 60, label: "26–50 WSE" },
  { maxWse: 74, percent: 50, label: "51–74 WSE" },
  { maxWse: 250, percent: 35, label: "75–250 WSE" },
  { maxWse: Infinity, percent: 25, label: "More than 250 WSE" },
];

export function recommendedSetupFee(q: QuoteInputs) {
  const fees = feeSummary(q);
  if (fees.totalWse === 0 || fees.monthly === 0) return null;
  const tier = SETUP_FEE_TIERS.find((t) => fees.totalWse <= t.maxWse)!;
  return { ...tier, monthly: fees.monthly, amount: Math.round(fees.monthly * tier.percent) / 100 };
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

// Months of free Professional Service Fee in year one, credited at the monthly fee.
export function freeMonthsCredit(q: QuoteInputs) {
  const fees = feeSummary(q);
  const months = Math.max(0, Math.min(12, Math.round(q.freeMonths || 0)));
  const credit = months * fees.monthly;
  return { months, credit, yearOne: Math.max(0, fees.annual - credit), effectivePepm: fees.totalWse ? (fees.annual - credit) / 12 / fees.totalWse : 0 };
}
