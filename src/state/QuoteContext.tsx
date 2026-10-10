import React, { createContext, useContext, useEffect, useState } from "react";
import { EMPTY_BENEFITS, type BenefitsInputs } from "./benefits";

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
  priceBreaks: PriceBreak[]; // growth pricing: PEPM at a future headcount
  rateCap: RateCap;
  setupFee: SetupFee;
  benefits: BenefitsInputs;
};

const EMPTY: QuoteInputs = {
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
  priceBreaks: [],
  rateCap: { enabled: false, percent: 0 },
  setupFee: { amount: 0, discount: 0, installments: 1, firstInvoiceDate: "", notes: "" },
  benefits: EMPTY_BENEFITS,
};

const STORAGE_KEY = "trinet-quote-inputs";

function load(): QuoteInputs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const saved = JSON.parse(raw);
    return { ...EMPTY, ...saved, benefits: { ...EMPTY_BENEFITS, ...saved.benefits } };
  } catch {
    return EMPTY;
  }
}

type QuoteContextValue = {
  quote: QuoteInputs;
  update: (changes: Partial<QuoteInputs>) => void;
  updateBenefits: (changes: Partial<BenefitsInputs>) => void;
  reset: () => void;
  totalWse: number;
};

const QuoteContext = createContext<QuoteContextValue | null>(null);

// Quote inputs entered on the home page, shared by every page and saved in this browser.
export function QuoteProvider({ children }: { children: React.ReactNode }) {
  const [quote, setQuote] = useState<QuoteInputs>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(quote));
    } catch {
      // Storage full or unavailable (e.g. private browsing); inputs still work for this visit.
    }
  }, [quote]);

  const value: QuoteContextValue = {
    quote,
    update: (changes) => setQuote((q) => ({ ...q, ...changes })),
    updateBenefits: (changes) => setQuote((q) => ({ ...q, benefits: { ...q.benefits, ...changes } })),
    reset: () => setQuote(EMPTY),
    totalWse: (quote.ftWse || 0) + (quote.ptWse || 0),
  };
  return <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>;
}

export function useQuote() {
  const ctx = useContext(QuoteContext);
  if (!ctx) throw new Error("useQuote must be used inside QuoteProvider");
  return ctx;
}
