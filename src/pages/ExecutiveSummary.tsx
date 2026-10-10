import type React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Printer } from "lucide-react";
import TriNetLogo from "../assets/trinet_logo_full_color.png";
import WingMotif from "../components/WingMotif";
import { primaryButton } from "../components/form";
import { KEY_MESSAGES } from "../data/brandMessages";
import { useQuote } from "../state/QuoteContext";
import { SERVICE_INCLUSIONS } from "../data/serviceInclusions";
import { feeSummary, formatDate, freeMonthsCredit, priceBreakRows, rateCapLimits, setupFeeSchedule, usd } from "../lib/pricing";

// Print-ready, letter-size executive summary. Rendered without the app header.
export default function ExecutiveSummary() {
  const { quote } = useQuote();
  const fees = feeSummary(quote);
  const breaks = priceBreakRows(quote);
  const cap = rateCapLimits(quote);
  const setup = setupFeeSchedule(quote);
  const free = freeMonthsCredit(quote);
  const ins = quote.callInsights;
  const callSteps = (ins?.next_steps ?? []).filter((x) => x.action.trim()).slice(0, 2);
  const company = quote.companyName || "Your Company";

  const today = [
    `${company} has ${fees.totalWse || "—"} employees`,
    fees.hasPt ? ` (${fees.ft} full-time and ${fees.pt} part-time)` : "",
    quote.incumbentPayroll ? `, runs payroll with ${quote.incumbentPayroll}` : "",
    quote.incumbentMedicalCarrier ? `, and offers medical coverage through ${quote.incumbentMedicalCarrier}` : "",
    quote.medicalRenewalDate ? `, renewing ${formatDate(quote.medicalRenewalDate, "MMMM d, yyyy")}` : "",
    ".",
  ].join("");

  return (
    <div className="min-h-screen bg-canvas print:bg-white py-6 print:py-0">
      <div className="no-print max-w-[8.5in] mx-auto mb-4 px-4 flex justify-between">
        <Link to="/outputs" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to outputs
        </Link>
        <button type="button" onClick={() => window.print()}
          className={primaryButton}>
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <article className="exec-page relative overflow-hidden bg-white max-w-[8.5in] mx-auto shadow-lg print:shadow-none text-navy text-[13px] leading-snug font-brand">
        {/* On white, use the full-color logo; one wing motif per layout. */}
        <WingMotif size={72} thickness={18} className="right-0 top-0" />
        <header className="px-10 pt-7 pb-4 flex items-end justify-between gap-6 border-b border-tngray-light">
          <div>
            <img src={TriNetLogo} alt="TriNet" className="h-8 w-auto" />
            <h1 className="mt-4 text-3xl font-bold leading-tight">
              <span className="block text-orange">Executive Summary</span>
              {company}
            </h1>
            <p className="mt-1 text-sm text-tngray-dark">
              {quote.repName ? `Prepared by ${quote.repName} · ` : ""}{format(new Date(), "MMMM d, yyyy")}
            </p>
          </div>
          {quote.companyLogo && (
            <img src={quote.companyLogo} alt={`${company} logo`} className="h-16 max-w-[180px] object-contain mr-10" />
          )}
        </header>

        <div className="px-10 py-5 space-y-[18px]">
          <section>
            <H>Where you are today</H>
            <p data-testid="exec-today">{ins?.summary.trim() || today}</p>
          </section>

          {ins && (ins.priorities.length > 0 || ins.pain_points.length > 0) && (
            <section data-testid="exec-heard">
              <H>What we heard</H>
              <div className="grid grid-cols-2 gap-6">
                {ins.priorities.length > 0 && (
                  <div>
                    <p className="font-bold">Your priorities</p>
                    <ul className="mt-0.5 list-disc pl-4 space-y-0.5">
                      {ins.priorities.slice(0, 3).map((x) => <li key={x.title}><span className="font-semibold">{x.title}.</span> <span className="text-tngray-dark">{x.detail}</span></li>)}
                    </ul>
                  </div>
                )}
                {ins.pain_points.length > 0 && (
                  <div>
                    <p className="font-bold">Challenges today</p>
                    <ul className="mt-0.5 list-disc pl-4 space-y-0.5">
                      {ins.pain_points.slice(0, 3).map((x) => <li key={x.title}><span className="font-semibold">{x.title}.</span> <span className="text-tngray-dark">{x.detail}</span></li>)}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          <section>
            <H>Your investment</H>
            <div className="grid grid-cols-4 gap-3">
              <Tile label={fees.hasPt ? "Blended PEPM" : "PEPM"} value={usd(fees.pepm)} highlight />
              <Tile label="Monthly fee" value={fees.monthly > 0 ? usd(fees.monthly, 0) : "—"} />
              <Tile label="Annual fee" value={fees.annual > 0 ? usd(fees.annual, 0) : "—"} />
              <Tile label="Setup fee" value={setup.gross > 0 ? usd(setup.net, 0) : "—"}
                detail={setup.discount > 0 ? `${usd(setup.discount, 0)} discount` : setup.count > 1 ? `${setup.count} payments` : undefined} />
            </div>
            {free.months > 0 && fees.monthly > 0 && (
              <p className="mt-2 font-semibold" data-testid="exec-free-months">
                {free.months} month{free.months > 1 ? "s" : ""} free: a {usd(free.credit, 0)} credit in year one, for a year-one fee of {usd(free.yearOne, 0)}.
              </p>
            )}
            {fees.hasPt && (
              <p className="mt-2 text-xs text-tngray-dark">
                {fees.ft} full-time × {usd(quote.ftPepm || 0)} + {fees.pt} part-time × {usd(quote.ptPepm || 0)} per month.
              </p>
            )}
          </section>

          {(breaks.length > 0 || cap) && (
            <section className="grid grid-cols-2 gap-6">
              {breaks.length > 0 && (
                <div>
                  <H>Price breaks as you grow</H>
                  <table className="w-full">
                    <thead><tr className="text-left text-tngray-dark border-b"><th className="py-1 font-medium">Headcount</th><th className="py-1 font-medium">FT PEPM</th><th className="py-1 font-medium">Monthly (FT)</th></tr></thead>
                    <tbody>
                      {breaks.map((b) => (
                        <tr key={b.id} className="border-b border-tngray-light">
                          <td className="py-1">{b.headcount}+</td><td className="py-1 font-semibold">{usd(b.pepm)}</td><td className="py-1">{usd(b.monthly, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {cap && (
                <div>
                  <H>Rate protection</H>
                  <p className="mb-1">
                    {cap.percent > 0
                      ? `At the year 2 renewal, the PEPM won't increase more than ${cap.percent}%.`
                      : "The PEPM won't increase at the year 2 renewal."}
                  </p>
                  <p className="text-tngray-dark">
                    Year 2 maximum: {usd(cap.ftMax)}{fees.hasPt ? ` full-time · ${usd(cap.ptMax)} part-time` : " PEPM"}.
                    A not-to-exceed cap, not a planned increase.
                  </p>
                </div>
              )}
            </section>
          )}

          {setup.gross > 0 && (setup.count > 1 || quote.setupFee.notes) && (
            <section>
              <H>Setup fee</H>
              <p>
                {usd(setup.gross)} setup fee{setup.discount > 0 ? `, less a ${usd(setup.discount)} discount` : ""}: {usd(setup.net)} total
                {setup.count > 1 ? `, paid in ${setup.count} payments of ${usd(setup.schedule[0].amount)}` : ""}
                {setup.count > 1 && setup.schedule[0].date ? ` starting ${setup.schedule[0].date}` : ""}.
              </p>
              {quote.setupFee.notes && <p className="text-tngray-dark mt-1">{quote.setupFee.notes}</p>}
            </section>
          )}

          <section>
            <H>What's included</H>
            <div className="grid grid-cols-3 gap-x-6 gap-y-3">
              {SERVICE_INCLUSIONS.map((c) => (
                <div key={c.title} className="flex gap-2.5">
                  <img src={c.icon} alt="" className="h-8 w-8 shrink-0 object-contain" />
                  <div>
                    <p className="font-bold">{c.title}</p>
                    <p className="text-tngray-dark">{c.items.slice(0, 2).join(" · ")}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <H>Why TriNet</H>
            <div className="grid grid-cols-3 gap-3">
              {KEY_MESSAGES.map((m) => (
                <p key={m.title} className="rounded-lg bg-canvas px-3 py-2 font-bold">{m.title}</p>
              ))}
            </div>
          </section>

          <section>
            <H>Next steps</H>
            <ol className="list-decimal pl-5 space-y-0.5" data-testid="exec-next-steps">
              {callSteps.map((x) => <li key={x.action}>{x.action}{x.owner ? ` (${x.owner})` : ""}</li>)}
              {/* With next steps from the call, keep the page to one sheet: only the steps every deal needs. */}
              {callSteps.length === 0 && <li>Review this proposal and confirm your employee counts</li>}
              <li>Sign the TriNet Service Agreement</li>
              <li>Submit complete paperwork by the deadline for your target live date</li>
              {callSteps.length === 0 && <li>Kick off implementation with your TriNet onboarding team</li>}
            </ol>
          </section>
        </div>
      </article>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy">
      <span className="h-2.5 w-2.5 bg-orange" aria-hidden />{children}
    </h2>
  );
}

function Tile({ label, value, detail, highlight }: { label: string; value: string; detail?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-navy text-white" : "bg-canvas"}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${highlight ? "text-orange" : "text-tngray-dark"}`}>{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {detail && <p className={`text-[11px] ${highlight ? "text-white/80" : "text-tngray-dark"}`}>{detail}</p>}
    </div>
  );
}
