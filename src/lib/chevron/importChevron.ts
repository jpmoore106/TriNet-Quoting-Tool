// Reads a Chevron proposal PDF in the browser (nothing is uploaded) and maps it onto the quote.
import type { QuoteInputs } from "../../state/QuoteContext";
import { extractPdfLines } from "../bss/extractLines";
import { parseChevron, type ChevronData } from "./parseChevron";

export async function readChevronFile(file: File): Promise<ChevronData> {
  const [pdfjs, worker] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pages = await extractPdfLines(pdfjs, new Uint8Array(await file.arrayBuffer()));
  return parseChevron(pages, file.name);
}

// The proposal is the source of truth for pricing: it overwrites the fields it contains.
export function chevronChanges(q: QuoteInputs, c: ChevronData): Partial<QuoteInputs> {
  const ft = c.serviceFees.find((f) => f.kind === "ft");
  const pt = c.serviceFees.find((f) => f.kind === "pt");
  const changes: Partial<QuoteInputs> = { chevron: c };
  if (c.companyName) changes.companyName = c.companyName;
  if (c.repName) changes.repName = c.repName;
  if (ft) { changes.ftPepm = ft.price; changes.ftWse = Math.round(ft.quantity); }
  if (pt) { changes.ptPepm = pt.price; changes.ptWse = Math.round(pt.quantity); }
  if (c.monthlyMinimum) changes.serviceFeeMinimum = c.monthlyMinimum;
  if (c.implementation) {
    changes.setupFee = { ...q.setupFee, amount: c.implementation.listPrice, discount: Math.round((c.implementation.listPrice - c.implementation.price) * 100) / 100 };
  }
  return changes;
}
