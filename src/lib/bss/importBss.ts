// Reads a BSS PDF in the browser (nothing is uploaded) and turns it into benefits inputs.
import type { BenefitsInputs, HealthLine } from "../../state/benefits";
import { extractPdfLines } from "./extractLines";
import { parseBss, type BssLine, type BssResult } from "./parseBss";

export async function readBssFile(file: File): Promise<BssResult> {
  const [pdfjs, worker] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pages = await extractPdfLines(pdfjs, new Uint8Array(await file.arrayBuffer()));
  return parseBss(pages);
}

// Replace medical, dental, vision, disability/life and current costs with the imported quote.
// Voluntary products and 401(k) aren't in a BSS, so they're kept.
export function applyBss(b: BenefitsInputs, r: BssResult, fileName: string): BenefitsInputs {
  const line = (key: BssLine): HealthLine => {
    const parsed = r.lines[key];
    const plans = parsed.plans;
    let funding = b[key].funding;
    if (parsed.funding) {
      const { limitPlanName, ...f } = parsed.funding;
      const limit = limitPlanName ? plans.find((p) => p.name.toLowerCase().startsWith(limitPlanName.toLowerCase())) : undefined;
      funding = { ...f, limitPlanId: limit?.id ?? "" };
    }
    return { ...b[key], plans, funding, currentPlans: parsed.currentPlans };
  };
  return {
    ...b,
    effectiveDate: r.effectiveDate || b.effectiveDate,
    medical: line("medical"),
    dental: line("dental"),
    vision: line("vision"),
    risk: r.risk,
    census: r.census,
    current: { ...r.current, anticipatedRenewalPct: b.current.anticipatedRenewalPct, noCurrentMedical: r.lines.medical.currentPlans.length === 0 && r.current.medical.employer + r.current.medical.employee === 0 },
    source: {
      fileName,
      importedAt: new Date().toISOString(),
      proposalNumber: r.proposalNumber,
      strategy: r.strategy,
      primaryCarrier: r.primaryCarrier,
      states: r.states,
      disabilityPackage: r.disabilityPackage,
    },
  };
}
