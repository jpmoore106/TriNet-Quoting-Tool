import { Section, TextField, NumberField, MoneyField, secondaryButton } from "../../components/form";
import CollateralCard from "../../components/CollateralCard";
import { RETIREMENT_COLLATERAL, TRINET_401K_DEFAULTS } from "../../data/collateral";
import { useQuote } from "../../state/QuoteContext";
import type { Retirement as RetirementInputs } from "../../state/benefits";
import { retirementCosts } from "../../lib/benefits";
import { usd } from "../../lib/pricing";
import { Totals } from "./fields";

export default function Retirement() {
  const { quote, updateBenefits } = useQuote();
  const r = quote.benefits.retirement;
  const set = (changes: Partial<RetirementInputs>) => updateBenefits({ retirement: { ...r, ...changes } });
  const c = retirementCosts(quote.benefits);

  return (
    <div className="space-y-6">
      <Totals items={[
        { label: "Participants", value: String(c.participants) },
        { label: "Employer match / year", value: usd(c.matchAnnual, 0), testId: "k-match" },
        { label: "Plan fees / year", value: usd(c.feesAnnual, 0), testId: "k-fees" },
        { label: "Employer cost / year", value: usd(c.employerAnnual, 0), testId: "k-employer" },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Plan & participation">
          <TextField id="k-provider" label="Plan provider" value={r.provider} onChange={(v) => set({ provider: v })} />
          <div className="grid grid-cols-2 gap-4">
            <NumberField id="k-eligible" label="Eligible employees" value={r.eligibleEmployees} onChange={(v) => set({ eligibleEmployees: Math.round(v) })} />
            <MoneyField id="k-payroll" label="Eligible payroll (annual)" value={r.eligiblePayroll} onChange={(v) => set({ eligiblePayroll: v })} />
            <NumberField id="k-participation" label="Participation rate" suffix="%" max={100} value={r.participationPct} onChange={(v) => set({ participationPct: v })} />
            <NumberField id="k-deferral" label="Average deferral" suffix="%" step={0.5} max={100} value={r.avgDeferralPct} onChange={(v) => set({ avgDeferralPct: v })} />
          </div>
        </Section>
        <Section title="Employer match & fees" description="Example: 100% match up to 4% of pay.">
          <button type="button" className={secondaryButton} onClick={() => set(TRINET_401K_DEFAULTS)}>Use TriNet 401(k) Plan fees</button>
          <div className="grid grid-cols-2 gap-4">
            <NumberField id="k-match-pct" label="Match % of deferrals" suffix="%" max={200} value={r.matchPct} onChange={(v) => set({ matchPct: v })} />
            <NumberField id="k-match-cap" label="Up to % of pay" suffix="%" step={0.5} max={100} value={r.matchUpToPct} onChange={(v) => set({ matchUpToPct: v })} />
            <MoneyField id="k-admin" label="Plan admin fee (annual)" value={r.adminFeeAnnual} onChange={(v) => set({ adminFeeAnnual: v })} />
            <MoneyField id="k-per-participant" label="Per-participant fee (annual)" value={r.perParticipantFeeAnnual} onChange={(v) => set({ perParticipantFeeAnnual: v })} />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-navy">
            <input id="k-employer-fees" type="checkbox" checked={r.employerPaysFees} onChange={(e) => set({ employerPaysFees: e.target.checked })} />
            Employer pays plan fees
          </label>
          {c.deferralsAnnual > 0 && (
            <p className="text-sm text-tngray-dark">Employees defer about {usd(c.deferralsAnnual, 0)} a year (not an employer cost).</p>
          )}
        </Section>
      </div>
      <CollateralCard collateral={RETIREMENT_COLLATERAL} />
    </div>
  );
}
