import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { slideByNumber, slideImage, slideThumb } from "../data/masterDeck";
import { useQuote } from "../state/QuoteContext";
import { selectedSlides, withSlide } from "../lib/deckRules";

// Full-size slide preview with previous/next, closed with Escape or the close button.
export function SlideViewer({ slides, index, onClose, onIndex }: {
  slides: number[]; index: number; onClose: () => void; onIndex: (i: number) => void;
}) {
  const n = slides[index];
  const s = slideByNumber(n);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < slides.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, slides.length, onClose, onIndex]);

  const nav = "rounded-full bg-white/90 p-2 text-navy hover:bg-white disabled:opacity-30";
  return (
    <div role="dialog" aria-modal="true" aria-label={`Slide ${n}: ${s.title}`} data-testid="slide-viewer"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-navy/90 p-4" onClick={onClose}>
      <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between gap-3 text-white">
          <p className="text-sm font-semibold">Slide {n} · {s.title}</p>
          <button type="button" onClick={onClose} aria-label="Close preview" className="rounded-full p-1.5 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <img src={slideImage(n)} alt={`Slide ${n}: ${s.title}`} className="w-full rounded-lg bg-white shadow-2xl" />
        <div className="mt-3 flex items-center justify-center gap-4">
          <button type="button" className={nav} disabled={index === 0} onClick={() => onIndex(index - 1)} aria-label="Previous slide">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm text-white">{index + 1} of {slides.length}</span>
          <button type="button" className={nav} disabled={index === slides.length - 1} onClick={() => onIndex(index + 1)} aria-label="Next slide">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Master proposal deck slides that support this page, with a toggle to include each in the proposal deck.
export default function DeckSlides({ slides, title = "From the master proposal deck", intro }: {
  slides: number[]; title?: string; intro?: string;
}) {
  const { quote, update } = useQuote();
  const [viewing, setViewing] = useState<number | null>(null);
  const inDeck = new Set(selectedSlides(quote));

  return (
    <Card data-testid="deck-slides">
      <CardContent className="p-5 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-wider text-orange-dark">TriNet collateral</p>
        <h3 className="text-xl font-bold text-navy">{title}</h3>
        <p className="mt-1 text-sm text-tngray-dark">
          {intro ?? "Slides to walk through with the client."} Add or remove them from the proposal deck here, or build the
          whole deck on the <Link to="/outputs" className="underline text-orange-dark">Outputs page</Link>.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {slides.map((n, i) => {
            const s = slideByNumber(n);
            const on = inDeck.has(n);
            return (
              <figure key={n} className="flex flex-col">
                <button type="button" onClick={() => setViewing(i)} className="group block overflow-hidden rounded-lg border border-tngray-light"
                  aria-label={`Preview slide ${n}: ${s.title}`}>
                  <img src={slideThumb(n)} alt="" loading="lazy" className="aspect-video w-full object-cover transition-transform group-hover:scale-[1.02]" />
                </button>
                <figcaption className="mt-2 flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-navy">{s.title}</span>
                  <button type="button" onClick={() => update({ deck: { ...quote.deck, selected: withSlide(quote, n, !on) } })}
                    aria-pressed={on} data-testid={`deck-toggle-${n}`}
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      on ? "border-navy bg-navy text-white" : "border-tngray-medium text-navy hover:border-navy"}`}>
                    {on ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
                    {on ? "In deck" : "Add to deck"}
                  </button>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </CardContent>
      {viewing !== null && <SlideViewer slides={slides} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} />}
    </Card>
  );
}
