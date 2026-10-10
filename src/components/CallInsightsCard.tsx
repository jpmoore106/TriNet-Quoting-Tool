import type React from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Section, inputClass, labelClass, secondaryButton } from "./form";
import { useQuote } from "../state/QuoteContext";
import type { CallInsights, InsightItem } from "../lib/callInsights";

const textarea = `${inputClass} text-sm leading-snug`;

// Review and edit the AI's call insights before they go into the executive summary and the proposal deck.
export default function CallInsightsCard() {
  const { quote, update } = useQuote();
  const ins = quote.callInsights;
  if (!ins) return null;
  const set = (changes: Partial<CallInsights>) => update({ callInsights: { ...ins, ...changes } });
  const setDeck = (changes: Partial<CallInsights["deck"]>) => set({ deck: { ...ins.deck, ...changes } });

  return (
    <Section title="Call insights"
      description={`AI analysis of ${ins.source.title || ins.source.fileName}${ins.source.recordedOn ? ` (${ins.source.recordedOn})` : ""}. Check and edit before sharing: it feeds the executive summary and the proposal deck.`}
      className="lg:col-span-2">
      <div data-testid="call-insights" className="space-y-6">
        <div>
          <label htmlFor="ins-summary" className={labelClass}>Where they are today (executive summary)</label>
          <textarea id="ins-summary" rows={4} className={textarea} value={ins.summary} onChange={(e) => set({ summary: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ItemList label="Priorities" testId="ins-priorities" items={ins.priorities} onChange={(priorities) => set({ priorities })} />
          <ItemList label="Pain points" testId="ins-pains" items={ins.pain_points}
            onChange={(items) => set({ pain_points: items.map((x) => ({ quote: "", ...x })) })}
            extra={(x, i) => {
              const quoteText = (x as InsightItem & { quote?: string }).quote;
              return quoteText ? <p className="mt-1 text-xs italic text-tngray-dark" key={i}>"{quoteText}"</p> : null;
            }} />
          <ItemList label="Requirements" testId="ins-reqs" items={ins.requirements} onChange={(requirements) => set({ requirements })} />
          <ItemList label="Open questions and concerns (internal)" testId="ins-concerns" items={ins.concerns} onChange={(concerns) => set({ concerns })} />
        </div>

        <div>
          <p className={labelClass}>Next steps</p>
          <div className="space-y-2">
            {ins.next_steps.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_200px_auto] gap-2">
                <input aria-label={`Next step ${i + 1}`} className={`${inputClass} py-1.5 text-sm`} value={s.action}
                  onChange={(e) => set({ next_steps: ins.next_steps.map((x, j) => (j === i ? { ...x, action: e.target.value } : x)) })} />
                <input aria-label={`Next step ${i + 1} owner`} placeholder="Owner" className={`${inputClass} py-1.5 text-sm`} value={s.owner}
                  onChange={(e) => set({ next_steps: ins.next_steps.map((x, j) => (j === i ? { ...x, owner: e.target.value } : x)) })} />
                <RemoveButton label={`Remove next step ${i + 1}`} onClick={() => set({ next_steps: ins.next_steps.filter((_, j) => j !== i) })} />
              </div>
            ))}
          </div>
          <AddButton label="Add next step" onClick={() => set({ next_steps: [...ins.next_steps, { action: "", owner: "" }] })} />
        </div>

        {ins.stakeholders.length > 0 && (
          <div>
            <p className={labelClass}>Their stakeholders</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {ins.stakeholders.map((s) => (
                <li key={s.name} className="rounded-lg bg-canvas px-3 py-2">
                  <span className="font-semibold text-navy">{s.name}</span>{s.title && <span className="text-tngray-dark">, {s.title}</span>}
                  <span className="block text-tngray-dark">{s.focus}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl bg-canvas p-4 space-y-4">
          <p className="flex items-center gap-2 font-bold text-navy"><Sparkles className="h-4 w-4 text-orange-dark" aria-hidden /> Proposal deck wording</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StringList label={`"We hear you" (slide 10, 4 lines)`} testId="ins-hear" items={ins.deck.we_hear_you} max={4} onChange={(we_hear_you) => setDeck({ we_hear_you })} />
            <StringList label="Current state (slide 11, 6 boxes)" testId="ins-current" items={ins.deck.current_state} max={6} onChange={(current_state) => setDeck({ current_state })} />
          </div>
          <div>
            <label htmlFor="ins-themes" className={labelClass}>Themes (slide 14 subtitle)</label>
            <input id="ins-themes" className={`${inputClass} text-sm`} value={ins.deck.themes} onChange={(e) => setDeck({ themes: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <StringList label="For employees (slide 14)" testId="ins-emp" items={ins.deck.employee_benefits} max={5} onChange={(employee_benefits) => setDeck({ employee_benefits })} />
            <StringList label="For the company (slide 14)" testId="ins-co" items={ins.deck.company_benefits} max={5} onChange={(company_benefits) => setDeck({ company_benefits })} />
            <StringList label="Financial (slide 14)" testId="ins-fin" items={ins.deck.financial_benefits} max={6} onChange={(financial_benefits) => setDeck({ financial_benefits })} />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" className="text-sm text-alert underline"
            onClick={() => { if (window.confirm("Remove the call insights from this quote?")) update({ callInsights: null }); }}>
            Remove call insights
          </button>
        </div>
      </div>
    </Section>
  );
}

function ItemList({ label, items, onChange, testId, extra }: {
  label: string; items: InsightItem[]; onChange: (items: InsightItem[]) => void; testId: string;
  extra?: (item: InsightItem, i: number) => React.ReactNode;
}) {
  return (
    <div data-testid={testId}>
      <p className={labelClass}>{label}</p>
      <div className="space-y-3">
        {items.map((x, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
            <div className="space-y-1">
              <input aria-label={`${label} ${i + 1} title`} className={`${inputClass} py-1.5 text-sm font-semibold`} value={x.title}
                onChange={(e) => onChange(items.map((y, j) => (j === i ? { ...y, title: e.target.value } : y)))} />
              <textarea aria-label={`${label} ${i + 1} detail`} rows={2} className={textarea} value={x.detail}
                onChange={(e) => onChange(items.map((y, j) => (j === i ? { ...y, detail: e.target.value } : y)))} />
              {extra?.(x, i)}
            </div>
            <RemoveButton label={`Remove ${label} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))} />
          </div>
        ))}
      </div>
      <AddButton label="Add item" onClick={() => onChange([...items, { title: "", detail: "" }])} />
    </div>
  );
}

function StringList({ label, items, onChange, max, testId }: {
  label: string; items: string[]; onChange: (items: string[]) => void; max: number; testId: string;
}) {
  return (
    <div data-testid={testId}>
      <p className={labelClass}>{label}</p>
      <div className="space-y-2">
        {items.map((x, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
            <input aria-label={`${label} ${i + 1}`} className={`${inputClass} py-1.5 text-sm`} value={x}
              onChange={(e) => onChange(items.map((y, j) => (j === i ? e.target.value : y)))} />
            <RemoveButton label={`Remove ${label} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))} />
          </div>
        ))}
      </div>
      {items.length < max && <AddButton label="Add line" onClick={() => onChange([...items, ""])} />}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={`${secondaryButton} mt-2 py-1 text-xs`} onClick={onClick}>
      <Plus className="h-3.5 w-3.5" aria-hidden /> {label}
    </button>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick}
      className="h-8 w-8 flex items-center justify-center rounded-lg text-tngray-dark hover:bg-alert/5 hover:text-alert">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
