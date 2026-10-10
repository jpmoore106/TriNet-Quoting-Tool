import type React from "react";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, FileUp, ImageUp, Mic, Sparkles } from "lucide-react";
import { Section, primaryButton, secondaryButton } from "./form";
import { useQuote } from "../state/QuoteContext";
import { CURRENT_LINES } from "../state/benefits";
import type { BssResult } from "../lib/bss/parseBss";
import { chevronGaps, type ChevronData } from "../lib/chevron/parseChevron";
import { chevronChanges } from "../lib/chevron/importChevron";
import { formatDate, usd } from "../lib/pricing";
import { analyzeCall, transcriptMeta, type TranscriptMeta } from "../lib/callInsights";

const MAX_LOGO_BYTES = 1024 * 1024;

// Setup's document uploads: the BSS and Chevron proposal fill in the quote; reps can adjust everything afterwards.
export default function DocumentUploads() {
  const bss = useBssImport();
  const chevron = useChevronImport();
  return (
    <Section title="Documents"
      description="Upload the prospect's documents to fill in the quote; you can adjust anything afterwards. PDFs and logos are read in your browser and never uploaded. Call transcripts are sent to Claude (Anthropic's AI) for analysis."
      className="lg:col-span-2">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <BssTile state={bss} />
        <ChevronTile state={chevron} />
        <GongTile />
        <LogoTile />
      </div>
      {bss.state.step === "preview" && (
        <ImportPreview result={bss.state.result} onApply={bss.apply} onCancel={bss.cancel} />
      )}
      {chevron.state.step === "preview" && (
        <ChevronPreview data={chevron.state.data} onApply={chevron.apply} onCancel={chevron.cancel} />
      )}
    </Section>
  );
}

function Tile({ icon: Icon, title, status, children, testId }: {
  icon: typeof FileUp; title: string; status: React.ReactNode; children?: React.ReactNode; testId?: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-tngray-light p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas text-navy"><Icon className="h-5 w-5" aria-hidden /></span>
        <h4 className="font-bold text-navy">{title}</h4>
      </div>
      <div className="mt-2 flex-1 text-sm text-tngray-dark" data-testid={testId}>{status}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

type ImportState =
  | { step: "idle" }
  | { step: "reading"; fileName: string }
  | { step: "preview"; fileName: string; result: BssResult }
  | { step: "error"; message: string };

// Import a TriNet Benefit Strategy Summary (BSS) PDF. The file is read in the browser and never uploaded.
function useBssImport() {
  const { quote, update } = useQuote();
  const [state, setState] = useState<ImportState>({ step: "idle" });

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return setState({ step: "error", message: "Please choose the BSS PDF." });
    setState({ step: "reading", fileName: file.name });
    try {
      const { readBssFile } = await import("../lib/bss/importBss");
      setState({ step: "preview", fileName: file.name, result: await readBssFile(file) });
    } catch (e) {
      setState({ step: "error", message: e instanceof Error ? e.message : "Couldn't read that PDF." });
    }
  }

  async function apply() {
    if (state.step !== "preview") return;
    const { result, fileName } = state;
    const { applyBss } = await import("../lib/bss/importBss");
    const noWse = !quote.ftWse && !quote.ptWse;
    update({
      benefits: applyBss(quote.benefits, result, fileName),
      companyName: quote.companyName || result.companyName,
      ...(noWse && result.employeeCount ? { ftWse: result.employeeCount } : {}),
    });
    setState({ step: "idle" });
  }

  return { state, onFile, apply, cancel: () => setState({ step: "idle" }) };
}

function BssTile({ state: { state, onFile } }: { state: ReturnType<typeof useBssImport> }) {
  const { quote } = useQuote();
  const src = quote.benefits.source;

  return (
    <Tile icon={FileUp} title="Benefit Strategy Summary" testId="import-status"
      status={
        state.step === "reading" ? `Reading ${state.fileName}…`
        : state.step === "error" ? <span role="alert" className="flex items-start gap-1.5 text-alert"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{state.message}</span>
        : src ? <span className="flex items-start gap-1.5 text-navy"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-dark" aria-hidden />Imported {src.fileName}{src.proposalNumber ? ` (${src.proposalNumber})` : ""} on {new Date(src.importedAt).toLocaleDateString()}.</span>
        : "The BSS PDF fills in benefits plans, rates, enrollment, funding, current costs and the employee census."
      }>
      <label className={`${primaryButton} cursor-pointer`}>
        <FileUp className="h-4 w-4" aria-hidden /> {src ? "Replace BSS" : "Upload BSS PDF"}
        <input id="bss-upload" type="file" accept="application/pdf,.pdf" className="sr-only"
          onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
    </Tile>
  );
}

type ChevronState =
  | { step: "idle" }
  | { step: "reading"; fileName: string }
  | { step: "preview"; data: ChevronData }
  | { step: "error"; message: string };

// Import a TriNet Chevron proposal PDF: pricing, rep details, pay dates, cost summary, tax and workers' comp rates.
function useChevronImport() {
  const { quote, update } = useQuote();
  const [state, setState] = useState<ChevronState>({ step: "idle" });
  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return setState({ step: "error", message: "Please choose the Chevron proposal PDF." });
    setState({ step: "reading", fileName: file.name });
    try {
      const { readChevronFile } = await import("../lib/chevron/importChevron");
      setState({ step: "preview", data: await readChevronFile(file) });
    } catch (e) {
      setState({ step: "error", message: e instanceof Error ? e.message : "Couldn't read that PDF." });
    }
  }
  async function apply() {
    if (state.step !== "preview") return;
    update(chevronChanges(quote, state.data));
    setState({ step: "idle" });
  }
  return { state, onFile, apply, cancel: () => setState({ step: "idle" }) };
}

function ChevronTile({ state: { state, onFile } }: { state: ReturnType<typeof useChevronImport> }) {
  const { quote } = useQuote();
  const c = quote.chevron;
  return (
    <Tile icon={FileText} title="Chevron Proposal" testId="chevron-status"
      status={
        state.step === "reading" ? `Reading ${state.fileName}…`
        : state.step === "error" ? <span role="alert" className="flex items-start gap-1.5 text-alert"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{state.message}</span>
        : c ? (
          <>
            <span className="flex items-start gap-1.5 text-navy"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-dark" aria-hidden />Imported {c.fileName}{c.quoteNumber ? ` (${c.quoteNumber})` : ""}{c.validUntil ? `, valid until ${formatDate(c.validUntil)}` : ""}.</span>
            {chevronGaps(c).length > 0 && (
              <span className="mt-1 flex items-start gap-1.5 text-alert" data-testid="chevron-gaps-status">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />Not in this file: {chevronGaps(c).join(", ")}.
              </span>
            )}
          </>
        )
        : "The proposal PDF fills in the company, rep, service fee, implementation fee, pay dates, taxes and workers' comp."
      }>
      <label className={`${primaryButton} cursor-pointer`}>
        <FileUp className="h-4 w-4" aria-hidden /> {c ? "Replace proposal" : "Upload proposal PDF"}
        <input id="chevron-upload" type="file" accept="application/pdf,.pdf" className="sr-only"
          onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
    </Tile>
  );
}

// Warn when the proposal is missing the payroll pages, e.g. a "preview" export.
export function GapsNote({ data }: { data: ChevronData }) {
  const gaps = chevronGaps(data);
  if (!gaps.length) return null;
  return (
    <p role="alert" data-testid="chevron-gaps" className="mt-3 flex items-start gap-2 rounded-lg bg-alert/5 px-3 py-2 text-sm font-semibold text-alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      This proposal doesn't include {gaps.join(", ")}. Preview copies of the proposal often leave out those pages: export the full
      proposal from Chevron (with the cost summary, tax and workers' comp pages) and upload that instead.
    </p>
  );
}

function ChevronPreview({ data: c, onApply, onCancel }: { data: ChevronData; onApply: () => void; onCancel: () => void }) {
  const { quote } = useQuote();
  const changes = chevronChanges(quote, c);
  const rows: [string, string, string][] = [];
  const add = (label: string, before: string, after: string | undefined) => { if (after !== undefined && after !== before) rows.push([label, before || "—", after]); };
  {
    add("Company name", quote.companyName, changes.companyName);
    add("Prepared by", quote.repName, changes.repName);
    add("FT WSE", String(quote.ftWse || ""), changes.ftWse?.toString());
    add("FT PEPM", quote.ftPepm ? usd(quote.ftPepm) : "", changes.ftPepm !== undefined ? usd(changes.ftPepm) : undefined);
    add("PT WSE", String(quote.ptWse || ""), changes.ptWse?.toString());
    add("PT PEPM", quote.ptPepm ? usd(quote.ptPepm) : "", changes.ptPepm !== undefined ? usd(changes.ptPepm) : undefined);
    add("Monthly minimum fee", quote.serviceFeeMinimum ? usd(quote.serviceFeeMinimum) : "", changes.serviceFeeMinimum !== undefined ? usd(changes.serviceFeeMinimum) : undefined);
    if (changes.setupFee) add("Setup fee", quote.setupFee.amount ? `${usd(quote.setupFee.amount)} − ${usd(quote.setupFee.discount)}` : "", `${usd(changes.setupFee.amount)} − ${usd(changes.setupFee.discount)} discount`);
  }
  const ft = c.serviceFees.find((f) => f.kind === "ft");
  return (
    <div className="rounded-xl border border-tngray-light bg-canvas p-4" data-testid="chevron-preview">
      <p className="font-bold text-navy">Found in this proposal</p>
      <p className="text-sm text-tngray-dark">
        {[c.quoteNumber, c.companyName, c.validUntil && `Valid until ${formatDate(c.validUntil)}`, c.payroll.frequency && `${c.payroll.frequency} payroll`, c.payroll.firstCheck && `First TriNet check ${formatDate(c.payroll.firstCheck)}`].filter(Boolean).join(" · ")}
      </p>
      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-navy">
        {ft && <li><span className="font-semibold">Service fee:</span> {usd(ft.price)} PEPM ({usd(ft.listPrice)} list, {ft.discountPct}% discount) × {ft.quantity} FT</li>}
        {c.implementation && <li><span className="font-semibold">Implementation:</span> {usd(c.implementation.price)} ({usd(c.implementation.listPrice)} list, {c.implementation.discountPct}% discount)</li>}
        <li><span className="font-semibold">Annual gross wages:</span> {usd(c.annual.grossWages, 0)} · <span className="font-semibold">payroll taxes</span> {usd(c.annual.payrollTaxes, 0)}</li>
        <li><span className="font-semibold">Tax & WC rates:</span> {c.taxes.map((t) => `${t.state} (class ${t.classCode})`).join(", ") || "none"}</li>
      </ul>
      <GapsNote data={c} />
      {rows.length > 0 && (
        <table className="mt-3 w-full max-w-2xl text-sm" data-testid="chevron-changes">
          <thead><tr className="text-left text-tngray-dark"><th className="py-1 pr-3 font-semibold">Setup field</th><th className="py-1 pr-3 font-semibold">Now</th><th className="py-1 font-semibold">From proposal</th></tr></thead>
          <tbody>{rows.map(([l, b, a]) => <tr key={l} className="border-t border-tngray-light"><td className="py-1 pr-3">{l}</td><td className="py-1 pr-3 text-tngray-dark">{b}</td><td className="py-1 font-semibold text-navy">{a}</td></tr>)}</tbody>
        </table>
      )}
      <p className="mt-3 text-xs text-tngray-dark">Applying updates the fields above and adds the proposal's pay dates, cost summary, tax and workers' comp rates to the quote. You can edit everything afterwards.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className={primaryButton} onClick={onApply}>Apply to quote</button>
        <button type="button" className={secondaryButton} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

type GongState =
  | { step: "idle" }
  | { step: "ready"; fileName: string; text: string; meta: TranscriptMeta }
  | { step: "analyzing"; fileName: string; meta: TranscriptMeta }
  | { step: "error"; message: string; retry?: { fileName: string; text: string; meta: TranscriptMeta } };

const MAX_TRANSCRIPT_BYTES = 2 * 1024 * 1024;

// A Gong (or other) call transcript, analyzed by AI into talking points for the executive summary and deck.
function GongTile() {
  const { quote, update } = useQuote();
  const [state, setState] = useState<GongState>({ step: "idle" });
  const ins = quote.callInsights;

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(txt|vtt|srt)$/i.test(file.name) && !file.type.startsWith("text/")) return setState({ step: "error", message: "Please choose the transcript as a .txt file (Gong: Download transcript)." });
    if (file.size > MAX_TRANSCRIPT_BYTES) return setState({ step: "error", message: "That transcript is larger than 2 MB." });
    const text = await file.text();
    setState({ step: "ready", fileName: file.name, text, meta: transcriptMeta(text) });
  }

  async function analyze(s: { fileName: string; text: string; meta: TranscriptMeta }) {
    setState({ step: "analyzing", fileName: s.fileName, meta: s.meta });
    try {
      const insights = await analyzeCall(s.text, s.meta, s.fileName, quote.companyName);
      update({ callInsights: insights });
      setState({ step: "idle" });
    } catch (e) {
      setState({ step: "error", message: e instanceof Error ? e.message : "Couldn't analyze the call.", retry: s });
    }
  }

  return (
    <Tile icon={Mic} title="Call transcript (Gong)" testId="gong-status"
      status={
        state.step === "ready" ? (
          <span className="text-navy">
            <span className="font-semibold">{state.meta.title || state.fileName}</span>
            {state.meta.recordedOn && <span className="block">{state.meta.recordedOn}{state.meta.duration ? ` · ${state.meta.duration}` : ""}</span>}
            {state.meta.speakers.length > 0 && <span className="block">{state.meta.speakers.length} speakers</span>}
          </span>
        )
        : state.step === "analyzing" ? <span role="status" className="text-navy">Analyzing {state.meta.title || state.fileName} with AI. This takes about a minute…</span>
        : state.step === "error" ? <span role="alert" className="flex items-start gap-1.5 text-alert"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{state.message}</span>
        : ins ? <span className="flex items-start gap-1.5 text-navy"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-dark" aria-hidden />Analyzed {ins.source.title || ins.source.fileName} on {new Date(ins.source.analyzedAt).toLocaleDateString()}. Review it under Call insights.</span>
        : "AI turns a call transcript into priorities, pain points and next steps for the executive summary and deck."
      }>
      {state.step === "ready" ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={primaryButton} onClick={() => analyze(state)} data-testid="gong-analyze">
            <Sparkles className="h-4 w-4" aria-hidden /> Analyze with AI
          </button>
          <button type="button" className="text-sm text-navy underline" onClick={() => setState({ step: "idle" })}>Cancel</button>
        </div>
      ) : state.step === "error" && state.retry ? (
        <button type="button" className={primaryButton} onClick={() => analyze(state.retry!)}>
          <Sparkles className="h-4 w-4" aria-hidden /> Try again
        </button>
      ) : (
        <label className={`${primaryButton} cursor-pointer ${state.step === "analyzing" ? "pointer-events-none opacity-60" : ""}`}>
          <FileUp className="h-4 w-4" aria-hidden /> {ins ? "Analyze another call" : "Upload transcript"}
          <input id="gong-upload" type="file" accept=".txt,.vtt,.srt,text/plain" className="sr-only" disabled={state.step === "analyzing"}
            onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      )}
    </Tile>
  );
}

function LogoTile() {
  const { quote, update } = useQuote();
  const [error, setError] = useState("");
  function onLogo(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file (PNG, JPG, SVG, etc.).");
    if (file.size > MAX_LOGO_BYTES) return setError("Logo must be 1 MB or smaller.");
    const reader = new FileReader();
    reader.onload = () => update({ companyLogo: reader.result as string });
    reader.readAsDataURL(file);
  }
  return (
    <Tile icon={ImageUp} title="Company logo"
      status={error ? <span className="text-alert">{error}</span>
        : quote.companyLogo ? <img src={quote.companyLogo} alt="Client logo" className="h-12 max-w-[180px] object-contain" />
        : "Shown in the header, the executive summary and the proposal deck."}>
      <div className="flex items-center gap-3">
        <label className={`${secondaryButton} cursor-pointer`}>
          <ImageUp className="h-4 w-4" aria-hidden /> {quote.companyLogo ? "Replace logo" : "Upload logo"}
          <input id="logo" type="file" accept="image/*" className="sr-only"
            onChange={(e) => { onLogo(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {quote.companyLogo && (
          <button type="button" className="text-sm text-alert underline" onClick={() => update({ companyLogo: null })}>Remove</button>
        )}
      </div>
    </Tile>
  );
}

function ImportPreview({ result: r, onApply, onCancel }: { result: BssResult; onApply: () => void; onCancel: () => void }) {
  const lines = (["medical", "dental", "vision"] as const).map((k) => {
    const l = r.lines[k];
    const enrolled = l.plans.reduce((a, p) => a + p.enrollment.ee + p.enrollment.es + p.enrollment.ec + p.enrollment.ef, 0);
    return { k, label: k[0].toUpperCase() + k.slice(1), plans: l.plans.length, enrolled, funding: l.funding };
  });
  const risk = r.risk.filter((c) => c.enabled);
  const currentTotal = CURRENT_LINES.reduce((a, k) => a + r.current[k].employer + r.current[k].employee, 0);
  return (
    <div className="mt-5 rounded-xl border border-tngray-light bg-canvas p-4" data-testid="import-preview">
      <p className="font-bold text-navy">Found in this BSS</p>
      <p className="text-sm text-tngray-dark">
        {[r.proposalNumber && `Proposal ${r.proposalNumber}`, r.strategy, r.primaryCarrier, r.planYear && `Plan year ${r.planYear}`, r.states && `States: ${r.states}`].filter(Boolean).join(" · ")}
      </p>
      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-navy">
        {lines.map((l) => (
          <li key={l.k}>
            <span className="font-semibold">{l.label}:</span> {l.plans} plan{l.plans === 1 ? "" : "s"}, {l.enrolled} enrolled
            {l.funding && `, ${l.funding.type === "percent" ? `${l.funding.pct.ee}% employer-paid (EE)` : "flat $ funding"}`}
          </li>
        ))}
        <li><span className="font-semibold">Disability & life:</span> {risk.length ? risk.map((c) => c.benefit).join(", ") : "none"}</li>
        <li><span className="font-semibold">Current monthly cost:</span> {usd(currentTotal)}{r.lines.medical.currentPlans.length ? ` (${r.lines.medical.currentPlans.length} current medical plans)` : ""}</li>
      </ul>
      <ul className="mt-3 space-y-1 text-sm">
        {r.checks.map((c) => (
          <li key={c.label} className={`flex items-center gap-2 ${c.ok ? "text-navy" : "text-alert"}`}>
            {c.ok ? <CheckCircle2 className="h-4 w-4 text-orange-dark" aria-hidden /> : <AlertTriangle className="h-4 w-4" aria-hidden />}
            {c.label}: {usd(c.actual)} {c.ok ? "matches the report" : `vs. ${usd(c.expected)} in the report`}
          </li>
        ))}
        {r.warnings.map((w) => (
          <li key={w} className="flex items-center gap-2 text-tngray-dark"><AlertTriangle className="h-4 w-4" aria-hidden />{w}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-tngray-dark">Applying replaces medical, dental, vision, disability/life, current costs and the employee census, and fills in the company name, WSE count and benefits start date if they're empty. Voluntary and 401(k) are kept. The census stays in this browser.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className={primaryButton} onClick={onApply}>Apply to quote</button>
        <button type="button" className={secondaryButton} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
