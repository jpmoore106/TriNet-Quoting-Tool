// Builds the proposal deck (.pptx) in the browser from the quote details.
import type PptxGenJS from "pptxgenjs";
import { format } from "date-fns";
import TriNetLogoUrl from "../assets/trinet_white_rgb_md.png";
import type { QuoteInputs } from "../state/QuoteContext";
import { SERVICE_INCLUSIONS } from "../data/serviceInclusions";
import { feeSummary, formatDate, priceBreakRows, rateCapSchedule, setupFeeSchedule, usd } from "./pricing";

const NAVY = "0B0134";
const ORANGE = "FD5000";
const SLATE = "64748B";
const LIGHT = "F1F5F9";
const FONT = "Arial";
const W = 13.333; // LAYOUT_WIDE
const H = 7.5;

type Img = { data: string; width: number; height: number };

async function loadImage(src: string): Promise<Img> {
  const data = src.startsWith("data:") ? src : await fetch(src).then((r) => r.blob()).then(blobToDataUrl);
  const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
    img.onerror = reject;
    img.src = data;
  });
  return { data, width, height };
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
  const cap = rateCapSchedule(q);
  const setup = setupFeeSchedule(q);
  const trinetLogo = await loadImage(TriNetLogoUrl);
  const clientLogo = q.companyLogo ? await loadImage(q.companyLogo).catch(() => null) : null;

  pptx.defineSlideMaster({
    title: "CONTENT",
    background: { color: "FFFFFF" },
    objects: [
      { rect: { x: 0, y: 0, w: W, h: 0.9, fill: { color: NAVY } } },
      { image: fit(trinetLogo, W - 2.0, 0.2, 1.6, 0.5) },
      { rect: { x: 0, y: H - 0.12, w: W, h: 0.12, fill: { color: ORANGE } } },
      { text: { text: `Prepared for ${company}`, options: { x: 0.5, y: H - 0.55, w: 8, h: 0.3, fontFace: FONT, fontSize: 10, color: SLATE } } },
    ],
    slideNumber: { x: W - 1.0, y: H - 0.55, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 10, color: SLATE, align: "right" },
  });

  const content = (title: string) => {
    const s = pptx.addSlide({ masterName: "CONTENT" });
    s.addText(title, { x: 0.5, y: 0.15, w: W - 3, h: 0.6, fontFace: FONT, fontSize: 24, bold: true, color: "FFFFFF" });
    return s;
  };

  const statTile = (s: PptxGenJS.Slide, x: number, y: number, w: number, label: string, value: string, detail?: string) => {
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 1.5, fill: { color: LIGHT }, line: { color: LIGHT }, rectRadius: 0.12 });
    s.addText(label.toUpperCase(), { x: x + 0.25, y: y + 0.15, w: w - 0.5, h: 0.35, fontFace: FONT, fontSize: 11, color: SLATE, charSpacing: 1 });
    s.addText(value, { x: x + 0.25, y: y + 0.5, w: w - 0.5, h: 0.6, fontFace: FONT, fontSize: 26, bold: true, color: NAVY });
    if (detail) s.addText(detail, { x: x + 0.25, y: y + 1.05, w: w - 0.5, h: 0.3, fontFace: FONT, fontSize: 11, color: SLATE });
  };

  // 1. Title
  const title = pptx.addSlide();
  title.background = { color: NAVY };
  title.addImage(fit(trinetLogo, 0.7, 0.6, 2.4, 0.8));
  title.addShape(pptx.ShapeType.rect, { x: 0.7, y: 2.6, w: 0.15, h: 1.9, fill: { color: ORANGE }, line: { color: ORANGE } });
  title.addText("Proposal", { x: 1.1, y: 2.5, w: 8, h: 0.6, fontFace: FONT, fontSize: 20, color: ORANGE, bold: true });
  title.addText(company, { x: 1.1, y: 3.05, w: 8, h: 1.0, fontFace: FONT, fontSize: 44, bold: true, color: "FFFFFF", fit: "shrink" });
  title.addText(
    [q.repName ? `Prepared by ${q.repName}` : "Prepared by TriNet", format(new Date(), "MMMM d, yyyy")].join("  ·  "),
    { x: 1.1, y: 4.05, w: 8, h: 0.4, fontFace: FONT, fontSize: 14, color: "CBD5E1" },
  );
  if (clientLogo) {
    title.addShape(pptx.ShapeType.roundRect, { x: W - 4.2, y: 2.55, w: 3.4, h: 2.0, fill: { color: "FFFFFF" }, line: { color: "FFFFFF" }, rectRadius: 0.15 });
    title.addImage(fit(clientLogo, W - 3.95, 2.8, 2.9, 1.5));
  }
  title.addShape(pptx.ShapeType.rect, { x: 0, y: H - 0.12, w: W, h: 0.12, fill: { color: ORANGE }, line: { color: ORANGE } });

  // 2. Your team today
  const today = content("Your team today");
  statTile(today, 0.5, 1.4, 3.9, "Employees", String(fees.totalWse || "—"), fees.hasPt ? `${fees.ft} full-time · ${fees.pt} part-time` : undefined);
  statTile(today, 4.7, 1.4, 3.9, "Payroll provider", q.incumbentPayroll || "—");
  statTile(today, 8.9, 1.4, 3.9, "Medical carrier", q.incumbentMedicalCarrier || "—",
    q.medicalRenewalDate ? `Renews ${formatDate(q.medicalRenewalDate)}` : undefined);
  today.addText("With TriNet, payroll, benefits, HR and compliance come together in one partner and one simple fee.", {
    x: 0.5, y: 3.5, w: W - 1, h: 0.8, fontFace: FONT, fontSize: 18, color: NAVY,
  });

  // 3. Professional Service Fee
  const fee = content("Your Professional Service Fee");
  fee.addText(fees.hasPt ? "BLENDED PEPM" : "PER EMPLOYEE PER MONTH", { x: 0.5, y: 1.3, w: 6, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: ORANGE, charSpacing: 1 });
  fee.addText(usd(fees.pepm), { x: 0.5, y: 1.7, w: 6, h: 1.2, fontFace: FONT, fontSize: 66, bold: true, color: NAVY });
  if (fees.pepm > 0) {
    fee.addText(`About ${usd(fees.perWorkday)} per employee per workday`, { x: 0.5, y: 2.9, w: 6, h: 0.4, fontFace: FONT, fontSize: 16, color: SLATE });
  }
  statTile(fee, 7.0, 1.3, 2.8, "Monthly fee", fees.monthly > 0 ? usd(fees.monthly, 0) : "—");
  statTile(fee, 10.0, 1.3, 2.8, "Annual fee", fees.annual > 0 ? usd(fees.annual, 0) : "—");
  if (fees.hasPt) {
    fee.addTable(
      [
        [hdr("Employees"), hdr("Count"), hdr("PEPM"), hdr("Monthly")],
        [cell("Full-time"), cell(String(fees.ft)), cell(usd(q.ftPepm || 0)), cell(usd(fees.ftMonthly, 0))],
        [cell("Part-time"), cell(String(fees.pt)), cell(usd(q.ptPepm || 0)), cell(usd(fees.ptMonthly, 0))],
        [cell("Total", true), cell(String(fees.totalWse), true), cell(usd(fees.pepm), true), cell(usd(fees.monthly, 0), true)],
      ],
      { x: 0.5, y: 3.9, w: 7.5, colW: [2.2, 1.5, 1.8, 2.0], fontFace: FONT, border: { type: "solid", pt: 0.5, color: "E2E8F0" } },
    );
  }

  // 4. What's included
  const inc = content("What's included in your fee");
  SERVICE_INCLUSIONS.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.15;
    const y = 1.25 + row * 2.95;
    inc.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.95, h: 2.75, fill: { color: LIGHT }, line: { color: LIGHT }, rectRadius: 0.1 });
    inc.addShape(pptx.ShapeType.rect, { x, y: y + 0.25, w: 0.08, h: 0.45, fill: { color: ORANGE }, line: { color: ORANGE } });
    inc.addText(c.title, { x: x + 0.25, y: y + 0.2, w: 3.6, h: 0.55, fontFace: FONT, fontSize: 15, bold: true, color: NAVY });
    inc.addText(
      c.items.map((t) => ({ text: t, options: { bullet: { code: "2713" }, breakLine: true } })),
      { x: x + 0.25, y: y + 0.8, w: 3.55, h: 1.85, fontFace: FONT, fontSize: 11, color: "334155", valign: "top", paraSpaceAfter: 3 },
    );
  });

  // 5. Growth pricing
  if (breaks.length) {
    const g = content("Price breaks as you grow");
    g.addText("Your PEPM drops as your team reaches each headcount.", { x: 0.5, y: 1.2, w: W - 1, h: 0.5, fontFace: FONT, fontSize: 16, color: SLATE });
    const rows = [[hdr("Headcount"), hdr("PEPM"), hdr("Monthly"), hdr("Annual"), hdr("Savings per employee")]];
    if (fees.totalWse > 0) rows.push([cell(`${fees.totalWse} (today)`), cell(usd(fees.pepm)), cell(usd(fees.monthly, 0)), cell(usd(fees.annual, 0)), cell("—")]);
    breaks.forEach((b) => rows.push([
      cell(`${b.headcount}+`, true), cell(usd(b.pepm), true), cell(usd(b.monthly, 0)), cell(usd(b.annual, 0)),
      cell(b.savingsPerEmployee > 0 ? `${usd(b.savingsPerEmployee)} (${b.savingsPercent.toFixed(1)}%)` : "—"),
    ]));
    g.addTable(rows, { x: 0.5, y: 1.9, w: W - 1, fontFace: FONT, border: { type: "solid", pt: 0.5, color: "E2E8F0" } });
  }

  // 6. Rate protection
  if (cap.length) {
    const r = content("Rate protection");
    r.addText(
      q.rateCap.percent > 0
        ? `Your PEPM can't rise more than ${q.rateCap.percent}% a year for ${cap.length} years.`
        : `Your PEPM is locked for ${cap.length} years.`,
      { x: 0.5, y: 1.3, w: W - 1, h: 0.7, fontFace: FONT, fontSize: 24, bold: true, color: NAVY },
    );
    r.addTable(
      [[hdr("Year"), hdr("Maximum PEPM")], ...cap.map((y) => [cell(y.year === 1 ? "Year 1 (today)" : `Year ${y.year}`), cell(usd(y.maxPepm), true)])],
      { x: 0.5, y: 2.3, w: 6, colW: [3, 3], fontFace: FONT, border: { type: "solid", pt: 0.5, color: "E2E8F0" } },
    );
  }

  // 7. Setup fee
  if (setup.gross > 0) {
    const sf = content("Setup fee");
    statTile(sf, 0.5, 1.3, 3.9, "Setup fee", usd(setup.gross, 0));
    if (setup.discount > 0) statTile(sf, 4.7, 1.3, 3.9, "Discount", `−${usd(setup.discount, 0)}`);
    statTile(sf, setup.discount > 0 ? 8.9 : 4.7, 1.3, 3.9, "You pay", usd(setup.net, 0),
      setup.count > 1 ? `${setup.count} payments of ${usd(setup.schedule[0].amount)}` : "One payment");
    if (setup.count > 1) {
      const perRow = 6;
      const rows: PptxGenJS.TableRow[] = [];
      for (let i = 0; i < setup.schedule.length; i += perRow) {
        const chunk = setup.schedule.slice(i, i + perRow);
        rows.push(chunk.map((p) => hdr(p.date || `Payment ${p.number}`)));
        rows.push(chunk.map((p) => cell(usd(p.amount))));
      }
      sf.addTable(rows, { x: 0.5, y: 3.2, w: W - 1, fontFace: FONT, border: { type: "solid", pt: 0.5, color: "E2E8F0" } });
    }
    if (q.setupFee.notes) {
      sf.addText(q.setupFee.notes, { x: 0.5, y: H - 1.3, w: W - 1, h: 0.5, fontFace: FONT, fontSize: 12, italic: true, color: SLATE });
    }
  }

  // 8. Next steps
  const next = content("Next steps");
  next.addText(
    [
      "Review this proposal and confirm your employee counts",
      "Sign the TriNet Service Agreement",
      "Submit complete paperwork by the deadline for your target live date",
      "Kick off implementation with your TriNet onboarding team",
    ].map((t, i) => ({ text: t, options: { bullet: { type: "number" as const, numberStartAt: 1 }, breakLine: i < 3 } })),
    { x: 0.5, y: 1.4, w: W - 1, h: 3.5, fontFace: FONT, fontSize: 22, color: NAVY, paraSpaceAfter: 14, valign: "top" },
  );

  return pptx;
}

function hdr(text: string): PptxGenJS.TableCell {
  return { text, options: { bold: true, color: "FFFFFF", fill: { color: NAVY }, fontSize: 12, margin: 0.08 } };
}

function cell(text: string, bold = false): PptxGenJS.TableCell {
  return { text, options: { bold, color: NAVY, fontSize: 12, margin: 0.08 } };
}
