import { Card, CardContent } from "../components/ui/card";
import PageTitle from "../components/PageTitle";
import { useQuote } from "../state/QuoteContext";
import { usd } from "../lib/pricing";
import { Totals } from "./benefits/fields";
import { NeedsProposal } from "./Taxes";

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${usd(Math.abs(n))}`;

// Workers' compensation comparison from the imported Chevron proposal. EPLI is still to come.
export default function WorkersComp() {
  const { quote } = useQuote();
  const c = quote.chevron;
  const rows = c?.workersComp ?? [];
  const current = rows.reduce((a, r) => a + r.currentFee, 0);
  const trinet = rows.reduce((a, r) => a + r.trinetFee, 0);
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <PageTitle eyebrow="Risk" title="Worker's Comp & EPLI" subtitle="Workers' compensation and employment practices liability coverage and costs." />
      {!c ? <NeedsProposal what="workers' compensation rates and costs" /> : (
        <>
          <Totals items={[
            { label: "Billable wages", value: usd(rows.reduce((a, r) => a + r.wages, 0), 0) },
            { label: "Current WC / year", value: current ? usd(current, 0) : "Not provided", testId: "wc-current" },
            { label: "TriNet WC / year", value: usd(trinet, 0), testId: "wc-trinet" },
            { label: "Difference", value: current ? signed(trinet - current) : "—" },
          ]} />
          <Card>
            <CardContent className="p-5 sm:p-6 overflow-x-auto">
              <h3 className="text-lg font-bold text-navy">Workers' compensation comparison</h3>
              <table className="mt-3 w-full min-w-[760px] text-sm" data-testid="wc-table">
                <thead>
                  <tr className="text-left text-tngray-dark border-b border-tngray-light">
                    <th className="py-2 pr-3 font-semibold">State</th>
                    <th className="py-2 pr-3 font-semibold">Class code</th>
                    <th className="py-2 pr-3 font-semibold text-right">Billable wages</th>
                    <th className="py-2 pr-3 font-semibold text-right">Current rate</th>
                    <th className="py-2 pr-3 font-semibold text-right">Current fee</th>
                    <th className="py-2 pr-3 font-semibold text-right">TriNet rate</th>
                    <th className="py-2 font-semibold text-right">TriNet annual fee</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.state}-${r.code}`} className="border-b border-tngray-light last:border-0">
                      <td className="py-2 pr-3 font-semibold">{r.state}</td>
                      <td className="py-2 pr-3">{r.code}</td>
                      <td className="py-2 pr-3 text-right">{usd(r.wages, 0)}</td>
                      <td className="py-2 pr-3 text-right">{r.currentRate.toFixed(3)}</td>
                      <td className="py-2 pr-3 text-right">{usd(r.currentFee)}</td>
                      <td className="py-2 pr-3 text-right">{r.trinetRate.toFixed(3)}</td>
                      <td className="py-2 text-right font-semibold">{usd(r.trinetFee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-tngray-dark">
                Rates apply to every $100 of compensable wages (hourly in WA). Pay-as-you-go with no deductibles; rates are estimates and subject to change.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 sm:p-6">
              <h3 className="text-lg font-bold text-navy">EPLI</h3>
              <p className="text-sm text-tngray-dark mt-1">Employment practices liability details are coming next.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
