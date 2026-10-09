import React, { createContext, useContext, useEffect, useState } from "react";

export type QuoteInputs = {
  ftWse: number;
  ptWse: number;
  companyLogo: string | null; // data URL
  incumbentPayroll: string;
  incumbentMedicalCarrier: string;
  medicalRenewalDate: string; // yyyy-MM-dd
};

const EMPTY: QuoteInputs = {
  ftWse: 0,
  ptWse: 0,
  companyLogo: null,
  incumbentPayroll: "",
  incumbentMedicalCarrier: "",
  medicalRenewalDate: "",
};

const STORAGE_KEY = "trinet-quote-inputs";

function load(): QuoteInputs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

type QuoteContextValue = {
  quote: QuoteInputs;
  update: (changes: Partial<QuoteInputs>) => void;
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
