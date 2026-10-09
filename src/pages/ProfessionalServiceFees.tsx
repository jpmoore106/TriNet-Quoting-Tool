import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import PageTitle from "../components/PageTitle";
import { useQuote } from "../state/QuoteContext";
import { SERVICE_INCLUSIONS } from "../data/serviceInclusions";

const WORKDAYS_PER_YEAR = 260;

const usd = (n: number, digits = 2) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });

const labelClass = "block text-sm font-medium mb-1 text-[#0B0134]";
const inputClass = "w-full border border-slate-700 bg-slate-900 rounded-lg pl-7 pr-3 py-2 text-slate-100";

export default function ProfessionalServiceFees() {
  const { quote, update, totalWse } = useQuote();
  const ft = quote.ftWse || 0;
  const pt = quote.ptWse || 0;
  const hasPt = pt > 0;

  const ftMonthly = ft * (quote.ftPepm || 0);
  const ptMonthly = hasPt ? pt * (quote.ptPepm || 0) : 0;
  const monthly = ftMonthly + ptMonthly;
  // Blended PEPM: total monthly fee spread across every WSE (FT and PT).
  const pepm = totalWse > 0 ? monthly / totalWse : quote.ftPepm || 0;
  const annual = monthly * 12;
  const perWorkday = (pepm * 12) / WORKDAYS_PER_YEAR;
  const ftShare = monthly > 0 ? (ftMonthly / monthly) * 100 : 0;

  const toRate = (v: string) => Math.max(0, parseFloat(v) || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageTitle
        title="Professional Service Fees"
        subtitle="One simple per-employee fee, and everything it includes."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm border-slate-800">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <h3 className="text-lg font-semibold text-[#0B0134]">PEPM rates</h3>
            {totalWse === 0 && (
              <p className="text-sm text-slate-600">
                Enter FT and PT WSE counts on the <Link to="/" className="underline text-[#FD5000]">Home page</Link> to see totals.
              </p>
            )}
            <RateInput id="ft-pepm" label={`Full-time PEPM${ft ? ` (${ft} FT WSE)` : ""}`}
              value={quote.ftPepm} onChange={(v) => update({ ftPepm: toRate(v) })} />
            {hasPt && (
              <RateInput id="pt-pepm" label={`Part-time PEPM (${pt} PT WSE)`}
                value={quote.ptPepm} onChange={(v) => update({ ptPepm: toRate(v) })} />
            )}
            {!hasPt && (
              <p className="text-xs text-slate-500">
                Add PT WSE on the Home page to enter a part-time rate and see a blended PEPM.
              </p>
            )}
          </CardContent>
        </Card>

        <section aria-label="Fee summary" className="lg:col-span-2 rounded-2xl bg-[#0B0134] text-white p-6 sm:p-8 shadow-sm">
          <p className="text-sm uppercase tracking-wider text-[#FD5000] font-semibold">
            {hasPt ? "Blended PEPM" : "Professional Service Fee"}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span data-testid="pepm" className="text-5xl sm:text-6xl font-bold">{usd(pepm)}</span>
            <span className="text-slate-300">per employee / month</span>
          </div>
          {pepm > 0 && (
            <p className="mt-2 text-slate-300">
              That's about <span className="text-white font-semibold">{usd(perWorkday)}</span> per employee per workday.
            </p>
          )}

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="Employees covered" value={totalWse > 0 ? String(totalWse) : "—"}
              detail={hasPt ? `${ft} FT · ${pt} PT` : undefined} />
            <Stat label="Monthly fee" value={monthly > 0 ? usd(monthly, 0) : "—"} testId="monthly" />
            <Stat label="Annual fee" value={annual > 0 ? usd(annual, 0) : "—"} testId="annual" />
          </div>

          {hasPt && monthly > 0 && (
            <div className="mt-6">
              <div className="flex h-3 overflow-hidden rounded-full bg-white/10" role="img"
                aria-label={`Full-time ${Math.round(ftShare)}% and part-time ${Math.round(100 - ftShare)}% of the monthly fee`}>
                <div className="bg-[#FD5000]" style={{ width: `${ftShare}%` }} />
                <div className="bg-white/60" style={{ width: `${100 - ftShare}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-sm text-slate-300">
                <span><span className="inline-block h-2 w-2 rounded-full bg-[#FD5000] mr-1.5" />
                  Full-time: {ft} × {usd(quote.ftPepm || 0)} = {usd(ftMonthly, 0)}/mo</span>
                <span><span className="inline-block h-2 w-2 rounded-full bg-white/60 mr-1.5" />
                  Part-time: {pt} × {usd(quote.ptPepm || 0)} = {usd(ptMonthly, 0)}/mo</span>
              </div>
            </div>
          )}
        </section>
      </div>

      <h3 className="mt-10 mb-1 text-xl font-bold text-white">What's included in your fee</h3>
      <p className="mb-4 text-sm text-white/90">Every employee is covered by the full TriNet service, with no per-service add-ons for the essentials below.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {SERVICE_INCLUSIONS.map(({ title, icon: Icon, summary, items }) => (
          <Card key={title} className="shadow-sm border-slate-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FD5000]/10 text-[#FD5000]">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h4 className="font-semibold text-[#0B0134]">{title}</h4>
                  <p className="text-sm text-slate-500">{summary}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#FD5000]" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RateInput({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
        <input id={id} type="number" min={0} step="0.01" inputMode="decimal" className={inputClass}
          value={value || ""} placeholder="0.00" onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function Stat({ label, value, detail, testId }: { label: string; value: string; detail?: string; testId?: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p data-testid={testId} className="mt-1 text-2xl font-semibold">{value}</p>
      {detail && <p className="text-xs text-slate-400 mt-0.5">{detail}</p>}
    </div>
  );
}
