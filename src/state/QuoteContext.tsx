import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { EMPTY_BENEFITS, normalizeBenefits, type BenefitsInputs } from "./benefits";
import type { ChevronData } from "../lib/chevron/parseChevron";
import type { CallInsights } from "../lib/callInsights";
import type { Promotion, RiskRating, ServiceLevel } from "../data/rateCard";

export type PriceBreak = { id: string; headcount: number; pepm: number };

// Not-to-exceed cap on the PEPM increase at the year 2 renewal (not an automatic increase).
export type RateCap = {
  enabled: boolean;
  percent: number;
};

export type SetupFee = {
  amount: number; // standard setup fee
  discount: number; // amount waived
  installments: number; // 1 = paid up front
  firstInvoiceDate: string; // yyyy-MM-dd, optional
  notes: string;
};

export type BenefitsModel = "trinet" | "oms" | "none";

// Proposal deck built from the master deck.
export type DeckOptions = {
  benefitsModel: BenefitsModel; // TriNet-sponsored benefits, Open Market Solutions or no benefits
  selected: number[] | null; // master-deck slide numbers; null = follow the recommendations
  paperworkDeadline: string; // yyyy-MM-dd, shown on the onboarding timeline slide
};

// The prospect's current workers' comp: class codes with billable wages and manual rates (per $100 of wages),
// plus the total premium before and after the carrier's discounts.
export type CurrentWcRow = { id: string; state: string; code: string; description: string; wages: number; rate: number };
export type CurrentWc = { rows: CurrentWcRow[]; totalPremium: number; discountedPremium: number };

// Internal pricing guidance inputs (rate card and promotions). Never shown to clients.
export type PricingGuide = {
  serviceLevel: ServiceLevel;
  risk: RiskRating;
  promotion: Promotion;
  direct: boolean; // direct deal: lower PEPM promo price
  tnxi: boolean; // TNXI deal: no promotions
};

export type QuoteInputs = {
  companyName: string;
  repName: string;
  ftWse: number;
  ptWse: number;
  companyLogo: string | null; // data URL
  incumbentPayroll: string;
  incumbentMedicalCarrier: string;
  medicalRenewalDate: string; // yyyy-MM-dd
  ftPepm: number; // Professional Service Fee per FT employee per month
  ptPepm: number; // Professional Service Fee per PT employee per month
  serviceFeeMinimum: number; // monthly minimum Professional Service Fee (0 = none)
  priceBreaks: PriceBreak[]; // growth pricing: PEPM at a future headcount
  rateCap: RateCap;
  setupFee: SetupFee;
  benefits: BenefitsInputs;
  chevron: ChevronData | null; // imported Chevron proposal
  deck: DeckOptions;
  currentWc: CurrentWc;
  freeMonths: number; // months of Professional Service Fee credited in year one
  callInsights: CallInsights | null; // AI analysis of a sales call transcript (Gong), edited by the rep
  workersCompCarvedOut: boolean; // the client keeps its own workers' comp policy
  pricingGuide: PricingGuide;
};

export const EMPTY_QUOTE: QuoteInputs = {
  companyName: "",
  repName: "",
  ftWse: 0,
  ptWse: 0,
  companyLogo: null,
  incumbentPayroll: "",
  incumbentMedicalCarrier: "",
  medicalRenewalDate: "",
  ftPepm: 0,
  ptPepm: 0,
  serviceFeeMinimum: 0,
  priceBreaks: [],
  rateCap: { enabled: false, percent: 0 },
  setupFee: { amount: 0, discount: 0, installments: 1, firstInvoiceDate: "", notes: "" },
  benefits: EMPTY_BENEFITS,
  chevron: null,
  deck: { benefitsModel: "trinet", selected: null, paperworkDeadline: "" },
  currentWc: { rows: [], totalPremium: 0, discountedPremium: 0 },
  freeMonths: 0,
  callInsights: null,
  workersCompCarvedOut: false,
  pricingGuide: { serviceLevel: "assigned", risk: "", promotion: "none", direct: false, tnxi: false },
};

// Fill in fields added since a quote was saved.
export function normalizeQuote(saved: unknown): QuoteInputs {
  const s = (saved && typeof saved === "object" ? saved : {}) as Partial<QuoteInputs>;
  return {
    ...EMPTY_QUOTE, ...s,
    benefits: normalizeBenefits(s.benefits),
    deck: { ...EMPTY_QUOTE.deck, ...s.deck },
    currentWc: { ...EMPTY_QUOTE.currentWc, ...s.currentWc },
    pricingGuide: { ...EMPTY_QUOTE.pricingGuide, ...s.pricingGuide },
  };
}

export type SaveState = "saved" | "saving" | "error" | "conflict" | "readonly";

type QuoteContextValue = {
  quote: QuoteInputs;
  update: (changes: Partial<QuoteInputs>) => void;
  updateBenefits: (changes: Partial<BenefitsInputs>) => void;
  reset: () => void;
  totalWse: number;
  readOnly: boolean;
  saveState: SaveState;
  companyId: string | null; // the open company (null outside accounts, e.g. a prospect's view)
  ownerId: string | null;
  ownerName: string; // set when the open company belongs to someone else (a manager or admin working on it)
};

const QuoteContext = createContext<QuoteContextValue | null>(null);

const SAVE_DELAY_MS = 800;

// The open company's quote, shared by every page. Edits autosave to the company; read-only views never save.
export function QuoteProvider({ children, initial, save, readOnly = false, companyId = null, ownerId = null, ownerName = "" }: {
  children: React.ReactNode;
  initial: QuoteInputs;
  companyId?: string | null;
  ownerId?: string | null;
  ownerName?: string;
  save?: (q: QuoteInputs) => Promise<void>;
  readOnly?: boolean;
}) {
  const [quote, setQuote] = useState<QuoteInputs>(initial);
  const [saveState, setSaveState] = useState<SaveState>(readOnly || !save ? "readonly" : "saved");
  const lastSaved = useRef(initial);
  const pending = useRef<QuoteInputs | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const saveRef = useRef(save);
  saveRef.current = save;

  // Saves run one at a time, each sending the latest edits, so an older save can never land after a newer one.
  const inFlight = useRef<Promise<void> | null>(null);
  const conflicted = useRef(false);
  const flush = useCallback(async (): Promise<void> => {
    if (inFlight.current) {
      await inFlight.current;
      return flush();
    }
    const q = pending.current;
    if (!q || !saveRef.current || conflicted.current) return;
    pending.current = null;
    setSaveState("saving");
    const run = (async () => {
      try {
        await saveRef.current!(q);
        lastSaved.current = q;
        if (!pending.current) setSaveState("saved");
      } catch (e) {
        if (e instanceof Error && e.name === "ConflictError") {
          // Someone else saved this company; stop saving so their changes aren't overwritten.
          conflicted.current = true;
          pending.current = null;
          setSaveState("conflict");
          return;
        }
        console.error(e);
        pending.current = pending.current ?? q; // retry with the next edit
        setSaveState("error");
      }
    })();
    inFlight.current = run;
    await run;
    inFlight.current = null;
  }, []);

  useEffect(() => {
    if (readOnly || !save || quote === lastSaved.current || conflicted.current) return;
    pending.current = quote;
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  }, [quote, readOnly, save, flush]);

  // Save any pending edit when leaving the company; warn before closing the tab with an edit still unsaved.
  useEffect(() => {
    const onHide = () => { if (pending.current) { clearTimeout(timer.current); void flush(); } };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!pending.current && !inFlight.current) return;
      onHide();
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => { window.removeEventListener("beforeunload", onBeforeUnload); onHide(); };
  }, [flush]);

  const value: QuoteContextValue = {
    quote,
    update: (changes) => setQuote((q) => ({ ...q, ...changes })),
    updateBenefits: (changes) => setQuote((q) => ({ ...q, benefits: { ...q.benefits, ...changes } })),
    reset: () => setQuote({ ...EMPTY_QUOTE, repName: quote.repName }),
    totalWse: (quote.ftWse || 0) + (quote.ptWse || 0),
    readOnly,
    saveState,
    companyId,
    ownerId,
    ownerName,
  };
  return <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>;
}

export function useQuote() {
  const ctx = useContext(QuoteContext);
  if (!ctx) throw new Error("useQuote must be used inside QuoteProvider");
  return ctx;
}
