import { useState } from "react";
import { Link } from "react-router-dom";
import { FileUp } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Section, TextField } from "../../components/form";
import { useQuote } from "../../state/QuoteContext";
import { benefitsSummary, type LineSummary } from "../../lib/benefits";
import { feeSummary, usd } from "../../lib/pricing";

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
          <ImportCard />
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

function ImportCard() {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-navy"><FileUp className="h-5 w-5" aria-hidden /></span>
          <h3 className="text-lg font-bold text-navy">Import a TriNet benefits quote</h3>
        </div>
        <p className="mt-2 text-sm text-tngray-dark">
          Coming next: upload a TriNet benefits quote to fill in plans, rates and enrollment automatically.
          For now, enter them on each benefit tab.
        </p>
        <button type="button" disabled className="mt-3 inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-canvas px-4 py-2 text-sm font-semibold text-tngray-dark">
          <FileUp className="h-4 w-4" /> Upload quote (coming soon)
        </button>
      </CardContent>
    </Card>
  );
}
