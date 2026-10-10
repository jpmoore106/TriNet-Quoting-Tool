import { Plus, Trash2 } from "lucide-react";
import { Section, inputClass, labelClass, secondaryButton } from "../../components/form";
import { useQuote } from "../../state/QuoteContext";
import type { VoluntaryProduct } from "../../state/benefits";
import { usd } from "../../lib/pricing";
import { CellMoney, CellNumber, Totals } from "./fields";

const SUGGESTIONS = ["Accident", "Critical Illness", "Hospital Indemnity", "Voluntary Life", "Voluntary Disability", "Legal", "Pet Insurance", "Identity Protection"];

export default function Voluntary() {
  const { quote, updateBenefits } = useQuote();
  const products = quote.benefits.voluntary;
  const set = (id: string, changes: Partial<VoluntaryProduct>) =>
    updateBenefits({ voluntary: products.map((p) => (p.id === id ? { ...p, ...changes } : p)) });
  const premium = products.reduce((a, p) => a + (p.monthlyPremium || 0), 0);
  const employer = products.reduce((a, p) => a + (p.monthlyPremium || 0) * Math.min(100, p.employerPct || 0) / 100, 0);

  return (
    <div className="space-y-6">
      <Totals items={[
        { label: "Products", value: String(products.length) },
        { label: "Monthly premium", value: usd(premium), testId: "vol-premium" },
        { label: "Employer / month", value: usd(employer), testId: "vol-employer" },
        { label: "Employee / month", value: usd(premium - employer) },
      ]} />
      <Section title="Voluntary products" description="Usually employee-paid. Enter the estimated total monthly premium for each product.">
        {products.length > 0 && (
          <div className="space-y-3">
            <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-3 text-sm font-semibold text-navy">
              <span>Product</span><span>Carrier</span><span>Monthly premium</span><span>Employer pays</span><span className="w-9" />
            </div>
            {products.map((p, i) => (
              <div key={p.id} className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-3 items-center">
                <input aria-label={`Product ${i + 1} name`} list="voluntary-products" className={`${inputClass} py-1.5 text-sm`} value={p.name}
                  placeholder="e.g. Accident" onChange={(e) => set(p.id, { name: e.target.value })} />
                <input aria-label={`Product ${i + 1} carrier`} className={`${inputClass} py-1.5 text-sm`} value={p.carrier}
                  onChange={(e) => set(p.id, { carrier: e.target.value })} />
                <CellMoney label={`Product ${i + 1} monthly premium`} value={p.monthlyPremium} onChange={(v) => set(p.id, { monthlyPremium: v })} />
                <CellNumber label={`Product ${i + 1} employer %`} value={p.employerPct} suffix="%" onChange={(v) => set(p.id, { employerPct: Math.min(100, v) })} />
                <button type="button" aria-label={`Remove product ${i + 1}`} onClick={() => updateBenefits({ voluntary: products.filter((x) => x.id !== p.id) })}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-tngray-dark hover:bg-alert/5 hover:text-alert">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <datalist id="voluntary-products">{SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
        <button type="button" className={secondaryButton}
          onClick={() => updateBenefits({ voluntary: [...products, { id: crypto.randomUUID(), name: "", carrier: "", monthlyPremium: 0, employerPct: 0 }] })}>
          <Plus className="h-4 w-4" /> Add voluntary product
        </button>
        {products.length === 0 && <p className={`${labelClass} font-normal text-tngray-dark`}>No voluntary products yet.</p>}
      </Section>
    </div>
  );
}
