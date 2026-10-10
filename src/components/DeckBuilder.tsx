import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Download, Eye, Sparkles } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { SlideViewer } from "./DeckSlides";
import { inputClass, labelClass, primaryButton, secondaryButton } from "./form";
import { MASTER_DECK_URL, MASTER_SLIDES, slideThumb, type DeckSection } from "../data/masterDeck";
import { useQuote, type BenefitsModel } from "../state/QuoteContext";
import { FIRST_MEETING, recommendedSlides, selectedSlides } from "../lib/deckRules";
import type { BuiltDeck } from "../lib/deckBuilder";

const MODELS: { value: BenefitsModel; label: string }[] = [
  { value: "trinet", label: "TriNet-sponsored benefits" },
  { value: "oms", label: "Open Market Solutions (OMS)" },
  { value: "none", label: "No benefits" },
];

const SECTIONS = [...new Set(MASTER_SLIDES.map((s) => s.section))] as DeckSection[];

// Builds the client's proposal deck by trimming the master deck to the slides that fit this deal.
export default function DeckBuilder() {
  const { quote, update } = useQuote();
  const deck = quote.deck;
  const recommended = useMemo(() => recommendedSlides(quote), [quote]);
  const selected = new Set(selectedSlides(quote));
  const [state, setState] = useState<{ status: "idle" | "working" | "done" | "error"; step?: string; result?: BuiltDeck }>({ status: "idle" });
  const [viewing, setViewing] = useState<number | null>(null);
  const previewOrder = MASTER_SLIDES.map((s) => s.n);

  const setDeck = (changes: Partial<typeof deck>) => update({ deck: { ...deck, ...changes } });
  const setSelected = (next: Set<number>) => setDeck({ selected: [...next].sort((a, b) => a - b) });
  const toggle = (n: number) => {
    const next = new Set(selected);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    setSelected(next);
  };

  async function download() {
    setState({ status: "working", step: "Starting…" });
    try {
      const { buildMasterDeck, masterDeckFileName } = await import("../lib/deckBuilder");
      const result = await buildMasterDeck(quote, [...selected], (step) => setState({ status: "working", step }));
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = masterDeckFileName(quote);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setState({ status: "done", result });
    } catch (e) {
      console.error(e);
      setState({ status: "error" });
    }
  }

  const following = deck.selected === null;
  return (
    <Card data-testid="deck-builder">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-orange-dark">Master proposal deck</p>
            <h3 className="text-xl font-bold text-navy">Build the proposal deck</h3>
            <p className="mt-1 text-sm text-tngray-dark">
              Slides are picked from the master proposal deck to fit this deal. Add or remove any slide, then download a
              trimmed PowerPoint with the company name, pricing and onboarding dates filled in.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button type="button" onClick={download} disabled={state.status === "working" || selected.size === 0} className={primaryButton}
              data-testid="deck-download">
              <Download className="h-4 w-4" aria-hidden />
              {state.status === "working" ? state.step : `Download ${selected.size}-slide deck`}
            </button>
            <a href={MASTER_DECK_URL} download className="text-xs underline text-orange-dark">Download the full master deck</a>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 rounded-xl bg-canvas p-4">
          <fieldset>
            <legend className={labelClass}>Benefits offering</legend>
            <div className="flex flex-wrap gap-2">
              {MODELS.map((m) => (
                <label key={m.value}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold ${
                    deck.benefitsModel === m.value ? "border-navy bg-navy text-white" : "border-tngray-medium bg-white text-navy"}`}>
                  <input type="radio" name="benefits-model" value={m.value} className="sr-only"
                    checked={deck.benefitsModel === m.value} onChange={() => setDeck({ benefitsModel: m.value })} />
                  {m.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="paperwork-deadline" className={labelClass}>Paperwork deadline</label>
            <input id="paperwork-deadline" type="date" className={inputClass} value={deck.paperworkDeadline}
              onChange={(e) => setDeck({ paperworkDeadline: e.target.value })} />
            <Link to="/paperwork-deadlines" className="text-xs underline text-orange-dark">Look it up in the paperwork deadlines calendar</Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className={secondaryButton} onClick={() => setDeck({ selected: null })} data-testid="deck-recommended">
            <Sparkles className="h-4 w-4" aria-hidden /> Use recommendations
          </button>
          <button type="button" className={secondaryButton} onClick={() => setSelected(new Set(FIRST_MEETING))}>First meeting deck</button>
          <button type="button" className={secondaryButton} onClick={() => setSelected(new Set())}>Clear all</button>
          <p className="text-sm text-tngray-dark" data-testid="deck-status">
            {selected.size} of {MASTER_SLIDES.length} slides selected · {following ? "following the recommendations for this deal" : "customized"}
          </p>
        </div>

        {state.status === "error" && (
          <p role="alert" className="mt-3 text-sm font-semibold text-alert">Couldn't build the deck. Please try again.</p>
        )}
        {state.status === "done" && state.result && (
          <div role="status" className="mt-4 rounded-xl border border-tngray-light p-4" data-testid="deck-result">
            <p className="text-sm font-semibold text-navy">
              Downloaded a {state.result.slideCount}-slide deck ({(state.result.blob.size / 1024 / 1024).toFixed(1)} MB).
            </p>
            {state.result.warnings.length > 0 && (
              <>
                <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-navy">
                  <AlertTriangle className="h-4 w-4 text-orange" aria-hidden /> Review before presenting
                </p>
                <ul className="mt-1 list-disc pl-5 text-sm text-tngray-dark" data-testid="deck-warnings">
                  {state.result.warnings.map((w, i) => <li key={i}>Slide {w.slide}: {w.text}</li>)}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="mt-6 space-y-8">
          {SECTIONS.map((section) => {
            const slides = MASTER_SLIDES.filter((s) => s.section === section);
            const count = slides.filter((s) => selected.has(s.n)).length;
            return (
              <section key={section} aria-label={section}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-tngray-light pb-2">
                  <h4 className="text-base font-bold text-navy">
                    {section} <span className="ml-1 text-sm font-medium text-tngray-dark">{count} of {slides.length}</span>
                  </h4>
                  <div className="flex gap-3 text-xs font-semibold">
                    <button type="button" className="underline text-navy"
                      onClick={() => setSelected(new Set([...selected, ...slides.filter((s) => !s.internal).map((s) => s.n)]))}>
                      Select all
                    </button>
                    <button type="button" className="underline text-navy"
                      onClick={() => setSelected(new Set([...selected].filter((n) => !slides.some((s) => s.n === n))))}>
                      Select none
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {slides.map((s) => {
                    const on = selected.has(s.n);
                    const reason = recommended.get(s.n);
                    return (
                      <div key={s.n} data-testid={`deck-slide-${s.n}`} data-selected={on}
                        className={`relative flex flex-col rounded-xl border-2 p-2 transition-colors ${on ? "border-orange bg-orange/5" : "border-tngray-light bg-white"}`}>
                        <label className="flex cursor-pointer flex-col">
                          <span className="relative block">
                            <img src={slideThumb(s.n)} alt="" loading="lazy" className={`aspect-video w-full rounded object-cover ${on ? "" : "opacity-60"}`} />
                            <input type="checkbox" checked={on} onChange={() => toggle(s.n)}
                              aria-label={`Slide ${s.n}: ${s.title}`}
                              className="absolute left-1.5 top-1.5 h-5 w-5 accent-orange" />
                          </span>
                          <span className="mt-1.5 text-xs font-semibold text-tngray-dark">Slide {s.n}</span>
                          <span className="text-sm font-semibold leading-snug text-navy">{s.title}</span>
                        </label>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {reason && <Badge tone="orange" title={reason}>Recommended</Badge>}
                          {s.fills && <Badge tone="navy" title={`Filled from the quote: ${s.fills}`}>Auto-filled</Badge>}
                          {s.internal && <Badge tone="alert" title="TriNet-internal; not for clients">Internal</Badge>}
                          {s.hidden && <Badge tone="gray" title="Hidden in the master deck; shown when picked">Hidden in master</Badge>}
                        </div>
                        {reason && <p className="mt-1 text-xs text-tngray-dark">{reason}</p>}
                        {s.note && <p className="mt-1 text-xs text-orange-dark">{s.note}</p>}
                        <button type="button" onClick={() => setViewing(previewOrder.indexOf(s.n))}
                          className="mt-auto pt-2 inline-flex items-center gap-1 self-start text-xs font-semibold text-navy underline">
                          <Eye className="h-3.5 w-3.5" aria-hidden /> Preview
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </CardContent>
      {viewing !== null && <SlideViewer slides={previewOrder} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} />}
    </Card>
  );
}

function Badge({ tone, title, children }: { tone: "orange" | "navy" | "alert" | "gray"; title: string; children: string }) {
  const tones = {
    orange: "bg-orange text-navy",
    navy: "bg-navy text-white",
    alert: "bg-alert text-white",
    gray: "bg-tngray-light text-navy",
  };
  return <span title={title} className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}
