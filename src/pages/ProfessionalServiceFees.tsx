import type React from "react";
import { Link } from "react-router-dom";
import { Check, TrendingDown, ShieldCheck, Rocket, Pencil } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import PageTitle from "../components/PageTitle";
import { useQuote } from "../state/QuoteContext";
import { SERVICE_INCLUSIONS } from "../data/serviceInclusions";
import { feeSummary, priceBreakRows, rateCapLimits, setupFeeSchedule, usd } from "../lib/pricing";

export default function ProfessionalServiceFees() {
  const { quote } = useQuote();
  const fees = feeSummary(quote);
  const breaks = priceBreakRows(quote);
  const cap = rateCapLimits(quote);
  const setup = setupFeeSchedule(quote);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle title="Professional Service Fees" subtitle="One simple per-employee fee, and everything it includes." />
        <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/25">
          <Pencil className="h-4 w-4" /> Edit pricing on Setup
        </Link>
      </div>

      <section aria-label="Fee summary" className="rounded-2xl bg-[#0B0134] text-white p-6 sm:p-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-sm uppercase tracking-wider text-[#FD5000] font-semibold">
              {fees.hasPt ? "Blended PEPM" : "Professional Service Fee"}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span data-testid="pepm" className="text-5xl sm:text-6xl font-bold">{usd(fees.pepm)}</span>
              <span className="text-slate-300">per employee / month</span>
            </div>
            {fees.pepm > 0 ? (
              <p className="mt-2 text-slate-300">
                That's about <span className="text-white font-semibold">{usd(fees.perWorkday)}</span> per employee per workday.
              </p>
            ) : (
              <p className="mt-2 text-slate-300">
                Enter PEPM rates on the <Link to="/" className="underline text-[#FD5000]">Setup page</Link>.
              </p>
            )}
            {fees.hasPt && fees.monthly > 0 && (
              <div className="mt-6">
                <div className="flex h-3 overflow-hidden rounded-full bg-white/10" role="img"
                  aria-label={`Full-time ${Math.round(fees.ftShare)}% and part-time ${Math.round(100 - fees.ftShare)}% of the monthly fee`}>
                  <div className="bg-[#FD5000]" style={{ width: `${fees.ftShare}%` }} />
                  <div className="bg-white/60" style={{ width: `${100 - fees.ftShare}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-slate-300">
                  <span><span className="inline-block h-2 w-2 rounded-full bg-[#FD5000] mr-1.5" />
                    Full-time: {fees.ft} × {usd(quote.ftPepm || 0)} = {usd(fees.ftMonthly, 0)}/mo</span>
                  <span><span className="inline-block h-2 w-2 rounded-full bg-white/60 mr-1.5" />
                    Part-time: {fees.pt} × {usd(quote.ptPepm || 0)} = {usd(fees.ptMonthly, 0)}/mo</span>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-4 content-start">
            <Stat label="Employees covered" value={fees.totalWse > 0 ? String(fees.totalWse) : "—"}
              detail={fees.hasPt ? `${fees.ft} FT · ${fees.pt} PT` : undefined} />
            <Stat label="Monthly fee" value={fees.monthly > 0 ? usd(fees.monthly, 0) : "—"} testId="monthly" />
            <Stat label="Annual fee" value={fees.annual > 0 ? usd(fees.annual, 0) : "—"} testId="annual" />
          </div>
        </div>
      </section>

      {(breaks.length > 0 || cap) && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {breaks.length > 0 && (
            <FeatureCard icon={TrendingDown} title="Price breaks as you grow" className={cap ? "lg:col-span-2" : "lg:col-span-3"}
              subtitle={`Your full-time PEPM drops as your team reaches each headcount.${fees.hasPt ? " Part-time pricing stays the same." : ""}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="price-breaks">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-4 font-medium">Headcount</th>
                      <th className="py-2 pr-4 font-medium">FT PEPM</th>
                      <th className="py-2 pr-4 font-medium">Monthly (FT)</th>
                      <th className="py-2 pr-4 font-medium">Annual (FT)</th>
                      <th className="py-2 font-medium">vs. today</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#0B0134]">
                    {fees.ft > 0 && (
                      <tr className="border-b border-slate-100 text-slate-500">
                        <td className="py-2 pr-4">{fees.ft} (today)</td>
                        <td className="py-2 pr-4">{usd(quote.ftPepm || 0)}</td>
                        <td className="py-2 pr-4">{usd(fees.ftMonthly, 0)}</td>
                        <td className="py-2 pr-4">{usd(fees.ftMonthly * 12, 0)}</td>
                        <td className="py-2">—</td>
                      </tr>
                    )}
                    {breaks.map((b) => (
                      <tr key={b.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-4 font-semibold">{b.headcount}+</td>
                        <td className="py-2 pr-4 font-semibold">{usd(b.pepm)}</td>
                        <td className="py-2 pr-4">{usd(b.monthly, 0)}</td>
                        <td className="py-2 pr-4">{usd(b.annual, 0)}</td>
                        <td className="py-2">
                          {b.savingsPerEmployee > 0 ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 font-medium">
                              {usd(b.savingsPerEmployee)} less ({b.savingsPercent.toFixed(1)}%)
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </FeatureCard>
          )}
          {cap && (
            <FeatureCard icon={ShieldCheck} title="Rate protection" className={breaks.length ? "" : "lg:col-span-3"}
              subtitle={cap.percent > 0
                ? `At your year 2 renewal, your PEPM won't increase more than ${cap.percent}%.`
                : "Your PEPM won't increase at your year 2 renewal."}>
              <ul className="space-y-2 text-sm" data-testid="rate-cap">
                <CapRow label={fees.hasPt ? "Full-time PEPM" : "PEPM"} today={quote.ftPepm || 0} max={cap.ftMax} />
                {fees.hasPt && <CapRow label="Part-time PEPM" today={quote.ptPepm || 0} max={cap.ptMax} />}
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                This is a not-to-exceed cap, not a planned increase. It applies to the year 2 renewal only.
              </p>
            </FeatureCard>
          )}
        </div>
      )}

      {setup.gross > 0 && (
        <div className="mt-6">
          <FeatureCard icon={Rocket} title="Setup fee" subtitle="One-time implementation to get your team onto TriNet.">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-2 text-sm" data-testid="setup-fee">
                <Row label="Setup fee" value={usd(setup.gross)} />
                {setup.discount > 0 && <Row label="Discount" value={`−${usd(setup.discount)}`} accent />}
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-semibold text-[#0B0134]">You pay</span>
                  <span className="text-xl font-bold text-[#0B0134]">{usd(setup.net)}</span>
                </div>
                {quote.setupFee.notes && <p className="text-xs text-slate-500 pt-1">{quote.setupFee.notes}</p>}
              </div>
              <div className="lg:col-span-2">
                <p className="text-sm font-medium text-[#0B0134] mb-2">
                  {setup.count > 1 ? `Split into ${setup.count} payments` : "Payment"}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" data-testid="setup-schedule">
                  {setup.schedule.map((p) => (
                    <div key={p.number} className="rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-xs text-slate-500">{p.date || `Payment ${p.number}`}</p>
                      <p className="font-semibold text-[#0B0134]">{usd(p.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FeatureCard>
        </div>
      )}

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

function FeatureCard({ icon: Icon, title, subtitle, children, className = "" }: {
  icon: typeof Check; title: string; subtitle: string; children: React.ReactNode; className?: string;
}) {
  return (
    <Card className={`shadow-sm border-slate-800 ${className}`}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FD5000]/10 text-[#FD5000]">
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-[#0B0134]">{title}</h3>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function CapRow({ label, today, max }: { label: string; today: number; max: number }) {
  return (
    <li className="border-b border-slate-100 last:border-0 pb-2">
      <p className="text-slate-500">{label}</p>
      <p className="flex justify-between">
        <span className="text-[#0B0134]">Today {usd(today)}</span>
        <span className="font-semibold text-[#0B0134]">Year 2 max {usd(max)}</span>
      </p>
    </li>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={accent ? "font-medium text-emerald-700" : "font-medium text-[#0B0134]"}>{value}</span>
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
