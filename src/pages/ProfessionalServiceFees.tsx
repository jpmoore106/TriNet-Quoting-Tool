import type React from "react";
import { Link } from "react-router-dom";
import { Check, Pencil } from "lucide-react";
import growthIcon from "../assets/icons/growth.png";
import riskIcon from "../assets/icons/risk.png";
import technologyIcon from "../assets/icons/technology.png";
import { Card, CardContent } from "../components/ui/card";
import PageTitle from "../components/PageTitle";
import WingMotif from "../components/WingMotif";
import { secondaryButton } from "../components/form";
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
        <PageTitle eyebrow="Your investment" title="Professional Service Fees" subtitle="One simple per-employee fee, and everything it includes." />
        <Link to="/" className={secondaryButton}>
          <Pencil className="h-4 w-4" /> Edit pricing on Setup
        </Link>
      </div>

      <section aria-label="Fee summary" className="relative overflow-hidden rounded-2xl bg-navy text-white p-6 sm:p-8 shadow-sm">
        <WingMotif size={88} thickness={22} className="right-0 top-0" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-sm uppercase tracking-wider text-orange font-semibold">
              {fees.hasPt ? "Blended PEPM" : "Professional Service Fee"}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span data-testid="pepm" className="text-5xl sm:text-6xl font-bold">{usd(fees.pepm)}</span>
              <span className="text-white/80">per employee / month</span>
            </div>
            {fees.pepm > 0 ? (
              <p className="mt-2 text-white/80">
                That's about <span className="text-white font-semibold">{usd(fees.perWorkday)}</span> per employee per workday.
              </p>
            ) : (
              <p className="mt-2 text-white/80">
                Enter PEPM rates on the <Link to="/" className="underline text-orange">Setup page</Link>.
              </p>
            )}
            {fees.hasPt && fees.monthly > 0 && (
              <div className="mt-6">
                <div className="flex h-3 overflow-hidden rounded-full bg-white/10" role="img"
                  aria-label={`Full-time ${Math.round(fees.ftShare)}% and part-time ${Math.round(100 - fees.ftShare)}% of the monthly fee`}>
                  <div className="bg-orange" style={{ width: `${fees.ftShare}%` }} />
                  <div className="bg-white/60" style={{ width: `${100 - fees.ftShare}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-white/80">
                  <span><span className="inline-block h-2 w-2 rounded-full bg-orange mr-1.5" />
                    Full-time: {fees.ft} × {usd(quote.ftPepm || 0)} = {usd(fees.ftMonthly, 0)}/mo</span>
                  <span><span className="inline-block h-2 w-2 rounded-full bg-white/60 mr-1.5" />
                    Part-time: {fees.pt} × {usd(quote.ptPepm || 0)} = {usd(fees.ptMonthly, 0)}/mo</span>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-4 content-start lg:pt-16">
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
            <FeatureCard icon={growthIcon} title="Price breaks as you grow" className={cap ? "lg:col-span-2" : "lg:col-span-3"}
              subtitle={`Your full-time PEPM drops as your team reaches each headcount.${fees.hasPt ? " Part-time pricing stays the same." : ""}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="price-breaks">
                  <thead>
                    <tr className="text-left text-tngray-dark border-b border-tngray-light">
                      <th className="py-2 pr-4 font-medium">Headcount</th>
                      <th className="py-2 pr-4 font-medium">FT PEPM</th>
                      <th className="py-2 pr-4 font-medium">Monthly (FT)</th>
                      <th className="py-2 pr-4 font-medium">Annual (FT)</th>
                      <th className="py-2 font-medium">vs. today</th>
                    </tr>
                  </thead>
                  <tbody className="text-navy">
                    {fees.ft > 0 && (
                      <tr className="border-b border-tngray-light text-tngray-dark">
                        <td className="py-2 pr-4">{fees.ft} (today)</td>
                        <td className="py-2 pr-4">{usd(quote.ftPepm || 0)}</td>
                        <td className="py-2 pr-4">{usd(fees.ftMonthly, 0)}</td>
                        <td className="py-2 pr-4">{usd(fees.ftMonthly * 12, 0)}</td>
                        <td className="py-2">—</td>
                      </tr>
                    )}
                    {breaks.map((b) => (
                      <tr key={b.id} className="border-b border-tngray-light last:border-0">
                        <td className="py-2 pr-4 font-semibold">{b.headcount}+</td>
                        <td className="py-2 pr-4 font-semibold">{usd(b.pepm)}</td>
                        <td className="py-2 pr-4">{usd(b.monthly, 0)}</td>
                        <td className="py-2 pr-4">{usd(b.annual, 0)}</td>
                        <td className="py-2">
                          {b.savingsPerEmployee > 0 ? (
                            <span className="rounded-full bg-orange/10 px-2 py-0.5 text-navy font-semibold">
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
            <FeatureCard icon={riskIcon} title="Rate protection" className={breaks.length ? "" : "lg:col-span-3"}
              subtitle={cap.percent > 0
                ? `At your year 2 renewal, your PEPM won't increase more than ${cap.percent}%.`
                : "Your PEPM won't increase at your year 2 renewal."}>
              <ul className="space-y-2 text-sm" data-testid="rate-cap">
                <CapRow label={fees.hasPt ? "Full-time PEPM" : "PEPM"} today={quote.ftPepm || 0} max={cap.ftMax} />
                {fees.hasPt && <CapRow label="Part-time PEPM" today={quote.ptPepm || 0} max={cap.ptMax} />}
              </ul>
              <p className="mt-3 text-xs text-tngray-dark">
                This is a not-to-exceed cap, not a planned increase. It applies to the year 2 renewal only.
              </p>
            </FeatureCard>
          )}
        </div>
      )}

      {setup.gross > 0 && (
        <div className="mt-6">
          <FeatureCard icon={technologyIcon} title="Setup fee" subtitle="One-time implementation to get your team onto TriNet.">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-2 text-sm" data-testid="setup-fee">
                <Row label="Setup fee" value={usd(setup.gross)} />
                {setup.discount > 0 && <Row label="Discount" value={`−${usd(setup.discount)}`} accent />}
                <div className="flex justify-between border-t border-tngray-light pt-2">
                  <span className="font-semibold text-navy">You pay</span>
                  <span className="text-xl font-bold text-navy">{usd(setup.net)}</span>
                </div>
                {quote.setupFee.notes && <p className="text-xs text-tngray-dark pt-1">{quote.setupFee.notes}</p>}
              </div>
              <div className="lg:col-span-2">
                <p className="text-sm font-medium text-navy mb-2">
                  {setup.count > 1 ? `Split into ${setup.count} payments` : "Payment"}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" data-testid="setup-schedule">
                  {setup.schedule.map((p) => (
                    <div key={p.number} className="rounded-lg border border-tngray-light px-3 py-2">
                      <p className="text-xs text-tngray-dark">{p.date || `Payment ${p.number}`}</p>
                      <p className="font-semibold text-navy">{usd(p.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FeatureCard>
        </div>
      )}

      <h3 className="mt-10 mb-1 text-2xl font-bold leading-tight text-navy"><span className="block text-orange">Everything you need</span>What's included in your fee</h3>
      <p className="mb-4 text-tngray-dark">Every employee is covered by the full TriNet service, with no per-service add-ons for the essentials below.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {SERVICE_INCLUSIONS.map(({ title, icon, summary, items }) => (
          <Card key={title}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <img src={icon} alt="" className="h-12 w-12 object-contain" />
                <div>
                  <h4 className="font-bold text-navy">{title}</h4>
                  <p className="text-sm text-tngray-dark">{summary}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-tngray-dark">
                {items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-orange" aria-hidden />
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

function FeatureCard({ icon, title, subtitle, children, className = "" }: {
  icon: string; title: string; subtitle: string; children: React.ReactNode; className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <img src={icon} alt="" className="h-12 w-12 object-contain" />
          <div>
            <h3 className="text-lg font-bold text-navy">{title}</h3>
            <p className="text-sm text-tngray-dark">{subtitle}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function CapRow({ label, today, max }: { label: string; today: number; max: number }) {
  return (
    <li className="border-b border-tngray-light last:border-0 pb-2">
      <p className="text-tngray-dark">{label}</p>
      <p className="flex justify-between">
        <span className="text-navy">Today {usd(today)}</span>
        <span className="font-semibold text-navy">Year 2 max {usd(max)}</span>
      </p>
    </li>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-tngray-dark">{label}</span>
      <span className={accent ? "font-semibold text-orange-dark" : "font-medium text-navy"}>{value}</span>
    </div>
  );
}

function Stat({ label, value, detail, testId }: { label: string; value: string; detail?: string; testId?: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <p className="text-xs uppercase tracking-wider text-white/70">{label}</p>
      <p data-testid={testId} className="mt-1 text-2xl font-semibold">{value}</p>
      {detail && <p className="text-xs text-white/70 mt-0.5">{detail}</p>}
    </div>
  );
}
