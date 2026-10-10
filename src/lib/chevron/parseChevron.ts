// Parses a TriNet Chevron proposal PDF (Word-generated), already split into text lines per page.

export type ChevronTaxRow = { state: string; classCode: string; wcRate: number; fica: number; futa: number; suta: number };
export type ChevronWcRow = { state: string; code: string; wages: number; currentRate: number; currentFee: number; trinetRate: number; trinetFee: number };
export type ChevronFeeRow = { kind: "ft" | "pt"; listPrice: number; discountPct: number; price: number; quantity: number; annual: number };

export type ChevronData = {
  fileName: string;
  importedAt: string;
  companyName: string;
  repName: string;
  repTitle: string;
  repEmail: string;
  repPhone: string;
  quoteNumber: string;
  validUntil: string; // yyyy-MM-dd
  serviceFees: ChevronFeeRow[];
  implementation: { listPrice: number; discountPct: number; price: number } | null;
  monthlyMinimum: number;
  payroll: {
    frequency: string; // as written, e.g. "Semi-Monthly"
    currentPayBegin: string; currentPayEnd: string; nextCheck: string;
    trinetPayBegin: string; trinetPayEnd: string; firstCheck: string;
  };
  annual: { grossWages: number; payrollTaxes: number; workersComp: number; disability: number; serviceFee: number; life: number; total: number };
  taxes: ChevronTaxRow[];
  workersComp: ChevronWcRow[];
};

const num = (s: string) => parseFloat(s.replace(/[$,%\s]/g, ""));
// Word PDFs split words around hyphens and percent signs ("Q - 00413980", "50.46 %"); put them back together.
const clean = (l: string) => l.replace(/(\w) - (\w)/g, "$1-$2").replace(/ %/g, "%").replace(/\s+/g, " ").trim();
const isoDate = (d: string) => {
  const m = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : "";
};
const MONEY = String.raw`\$([\d,]+\.\d{2})`;

export function parseChevron(rawPages: string[][], fileName = ""): ChevronData {
  const pages = rawPages.map((p) => p.map(clean));
  const all = pages.flat();
  const text = all.join("\n");
  if (!/Cost Summary/.test(text) || !/Service Fee/.test(text) || !/Proposal/.test(text)) {
    throw new Error("This doesn't look like a TriNet Chevron proposal.");
  }

  // Cover page: Proposal, company, rep name, title, email, phone, valid until, quote number.
  const cover = pages[0];
  const p = cover.indexOf("Proposal");
  const after = p >= 0 ? cover.slice(p + 1) : [];
  const email = all.find((l) => /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(l)) ?? "";
  const emailAt = after.indexOf(email);

  const fees: ChevronFeeRow[] = [];
  all.forEach((l, i) => {
    const m = l.match(/^Service Fee (Full-time|Part-time) Employees/i);
    if (!m) return;
    const row = all.slice(i + 1, i + 3).find((x) => /\$[\d,.]+ [\d.]+% \$[\d,.]+ [\d.]+ \$[\d,.]+/.test(x));
    const v = row?.match(/\$([\d,.]+) ([\d.]+)% \$([\d,.]+) ([\d.]+) \$([\d,.]+)/);
    if (v) fees.push({ kind: /full/i.test(m[1]) ? "ft" : "pt", listPrice: num(v[1]), discountPct: num(v[2]), price: num(v[3]), quantity: num(v[4]), annual: num(v[5]) });
  });
  const impl = text.match(/Implementation Fee \(One-time\) \$([\d,.]+) ([\d.]+)% \$([\d,.]+)/);

  const grab = (label: string) => {
    const m = text.match(new RegExp(`^${label} ${MONEY}`, "m"));
    return m ? num(m[1]) : 0;
  };
  const dates = text.match(/CURRENT PAY PERIOD BEGIN: ([\d/]+) END: ([\d/]+) TRINET PAY PERIOD BEGIN: ([\d/]+) END: ([\d/]+)/);
  const checks = text.match(/NEXT CHECK DATE ([\d/]+) TRINET FIRST CHECK DATE ([\d/]+)/);

  const taxes: ChevronTaxRow[] = [];
  const workersComp: ChevronWcRow[] = [];
  for (const l of all) {
    const t = l.match(/^([A-Z]{2}) (\S+) ([\d.]+) ([\d.]+)% ([\d.]+)% ([\d.]+)%$/);
    if (t) taxes.push({ state: t[1], classCode: t[2], wcRate: num(t[3]), fica: num(t[4]), futa: num(t[5]), suta: num(t[6]) });
    const w = l.match(new RegExp(`^([A-Z]{2}) (\\S+) ${MONEY} ([\\d.]+) ${MONEY} ([\\d.]+) ${MONEY}$`));
    if (w) workersComp.push({ state: w[1], code: w[2], wages: num(w[3]), currentRate: num(w[4]), currentFee: num(w[5]), trinetRate: num(w[6]), trinetFee: num(w[7]) });
  }

  return {
    fileName,
    importedAt: new Date().toISOString(),
    companyName: after[0] ?? "",
    repName: after[1] ?? "",
    repTitle: emailAt > 2 ? after[2] : "",
    repEmail: email,
    repPhone: all.find((l) => /^\(?\d{3}\)?[ .-]?\d{3}[ .-]\d{4}$/.test(l)) ?? "",
    quoteNumber: text.match(/\b(Q-\d+)\b/)?.[1] ?? "",
    validUntil: isoDate(text.match(/Valid until: ([\d/]+)/)?.[1] ?? ""),
    serviceFees: fees,
    implementation: impl ? { listPrice: num(impl[1]), discountPct: num(impl[2]), price: num(impl[3]) } : null,
    monthlyMinimum: num(text.match(/monthly minimum of \$([\d,.]+)/)?.[1] ?? "0") || 0,
    payroll: {
      frequency: text.match(/PAY FREQUENCY ([A-Za-z-]+)/)?.[1] ?? "",
      currentPayBegin: isoDate(dates?.[1] ?? ""), currentPayEnd: isoDate(dates?.[2] ?? ""), nextCheck: isoDate(checks?.[1] ?? ""),
      trinetPayBegin: isoDate(dates?.[3] ?? ""), trinetPayEnd: isoDate(dates?.[4] ?? ""), firstCheck: isoDate(checks?.[2] ?? ""),
    },
    annual: {
      grossWages: grab("Gross Wages"), payrollTaxes: grab("Payroll Taxes"), workersComp: grab("Workers' Compensation"),
      disability: grab("Disability Insurance"), serviceFee: grab("Service Fee"), life: grab("Life Insurance"), total: grab("Total"),
    },
    taxes,
    workersComp,
  };
}

// Sections the proposal didn't include (or that couldn't be read), e.g. a preview copy without the cost pages.
export function chevronGaps(c: ChevronData): string[] {
  const gaps: string[] = [];
  if (!c.taxes.length) gaps.push("payroll tax rates");
  if (!c.workersComp.length) gaps.push("workers' comp rates");
  if (!c.annual.grossWages && !c.annual.payrollTaxes) gaps.push("annual wages and payroll taxes");
  if (!c.payroll.trinetPayBegin && !c.payroll.firstCheck) gaps.push("pay period and first check dates");
  return gaps;
}
