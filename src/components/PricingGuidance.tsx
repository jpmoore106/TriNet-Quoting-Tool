import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, XCircle } from "lucide-react";
import { Section, labelClass, inputClass } from "./form";
import { useQuote, type PricingGuide } from "../state/QuoteContext";
import { PROMOTIONS, SERVICE_LEVELS, type Promotion, type RateCard, type RiskRating, type ServiceLevel } from "../data/rateCard";
import { monthList, positionLabel, pricingGuidance, type Check } from "../lib/pricingGuidance";
import { loadRateCard } from "../lib/cloud/pricingConfig";
import { usd } from "../lib/pricing";

const ICONS = {
  ok: <CheckCircle2 className="h-4 w-4 shrink-0 text-green-700" aria-hidden />,
  warn: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />,
  stop: <XCircle className="h-4 w-4 shrink-0 text-red-700" aria-hidden />,
};

function CheckLine({ check }: { check: Check }) {
  return <li className="flex items-start gap-2" data-level={check.level}><span className="mt-0.5">{ICONS[check.level]}</span>{check.text}</li>;
}

// Rate card and promotions guidance for the rep. CONFIDENTIAL – INTERNAL USE ONLY: Setup only, never client-facing.
export default function PricingGuidance() {
  const [card, setCard] = useState<RateCard | null | undefined>(undefined);
  const [error, setError] = useState("");
  useEffect(() => {
    loadRateCard().then(setCard).catch((e) => { setError(e.message ?? String(e)); setCard(null); });
  }, []);

  return (
    <Section title="Pricing guidance" description="Rate card and promotions. Confidential, internal use only: never shown on client outputs." className="lg:col-span-2">
      {card === undefined && <p className="text-sm text-tngray-dark">Loading the rate card…</p>}
      {card === null && (
        <p className="text-sm text-tngray-dark" data-testid="rate-card-missing">
          {error ? `Couldn't load the rate card: ${error}` : "The rate card hasn't been loaded yet. Ask an admin to load it in Supabase."}
        </p>
      )}
      {card && <Guidance card={card} />}
    </Section>
  );
}

function Guidance({ card }: { card: RateCard }) {
  const { quote, update } = useQuote();
  const g = quote.pricingGuide;
  const set = (changes: Partial<PricingGuide>) => update({ pricingGuide: { ...g, ...changes } });
  const r = pricingGuidance(card, quote);
  const level = g.serviceLevel;
  const c = card.creditMaxMonths;
  const promo = card.pepmPromo.map((t, i) => {
    const prev = card.pepmPromo[i - 1]?.headcountBelow;
    return `${prev ? `${prev}–${t.headcountBelow - 1}` : `under ${t.headcountBelow}`} employees $${t.price} ($${t.direct} direct)`;
  }).join("; ");

  return (
      <div data-testid="pricing-guidance" className="space-y-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-700"><Lock className="h-3.5 w-3.5" aria-hidden /> Confidential – internal use only</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="service-level" className={labelClass}>Service level</label>
            <select id="service-level" className={inputClass} value={level} onChange={(e) => set({ serviceLevel: e.target.value as ServiceLevel })}>
              {Object.entries(SERVICE_LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <p className="mt-1 text-xs text-tngray-dark">{card.verticals[level]}</p>
          </div>
          <div>
            <label htmlFor="risk-rating" className={labelClass}>Risk rating</label>
            <select id="risk-rating" className={inputClass} value={g.risk} onChange={(e) => set({ risk: e.target.value as RiskRating })}>
              <option value="">Not set</option>
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
              <option value="red">Red</option>
            </select>
          </div>
          <div>
            <label htmlFor="promotion" className={labelClass}>Promotion</label>
            <select id="promotion" className={inputClass} value={g.promotion} onChange={(e) => set({ promotion: e.target.value as Promotion })}>
              {Object.entries(PROMOTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <label className="flex items-center gap-1.5"><input id="promo-direct" type="checkbox" checked={g.direct} onChange={(e) => set({ direct: e.target.checked })} /> Direct deal</label>
              <label className="flex items-center gap-1.5"><input id="promo-tnxi" type="checkbox" checked={g.tnxi} onChange={(e) => set({ tnxi: e.target.checked })} /> TNXI</label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl bg-canvas p-4 text-sm space-y-2">
            <p className="font-semibold text-navy">
              {r.totalWse} WSE · {r.band.label} band · {SERVICE_LEVELS[level]}
            </p>
            {quote.ftPepm > 0 ? (
              <ul className="space-y-1" data-testid="pepm-position">
                <CheckLine check={{ ...r.approval, text: `Full-time PEPM ${usd(quote.ftPepm, 0)}: ${positionLabel(r.position)}. ${r.approval.text}.` }} />
                {r.breaks.map((b) => (
                  <CheckLine key={b.id} check={{ ...b.approval, text: `Price break ${usd(b.pepm, 0)} at ${b.headcount}+ (${b.band.label} band): ${positionLabel(b.position)}. ${b.approval.text}.` }} />
                ))}
              </ul>
            ) : (
              <p className="text-tngray-dark">Enter the full-time PEPM to see where it lands.</p>
            )}
            {r.checks.length > 0 && (
              <ul className="space-y-1 border-t border-tngray-light pt-2" data-testid="promo-checks">
                {r.checks.map((c) => <CheckLine key={c.text} check={c} />)}
              </ul>
            )}
          </div>

          <div>
            <table className="w-full text-sm" data-testid="rate-card">
              <thead>
                <tr className="text-left text-tngray-dark">
                  <th className="py-1 font-semibold">Employees</th>
                  <th className="py-1 font-semibold text-right">Start</th>
                  <th className="py-1 font-semibold text-right">Target</th>
                  <th className="py-1 font-semibold text-right">Floor</th>
                  <th className="py-1 font-semibold text-right">DOR Floor</th>
                </tr>
              </thead>
              <tbody>
                {card.bands[level].map((b) => (
                  <tr key={b.label} className={`border-t border-tngray-light ${b === r.band ? "bg-orange/10 font-semibold text-navy" : ""}`}>
                    <td className="py-1">{b.label}</td>
                    <td className="py-1 text-right">${b.start}</td>
                    <td className="py-1 text-right">${b.target}</td>
                    <td className="py-1 text-right">${b.floor}</td>
                    <td className="py-1 text-right">${b.dor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-xs text-tngray-dark">PEPM rates, effective {card.effective}. Start, Target and Floor need no approval; the DOR Floor needs DOR approval.</p>
          </div>
        </div>

        <details className="text-sm text-tngray-dark">
          <summary className="cursor-pointer font-semibold text-navy">Promotion rules</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><b>PEPM promo:</b> {promo}. Green or Yellow risk; Red only without an insurance investment. Not for OMS or TNXI. Perpetual pricing, 12-month minimum waived.</li>
            <li><b>Promo credit (GNP):</b> months free up to {c.start} at Start, {c.target} at Target, {c.floor} at Floor, {c.dor} at DOR Floor. 1–{card.creditTwoYearFrom - 1} months needs a 1-year commitment; {card.creditTwoYearFrom} or more, a 2-year commitment.</li>
            <li><b>Investment credit:</b> up to {card.investmentMaxMonths} months of admin fees, no more than {card.investmentMaxRevenuePct}% of total revenue. First check date in {monthList(card.investmentFirstCheckMonths)}. Green or Yellow risk only; not for Red, OMS or TNXI.</li>
          </ul>
        </details>
      </div>
  );
}
