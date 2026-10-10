import { format } from "date-fns";
import type JSZip from "jszip";
import type { QuoteInputs } from "../state/QuoteContext";
import { MASTER_DECK_URL, MASTER_SLIDES } from "../data/masterDeck";
import { feeSummary, freeMonthsCredit, priceBreakRows, setupFeeSchedule } from "./pricing";

const PPTX_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const longDate = (iso: string) => (iso ? format(new Date(iso + "T00:00:00"), "MMMM do") : null);

// Replace the text of a run whose text is exactly `from` (as written in the XML). Returns null if it isn't there.
function setRun(xml: string, from: string, to: string, occurrence = 0): string | null {
  const needle = `<a:t>${from}</a:t>`;
  let i = -1;
  for (let k = 0; k <= occurrence; k++) {
    i = xml.indexOf(needle, i + 1);
    if (i < 0) return null;
  }
  return xml.slice(0, i) + `<a:t>${esc(to)}</a:t>` + xml.slice(i + needle.length);
}

type Fill = { xml: string; warnings: string[] };

function fill(xml: string, warnings: string[], from: string, to: string | null, what: string, occurrence = 0) {
  if (to === null) return xml;
  const next = setRun(xml, from, to, occurrence);
  if (next === null) {
    warnings.push(`Couldn't find the ${what} on the slide; it still shows the master deck's text.`);
    return xml;
  }
  return next;
}

// Paragraph text as written in the slide XML: its runs joined (runs can split words, e.g. "S" + "treamlining").
const paragraphs = (xml: string) =>
  [...xml.matchAll(/<a:p>(?:(?!<\/a:p>).)*?<\/a:p>|<a:p [^>]*>(?:(?!<\/a:p>).)*?<\/a:p>/gs)].map((m) => ({
    start: m.index!, end: m.index! + m[0].length, raw: m[0],
    text: [...m[0].matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((t) => t[1]).join(""),
  }));

// Replace whole paragraphs by their master-deck text. A null replacement removes the paragraph; the first run keeps its
// formatting and takes the new text, the other runs go. Works from the end so earlier offsets stay valid.
function replaceParagraphs(xml: string, pairs: [string, string | null][], warnings: string[], what: string) {
  const found = paragraphs(xml);
  const edits = pairs.map(([from, to]) => ({ p: found.find((p) => p.text === from), to })).filter((e) => e.p);
  if (edits.length < pairs.length) warnings.push(`Couldn't find all of the ${what}; some lines still show the master deck's text.`);
  for (const { p, to } of edits.sort((a, b) => b.p!.start - a.p!.start)) {
    let next = "";
    if (to !== null) {
      let first = true;
      next = p!.raw.replace(/<a:r>(?:(?!<\/a:r>).)*?<\/a:r>/gs, (run) => {
        if (!first) return "";
        first = false;
        return run.replace(/<a:t>[^<]*<\/a:t>/, `<a:t>${esc(to)}</a:t>`);
      });
    }
    xml = xml.slice(0, p!.start) + next + xml.slice(p!.end);
  }
  return xml;
}

// Pair master-deck lines with new lines; master lines without a new one are removed.
const pairUp = (master: string[], lines: string[]): [string, string | null][] =>
  master.map((m, i) => [m, lines[i]?.trim() ? lines[i].trim() : null]);

// Slide 10 "We hear you…": four statements (a fifth is part of the graphic).
const HEAR_YOU = [
  "Streamlining HR workflow including added tools and integrations.",
  "Partnering with an HR experts who are focused on Compliance.",
  "User friendly technology that will serve to elevate the employee experience.",
  "Work with an HR partner that provides nonprofit expertise.",
];
function personalizeWeHearYou(xml: string, q: QuoteInputs): Fill {
  const warnings: string[] = [];
  const lines = q.callInsights?.deck.we_hear_you ?? [];
  if (!lines.length) return { xml, warnings: ["No call transcript analyzed, so these are the master deck's sample statements."] };
  // Keep every box filled: the graphic has a fixed number of bars.
  const filled = HEAR_YOU.map((m, i) => lines[i]?.trim() || m);
  xml = replaceParagraphs(xml, HEAR_YOU.map((m, i) => [m, filled[i]]), warnings, "We hear you statements");
  warnings.push("The fifth statement is part of the graphic; edit it in PowerPoint if it doesn't fit.");
  return { xml, warnings };
}

// Slide 11 "Current State": six boxes.
const CURRENT_STATE = [
  "Desire to improve HRIS / Technology",
  "Lack of Integration to QBO / Promise",
  "ProLiant is antiquated; desire return to PEO",
  "Improved functionality RE scalability / future markets",
  "Lack of support RE new state tax setup",
  "Performance MGMT is manual",
];
function personalizeCurrentState(xml: string, q: QuoteInputs): Fill {
  const warnings: string[] = [];
  const lines = q.callInsights?.deck.current_state ?? [];
  if (!lines.length) return { xml, warnings: ["No call transcript analyzed, so these are the master deck's sample pain points."] };
  const filled = CURRENT_STATE.map((m, i) => lines[i]?.trim() || "");
  xml = replaceParagraphs(xml, CURRENT_STATE.map((m, i) => [m, filled[i]]), warnings, "current state boxes");
  if (lines.length < 6) warnings.push(`Only ${lines.length} current-state items, so ${6 - lines.length} box(es) are empty: delete them in PowerPoint.`);
  return { xml, warnings };
}

// Slide 14 columns (as written in the XML, so "&amp;" stays escaped).
const EMPLOYEE_LINES = [
  "Richer benefits, multiple plans and voluntary options",
  "Significantly enhanced 401(k) options with lower basis points and overall fees",
  "Ease of Use, End-to-End HR Web &amp; Mobile",
  "24 HR Support option and expertise RE first call resolution",
  "Marketplace for all aspects to impact  disposable income",
];
const COMPANY_LINES = [
  "Retain &amp; Attract Top Talent, reduce turnover ",
  "Included Cloud Apps (Performance MGMT, Expense, ATS and T&amp;A)",
  "Process and Productivity enhancements achieved with end-to-end integration; direct GL Integration",
  "Enhanced employee insight and trends supported via advanced reporting and analytics",
  "Best in class Technology: Mobile App",
];
const FINANCIAL_LINES = [
  "YoY Cost Containment and Predictability",
  "Transparency of all cost, no hidden fees, Flat $ vs. %",
  "Preferred tax approach over competitors: SEC 125, SUTA, R&amp;D Tax Credits",
  "$1M in EPLI, most not hitting policy",
  "Recovery Credit Program- commitment to Clients",
  "Reduced 401(k) Fees: both ER and EE",
];

function personalizeWhatThisMeans(xml: string, q: QuoteInputs): Fill {
  const warnings: string[] = [];
  const d = q.callInsights?.deck;
  if (d) {
    const pairs: [string, string | null][] = [
      ...pairUp(EMPLOYEE_LINES, d.employee_benefits),
      ...pairUp(COMPANY_LINES, d.company_benefits),
      ...pairUp(FINANCIAL_LINES, d.financial_benefits),
    ];
    if (d.themes.trim()) pairs.push(["Service, Integration / Technology, Ease of Use ", d.themes.trim()]);
    xml = replaceParagraphs(xml, pairs, warnings, "slide 14 bullets");
  } else {
    warnings.push("No call transcript analyzed, so the three columns are the master deck's sample points.");
  }
  const name = q.companyName.trim();
  if (!name) return { xml, warnings: [...warnings, "No company name yet, so it still reads \u201cCompany Name\u201d."] };
  const title = `What this means for ${name}`;
  xml = fill(xml, warnings, "What this means for Company Name", title, "title");
  xml = fitRun(xml, title, 34, 2000);
  xml = fill(xml, warnings, "Company Name", name, "column heading");
  xml = fitRun(xml, name, 14, 1000);
  return { xml, warnings };
}

// Shrink the run holding `text` so text longer than the master's sample still fits on one line.
function fitRun(xml: string, text: string, sampleLength: number, minSize: number) {
  const i = xml.indexOf(`<a:t>${esc(text)}</a:t>`);
  const r = xml.lastIndexOf("<a:rPr", i);
  if (i < 0 || r < 0 || text.length <= sampleLength) return xml;
  const tagEnd = xml.indexOf(">", r);
  const tag = xml.slice(r, tagEnd);
  const size = Number(tag.match(/ sz="(\d+)"/)?.[1] ?? 0);
  if (!size) return xml;
  const fitted = Math.max(minSize, Math.floor((size * sampleLength) / text.length / 100) * 100);
  return xml.slice(0, r) + tag.replace(/ sz="\d+"/, ` sz="${fitted}"`) + xml.slice(tagEnd);
}

function personalizePricing(xml: string, q: QuoteInputs): Fill {
  const warnings: string[] = [];
  const fees = feeSummary(q);
  if (fees.monthly > 0) {
    const fee = fees.minimumApplied
      ? `${money(fees.monthly)}/month minimum (${fees.totalWse} WSEs)`
      : fees.hasPt
        ? `${money(q.ftPepm)} FT + ${money(q.ptPepm)} PT PEPM × ${fees.totalWse} WSEs`
        : `${money(q.ftPepm)}/PEPM × ${fees.totalWse} WSEs`;
    xml = fill(xml, warnings, " $129/PEPM × 19 WSEs = $24,852/yr   |   ", ` ${fee} = ${money(fees.annual)}/yr   |   `, "service fee");
  } else warnings.push("No PEPM or WSE count yet, so the service fee is the master deck's sample.");

  const setup = setupFeeSchedule(q);
  if (setup.gross > 0) {
    const terms = setup.net === 0 ? "waived" : setup.count > 1 ? `in ${setup.count} installments` : "one-time";
    xml = fill(xml, warnings, " $2,812 (one-time) ", ` ${money(setup.net)} (${terms}) `, "implementation fee");
  } else warnings.push("No setup fee yet, so the implementation fee is the master deck's sample.");

  // Volume price breaks: today's FT PEPM up to the first break, then each break's PEPM.
  const breaks = priceBreakRows(q);
  const rows = breaks.length === 0
    ? [{ label: "Not included in this quote", price: "" }]
    : [
        ...(breaks[0].headcount > 1 && q.ftPepm > 0 ? [{ label: `1–${breaks[0].headcount - 1} employees`, price: q.ftPepm }] : []),
        ...breaks.map((b, i) => ({
          label: i < breaks.length - 1 ? `${b.headcount}–${breaks[i + 1].headcount - 1} employees` : `${b.headcount}+ employees`,
          price: b.pepm,
        })),
      ].map((r) => ({ label: r.label, price: `\t${money(r.price as number)} PEPM` }));
  const paras = [...xml.matchAll(/<a:p>(?:(?!<\/a:p>).)*?employees<\/a:t>(?:(?!<\/a:p>).)*?PEPM<\/a:t><\/a:r><\/a:p>/gs)];
  if (paras.length > 0) {
    const template = paras[0][0];
    const start = paras[0].index!;
    const last = paras[paras.length - 1];
    const end = last.index! + last[0].length;
    const built = rows.map((r) => {
      let p = template.replace(/<a:t>[^<]*employees<\/a:t>/, `<a:t>${esc(r.label)}</a:t>`);
      p = p.replace(/<a:t>[^<]*PEPM<\/a:t>/, `<a:t>${esc(r.price)}</a:t>`);
      return p;
    });
    xml = xml.slice(0, start) + built.join("") + xml.slice(end);
  } else warnings.push("Couldn't find the price breaks on the slide.");

  if (q.rateCap.enabled) {
    xml = fill(xml, warnings, "a. Your Per WSE Monthly Service Fee shall not increase more than 5%; and ",
      `a. Your Per WSE Monthly Service Fee shall not increase more than ${q.rateCap.percent}%; and `, "rate cap");
  } else warnings.push("No rate cap in the quote, so the rate-lock terms are the master deck's sample.");
  const free = freeMonthsCredit(q);
  if (free.months > 0 && fees.monthly > 0) {
    const m = `${free.months} Month${free.months > 1 ? "s" : ""}`;
    xml = fill(xml, warnings, "3 Months Free Credit (Year One):  ", `${m} Free Credit (Year One):  `, "free credit heading");
    xml = fill(xml, warnings, "$6,213", money(free.credit), "free credit amount");
    xml = fill(xml, warnings, "3 months × $109 PEPM × 19 employees = $6,213",
      `${free.months} month${free.months > 1 ? "s" : ""} × ${money(fees.monthly)}/month = ${money(free.credit)}`, "free credit math");
    warnings.push("Check the benefits decision support line; it isn't part of the quote.");
  } else {
    warnings.push("No months free in the quote: delete the free credit box, and check the benefits decision support line.");
  }
  return { xml, warnings };
}

function personalizeTimeline(xml: string, q: QuoteInputs): Fill {
  const warnings: string[] = [];
  const pay = q.chevron?.payroll;
  const benefitsStart = q.benefits.effectiveDate;
  // "June 1st" appears twice: payroll start, then benefits start. Fill benefits first so the payroll index holds.
  if (benefitsStart) xml = fill(xml, warnings, "June 1st", longDate(benefitsStart), "benefits start date", 1);
  else warnings.push("No benefits start date yet.");
  if (pay?.trinetPayBegin) {
    xml = fill(xml, warnings, "June 1st", longDate(pay.trinetPayBegin), "payroll start date");
    xml = fill(xml, warnings, "June 7th", longDate(pay.trinetPayEnd), "payroll end date");
    xml = fill(xml, warnings, "June 13th", longDate(pay.firstCheck), "first check date");
  } else warnings.push("No payroll dates yet; import the Chevron proposal on the Setup page.");
  if (q.deck.paperworkDeadline) xml = fill(xml, warnings, "April 17th", longDate(q.deck.paperworkDeadline), "paperwork deadline");
  else warnings.push("No paperwork deadline yet.");
  warnings.push("Check the early-access line under the paperwork deadline.");
  return { xml, warnings };
}

const PERSONALIZE: Record<number, (xml: string, q: QuoteInputs) => Fill> = {
  10: personalizeWeHearYou,
  11: personalizeCurrentState,
  14: personalizeWhatThisMeans,
  67: personalizePricing,
  69: personalizeTimeline,
};

// Resolve a relationship target against the part that owns it.
function resolvePart(source: string, target: string) {
  if (target.startsWith("/")) return target.slice(1);
  const parts = source.split("/").slice(0, -1);
  for (const seg of target.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}
const relsPathFor = (part: string) => {
  const i = part.lastIndexOf("/");
  return `${part.slice(0, i + 1)}_rels/${part.slice(i + 1)}.rels`;
};
const internalTargets = (rels: string) =>
  [...rels.matchAll(/<Relationship\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => !/TargetMode="External"/.test(tag))
    .map((tag) => tag.match(/Target="([^"]+)"/)?.[1] ?? "")
    .filter(Boolean);

// Drop every part no longer reachable from the package root (removed slides, their notes, unused media).
async function removeUnreachable(zip: JSZip) {
  const reachable = new Set<string>();
  const queue: [string, string][] = [["", "_rels/.rels"]];
  while (queue.length) {
    const [source, relsPath] = queue.shift()!;
    const rels = await zip.file(relsPath)?.async("string");
    if (!rels) continue;
    for (const t of internalTargets(rels)) {
      const part = source ? resolvePart(source, t) : t.replace(/^\//, "");
      if (reachable.has(part) || !zip.file(part)) continue;
      reachable.add(part);
      queue.push([part, relsPathFor(part)]);
    }
  }
  const keep = (path: string) => {
    if (path === "[Content_Types].xml" || path === "_rels/.rels" || reachable.has(path)) return true;
    const m = path.match(/^(.*)_rels\/([^/]+)\.rels$/);
    return !!m && reachable.has(m[1] + m[2]);
  };
  Object.keys(zip.files).filter((p) => !zip.files[p].dir && !keep(p)).forEach((p) => zip.remove(p));

  const types = await zip.file("[Content_Types].xml")!.async("string");
  zip.file("[Content_Types].xml", types.replace(/<Override PartName="\/([^"]+)"[^>]*\/>/g, (tag, part) => (zip.file(part) ? tag : "")));
}

export type BuiltDeck = { blob: Blob; slideCount: number; warnings: { slide: number; text: string }[] };

// Build a trimmed copy of the master deck with only the chosen slides, in master-deck order.
export async function buildMasterDeck(q: QuoteInputs, slides: number[], onProgress?: (step: string) => void): Promise<BuiltDeck> {
  const { default: JSZipCtor } = await import("jszip");
  onProgress?.("Downloading the master deck…");
  const res = await fetch(MASTER_DECK_URL);
  if (!res.ok) throw new Error(`Master deck download failed (${res.status})`);
  const zip = await JSZipCtor.loadAsync(await res.arrayBuffer());
  onProgress?.("Trimming slides…");

  const keep = new Set(slides);
  const presPath = "ppt/presentation.xml";
  const presRelsPath = "ppt/_rels/presentation.xml.rels";
  let pres = await zip.file(presPath)!.async("string");
  let presRels = await zip.file(presRelsPath)!.async("string");

  const relTarget = (rId: string) => presRels.match(new RegExp(`<Relationship\\b[^>]*Id="${rId}"[^>]*>`))?.[0].match(/Target="([^"]+)"/)?.[1];
  const entries = [...pres.matchAll(/<p:sldId id="(\d+)" r:id="(rId\d+)"\/>/g)].map((m, i) => ({ n: i + 1, tag: m[0], id: m[1], rId: m[2] }));
  if (entries.length !== MASTER_SLIDES.length) throw new Error(`Expected ${MASTER_SLIDES.length} slides in the master deck, found ${entries.length}`);

  const warnings: BuiltDeck["warnings"] = [];
  for (const e of entries) {
    if (keep.has(e.n)) {
      const path = "ppt/" + relTarget(e.rId);
      let xml = await zip.file(path)!.async("string");
      xml = xml.replace(/(<p:sld\b[^>]*?) show="0"/, "$1"); // unhide slides hidden in the master
      const personalize = PERSONALIZE[e.n];
      if (personalize) {
        const r = personalize(xml, q);
        xml = r.xml;
        r.warnings.forEach((text) => warnings.push({ slide: e.n, text }));
      }
      zip.file(path, xml);
      continue;
    }
    pres = pres.replace(e.tag, "");
    pres = pres.replace(`<p14:sldId id="${e.id}"/>`, "");
    presRels = presRels.replace(new RegExp(`<Relationship\\b[^>]*Id="${e.rId}"[^>]*/>`), "");
  }
  // Drop sections left empty, and the co-authoring change log, which refers to removed slides.
  pres = pres.replace(/<p14:section\b[^>]*>\s*<p14:sldIdLst\s*\/>\s*<\/p14:section>/g, "");
  pres = pres.replace(/<p14:section\b[^>]*>\s*<p14:sldIdLst>\s*<\/p14:sldIdLst>\s*<\/p14:section>/g, "");
  presRels = presRels.replace(/<Relationship\b[^>]*relationships\/changesInfo"[^>]*\/>/g, "");
  zip.file(presPath, pres);
  zip.file(presRelsPath, presRels);

  await removeUnreachable(zip);
  const app = await zip.file("docProps/app.xml")?.async("string");
  if (app) zip.file("docProps/app.xml", app.replace(/<Slides>\d+<\/Slides>/, `<Slides>${keep.size}</Slides>`).replace(/<HiddenSlides>\d+<\/HiddenSlides>/, "<HiddenSlides>0</HiddenSlides>"));

  onProgress?.("Packaging the PowerPoint…");
  const blob = await zip.generateAsync({ type: "blob", mimeType: PPTX_TYPE, compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { blob, slideCount: keep.size, warnings };
}

export function masterDeckFileName(q: QuoteInputs) {
  const name = (q.companyName.trim() || "Client").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-");
  return `TriNet-Proposal-${name}.pptx`;
}
