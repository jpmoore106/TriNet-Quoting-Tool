// Builds the proposal deck (.pptx) in the browser from the quote details,
// styled to the TriNet Brand Identity Playbook (v2.4).
import type PptxGenJS from "pptxgenjs";
import { format } from "date-fns";
import LogoFullColorUrl from "../assets/trinet_logo_full_color.png";
import LogoReversedUrl from "../assets/trinet_logo_reversed.png";
import type { QuoteInputs } from "../state/QuoteContext";
import { SERVICE_INCLUSIONS } from "../data/serviceInclusions";
import { KEY_MESSAGES } from "../data/brandMessages";
import { feeSummary, formatDate, priceBreakRows, rateCapLimits, setupFeeSchedule, usd } from "./pricing";

const NAVY = "0B0134";
const ORANGE = "FD5000";
const DARK_GRAY = "54565A";
const LIGHT_GRAY = "DFE1DF";
const CANVAS = "F2F3F2";
// System font for Microsoft programs; PowerPoint substitutes a similar font if it isn't installed.
const FONT = "Avenir Next LT Pro";
const W = 13.333; // LAYOUT_WIDE
const H = 7.5;

type Img = { data: string; width: number; height: number };

async function loadImage(src: string): Promise<Img> {
  const data = src.startsWith("data:") ? src : await fetch(src).then((r) => r.blob()).then(blobToDataUrl);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = data;
  });
  const width = img.naturalWidth || 1;
  const height = img.naturalHeight || 1;
  if (!data.startsWith("data:image/svg")) return { data, width, height };
  // PowerPoint support for SVG varies, so rasterize SVGs to PNG.
  const scale = 512 / Math.max(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { data: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Place an image inside a box, keeping its aspect ratio and centering it.
function fit(img: Img, x: number, y: number, w: number, h: number) {
  const scale = Math.min(w / img.width, h / img.height);
  const iw = img.width * scale;
  const ih = img.height * scale;
  return { data: img.data, x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih };
}

export function deckFileName(q: QuoteInputs) {
  const name = (q.companyName || "Prospect").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_");
  return `TriNet_Proposal_${name}_${format(new Date(), "yyyy-MM-dd")}.pptx`;
}

export async function buildProposalDeck(q: QuoteInputs): Promise<PptxGenJS> {
  const { default: Pptx } = await import("pptxgenjs");
  const pptx = new Pptx();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = `TriNet Proposal – ${q.companyName || "Prospect"}`;

  const company = q.companyName || "Your Company";
  const fees = feeSummary(q);
  const breaks = priceBreakRows(q);
  const cap = rateCapLimits(q);
  const setup = setupFeeSchedule(q);
  const [logoFull, logoReversed, ...icons] = await Promise.all([
    loadImage(LogoFullColorUrl),
    loadImage(LogoReversedUrl),
    ...SERVICE_INCLUSIONS.map((c) => loadImage(c.icon)),
  ]);
  const clientLogo = q.companyLogo ? await loadImage(q.companyLogo).catch(() => null) : null;

  // Wing motif: an orange L in the top-right corner (one per layout).
  const wing = (size: number, thickness: number) => [
    { rect: { x: W - size, y: 0, w: size, h: thickness, fill: { color: ORANGE } } },
    { rect: { x: W - thickness, y: 0, w: thickness, h: size, fill: { color: ORANGE } } },
  ];

  pptx.defineSlideMaster({
    title: "CONTENT",
    background: { color: "FFFFFF" },
    objects: [
      ...wing(0.75, 0.19),
      // Full-color logo on white.
      { image: fit(logoFull, 0.6, H - 0.65, 1.2, 0.35) },
      { text: { text: `Prepared for ${company}`, options: { x: 2.0, y: H - 0.63, w: 8, h: 0.3, fontFace: FONT, fontSize: 10, color: DARK_GRAY } } },
    ],
    slideNumber: { x: W - 1.1, y: H - 0.63, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 10, color: DARK_GRAY, align: "right" },
  });

  // Slide header (navy, bold) with an optional orange 18pt subhead, per the system font hierarchy.
  const content = (title: string, subhead?: string) => {
    const s = pptx.addSlide({ masterName: "CONTENT" });
    s.addText(title, { x: 0.6, y: 0.45, w: W - 2.2, h: 0.65, fontFace: FONT, fontSize: 30, bold: true, color: NAVY, margin: 0 });
    if (subhead) s.addText(subhead, { x: 0.6, y: 1.1, w: W - 2.2, h: 0.4, fontFace: FONT, fontSize: 18, bold: true, color: ORANGE, margin: 0 });
    return s;
  };

  const statTile = (s: PptxGenJS.Slide, x: number, y: number, w: number, label: string, value: string, detail?: string, dark = false) => {
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 1.55, fill: { color: dark ? NAVY : CANVAS }, line: { color: dark ? NAVY : CANVAS }, rectRadius: 0.1 });
    s.addText(label.toUpperCase(), { x: x + 0.25, y: y + 0.15, w: w - 0.5, h: 0.35, fontFace: FONT, fontSize: 11, bold: true, color: dark ? ORANGE : DARK_GRAY, charSpacing: 1 });
    s.addText(value, { x: x + 0.25, y: y + 0.5, w: w - 0.5, h: 0.6, fontFace: FONT, fontSize: 28, bold: true, color: dark ? "FFFFFF" : NAVY, fit: "shrink" });
    if (detail) s.addText(detail, { x: x + 0.25, y: y + 1.08, w: w - 0.5, h: 0.32, fontFace: FONT, fontSize: 12, color: dark ? "FFFFFF" : DARK_GRAY });
  };

  const table = (s: PptxGenJS.Slide, rows: PptxGenJS.TableRow[], opts: PptxGenJS.TableProps) =>
    s.addTable(rows, { fontFace: FONT, border: { type: "solid", pt: 0.75, color: LIGHT_GRAY }, rowH: 0.45, valign: "middle", ...opts });

  // 1. Title: TriNet Navy, reversed-out logo, wing motif.
  const title = pptx.addSlide();
  title.background = { color: NAVY };
  title.addShape(pptx.ShapeType.rect, { x: W - 2.6, y: 0, w: 2.6, h: 0.65, fill: { color: ORANGE }, line: { color: ORANGE } });
  title.addShape(pptx.ShapeType.rect, { x: W - 0.65, y: 0, w: 0.65, h: 2.6, fill: { color: ORANGE }, line: { color: ORANGE } });
  title.addImage(fit(logoReversed, 0.8, 0.7, 2.4, 0.75));
  title.addText("PROPOSAL", { x: 0.8, y: 2.55, w: 9, h: 0.6, fontFace: FONT, fontSize: 22, bold: true, color: ORANGE, charSpacing: 2, margin: 0 });
  title.addText(company, { x: 0.8, y: 3.15, w: 8.5, h: 1.2, fontFace: FONT, fontSize: 48, bold: true, color: "FFFFFF", fit: "shrink", margin: 0, valign: "top" });
  title.addText(
    [q.repName ? `Prepared by ${q.repName}` : "Prepared by TriNet", format(new Date(), "MMMM d, yyyy")].join("  ·  "),
    { x: 0.8, y: 4.45, w: 8.5, h: 0.4, fontFace: FONT, fontSize: 16, color: "FFFFFF", margin: 0 },
  );
  if (clientLogo) {
    title.addShape(pptx.ShapeType.roundRect, { x: W - 4.3, y: 3.6, w: 3.5, h: 2.1, fill: { color: "FFFFFF" }, line: { color: "FFFFFF" }, rectRadius: 0.12 });
    title.addImage(fit(clientLogo, W - 4.05, 3.85, 3.0, 1.6));
  }

  // 2. Your team today
  const today = content("Your team today", `Where ${company} is now`);
  statTile(today, 0.6, 1.9, 3.9, "Employees", String(fees.totalWse || "—"), fees.hasPt ? `${fees.ft} full-time · ${fees.pt} part-time` : undefined);
  statTile(today, 4.72, 1.9, 3.9, "Payroll provider", q.incumbentPayroll || "—");
  statTile(today, 8.84, 1.9, 3.9, "Medical carrier", q.incumbentMedicalCarrier || "—",
    q.medicalRenewalDate ? `Renews ${formatDate(q.medicalRenewalDate)}` : undefined);
  today.addText("With TriNet, payroll, benefits, HR and compliance come together with one partner and one simple fee.", {
    x: 0.6, y: 4.0, w: W - 1.6, h: 0.8, fontFace: FONT, fontSize: 18, color: NAVY, margin: 0,
  });

  // 3. Why TriNet: the brand's three key messages.
  const why = content("Why TriNet", "One partner for the people side of your business");
  KEY_MESSAGES.forEach((m, i) => {
    const x = 0.6 + i * 4.12;
    why.addShape(pptx.ShapeType.rect, { x, y: 1.9, w: 0.08, h: 0.9, fill: { color: ORANGE }, line: { color: ORANGE } });
    why.addText(m.title, { x: x + 0.25, y: 1.85, w: 3.6, h: 1.0, fontFace: FONT, fontSize: 20, bold: true, color: NAVY, margin: 0, valign: "top" });
    why.addText(m.body, { x: x + 0.25, y: 2.95, w: 3.6, h: 3.0, fontFace: FONT, fontSize: 15, color: DARK_GRAY, margin: 0, valign: "top", paraSpaceAfter: 4 });
  });

  // 4. Professional Service Fee
  const fee = content("Your Professional Service Fee", fees.hasPt ? "Blended per employee per month (PEPM)" : "Per employee per month (PEPM)");
  fee.addText(usd(fees.pepm), { x: 0.6, y: 1.8, w: 6, h: 1.3, fontFace: FONT, fontSize: 72, bold: true, color: NAVY, margin: 0 });
  if (fees.pepm > 0) {
    fee.addText(`About ${usd(fees.perWorkday)} per employee per workday`, { x: 0.6, y: 3.1, w: 6, h: 0.4, fontFace: FONT, fontSize: 18, color: DARK_GRAY, margin: 0 });
  }
  statTile(fee, 7.0, 1.8, 2.75, "Monthly fee", fees.monthly > 0 ? usd(fees.monthly, 0) : "—", undefined, true);
  statTile(fee, 9.95, 1.8, 2.75, "Annual fee", fees.annual > 0 ? usd(fees.annual, 0) : "—", undefined, true);
  if (fees.hasPt) {
    table(fee, [
      [hdr("Employees"), hdr("Count"), hdr("PEPM"), hdr("Monthly")],
      [cell("Full-time"), cell(String(fees.ft)), cell(usd(q.ftPepm || 0)), cell(usd(fees.ftMonthly, 0))],
      [cell("Part-time"), cell(String(fees.pt)), cell(usd(q.ptPepm || 0)), cell(usd(fees.ptMonthly, 0))],
      [cell("Total", true), cell(String(fees.totalWse), true), cell(usd(fees.pepm), true), cell(usd(fees.monthly, 0), true)],
    ], { x: 0.6, y: 4.1, w: 7.5, colW: [2.2, 1.5, 1.8, 2.0] });
  }

  // 5. What's included, with TriNet's icon set.
  const inc = content("What's included in your fee", "Everything your team needs, in one fee");
  SERVICE_INCLUSIONS.forEach((c, i) => {
    const x = 0.6 + (i % 3) * 4.12;
    const y = 1.8 + Math.floor(i / 3) * 2.7;
    inc.addImage(fit(icons[i], x, y, 0.6, 0.6));
    inc.addText(c.title, { x: x + 0.75, y, w: 3.15, h: 0.6, fontFace: FONT, fontSize: 16, bold: true, color: NAVY, margin: 0, valign: "middle" });
    inc.addText(
      c.items.map((t) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: true } })),
      { x, y: y + 0.75, w: 3.9, h: 1.75, fontFace: FONT, fontSize: 12, color: DARK_GRAY, valign: "top", paraSpaceAfter: 3, margin: 0 },
    );
  });

  // 6. Growth pricing (price breaks replace the full-time PEPM)
  if (breaks.length) {
    const g = content("Price breaks as you grow",
      `Your full-time PEPM drops as your team grows${fees.hasPt ? "; part-time pricing stays the same" : ""}`);
    const rows: PptxGenJS.TableRow[] = [[hdr("Headcount"), hdr("FT PEPM"), hdr("Monthly (FT)"), hdr("Annual (FT)"), hdr("Savings per employee")]];
    if (fees.ft > 0) rows.push([cell(`${fees.ft} (today)`), cell(usd(q.ftPepm || 0)), cell(usd(fees.ftMonthly, 0)), cell(usd(fees.ftMonthly * 12, 0)), cell("—")]);
    breaks.forEach((b) => rows.push([
      cell(`${b.headcount}+`, true), cell(usd(b.pepm), true), cell(usd(b.monthly, 0)), cell(usd(b.annual, 0)),
      cell(b.savingsPerEmployee > 0 ? `${usd(b.savingsPerEmployee)} (${b.savingsPercent.toFixed(1)}%)` : "—", true),
    ]));
    table(g, rows, { x: 0.6, y: 1.9, w: W - 1.6 });
  }

  // 7. Rate protection: a not-to-exceed cap at the year 2 renewal only.
  if (cap) {
    const r = content("Rate protection", "A not-to-exceed cap at your year 2 renewal");
    r.addText(
      cap.percent > 0
        ? `At your year 2 renewal, your PEPM won't increase more than ${cap.percent}%.`
        : "Your PEPM won't increase at your year 2 renewal.",
      { x: 0.6, y: 1.8, w: W - 1.6, h: 0.7, fontFace: FONT, fontSize: 24, bold: true, color: NAVY, margin: 0 },
    );
    const capRows: PptxGenJS.TableRow[] = [[hdr(""), hdr("Today"), hdr("Year 2 maximum")],
      [cell(fees.hasPt ? "Full-time PEPM" : "PEPM"), cell(usd(q.ftPepm || 0)), cell(usd(cap.ftMax), true)]];
    if (fees.hasPt) capRows.push([cell("Part-time PEPM"), cell(usd(q.ptPepm || 0)), cell(usd(cap.ptMax), true)]);
    table(r, capRows, { x: 0.6, y: 2.75, w: 8, colW: [3, 2.5, 2.5] });
    r.addText("This is a ceiling, not a planned increase.",
      { x: 0.6, y: 2.95 + 0.45 * capRows.length, w: W - 1.6, h: 0.4, fontFace: FONT, fontSize: 15, color: DARK_GRAY, margin: 0 });
  }

  // 8. Setup fee
  if (setup.gross > 0) {
    const sf = content("Setup fee", "One-time implementation to get your team onto TriNet");
    statTile(sf, 0.6, 1.8, 3.9, "Setup fee", usd(setup.gross, 0));
    if (setup.discount > 0) statTile(sf, 4.72, 1.8, 3.9, "Discount", `−${usd(setup.discount, 0)}`);
    statTile(sf, setup.discount > 0 ? 8.84 : 4.72, 1.8, 3.9, "You pay", usd(setup.net, 0),
      setup.count > 1 ? `${setup.count} payments of ${usd(setup.schedule[0].amount)}` : "One payment", true);
    if (setup.count > 1) {
      const perRow = 6;
      const rows: PptxGenJS.TableRow[] = [];
      for (let i = 0; i < setup.schedule.length; i += perRow) {
        const chunk = setup.schedule.slice(i, i + perRow);
        rows.push(chunk.map((p) => hdr(p.date || `Payment ${p.number}`)));
        rows.push(chunk.map((p) => cell(usd(p.amount))));
      }
      table(sf, rows, { x: 0.6, y: 3.75, w: W - 1.6 });
    }
    if (q.setupFee.notes) {
      sf.addText(q.setupFee.notes, { x: 0.6, y: H - 1.35, w: W - 1.6, h: 0.45, fontFace: FONT, fontSize: 13, italic: true, color: DARK_GRAY, margin: 0 });
    }
  }

  // 9. Next steps
  const next = content("Next steps", "Getting started with TriNet");
  next.addText(
    [
      "Review this proposal and confirm your employee counts",
      "Sign the TriNet Service Agreement",
      "Submit complete paperwork by the deadline for your target live date",
      "Kick off implementation with your TriNet onboarding team",
    ].map((t, i) => ({ text: t, options: { bullet: { type: "number" as const, numberStartAt: 1 }, breakLine: i < 3 } })),
    { x: 0.6, y: 1.9, w: W - 1.6, h: 3.5, fontFace: FONT, fontSize: 22, color: NAVY, paraSpaceAfter: 16, valign: "top", margin: 0 },
  );

  return pptx;
}

function hdr(text: string): PptxGenJS.TableCell {
  return { text, options: { bold: true, color: "FFFFFF", fill: { color: NAVY }, fontSize: 13, margin: 0.1 } };
}

function cell(text: string, bold = false): PptxGenJS.TableCell {
  return { text, options: { bold, color: NAVY, fontSize: 13, margin: 0.1 } };
}
