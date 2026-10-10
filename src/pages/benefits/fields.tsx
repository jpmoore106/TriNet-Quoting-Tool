import { inputClass } from "../../components/form";

const num = (v: string) => Math.max(0, parseFloat(v) || 0);

// Compact inputs for rate and enrollment tables.
export function CellMoney({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-tngray-dark">$</span>
      <input aria-label={label} type="number" min={0} step="0.01" inputMode="decimal" placeholder="0.00"
        className={`${inputClass} py-1.5 pl-5 pr-2 text-sm`} value={value || ""} onChange={(e) => onChange(num(e.target.value))} />
    </div>
  );
}

export function CellNumber({ label, value, onChange, suffix, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string; step?: number;
}) {
  return (
    <div className="relative">
      <input aria-label={label} type="number" min={0} step={step} placeholder="0"
        className={`${inputClass} py-1.5 px-2 text-sm ${suffix ? "pr-6" : ""}`} value={value || ""}
        onChange={(e) => onChange(step === 1 ? Math.round(num(e.target.value)) : num(e.target.value))} />
      {suffix && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-tngray-dark">{suffix}</span>}
    </div>
  );
}

export function Totals({ items }: { items: { label: string; value: string; testId?: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl bg-canvas px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-tngray-dark">{i.label}</p>
          <p data-testid={i.testId} className="mt-0.5 text-xl font-bold text-navy">{i.value}</p>
        </div>
      ))}
    </div>
  );
}
