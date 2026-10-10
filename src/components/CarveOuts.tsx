import { Scissors } from "lucide-react";
import { useQuote } from "../state/QuoteContext";

const DESCRIPTIONS = {
  medical: "The company keeps its current medical plan. TriNet medical is left out of totals, comparisons, outputs and the deck; dental, vision and other benefits stay in.",
  workersComp: "The company keeps its current workers' comp policy. TriNet workers' comp is left out of the costs, outputs and deck.",
};

// Carve-outs: parts of the PEO offering the company keeps with its own carrier.
export default function CarveOuts({ only }: { only?: "medical" | "workersComp" }) {
  const { quote, update, updateBenefits } = useQuote();
  const items = [
    { key: "medical" as const, label: "Medical carved out", checked: quote.benefits.medicalCarvedOut, set: (v: boolean) => updateBenefits({ medicalCarvedOut: v }) },
    { key: "workersComp" as const, label: "Workers' comp carved out", checked: quote.workersCompCarvedOut, set: (v: boolean) => update({ workersCompCarvedOut: v }) },
  ].filter((i) => !only || i.key === only);
  return (
    <div className="space-y-2" data-testid="carve-outs">
      {!only && <p className="flex items-center gap-1.5 text-sm font-semibold text-navy"><Scissors className="h-4 w-4" aria-hidden /> Carve-outs</p>}
      {items.map((i) => (
        <label key={i.key} className="flex items-start gap-2 text-sm">
          <input id={`carve-${i.key}`} type="checkbox" className="mt-0.5" checked={i.checked} onChange={(e) => i.set(e.target.checked)} />
          <span><span className="font-semibold text-navy">{i.label}</span><span className="block text-tngray-dark">{DESCRIPTIONS[i.key]}</span></span>
        </label>
      ))}
    </div>
  );
}

// Banner for pages whose line is carved out.
export function CarvedOutBanner({ what }: { what: "medical" | "workersComp" }) {
  return (
    <div role="note" data-testid={`carved-out-${what}`} className="flex items-start gap-2 rounded-xl bg-orange/10 px-4 py-3 text-sm text-navy">
      <Scissors className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        <span className="font-semibold">{what === "medical" ? "Medical is carved out." : "Workers' comp is carved out."}</span>{" "}
        {what === "medical"
          ? "The company keeps its current medical plan, so TriNet medical below isn't in any totals or outputs."
          : "The company keeps its current workers' comp policy, so TriNet's rates aren't in any costs or outputs."}
      </span>
    </div>
  );
}
