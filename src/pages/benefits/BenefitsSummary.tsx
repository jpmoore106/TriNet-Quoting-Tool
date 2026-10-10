import { useState } from "react";
import DeckSlides from "../../components/DeckSlides";
import { PAGE_SLIDES } from "../../data/masterDeck";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { Section, TextField } from "../../components/form";
import { useQuote } from "../../state/QuoteContext";
import { MIN_FUNDING_PCT, benefitsSummary, currentVsTrinet, fundingCheck, type LineSummary } from "../../lib/benefits";
import type { CostSplit, CurrentLine } from "../../state/benefits";
import { CellMoney, CellNumber } from "./fields";
import { feeSummary, formatDate, usd } from "../../lib/pricing";

// Chart colors: Violet (secondary palette) + TriNet Orange; validated for lightness, CVD separation and contrast.
const EMPLOYER = "#7F3ED6";
const EMPLOYEE = "#FD5000";

export default function BenefitsSummary() {
  const { quote, updateBenefits } = useQuote();
  const { lines, total, medicalEnrolled } = benefitsSummary(quote.benefits);
  const fees = feeSummary(quote);
  const totalInvestment = fees.monthly + total.employer;

  return (
    <div className="space-y-6">
      <ImportStatus />
      <FundingAlerts />
      <section aria-label="Benefits financial summary" className="rounded-2xl bg-navy text-white p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-orange">Total monthly investment with TriNet</p>
        <p data-testid="total-investment" className="mt-1 text-5xl font-bold">{usd(totalInvestment, 0)}</p>
        <p className="mt-1 text-white/80">
          {usd(fees.monthly, 0)} Professional Service Fee + {usd(total.employer, 0)} employer benefits cost · {usd(totalInvestment * 12, 0)} a year
        </p>
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Total benefits premium" value={usd(total.premium, 0)} detail="per month" testId="sum-premium" />
          <Kpi label="Employer pays" value={usd(total.employer, 0)} detail={total.premium > 0 ? `${Math.round((total.employer / total.premium) * 100)}% of premium` : "per month"} testId="sum-employer" />
          <Kpi label="Employees pay" value={usd(total.employee, 0)} detail="per month, before tax" testId="sum-employee" />
          <Kpi label="Employer cost / medical enrollee" value={medicalEnrolled > 0 ? usd(lines[0].employer / medicalEnrolled) : "—"} detail="medical, per month" testId="sum-per-enrollee" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardContent className="p-5 sm:p-6">
            <h3 className="text-lg font-bold text-navy">Monthly cost by benefit</h3>
            <CostChart lines={lines} />
          </CardContent>
        </Card>
        <div className="lg:col-span-2 space-y-6">
          <Section title="Plan year">
            <TextField id="benefits-effective" label="Benefits effective date" type="date" value={quote.benefits.effectiveDate}
              onChange={(v) => updateBenefits({ effectiveDate: v })} />
          </Section>
        </div>
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6 overflow-x-auto">
          <h3 className="text-lg font-bold text-navy mb-3">Financial summary</h3>
          <table className="w-full min-w-[640px] text-sm" data-testid="benefits-table">
            <thead>
              <tr className="text-left text-tngray-dark border-b border-tngray-light">
                <th className="py-2 pr-4 font-semibold">Benefit</th>
                <th className="py-2 pr-4 font-semibold text-right">Premium / mo</th>
                <th className="py-2 pr-4 font-semibold text-right">Employer / mo</th>
                <th className="py-2 pr-4 font-semibold text-right">Employee / mo</th>
                <th className="py-2 font-semibold text-right">Employer / yr</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.key} className="border-b border-tngray-light">
                  <td className="py-2 pr-4">
                    <Link to={`/benefits/${l.path}`} className="font-semibold text-navy underline decoration-tngray-light hover:decoration-orange">{l.label}</Link>
                    {l.note && <span className="block text-xs text-tngray-dark">{l.note}</span>}
                  </td>
                  <td className="py-2 pr-4 text-right">{usd(l.premium)}</td>
                  <td className="py-2 pr-4 text-right">{usd(l.employer)}</td>
                  <td className="py-2 pr-4 text-right">{usd(l.employee)}</td>
                  <td className="py-2 text-right">{usd(l.employer * 12, 0)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="py-2 pr-4">Total benefits</td>
                <td className="py-2 pr-4 text-right">{usd(total.premium)}</td>
                <td className="py-2 pr-4 text-right">{usd(total.employer)}</td>
                <td className="py-2 pr-4 text-right">{usd(total.employee)}</td>
                <td className="py-2 text-right">{usd(total.employer * 12, 0)}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Comparison />
      <DeckSlides slides={quote.deck.benefitsModel === "oms" ? PAGE_SLIDES.oms : PAGE_SLIDES.benefits}
        intro={quote.deck.benefitsModel === "oms" ? "Explain Open Market Solutions." : "Show the client what comes with TriNet-sponsored benefits."} />
    </div>
  );
}

function Kpi({ label, value, detail, testId }: { label: string; value: string; detail: string; testId?: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <p className="text-xs uppercase tracking-wider text-white/70">{label}</p>
      <p data-testid={testId} className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-white/70">{detail}</p>
    </div>
  );
}

// Horizontal stacked bars: employer vs. employee share of each line's monthly cost.
function CostChart({ lines }: { lines: LineSummary[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const rows = lines.filter((l) => l.premium > 0);
  const max = Math.max(1, ...rows.map((l) => l.premium));
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-tngray-dark">Add plans and rates on the benefit tabs to see costs here.</p>;
  }
  return (
    <div className="mt-3">
      <div className="mb-4 flex gap-5 text-sm text-tngray-dark" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: EMPLOYER }} />Employer</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: EMPLOYEE }} />Employee</span>
      </div>
      <ul className="space-y-3" role="list" aria-label="Monthly cost by benefit; the financial summary table below has the same data">
        {rows.map((l) => {
          const tip = `${l.label}: ${usd(l.employer)} employer + ${usd(l.employee)} employee = ${usd(l.premium)} per month`;
          return (
            <li key={l.key} className="relative grid grid-cols-[130px_1fr] items-center gap-3"
              onMouseEnter={() => setHover(l.key)} onMouseLeave={() => setHover(null)} aria-label={tip}>
              <span className="text-sm font-semibold text-navy">{l.label}</span>
              <div className="flex items-center gap-2 py-1">
                <div className="flex h-5 gap-[2px]" style={{ width: `${(l.premium / max) * 85}%` }}>
                  {l.employer > 0 && <span className="h-full rounded-l" style={{ width: `${(l.employer / l.premium) * 100}%`, background: EMPLOYER, borderTopRightRadius: l.employee > 0 ? 0 : 4, borderBottomRightRadius: l.employee > 0 ? 0 : 4 }} />}
                  {l.employee > 0 && <span className="h-full rounded-r" style={{ width: `${(l.employee / l.premium) * 100}%`, background: EMPLOYEE, borderTopLeftRadius: l.employer > 0 ? 0 : 4, borderBottomLeftRadius: l.employer > 0 ? 0 : 4 }} />}
                </div>
                <span className="whitespace-nowrap text-xs font-semibold text-navy">{usd(l.premium, 0)}</span>
              </div>
              {hover === l.key && (
                <span role="tooltip" className="absolute left-[140px] -top-8 z-10 whitespace-nowrap rounded-lg bg-navy px-3 py-1.5 text-xs text-white shadow-lg">{tip}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Current (incumbent) vs. TriNet monthly cost. Current costs come from an imported quote or are entered here.
function Comparison() {
  const { quote, updateBenefits } = useQuote();
  const c = quote.benefits.current;
  const cmp = currentVsTrinet(quote.benefits, quote.medicalRenewalDate);
  const setCurrent = (key: CurrentLine, changes: Partial<CostSplit>) =>
    updateBenefits({ current: { ...c, [key]: { ...c[key], ...changes } } });
  const total = (s: CostSplit) => s.employer + s.employee;
  const diff = total(cmp.trinet) - total(cmp.current);
  const hasCurrent = total(cmp.current) > 0;
  return (
    <Card>
      <CardContent className="p-5 sm:p-6 overflow-x-auto">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-navy">Current benefits vs. TriNet</h3>
            <p className="text-sm text-tngray-dark">Monthly cost. Current costs are filled in by a quote import, or enter them here.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-navy">
            <input id="no-current-medical" type="checkbox" checked={c.noCurrentMedical}
              onChange={(e) => updateBenefits({ current: { ...c, noCurrentMedical: e.target.checked } })} />
            No current medical plan (new group)
          </label>
        </div>
        {!c.noCurrentMedical && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start rounded-xl bg-canvas p-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-navy" htmlFor="anticipated-renewal">Anticipated medical renewal</label>
              <div id="anticipated-renewal-wrap">
                <CellNumber label="Anticipated medical renewal %" value={c.anticipatedRenewalPct} suffix="%" step={0.5}
                  onChange={(v) => updateBenefits({ current: { ...c, anticipatedRenewalPct: Math.min(100, v) } })} />
              </div>
            </div>
            <p className="text-sm text-navy" data-testid="renewal-note">
              {!quote.medicalRenewalDate || !quote.benefits.effectiveDate ? (
                <>Needs the current medical renewal date (on <Link to="/" className="underline text-orange-dark">Setup</Link>) and the benefits effective date (Plan year, above).</>
              ) : cmp.renewal ? (
                <>
                  TriNet starts {formatDate(quote.benefits.effectiveDate)} and renews {cmp.renewal.trinetRenewal}: a {cmp.renewal.windowMonths}-month rate period
                  (TriNet medical renews quarterly). The current plan renews {cmp.renewal.currentRenewal}, so {cmp.renewal.increaseMonths} of those months
                  {c.anticipatedRenewalPct ? <> carry the {c.anticipatedRenewalPct}% increase: current medical is shown at <strong>{((cmp.factor - 1) * 100).toFixed(2)}%</strong> above today's cost, averaged over the period.</> : " would carry an increase. Enter the anticipated renewal % to apply it."}
                </>
              ) : null}
            </p>
          </div>
        )}
        <table className="mt-4 w-full min-w-[760px] text-sm" data-testid="comparison-table">
          <thead>
            <tr className="text-left text-tngray-dark">
              <th className="py-1 pr-3" />
              <th colSpan={3} className="py-1 pr-3 font-semibold text-navy border-b-2 border-tngray-medium">Current</th>
              <th colSpan={3} className="py-1 pr-3 font-semibold text-navy border-b-2 border-orange">With TriNet</th>
              <th className="py-1" />
            </tr>
            <tr className="text-left text-tngray-dark border-b border-tngray-light">
              <th className="py-2 pr-3 font-semibold">Benefit</th>
              <th className="py-2 pr-3 font-semibold w-32">Employer</th>
              <th className="py-2 pr-3 font-semibold w-32">Employee</th>
              <th className="py-2 pr-3 font-semibold text-right">Total</th>
              <th className="py-2 pr-3 font-semibold text-right">Employer</th>
              <th className="py-2 pr-3 font-semibold text-right">Employee</th>
              <th className="py-2 pr-3 font-semibold text-right">Total</th>
              <th className="py-2 font-semibold text-right">Difference</th>
            </tr>
          </thead>
          <tbody>
            {cmp.rows.map((r) => {
              const d = total(r.trinet) - total(r.current);
              const locked = r.key === "medical" && c.noCurrentMedical;
              return (
                <tr key={r.key} className="border-b border-tngray-light">
                  <td className="py-2 pr-3 font-semibold">{r.label}</td>
                  {locked ? (
                    <td colSpan={2} className="py-2 pr-3 text-tngray-dark">No current plan</td>
                  ) : (
                    <>
                      <td className="py-2 pr-3"><CellMoney label={`Current ${r.label} employer`} value={c[r.key].employer} onChange={(v) => setCurrent(r.key, { employer: v })} /></td>
                      <td className="py-2 pr-3"><CellMoney label={`Current ${r.label} employee`} value={c[r.key].employee} onChange={(v) => setCurrent(r.key, { employee: v })} /></td>
                    </>
                  )}
                  <td className="py-2 pr-3 text-right" data-testid={`cmp-current-${r.key}`}>
                    {usd(total(r.current))}
                    {r.key === "medical" && cmp.factor > 1 && <span className="block text-xs text-tngray-dark">incl. anticipated renewal</span>}
                  </td>
                  <td className="py-2 pr-3 text-right">{usd(r.trinet.employer)}</td>
                  <td className="py-2 pr-3 text-right">{usd(r.trinet.employee)}</td>
                  <td className="py-2 pr-3 text-right font-semibold">{usd(total(r.trinet))}</td>
                  <td className="py-2 text-right">{total(r.current) > 0 || total(r.trinet) > 0 ? signed(d) : "—"}</td>
                </tr>
              );
            })}
            <tr className="font-bold">
              <td className="py-2 pr-3">Monthly total</td>
              <td className="py-2 pr-3">{usd(cmp.current.employer)}</td>
              <td className="py-2 pr-3">{usd(cmp.current.employee)}</td>
              <td className="py-2 pr-3 text-right" data-testid="cmp-current">{usd(total(cmp.current))}</td>
              <td className="py-2 pr-3 text-right">{usd(cmp.trinet.employer)}</td>
              <td className="py-2 pr-3 text-right">{usd(cmp.trinet.employee)}</td>
              <td className="py-2 pr-3 text-right" data-testid="cmp-trinet">{usd(total(cmp.trinet))}</td>
              <td className="py-2 text-right" data-testid="cmp-diff">
                {signed(diff)}{hasCurrent && <span className="block text-xs font-normal text-tngray-dark">{diff >= 0 ? "+" : ""}{((diff / total(cmp.current)) * 100).toFixed(2)}%</span>}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-tngray-dark">TriNet costs follow the funding strategy on each benefit tab{quote.benefits.medical.hsa.enabled ? " and include employer HSA contributions" : ""}. Voluntary and 401(k) aren't included.</p>
      </CardContent>
    </Card>
  );
}

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${usd(Math.abs(n))}`;

// Where the benefits data came from; uploads live on the Setup page.
function ImportStatus() {
  const { quote } = useQuote();
  const s = quote.benefits.source;
  return (
    <p className="text-sm text-tngray-dark" data-testid="benefits-source">
      {s ? `Imported from ${s.fileName}${s.proposalNumber ? ` (${s.proposalNumber})` : ""}${s.strategy ? ` · ${s.strategy}` : ""}. ` : "Enter plans by hand on each tab, or "}
      <Link to="/" className="underline text-orange-dark">{s ? "Replace it on the Setup page" : "upload a Benefit Strategy Summary on the Setup page"}</Link>.
    </p>
  );
}

// Funding rule across medical, dental and vision: at least 50% of the lowest-cost plan.
function FundingAlerts() {
  const { quote } = useQuote();
  const failing = (["medical", "dental", "vision"] as const)
    .map((k) => ({ k, check: fundingCheck(quote.benefits[k]) }))
    .filter((x) => x.check && !x.check.ok);
  if (failing.length === 0) return null;
  return (
    <div role="alert" data-testid="funding-alerts" className="rounded-xl border border-alert bg-alert/5 p-4 text-sm text-alert">
      <p className="font-bold">Funding below the {MIN_FUNDING_PCT}% minimum</p>
      <ul className="mt-1 list-disc pl-5">
        {failing.map(({ k, check }) => (
          <li key={k}>
            <Link to={`/benefits/${k}`} className="underline">{k[0].toUpperCase() + k.slice(1)}</Link>: the employer must contribute at least {usd(check!.minimum)} per employee
            ({MIN_FUNDING_PCT}% of {check!.lowest.name || "the lowest-cost plan"}, employee-only).
          </li>
        ))}
      </ul>
    </div>
  );
}
