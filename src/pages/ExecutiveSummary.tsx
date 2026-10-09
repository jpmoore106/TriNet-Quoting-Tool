import type React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Printer } from "lucide-react";
import TriNetLogo from "../assets/trinet_white_rgb_md.png";
import { useQuote } from "../state/QuoteContext";
import { SERVICE_INCLUSIONS } from "../data/serviceInclusions";
import { feeSummary, formatDate, priceBreakRows, rateCapSchedule, setupFeeSchedule, usd } from "../lib/pricing";

// Print-ready, letter-size executive summary. Rendered without the app header.
export default function ExecutiveSummary() {
  const { quote } = useQuote();
  const fees = feeSummary(quote);
  const breaks = priceBreakRows(quote);
  const cap = rateCapSchedule(quote);
  const setup = setupFeeSchedule(quote);
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
    <div className="min-h-screen bg-slate-200 print:bg-white py-6 print:py-0">
      <div className="no-print max-w-[8.5in] mx-auto mb-4 px-4 flex justify-between">
        <Link to="/outputs" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0B0134] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to outputs
        </Link>
        <button type="button" onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FD5000] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <article className="exec-page bg-white max-w-[8.5in] mx-auto shadow-lg print:shadow-none text-[#0B0134] text-[13px] leading-snug"
        style={{ fontFamily: "'Avenir Next','Avenir',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif" }}>
        <header className="bg-[#0B0134] px-10 py-6 flex items-center justify-between gap-6">
          <div>
            <img src={TriNetLogo} alt="TriNet" className="h-7 w-auto" />
            <p className="mt-4 text-xs uppercase tracking-wider font-semibold text-[#FD5000]">Executive summary</p>
            <h1 className="text-3xl font-bold text-white">{company}</h1>
            <p className="text-sm text-slate-300">
              {quote.repName ? `Prepared by ${quote.repName} · ` : ""}{format(new Date(), "MMMM d, yyyy")}
            </p>
          </div>
          {quote.companyLogo && (
            <div className="rounded-lg bg-white p-3">
              <img src={quote.companyLogo} alt={`${company} logo`} className="h-14 max-w-[160px] object-contain" />
            </div>
          )}
        </header>
        <div className="h-1.5 bg-[#FD5000]" />

        <div className="px-10 py-7 space-y-6">
          <section>
            <H>Where you are today</H>
            <p>{today}</p>
          </section>

          <section>
            <H>Your investment</H>
            <div className="grid grid-cols-4 gap-3">
              <Tile label={fees.hasPt ? "Blended PEPM" : "PEPM"} value={usd(fees.pepm)} highlight />
              <Tile label="Monthly fee" value={fees.monthly > 0 ? usd(fees.monthly, 0) : "—"} />
              <Tile label="Annual fee" value={fees.annual > 0 ? usd(fees.annual, 0) : "—"} />
              <Tile label="Setup fee" value={setup.gross > 0 ? usd(setup.net, 0) : "—"}
                detail={setup.discount > 0 ? `${usd(setup.discount, 0)} discount` : setup.count > 1 ? `${setup.count} payments` : undefined} />
            </div>
            {fees.hasPt && (
              <p className="mt-2 text-xs text-slate-500">
                {fees.ft} full-time × {usd(quote.ftPepm || 0)} + {fees.pt} part-time × {usd(quote.ptPepm || 0)} per month.
              </p>
            )}
          </section>

          {(breaks.length > 0 || cap.length > 0) && (
            <section className="grid grid-cols-2 gap-6">
              {breaks.length > 0 && (
                <div>
                  <H>Price breaks as you grow</H>
                  <table className="w-full">
                    <thead><tr className="text-left text-slate-500 border-b"><th className="py-1 font-medium">Headcount</th><th className="py-1 font-medium">PEPM</th><th className="py-1 font-medium">Monthly</th></tr></thead>
                    <tbody>
                      {breaks.map((b) => (
                        <tr key={b.id} className="border-b border-slate-100">
                          <td className="py-1">{b.headcount}+</td><td className="py-1 font-semibold">{usd(b.pepm)}</td><td className="py-1">{usd(b.monthly, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {cap.length > 0 && (
                <div>
                  <H>Rate protection</H>
                  <p className="mb-1">
                    {quote.rateCap.percent > 0
                      ? `PEPM increases are capped at ${quote.rateCap.percent}% a year for ${cap.length} years.`
                      : `PEPM is locked for ${cap.length} years.`}
                  </p>
                  <p className="text-slate-500">
                    {cap.map((y) => `Year ${y.year}: ${usd(y.maxPepm)}`).join(" · ")}
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
              {quote.setupFee.notes && <p className="text-slate-500 mt-1">{quote.setupFee.notes}</p>}
            </section>
          )}

          <section>
            <H>What's included</H>
            <div className="grid grid-cols-3 gap-x-6 gap-y-3">
              {SERVICE_INCLUSIONS.map((c) => (
                <div key={c.title}>
                  <p className="font-semibold border-l-4 border-[#FD5000] pl-2">{c.title}</p>
                  <p className="text-slate-600 pl-3">{c.items.slice(0, 3).join(" · ")}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <H>Next steps</H>
            <ol className="list-decimal pl-5 space-y-0.5">
              <li>Review this proposal and confirm your employee counts</li>
              <li>Sign the TriNet Service Agreement</li>
              <li>Submit complete paperwork by the deadline for your target live date</li>
              <li>Kick off implementation with your TriNet onboarding team</li>
            </ol>
          </section>
        </div>
      </article>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs uppercase tracking-wider font-bold text-[#FD5000] mb-1.5">{children}</h2>;
}

function Tile({ label, value, detail, highlight }: { label: string; value: string; detail?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-[#0B0134] text-white" : "bg-slate-100"}`}>
      <p className={`text-[10px] uppercase tracking-wider ${highlight ? "text-[#FD5000]" : "text-slate-500"}`}>{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {detail && <p className={`text-[11px] ${highlight ? "text-slate-300" : "text-slate-500"}`}>{detail}</p>}
    </div>
  );
}
