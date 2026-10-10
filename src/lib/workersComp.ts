import type { CurrentWc } from "../state/QuoteContext";

// Current workers' comp: manual premium from wages × rate per $100, and the discount (or surcharge) the carrier applies
// to reach the discounted total premium. That percent adjusts every manual rate to an effective rate.
export function currentWcSummary(wc: CurrentWc) {
  const rows = wc.rows.map((r) => ({ ...r, premium: ((r.wages || 0) * (r.rate || 0)) / 100 }));
  const manual = rows.reduce((a, r) => a + r.premium, 0);
  const total = wc.totalPremium > 0 ? wc.totalPremium : manual;
  const discounted = wc.discountedPremium > 0 ? wc.discountedPremium : total;
  const changePct = total > 0 ? (discounted / total - 1) * 100 : 0;
  const factor = 1 + changePct / 100;
  return {
    rows: rows.map((r) => ({ ...r, adjustedRate: (r.rate || 0) * factor, adjustedPremium: r.premium * factor })),
    wages: rows.reduce((a, r) => a + (r.wages || 0), 0),
    manual, total, discounted, changePct, factor,
    hasData: rows.length > 0 || wc.totalPremium > 0 || wc.discountedPremium > 0,
  };
}
