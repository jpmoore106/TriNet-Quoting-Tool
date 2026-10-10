import { Link } from "react-router-dom";
import DeckSlides from "../components/DeckSlides";
import { PAGE_SLIDES } from "../data/masterDeck";
import { Card, CardContent } from "../components/ui/card";
import PageTitle from "../components/PageTitle";
import { useQuote } from "../state/QuoteContext";
import { usd } from "../lib/pricing";
import { Totals } from "./benefits/fields";

export function NeedsProposal({ what }: { what: string }) {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6 text-navy">
        <p className="font-semibold">No proposal imported yet.</p>
        <p className="text-sm text-tngray-dark mt-1">
          Upload the Chevron proposal on the <Link to="/" className="underline text-orange-dark">Setup page</Link> to see {what}.
        </p>
      </CardContent>
    </Card>
  );
}

// Employer payroll taxes from the imported Chevron proposal.
export default function Taxes() {
  const { quote } = useQuote();
  const c = quote.chevron;
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <PageTitle eyebrow="Payroll" title="Taxes" subtitle="Employer payroll taxes: FICA, FUTA and state unemployment (SUTA)." />
      {!c ? <NeedsProposal what="tax rates and estimated payroll taxes" /> : (
        <>
          <Totals items={[
            { label: "Annual gross wages", value: usd(c.annual.grossWages, 0), testId: "tax-wages" },
            { label: "Estimated payroll taxes", value: usd(c.annual.payrollTaxes, 0), testId: "tax-annual" },
            { label: "Share of gross wages", value: c.annual.grossWages ? `${((c.annual.payrollTaxes / c.annual.grossWages) * 100).toFixed(2)}%` : "—", testId: "tax-share" },
            { label: "Per month", value: usd(c.annual.payrollTaxes / 12, 0) },
          ]} />
          <Card>
            <CardContent className="p-5 sm:p-6 overflow-x-auto">
              <h3 className="text-lg font-bold text-navy">Tax rates by state</h3>
              <table className="mt-3 w-full min-w-[560px] text-sm" data-testid="tax-table">
                <thead>
                  <tr className="text-left text-tngray-dark border-b border-tngray-light">
                    <th className="py-2 pr-4 font-semibold">State</th>
                    <th className="py-2 pr-4 font-semibold text-right">FICA</th>
                    <th className="py-2 pr-4 font-semibold text-right">FUTA</th>
                    <th className="py-2 font-semibold text-right">SUTA</th>
                  </tr>
                </thead>
                <tbody>
                  {c.taxes.map((t) => (
                    <tr key={`${t.state}-${t.classCode}`} className="border-b border-tngray-light last:border-0">
                      <td className="py-2 pr-4 font-semibold">{t.state}</td>
                      <td className="py-2 pr-4 text-right">{t.fica.toFixed(2)}%</td>
                      <td className="py-2 pr-4 text-right">{t.futa.toFixed(2)}%</td>
                      <td className="py-2 text-right">{t.suta.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-tngray-dark">
                From {c.fileName}{c.quoteNumber ? ` (${c.quoteNumber})` : ""}. FICA and FUTA are charged at the federal rate. TriNet SUTA rates may include
                administrative charges and are subject to change; estimates use annual wages capped as applicable.
              </p>
            </CardContent>
          </Card>
        </>
      )}
      <DeckSlides slides={PAGE_SLIDES.taxes} intro="Show how TriNet handles payroll and payroll taxes." />
    </div>
  );
}
