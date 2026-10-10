import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import CollateralCard from "../components/CollateralCard";
import DeckSlides from "../components/DeckSlides";
import { PAGE_SLIDES } from "../data/masterDeck";
import { EPLI_COLLATERAL, LEGAL_HOTLINE_COLLATERAL } from "../data/collateral";
import PageTitle from "../components/PageTitle";
import { Section, inputClass, labelClass, secondaryButton } from "../components/form";
import { useQuote, type CurrentWcRow } from "../state/QuoteContext";
import { usd } from "../lib/pricing";
import { currentWcSummary } from "../lib/workersComp";
import { CellMoney, CellNumber, Totals } from "./benefits/fields";
import CarveOuts, { CarvedOutBanner } from "../components/CarveOuts";

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${usd(Math.abs(n))}`;
const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}%`;
const newRow = (r: Partial<CurrentWcRow> = {}): CurrentWcRow => ({ id: crypto.randomUUID(), state: "", code: "", description: "", wages: 0, rate: 0, ...r });

// Workers' compensation: the prospect's current coverage, TriNet's rates from the Chevron proposal, and EPLI.
export default function WorkersComp() {
  const { quote, update } = useQuote();
  const c = quote.chevron;
  const wc = quote.currentWc;
  const setWc = (changes: Partial<typeof wc>) => update({ currentWc: { ...wc, ...changes } });
  const setRow = (id: string, changes: Partial<CurrentWcRow>) => setWc({ rows: wc.rows.map((r) => (r.id === id ? { ...r, ...changes } : r)) });
  const cur = currentWcSummary(wc);
  const trinetRows = c?.workersComp ?? [];
  const trinet = trinetRows.reduce((a, r) => a + r.trinetFee, 0);
  // Current annual cost: the discounted premium entered here, else the current fees on the Chevron proposal.
  const currentCost = cur.hasData ? cur.discounted : trinetRows.reduce((a, r) => a + r.currentFee, 0);
  const carved = quote.workersCompCarvedOut;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <PageTitle eyebrow="Risk" title="Worker's Comp & EPLI" subtitle="Workers' compensation and employment practices liability coverage and costs." />

      {carved && <CarvedOutBanner what="workersComp" />}
      <CarveOuts only="workersComp" />
      <Totals items={[
        { label: "Current WC / year", value: currentCost ? usd(currentCost, 0) : "Not entered", testId: "wc-current" },
        { label: "TriNet WC / year", value: carved ? "Carved out" : trinet ? usd(trinet, 0) : "Import the proposal", testId: "wc-trinet" },
        { label: "Difference", value: !carved && currentCost && trinet ? signed(trinet - currentCost) : "—", testId: "wc-difference" },
        { label: "EPLI", value: "$1M included" },
      ]} />

      <Section title="Current workers' comp" description="The prospect's current policy: class codes, billable wages and manual rates per $100 of wages.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm" data-testid="current-wc-table">
            <thead>
              <tr className="text-left text-tngray-dark border-b border-tngray-light">
                <th className="py-2 pr-2 font-semibold w-20">State</th>
                <th className="py-2 pr-2 font-semibold w-24">Class code</th>
                <th className="py-2 pr-2 font-semibold">Description</th>
                <th className="py-2 pr-2 font-semibold w-40">Billable wages</th>
                <th className="py-2 pr-2 font-semibold w-28">Rate</th>
                <th className="py-2 pr-2 font-semibold text-right">Manual premium</th>
                <th className="py-2 pr-2 font-semibold text-right">Adjusted rate</th>
                <th className="py-2 pr-2 font-semibold text-right">Adjusted premium</th>
                <th className="py-2 w-9"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {cur.rows.map((r, i) => (
                <tr key={r.id} className="border-b border-tngray-light last:border-0">
                  <td className="py-1.5 pr-2">
                    <input aria-label={`Row ${i + 1} state`} className={`${inputClass} py-1.5 px-2 text-sm uppercase`} maxLength={2} value={r.state}
                      onChange={(e) => setRow(r.id, { state: e.target.value.toUpperCase() })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input aria-label={`Row ${i + 1} class code`} className={`${inputClass} py-1.5 px-2 text-sm`} value={r.code}
                      onChange={(e) => setRow(r.id, { code: e.target.value })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input aria-label={`Row ${i + 1} description`} className={`${inputClass} py-1.5 px-2 text-sm`} value={r.description}
                      placeholder="e.g. Clerical office" onChange={(e) => setRow(r.id, { description: e.target.value })} />
                  </td>
                  <td className="py-1.5 pr-2"><CellMoney label={`Row ${i + 1} billable wages`} value={r.wages} onChange={(v) => setRow(r.id, { wages: v })} /></td>
                  <td className="py-1.5 pr-2"><CellNumber label={`Row ${i + 1} rate`} value={r.rate} step={0.001} onChange={(v) => setRow(r.id, { rate: v })} /></td>
                  <td className="py-1.5 pr-2 text-right">{usd(r.premium)}</td>
                  <td className="py-1.5 pr-2 text-right font-semibold" data-testid={`wc-adjusted-rate-${i}`}>{r.adjustedRate.toFixed(3)}</td>
                  <td className="py-1.5 pr-2 text-right">{usd(r.adjustedPremium)}</td>
                  <td className="py-1.5">
                    <button type="button" aria-label={`Remove row ${i + 1}`} onClick={() => setWc({ rows: wc.rows.filter((x) => x.id !== r.id) })}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-tngray-dark hover:bg-alert/5 hover:text-alert">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {cur.rows.length > 0 && (
              <tfoot>
                <tr className="font-bold">
                  <td className="py-2" colSpan={3}>Total</td>
                  <td className="py-2 pr-2">{usd(cur.wages, 0)}</td>
                  <td />
                  <td className="py-2 pr-2 text-right">{usd(cur.manual)}</td>
                  <td />
                  <td className="py-2 pr-2 text-right">{usd(cur.manual * cur.factor)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} onClick={() => setWc({ rows: [...wc.rows, newRow()] })}>
            <Plus className="h-4 w-4" aria-hidden /> Add class code
          </button>
          {trinetRows.length > 0 && (
            <button type="button" className={secondaryButton} data-testid="wc-prefill"
              onClick={() => setWc({ rows: trinetRows.map((r) => newRow({ state: r.state, code: r.code, wages: r.wages, rate: r.currentRate })) })}>
              Fill from the Chevron proposal
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl bg-canvas p-4">
          <div>
            <p className={labelClass}>Current total premium</p>
            <CellMoney label="Current total premium" value={wc.totalPremium} onChange={(v) => setWc({ totalPremium: v })} />
            <p className="mt-1 text-xs text-tngray-dark">Leave blank to use the manual premium ({usd(cur.manual)}).</p>
          </div>
          <div>
            <p className={labelClass}>Discounted total premium</p>
            <CellMoney label="Discounted total premium" value={wc.discountedPremium} onChange={(v) => setWc({ discountedPremium: v })} />
            <p className="mt-1 text-xs text-tngray-dark">After experience mod, schedule credits and other discounts.</p>
          </div>
          <div>
            <p className={labelClass}>Increase / decrease</p>
            <p className="text-2xl font-bold text-navy" data-testid="wc-change-pct">{cur.total > 0 ? pct(cur.changePct) : "—"}</p>
            <p className="text-xs text-tngray-dark">Applied to every rate above to give the adjusted rates.</p>
          </div>
        </div>
      </Section>

      {!carved && trinetRows.length > 0 && (
        <Card>
          <CardContent className="p-5 sm:p-6 overflow-x-auto">
            <h3 className="text-lg font-bold text-navy">TriNet workers' compensation</h3>
            <p className="text-sm text-tngray-dark">From the Chevron proposal. Current rates are the adjusted rates above when a class code matches.</p>
            <table className="mt-3 w-full min-w-[760px] text-sm" data-testid="wc-table">
              <thead>
                <tr className="text-left text-tngray-dark border-b border-tngray-light">
                  <th className="py-2 pr-3 font-semibold">State</th>
                  <th className="py-2 pr-3 font-semibold">Class code</th>
                  <th className="py-2 pr-3 font-semibold text-right">Billable wages</th>
                  <th className="py-2 pr-3 font-semibold text-right">Current rate</th>
                  <th className="py-2 pr-3 font-semibold text-right">TriNet rate</th>
                  <th className="py-2 pr-3 font-semibold text-right">Rate difference</th>
                  <th className="py-2 font-semibold text-right">TriNet annual fee</th>
                </tr>
              </thead>
              <tbody>
                {trinetRows.map((r) => {
                  const mine = cur.rows.find((x) => x.code === r.code && (!x.state || x.state === r.state));
                  const current = mine ? mine.adjustedRate : r.currentRate;
                  return (
                    <tr key={`${r.state}-${r.code}`} className="border-b border-tngray-light last:border-0">
                      <td className="py-2 pr-3 font-semibold">{r.state}</td>
                      <td className="py-2 pr-3">{r.code}</td>
                      <td className="py-2 pr-3 text-right">{usd(r.wages, 0)}</td>
                      <td className="py-2 pr-3 text-right">{current ? current.toFixed(3) : "—"}</td>
                      <td className="py-2 pr-3 text-right">{r.trinetRate.toFixed(3)}</td>
                      <td className="py-2 pr-3 text-right">{current ? `${r.trinetRate - current >= 0 ? "+" : "−"}${Math.abs(r.trinetRate - current).toFixed(3)}` : "—"}</td>
                      <td className="py-2 text-right font-semibold">{usd(r.trinetFee)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-tngray-dark">
              Rates apply to every $100 of compensable wages (hourly in WA). Pay-as-you-go with no deductibles; rates are estimates and subject to change.
            </p>
          </CardContent>
        </Card>
      )}

      <CollateralCard collateral={EPLI_COLLATERAL} />
      <CollateralCard collateral={LEGAL_HOTLINE_COLLATERAL} />
      <DeckSlides slides={PAGE_SLIDES.workersComp} intro="Explain how TriNet's workers' comp and risk mitigation protect the business." />
    </div>
  );
}
