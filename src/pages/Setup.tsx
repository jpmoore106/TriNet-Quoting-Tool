import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import PageTitle from "../components/PageTitle";
import DocumentUploads from "../components/DocumentUploads";
import { Section, TextField, NumberField, MoneyField, labelClass, inputClass, primaryButton, secondaryButton } from "../components/form";
import { useQuote, type PriceBreak } from "../state/QuoteContext";
import { feeSummary, recommendedSetupFee, setupFeeSchedule, usd } from "../lib/pricing";

const PAYROLL_PROVIDERS = [
  "ADP", "Paychex", "Gusto", "Paylocity", "Paycom", "Paycor", "Rippling", "Justworks", "Insperity",
  "Workday", "UKG", "Ceridian Dayforce", "QuickBooks Payroll", "Intuit", "Namely", "Zenefits", "Bamboo HR",
  "Deel", "Sequoia", "In-house / Manual",
];

const MEDICAL_CARRIERS = [
  "Aetna", "Anthem", "Blue Cross Blue Shield", "Blue Shield of California", "Cigna", "Florida Blue",
  "Harvard Pilgrim", "Highmark", "Humana", "Kaiser Permanente", "Oscar", "Regence", "Tufts Health Plan",
  "UnitedHealthcare", "None (no current plan)",
];


export default function Setup() {
  const { quote, update, reset } = useQuote();
  const fees = feeSummary(quote);
  const setup = setupFeeSchedule(quote);
  const recommended = recommendedSetupFee(quote);


  const setBreak = (id: string, changes: Partial<PriceBreak>) =>
    update({ priceBreaks: quote.priceBreaks.map((b) => (b.id === id ? { ...b, ...changes } : b)) });
  const addBreak = () =>
    update({ priceBreaks: [...quote.priceBreaks, { id: crypto.randomUUID(), headcount: 0, pepm: 0 }] });
  const removeBreak = (id: string) => update({ priceBreaks: quote.priceBreaks.filter((b) => b.id !== id) });

  const setRateCap = (changes: Partial<typeof quote.rateCap>) => update({ rateCap: { ...quote.rateCap, ...changes } });
  const setSetupFee = (changes: Partial<typeof quote.setupFee>) => update({ setupFee: { ...quote.setupFee, ...changes } });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageTitle eyebrow="Quote" title="Setup" subtitle="Enter the prospect's details and pricing. Everything is saved in this browser and used on every page and output." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DocumentUploads />
        <Section title="Company">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField id="company-name" label="Company name" value={quote.companyName}
              onChange={(v) => update({ companyName: v })} placeholder="Acme Corp" />
            <TextField id="rep-name" label="Prepared by (rep name)" value={quote.repName}
              onChange={(v) => update({ repName: v })} />
          </div>
        </Section>

        <Section title="Workforce & incumbents">
          <div className="grid grid-cols-3 gap-4">
            <NumberField id="ft-wse" label="FT WSE count" value={quote.ftWse} onChange={(v) => update({ ftWse: Math.round(v) })} />
            <NumberField id="pt-wse" label="PT WSE count" value={quote.ptWse} onChange={(v) => update({ ptWse: Math.round(v) })} />
            <div>
              <span className={labelClass}>Total WSE</span>
              <div className="rounded-lg px-3 py-2 bg-canvas text-navy font-semibold">{fees.totalWse}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField id="payroll" label="Incumbent payroll provider" list="payroll-providers"
              value={quote.incumbentPayroll} onChange={(v) => update({ incumbentPayroll: v })} placeholder="Start typing or pick" />
            <TextField id="carrier" label="Incumbent medical carrier" list="medical-carriers"
              value={quote.incumbentMedicalCarrier} onChange={(v) => update({ incumbentMedicalCarrier: v })} placeholder="Start typing or pick" />
          </div>
          <datalist id="payroll-providers">{PAYROLL_PROVIDERS.map((p) => <option key={p} value={p} />)}</datalist>
          <datalist id="medical-carriers">{MEDICAL_CARRIERS.map((c) => <option key={c} value={c} />)}</datalist>
          <TextField id="renewal" label="Medical renewal date" type="date"
            value={quote.medicalRenewalDate} onChange={(v) => update({ medicalRenewalDate: v })} />
        </Section>

        <Section title="Professional Service Fee" description="Per employee per month (PEPM).">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MoneyField id="ft-pepm" label={`Full-time PEPM${fees.ft ? ` (${fees.ft} FT)` : ""}`}
              value={quote.ftPepm} onChange={(v) => update({ ftPepm: v })} />
            {fees.hasPt ? (
              <MoneyField id="pt-pepm" label={`Part-time PEPM (${fees.pt} PT)`}
                value={quote.ptPepm} onChange={(v) => update({ ptPepm: v })} />
            ) : (
              <p className="text-xs text-tngray-dark sm:pt-7">Enter PT WSE to add a part-time rate and a blended PEPM.</p>
            )}
          </div>
          <SummaryLine label={fees.hasPt ? "Blended PEPM" : "PEPM"} value={usd(fees.pepm)}
            extra={fees.monthly > 0 ? `${usd(fees.monthly, 0)}/mo · ${usd(fees.annual, 0)}/yr` : undefined} />
        </Section>

        <Section title="Rate cap" description="Not-to-exceed limit on the PEPM increase at the year 2 renewal. It's a ceiling, not a planned increase.">
          <label className="flex items-center gap-2 text-sm font-medium text-navy">
            <input id="rate-cap-enabled" type="checkbox" checked={quote.rateCap.enabled}
              onChange={(e) => setRateCap({ enabled: e.target.checked })} />
            Include a rate cap
          </label>
          {quote.rateCap.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <NumberField id="rate-cap-percent" label="Year 2 increase cap" suffix="%" step={0.5}
                value={quote.rateCap.percent} onChange={(v) => setRateCap({ percent: v })} max={100} />
              {fees.pepm > 0 && (
                <div>
                  <span className={labelClass}>Year 2 PEPM won't exceed</span>
                  <div data-testid="setup-cap-max" className="rounded-lg px-3 py-2 bg-canvas text-navy font-semibold">
                    {usd((quote.ftPepm || 0) * (1 + (quote.rateCap.percent || 0) / 100))}{fees.hasPt ? " FT" : ""}
                  </div>
                </div>
              )}
            </div>
          )}
          {quote.rateCap.enabled && quote.rateCap.percent === 0 && (
            <p className="text-xs text-tngray-dark">0% means no increase at the year 2 renewal.</p>
          )}
        </Section>

        <Section title="Price breaks" description="Full-time PEPM at future headcounts as the company grows. Part-time pricing doesn't change." className="lg:col-span-2">
          {quote.priceBreaks.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-3 text-sm font-medium text-navy">
                <span>Headcount</span><span>Full-time PEPM at that headcount</span><span className="w-9" />
              </div>
              {quote.priceBreaks.map((b, i) => (
                <div key={b.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
                  <input aria-label={`Price break ${i + 1} headcount`} type="number" min={0} placeholder="e.g. 75"
                    className={inputClass} value={b.headcount || ""}
                    onChange={(e) => setBreak(b.id, { headcount: Math.max(0, Math.round(parseFloat(e.target.value) || 0)) })} />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tngray-dark">$</span>
                    <input aria-label={`Price break ${i + 1} PEPM`} type="number" min={0} step="0.01" placeholder="0.00"
                      className={`${inputClass} pl-7`} value={b.pepm || ""}
                      onChange={(e) => setBreak(b.id, { pepm: Math.max(0, parseFloat(e.target.value) || 0) })} />
                  </div>
                  <button type="button" aria-label={`Remove price break ${i + 1}`} onClick={() => removeBreak(b.id)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg text-tngray-dark hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={addBreak}
            className={secondaryButton}>
            <Plus className="h-4 w-4" /> Add price break
          </button>
          <p className="text-xs text-tngray-dark">
            Costs and savings are shown on the <Link to="/professional-service-fees" className="underline text-orange-dark">Professional Service Fees</Link> page.
          </p>
        </Section>

        <Section title="Setup fee" description="One-time implementation fee, with optional discount and installment billing." className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MoneyField id="setup-amount" label="Setup fee" value={quote.setupFee.amount} onChange={(v) => setSetupFee({ amount: v })} />
            <MoneyField id="setup-discount" label="Discount / waived" value={quote.setupFee.discount} onChange={(v) => setSetupFee({ discount: v })} />
            <NumberField id="setup-installments" label="Split into payments" min={1} max={24} suffix="#"
              value={quote.setupFee.installments} onChange={(v) => setSetupFee({ installments: Math.round(v) || 1 })} />
            <TextField id="setup-first-invoice" label="First payment" type="date"
              value={quote.setupFee.firstInvoiceDate} onChange={(v) => setSetupFee({ firstInvoiceDate: v })} />
          </div>
          {recommended && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-orange px-4 py-3">
              <p className="text-sm text-navy">
                Recommended setup fee: <span data-testid="setup-recommended" className="font-bold">{usd(recommended.amount)}</span>
                <span className="block text-xs text-tngray-dark">
                  {recommended.percent}% of the {usd(recommended.monthly)} monthly fee ({recommended.label})
                </span>
              </p>
              {quote.setupFee.amount !== recommended.amount && (
                <button type="button" onClick={() => setSetupFee({ amount: recommended.amount })}
                  className={primaryButton}>
                  Use recommended
                </button>
              )}
            </div>
          )}
          <TextField id="setup-notes" label="Notes (shown on outputs)" value={quote.setupFee.notes}
            onChange={(v) => setSetupFee({ notes: v })} placeholder="e.g. Waived with signed agreement by Dec 15" />
          {setup.gross > 0 && (
            <SummaryLine label="Net setup fee" value={usd(setup.net)}
              extra={setup.count > 1 ? `${setup.count} payments of ${usd(setup.schedule[0].amount)}` : "Paid in one payment"} />
          )}
        </Section>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button type="button" className="text-sm text-tngray-dark underline hover:text-navy"
          onClick={() => { if (window.confirm("Clear all quote details?")) reset(); }}>
          Clear all quote details
        </button>
        <span className="flex flex-wrap items-center gap-4">
          <Link to="/paperwork-deadlines" className="text-sm font-semibold text-navy underline">Paperwork deadlines calendar</Link>
          <Link to="/outputs" className={primaryButton}>
          Go to outputs →
          </Link>
        </span>
      </div>
    </div>
  );
}

function SummaryLine({ label, value, extra }: { label: string; value: string; extra?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-orange/10 px-4 py-3">
      <span className="text-sm font-medium text-navy">{label}</span>
      <span className="text-right">
        <span data-testid={`summary-${label.toLowerCase().replace(/\s+/g, "-")}`} className="text-lg font-bold text-navy">{value}</span>
        {extra && <span className="block text-xs text-tngray-dark">{extra}</span>}
      </span>
    </div>
  );
}
