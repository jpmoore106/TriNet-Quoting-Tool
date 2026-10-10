import { inputClass } from "../../components/form";
import type { PlanDesign } from "../../state/benefits";

// Editable plan design: one labeled field per attribute.
export function DesignFields({ design, onChange, idPrefix, title = "Plan design (in-network)" }: {
  design: PlanDesign; onChange: (d: PlanDesign) => void; idPrefix: string; title?: string;
}) {
  return (
    <div data-testid={`${idPrefix}-design`}>
      <p className="text-sm font-semibold text-navy">{title}</p>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {design.map((d, i) => (
          <div key={d.label}>
            <label htmlFor={`${idPrefix}-design-${i}`} className="block text-xs font-semibold text-tngray-dark mb-1">{d.label}</label>
            <input id={`${idPrefix}-design-${i}`} className={`${inputClass} py-1.5 text-sm`} value={d.value}
              onChange={(e) => onChange(design.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Read-only design details, e.g. for the appendix table and summaries.
export function DesignList({ design }: { design?: PlanDesign }) {
  if (!design?.length) return <span className="text-tngray-dark">—</span>;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
      {design.filter((d) => d.value).map((d) => (
        <div key={d.label} className="contents">
          <dt className="text-tngray-dark">{d.label}</dt>
          <dd className="font-medium text-navy">{d.value}</dd>
        </div>
      ))}
    </dl>
  );
}
