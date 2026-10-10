import { Plus, Trash2 } from "lucide-react";
import { Section, labelClass, inputClass, secondaryButton } from "../../components/form";
import { useQuote } from "../../state/QuoteContext";
import {
  FUNDING_LABELS, TIERS, TIER_LABELS, newHealthPlan,
  type FundingStrategy, type FundingType, type HealthLine, type HealthPlan,
} from "../../state/benefits";
import { employerContribution, healthLineTotals, planTotals } from "../../lib/benefits";
import { usd } from "../../lib/pricing";
import { CellMoney, CellNumber, Totals } from "./fields";

type LineKey = "medical" | "dental" | "vision";

export default function HealthLinePage({ lineKey, title }: { lineKey: LineKey; title: string }) {
  const { quote, updateBenefits } = useQuote();
  const line = quote.benefits[lineKey];
  const setLine = (changes: Partial<HealthLine>) => updateBenefits({ [lineKey]: { ...line, ...changes } });
  const setFunding = (changes: Partial<FundingStrategy>) => setLine({ funding: { ...line.funding, ...changes } });
  const setPlan = (id: string, changes: Partial<HealthPlan>) =>
    setLine({ plans: line.plans.map((p) => (p.id === id ? { ...p, ...changes } : p)) });
  const totals = healthLineTotals(line);
  const f = line.funding;

  return (
    <div className="space-y-6">
      <Totals items={[
        { label: "Enrolled", value: String(totals.enrolled), testId: `${lineKey}-enrolled` },
        { label: "Monthly premium", value: usd(totals.premium), testId: `${lineKey}-premium` },
        { label: "Employer / month", value: usd(totals.employer), testId: `${lineKey}-employer` },
        { label: "Employee / month", value: usd(totals.employee), testId: `${lineKey}-employee` },
      ]} />

      <Section title="Employer funding strategy" description={`How the employer pays toward ${title.toLowerCase()} premiums.`}>
        <div>
          <label htmlFor={`${lineKey}-funding`} className={labelClass}>Strategy</label>
          <select id={`${lineKey}-funding`} className={inputClass} value={f.type}
            onChange={(e) => setFunding({ type: e.target.value as FundingType })}>
            {(Object.keys(FUNDING_LABELS) as FundingType[]).map((k) => <option key={k} value={k}>{FUNDING_LABELS[k]}</option>)}
          </select>
        </div>
        {f.type === "basePlan" && (
          <div>
            <label htmlFor={`${lineKey}-base`} className={labelClass}>Base plan</label>
            <select id={`${lineKey}-base`} className={inputClass} value={f.basePlanId}
              onChange={(e) => setFunding({ basePlanId: e.target.value })}>
              <option value="">Each plan funds itself</option>
              {line.plans.map((p, i) => <option key={p.id} value={p.id}>{p.name || `Plan ${i + 1}`}</option>)}
            </select>
          </div>
        )}
        {f.type === "pctEeOnly" ? (
          <div className="max-w-xs">
            <label className={labelClass}>Employer pays, of the employee-only rate</label>
            <CellNumber label="Employer % of employee-only rate" value={f.eeOnlyPct} suffix="%" step={0.5}
              onChange={(v) => setFunding({ eeOnlyPct: Math.min(100, v) })} />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {TIERS.map((t) => (
              <div key={t}>
                <label className={labelClass}>{TIER_LABELS[t]}</label>
                {f.type === "flat" ? (
                  <CellMoney label={`Employer $ ${TIER_LABELS[t]}`} value={f.flat[t]} onChange={(v) => setFunding({ flat: { ...f.flat, [t]: v } })} />
                ) : (
                  <CellNumber label={`Employer % ${TIER_LABELS[t]}`} value={f.pct[t]} suffix="%" step={0.5}
                    onChange={(v) => setFunding({ pct: { ...f.pct, [t]: Math.min(100, v) } })} />
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {line.plans.map((plan, i) => {
        const pt = planTotals(plan, line);
        return (
          <Section key={plan.id} title={plan.name || `${title} plan ${i + 1}`}>
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1fr_auto] gap-3 items-end">
              <div>
                <label className={labelClass} htmlFor={`${plan.id}-name`}>Plan name</label>
                <input id={`${plan.id}-name`} className={inputClass} value={plan.name} placeholder="e.g. Gold PPO 500"
                  onChange={(e) => setPlan(plan.id, { name: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor={`${plan.id}-carrier`}>Carrier</label>
                <input id={`${plan.id}-carrier`} className={inputClass} value={plan.carrier}
                  onChange={(e) => setPlan(plan.id, { carrier: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor={`${plan.id}-type`}>Plan type</label>
                <input id={`${plan.id}-type`} className={inputClass} value={plan.planType} placeholder="PPO, HMO, HDHP"
                  onChange={(e) => setPlan(plan.id, { planType: e.target.value })} />
              </div>
              <button type="button" aria-label={`Remove ${plan.name || `plan ${i + 1}`}`}
                onClick={() => setLine({ plans: line.plans.filter((p) => p.id !== plan.id) })}
                className="h-10 w-10 flex items-center justify-center rounded-lg text-tngray-dark hover:bg-alert/5 hover:text-alert">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-tngray-dark border-b border-tngray-light">
                    <th className="py-2 pr-3 font-semibold">Tier</th>
                    <th className="py-2 pr-3 font-semibold w-36">Monthly rate</th>
                    <th className="py-2 pr-3 font-semibold w-28">Enrolled</th>
                    <th className="py-2 pr-3 font-semibold">Employer / enrollee</th>
                    <th className="py-2 font-semibold">Employee / enrollee</th>
                  </tr>
                </thead>
                <tbody>
                  {TIERS.map((t) => {
                    const er = employerContribution(plan, line, t);
                    return (
                      <tr key={t} className="border-b border-tngray-light last:border-0">
                        <td className="py-2 pr-3 font-medium">{TIER_LABELS[t]}</td>
                        <td className="py-2 pr-3"><CellMoney label={`${plan.name || `Plan ${i + 1}`} ${TIER_LABELS[t]} rate`} value={plan.rates[t]}
                          onChange={(v) => setPlan(plan.id, { rates: { ...plan.rates, [t]: v } })} /></td>
                        <td className="py-2 pr-3"><CellNumber label={`${plan.name || `Plan ${i + 1}`} ${TIER_LABELS[t]} enrolled`} value={plan.enrollment[t]}
                          onChange={(v) => setPlan(plan.id, { enrollment: { ...plan.enrollment, [t]: v } })} /></td>
                        <td className="py-2 pr-3">{usd(er)}</td>
                        <td className="py-2">{usd((plan.rates[t] || 0) - er)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-tngray-dark" data-testid={`${plan.id}-totals`}>
              {pt.enrolled} enrolled · {usd(pt.premium)}/mo premium · <span className="font-semibold text-navy">{usd(pt.employer)}/mo employer</span> · {usd(pt.employee)}/mo employee
            </p>
          </Section>
        );
      })}

      <button type="button" className={secondaryButton} onClick={() => setLine({ plans: [...line.plans, newHealthPlan()] })}>
        <Plus className="h-4 w-4" /> Add {title.toLowerCase()} plan
      </button>
    </div>
  );
}
