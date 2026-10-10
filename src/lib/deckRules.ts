import type { QuoteInputs } from "../state/QuoteContext";
import { MASTER_SLIDES } from "../data/masterDeck";
import { TOPIC_SLIDES } from "./callInsights";

// Slides every proposal gets: opening, value and partnership, core PEO services, services model, pricing and timeline.
const CORE = [9, 12, 13, 14, 15, 16, 18, 20, 21, 25, 26, 27, 28, 29, 31, 48, 49, 50, 52, 67, 68, 69, 70, 71];
export const FIRST_MEETING = [1, 2, 3, 4, 5, 6, 7, 71];

// Recommended master-deck slides for this deal, with the reason each one is in.
export function recommendedSlides(q: QuoteInputs): Map<number, string> {
  const b = q.benefits;
  const model = q.deck.benefitsModel;
  const totalWse = (q.ftWse || 0) + (q.ptWse || 0);
  const hasMedical = b.medical.plans.length > 0;
  const picks = new Map<number, string>();

  // Carve-outs: no workers' comp slide, and no TriNet-medical slides (comparison, decision support, health advocate).
  const skip = new Set<number>([
    ...(q.workersCompCarvedOut ? [28] : []),
    ...(b.medicalCarvedOut ? [53, 54, 55, 57, 58, 60] : []),
  ]);
  const add = (slides: number[], reason: string) => slides.forEach((n) => skip.has(n) || picks.has(n) || picks.set(n, reason));
  add(CORE, "Core proposal slide");
  if (model === "trinet") {
    add([22, 56, 57, 58, 59, 60], "TriNet-sponsored benefits");
    if (hasMedical && !b.current.noCurrentMedical) add([53, 54, 55], "Medical quoted, with current plans to compare");
  }
  if (model === "oms") add([22, 59, 61, 62, 63, 64, 65], "Open Market Solutions deal");
  if (model === "trinet" && b.voluntary.length > 0) add([65], "Voluntary benefits quoted");
  if (q.incumbentPayroll.trim()) add([32], `Moving from ${q.incumbentPayroll.trim()}: integrations`);
  if (totalWse >= 50) add([34, 51], "50 or more WSEs");
  const ins = q.callInsights;
  if (ins) {
    add([10, 11], "From the call transcript");
    const topics = ins.topics.filter((t) => model !== "oms" || t !== "benefits");
    for (const t of topics) add(TOPIC_SLIDES[t] ?? [], `Discussed on the call: ${t.replace(/_/g, " ")}`);
  }
  return new Map([...picks].sort((a, c) => a[0] - c[0]));
}

// The slides to build: the rep's picks when they've made any, otherwise the recommendations.
export function selectedSlides(q: QuoteInputs): number[] {
  const valid = new Set(MASTER_SLIDES.map((s) => s.n));
  const picks = q.deck.selected ?? [...recommendedSlides(q).keys()];
  return [...new Set(picks)].filter((n) => valid.has(n)).sort((a, c) => a - c);
}

// Add or remove one slide, starting from the current selection.
export function withSlide(q: QuoteInputs, n: number, on: boolean): number[] {
  const current = selectedSlides(q).filter((s) => s !== n);
  return on ? [...current, n].sort((a, c) => a - c) : current;
}
