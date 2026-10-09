import type React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Presentation, LineChart, AlertTriangle, Download, Printer } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import PageTitle from "../components/PageTitle";
import { useQuote } from "../state/QuoteContext";
import { feeSummary } from "../lib/pricing";

export default function Outputs() {
  const { quote } = useQuote();
  const fees = feeSummary(quote);
  const [deckState, setDeckState] = useState<"idle" | "working" | "error">("idle");

  const missing = [
    !quote.companyName && "company name",
    fees.totalWse === 0 && "WSE counts",
    fees.pepm === 0 && "PEPM rate",
  ].filter(Boolean) as string[];

  async function downloadDeck() {
    setDeckState("working");
    try {
      const { buildProposalDeck, deckFileName } = await import("../lib/proposalDeck");
      const pptx = await buildProposalDeck(quote);
      await pptx.writeFile({ fileName: deckFileName(quote) });
      setDeckState("idle");
    } catch (e) {
      console.error(e);
      setDeckState("error");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageTitle title="Outputs" subtitle="Generate client-ready documents from the quote details." />

      {missing.length > 0 && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-xl bg-white p-4 text-sm text-[#0B0134]">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[#FD5000]" aria-hidden />
          <p>
            Missing {missing.join(", ")}. Outputs will show blanks until you add {missing.length > 1 ? "them" : "it"} on
            the <Link to="/" className="underline text-[#FD5000]">Setup page</Link>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <OutputCard icon={FileText} title="Executive summary"
          description="A one-page overview of the proposal: the team, the fee, growth pricing, rate protection and setup fee. Print it or save it as a PDF.">
          <Link to="/outputs/executive-summary"
            className="inline-flex items-center gap-2 rounded-lg bg-[#FD5000] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            <Printer className="h-4 w-4" /> Open executive summary
          </Link>
        </OutputCard>

        <OutputCard icon={Presentation} title="Proposal deck"
          description="A branded PowerPoint built from the quote, with the client's logo, fees, what's included, price breaks, rate cap, setup fee and next steps. Edit it further in PowerPoint or Google Slides.">
          <button type="button" onClick={downloadDeck} disabled={deckState === "working"}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FD5000] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            <Download className="h-4 w-4" /> {deckState === "working" ? "Building deck…" : "Download PowerPoint"}
          </button>
          {deckState === "error" && <p className="mt-2 text-sm text-red-600">Couldn't build the deck. Please try again.</p>}
        </OutputCard>

        <OutputCard icon={LineChart} title="vROI output"
          description="The value and return on investment of moving to TriNet. Available once the vROI calculator is built.">
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">Coming soon</span>
        </OutputCard>
      </div>
    </div>
  );
}

function OutputCard({ icon: Icon, title, description, children }: {
  icon: typeof FileText; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <Card className="shadow-sm border-slate-800 flex flex-col">
      <CardContent className="p-6 flex flex-col flex-1">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FD5000]/10 text-[#FD5000]">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <h3 className="mt-4 text-lg font-semibold text-[#0B0134]">{title}</h3>
        <p className="mt-1 text-sm text-slate-600 flex-1">{description}</p>
        <div className="mt-5">{children}</div>
      </CardContent>
    </Card>
  );
}
