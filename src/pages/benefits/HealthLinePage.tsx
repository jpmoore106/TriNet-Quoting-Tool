import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import DeckSlides from "../../components/DeckSlides";
import { PAGE_SLIDES } from "../../data/masterDeck";
import { Card, CardContent } from "../../components/ui/card";
import { Section, labelClass, inputClass, secondaryButton } from "../../components/form";
import { useQuote } from "../../state/QuoteContext";
import {
  FUNDING_LABELS, HEALTH_DESIGN_FIELDS, TIERS, TIER_LABELS, designOrBlank, isHsaEligible, newHealthPlan, zeroTiers,
  type FundingStrategy, type FundingType, type HealthLine, type HealthPlan, type HsaFunding,
} from "../../state/benefits";
import { MIN_FUNDING_PCT, currentPlanTotals, employerContribution, fundingCheck, healthLineTotals, hsaContribution, planTotals } from "../../lib/benefits";
import { usd } from "../../lib/pricing";
import { CellMoney, CellNumber, Totals } from "./fields";
import { DesignFields, DesignList } from "./PlanDesign";
import CarveOuts, { CarvedOutBanner } from "../../components/CarveOuts";

type LineKey = "medical" | "dental" | "vision";

export default function HealthLinePage({ lineKey, title }: { lineKey: LineKey; title: string }) {
  const { quote, updateBenefits } = useQuote();
  const line = quote.benefits[lineKey];
  const setLine = (changes: Partial<HealthLine>) => updateBenefits({ [lineKey]: { ...line, ...changes } });
  const setFunding = (changes: Partial<FundingStrategy>) => setLine({ funding: { ...line.funding, ...changes } });
  const setHsa = (changes: Partial<HsaFunding>) => setLine({ hsa: { ...line.hsa, ...changes } });
  const setPlan = (id: string, changes: Partial<HealthPlan>) =>
    setLine({ plans: line.plans.map((p) => (p.id === id ? { ...p, ...changes } : p)) });
  const totals = healthLineTotals(line);
  const f = line.funding;
  const isMedical = lineKey === "medical";
  const hsaPlans = line.plans.filter(isHsaEligible);
  const check = isMedical && quote.benefits.medicalCarvedOut ? null : fundingCheck(line);
  // Appendix plans not already quoted, cheapest first.
  const quotedNames = new Set(line.plans.map((p) => p.name.toLowerCase()));
  const appendixOnly = line.appendix.filter((p) => !quotedNames.has(p.name.toLowerCase())).sort((a, b) => a.rates.ee - b.rates.ee);
  const addFromAppendix = (p: HealthPlan) =>
    setLine({ plans: [...line.plans, { ...p, id: crypto.randomUUID(), enrollment: zeroTiers() }] });

  return (
    <div className="space-y-6">
      {isMedical && quote.benefits.medicalCarvedOut && <CarvedOutBanner what="medical" />}
      {isMedical && <CarveOuts only="medical" />}
      <Totals items={[
        { label: "Enrolled", value: String(totals.enrolled), testId: `${lineKey}-enrolled` },
        { label: "Monthly premium", value: usd(totals.premium), testId: `${lineKey}-premium` },
        { label: isMedical && totals.hsa ? "Employer / month (incl. HSA)" : "Employer / month", value: usd(totals.employer), testId: `${lineKey}-employer` },
        { label: "Employee / month", value: usd(totals.employee), testId: `${lineKey}-employee` },
      ]} />

      <Section title="Employer funding strategy" description={`How the employer pays toward ${title.toLowerCase()} premiums.`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${lineKey}-funding`} className={labelClass}>Contribution type</label>
            <select id={`${lineKey}-funding`} className={inputClass} value={f.type}
              onChange={(e) => setFunding({ type: e.target.value as FundingType })}>
              {(Object.keys(FUNDING_LABELS) as FundingType[]).map((k) => <option key={k} value={k}>{FUNDING_LABELS[k]}</option>)}
            </select>
          </div>
          {f.type === "percent" && (
            <div>
              <label htmlFor={`${lineKey}-limit`} className={labelClass}>Contribution limit</label>
              <select id={`${lineKey}-limit`} className={inputClass} value={f.limitPlanId}
                onChange={(e) => setFunding({ limitPlanId: e.target.value })}>
                <option value="">None</option>
                <optgroup label="Quoted plans">
                  {line.plans.map((p, i) => <option key={p.id} value={p.id}>Capped at {p.name || `Plan ${i + 1}`}</option>)}
                </optgroup>
                {appendixOnly.length > 0 && (
                  <optgroup label={`All plans in the BSS appendix (${appendixOnly.length})`}>
                    {appendixOnly.map((p) => (
                      <option key={p.id} value={p.id}>Capped at {p.name} ({usd(p.rates.ee)} EE)</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}
        </div>
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
        {check && (
          <p data-testid={`${lineKey}-funding-check`} role={check.ok ? undefined : "alert"}
            className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${check.ok ? "bg-canvas text-navy" : "bg-alert/5 text-alert font-semibold"}`}>
            {check.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-dark" aria-hidden /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
            {check.ok
              ? `Meets the funding rule: at least ${MIN_FUNDING_PCT}% of the lowest-cost plan (${check.lowest.name || "unnamed"}, ${usd(check.minimum)} of ${usd(check.lowest.rates.ee)} employee-only).`
              : `Below the funding rule: the employer must contribute at least ${usd(check.minimum)} (${MIN_FUNDING_PCT}% of the lowest-cost plan, ${check.lowest.name || "unnamed"}, employee-only). Short on: ${check.short.map((x) => `${x.plan.name || "unnamed"} (${usd(x.amount)})`).join(", ")}.`}
          </p>
        )}
        {f.type === "percent" && f.limitPlanId && (
          <p className="text-sm text-tngray-dark">The employer pays these percentages of each plan, up to the same percentage of the limit plan's premium.</p>
        )}
      </Section>

      {isMedical && (
        <Section title="HSA employer contributions" description="Monthly employer contribution to the HSA of each employee enrolled in an HSA-eligible plan.">
          <label className="flex items-center gap-2 text-sm font-semibold text-navy">
            <input id="hsa-enabled" type="checkbox" checked={line.hsa.enabled} onChange={(e) => setHsa({ enabled: e.target.checked })} />
            Employer contributes to HSAs
          </label>
          {line.hsa.enabled && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {TIERS.map((t) => (
                  <div key={t}>
                    <label className={labelClass}>{TIER_LABELS[t]}</label>
                    <CellMoney label={`HSA $ ${TIER_LABELS[t]}`} value={line.hsa.monthly[t]} onChange={(v) => setHsa({ monthly: { ...line.hsa.monthly, [t]: v } })} />
                  </div>
                ))}
              </div>
              <p className="text-sm text-tngray-dark" data-testid="hsa-summary">
                {hsaPlans.length === 0
                  ? "No HSA-eligible plans yet. Plans with HDHP in the name or type are HSA-eligible automatically."
                  : `${usd(totals.hsa)}/mo (${usd(totals.hsa * 12, 0)}/yr) across ${hsaPlans.map((p) => p.name || "unnamed plan").join(", ")}.`}
              </p>
            </>
          )}
        </Section>
      )}

      {line.plans.map((plan, i) => {
        const pt = planTotals(plan, line);
        const label = plan.name || `Plan ${i + 1}`;
        return (
          <Section key={plan.id} title={plan.name || `${title} plan ${i + 1}`}>
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1fr_auto] gap-3 items-end">
              <div>
                <label className={labelClass} htmlFor={`${plan.id}-name`}>Plan name</label>
                <input id={`${plan.id}-name`} className={inputClass} value={plan.name} placeholder="e.g. Aetna PPO 750"
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
              <button type="button" aria-label={`Remove ${label}`}
                onClick={() => setLine({ plans: line.plans.filter((p) => p.id !== plan.id), funding: f.limitPlanId === plan.id ? { ...f, limitPlanId: "" } : f })}
                className="h-10 w-10 flex items-center justify-center rounded-lg text-tngray-dark hover:bg-alert/5 hover:text-alert">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {isMedical && (
              <label className="flex items-center gap-2 text-sm font-semibold text-navy">
                <input type="checkbox" aria-label={`${label} HSA-eligible`} checked={isHsaEligible(plan)}
                  disabled={isHsaEligible(plan) && !plan.hsaEligible} onChange={(e) => setPlan(plan.id, { hsaEligible: e.target.checked })} />
                HSA-eligible{isHsaEligible(plan) && !plan.hsaEligible && <span className="font-normal text-tngray-dark">(HDHP plans always are)</span>}
              </label>
            )}
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
                    const hsa = hsaContribution(plan, line, t);
                    return (
                      <tr key={t} className="border-b border-tngray-light last:border-0">
                        <td className="py-2 pr-3 font-medium">{TIER_LABELS[t]}</td>
                        <td className="py-2 pr-3"><CellMoney label={`${label} ${TIER_LABELS[t]} rate`} value={plan.rates[t]}
                          onChange={(v) => setPlan(plan.id, { rates: { ...plan.rates, [t]: v } })} /></td>
                        <td className="py-2 pr-3"><CellNumber label={`${label} ${TIER_LABELS[t]} enrolled`} value={plan.enrollment[t]}
                          onChange={(v) => setPlan(plan.id, { enrollment: { ...plan.enrollment, [t]: v } })} /></td>
                        <td className="py-2 pr-3">{usd(er)}{hsa > 0 && <span className="text-tngray-dark"> + {usd(hsa)} HSA</span>}</td>
                        <td className="py-2">{usd((plan.rates[t] || 0) - er)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <DesignFields idPrefix={plan.id} design={designOrBlank(plan.design, HEALTH_DESIGN_FIELDS[lineKey])}
              onChange={(design) => setPlan(plan.id, { design })} />
            <p className="text-sm text-tngray-dark" data-testid={`${plan.id}-totals`}>
              {pt.enrolled} enrolled · {usd(pt.premium)}/mo premium · <span className="font-semibold text-navy">{usd(pt.employer + pt.hsa)}/mo employer</span>
              {pt.hsa > 0 && ` (incl. ${usd(pt.hsa)} HSA)`} · {usd(pt.employee)}/mo employee
            </p>
          </Section>
        );
      })}

      <button type="button" className={secondaryButton} onClick={() => setLine({ plans: [...line.plans, newHealthPlan()] })}>
        <Plus className="h-4 w-4" /> Add {title.toLowerCase()} plan
      </button>

      {line.appendix.length > 0 && <Appendix plans={appendixOnly} total={line.appendix.length} title={title} onAdd={addFromAppendix} lineKey={lineKey} />}

      {line.currentPlans.length > 0 && <CurrentPlans plans={line.currentPlans} title={title} />}
      {lineKey === "medical" && (
        <DeckSlides slides={PAGE_SLIDES.medical} intro="Walk through the medical comparison and TriNet's benefits support." />
      )}
    </div>
  );
}

// Every plan in the BSS appendix, with design and rates; any can be added to the quote.
function Appendix({ plans, total, title, onAdd, lineKey }: {
  plans: HealthPlan[]; total: number; title: string; onAdd: (p: HealthPlan) => void; lineKey: LineKey;
}) {
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();
  const shown = plans.filter((p) => !q || p.name.toLowerCase().includes(q));
  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <details data-testid={`${lineKey}-appendix`}>
          <summary className="cursor-pointer text-lg font-bold text-navy">
            All available {title.toLowerCase()} plans <span className="text-sm font-medium text-tngray-dark">({total} in the BSS plan appendix)</span>
          </summary>
          <p className="mt-1 text-sm text-tngray-dark">Plan design and rates for every plan in the BSS. Add any plan to the quote, or use it as the contribution limit.</p>
          <input aria-label={`Search ${title.toLowerCase()} plans`} placeholder="Search plans" value={filter} onChange={(e) => setFilter(e.target.value)}
            className={`${inputClass} mt-3 max-w-xs`} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-tngray-dark border-b border-tngray-light">
                  <th className="py-2 pr-3 font-semibold">Plan</th>
                  <th className="py-2 pr-3 font-semibold">Plan design</th>
                  {TIERS.map((t) => <th key={t} className="py-2 pr-3 font-semibold text-right">{TIER_LABELS[t]}</th>)}
                  <th className="py-2 font-semibold"><span className="sr-only">Add</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id} className="border-b border-tngray-light last:border-0 align-top">
                    <td className="py-2 pr-3 font-semibold">{p.name}</td>
                    <td className="py-2 pr-3"><DesignList design={p.design} /></td>
                    {TIERS.map((t) => <td key={t} className="py-2 pr-3 text-right">{usd(p.rates[t])}</td>)}
                    <td className="py-2">
                      <button type="button" className="whitespace-nowrap text-sm font-semibold text-navy underline" onClick={() => onAdd(p)}
                        aria-label={`Add ${p.name} to the quote`}>Add to quote</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

// Incumbent plans from an imported quote, for comparison (read-only).
function CurrentPlans({ plans, title }: { plans: HealthPlan[]; title: string }) {
  const t = currentPlanTotals(plans);
  return (
    <Card>
      <CardContent className="p-5 sm:p-6 overflow-x-auto">
        <h3 className="text-lg font-bold text-navy">Current {title.toLowerCase()} plans</h3>
        <p className="text-sm text-tngray-dark mb-3">From the imported quote: {t.enrolled} enrolled · {usd(t.premium)}/mo total premium.</p>
        <table className="w-full min-w-[640px] text-sm" data-testid="current-plans">
          <thead>
            <tr className="text-left text-tngray-dark border-b border-tngray-light">
              <th className="py-2 pr-3 font-semibold">Plan</th>
              {TIERS.map((tier) => <th key={tier} className="py-2 pr-3 font-semibold text-right">{TIER_LABELS[tier]}</th>)}
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-b border-tngray-light last:border-0">
                <td className="py-2 pr-3 font-medium">{p.name}</td>
                {TIERS.map((tier) => (
                  <td key={tier} className="py-2 pr-3 text-right">
                    {usd(p.rates[tier])}<span className="block text-xs text-tngray-dark">{p.enrollment[tier] || "–"} enrolled</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
