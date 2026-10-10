import { supabase } from "./cloud/supabase";

// AI-generated insights from a sales call transcript (e.g. a Gong export), editable by the rep.
// Shape matches supabase/functions/analyze-call (snake_case from the model; kept as-is).
export type InsightItem = { title: string; detail: string };
export type CallInsights = {
  source: { fileName: string; title: string; recordedOn: string; duration: string; analyzedAt: string; model: string };
  summary: string;
  priorities: InsightItem[];
  pain_points: (InsightItem & { quote: string })[];
  requirements: InsightItem[];
  concerns: InsightItem[];
  next_steps: { action: string; owner: string }[];
  stakeholders: { name: string; title: string; focus: string }[];
  topics: string[];
  deck: {
    we_hear_you: string[];
    current_state: string[];
    themes: string;
    employee_benefits: string[];
    company_benefits: string[];
    financial_benefits: string[];
  };
};

export type TranscriptMeta = { title: string; recordedOn: string; duration: string; speakers: string[] };

// Gong's text export: title on the first line, "Recorded on <date> via <tool>, <duration>", then "m:ss | Speaker"
// lines. Other plain-text transcripts still work; this only feeds the preview.
export function transcriptMeta(text: string): TranscriptMeta {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const title = lines.find((l) => l) ?? "";
  const rec = text.match(/Recorded on (.+?) via [^,\n]+,\s*([\dhm ]+)/);
  const speakers = [...new Set([...text.matchAll(/^\d{1,2}:\d{2}(?::\d{2})? \| (.+)$/gm)].map((m) => m[1].trim()))];
  return { title, recordedOn: rec?.[1]?.trim() ?? "", duration: rec?.[2]?.trim() ?? "", speakers };
}

// Sends the transcript to the analyze-call Edge Function (Claude), which only answers signed-in TriNet users.
export async function analyzeCall(transcript: string, meta: TranscriptMeta, fileName: string, companyName: string): Promise<CallInsights> {
  const { data, error } = await supabase.functions.invoke("analyze-call", {
    body: { transcript, title: meta.title, companyName },
  });
  if (error) {
    // The function returns { error } with a status; surface its message when there is one.
    let message = "Couldn't analyze the call. Please try again.";
    const ctx = (error as { context?: Response }).context;
    if (ctx && ctx.status === 404) {
      message = "AI analysis isn't set up yet: the analyze-call function hasn't been deployed to Supabase.";
    } else if (ctx && typeof ctx.json === "function") {
      try { message = (await ctx.json()).error ?? message; } catch { /* not JSON */ }
    } else if (/Failed to send|fetch/i.test(error.message)) {
      message = "Couldn't reach the AI service. If this is the first time, the analyze-call function may not be deployed yet.";
    }
    throw new Error(message);
  }
  const i = data.insights as Omit<CallInsights, "source">;
  return {
    ...i,
    source: { fileName, title: meta.title, recordedOn: meta.recordedOn, duration: meta.duration, analyzedAt: new Date().toISOString(), model: data.model ?? "" },
  };
}

// Master-deck technology and service slides for the topics the prospect cared about.
export const TOPIC_SLIDES: Record<string, number[]> = {
  payroll: [26],
  benefits: [56],
  risk_compliance: [27],
  workers_comp: [28],
  hr_expertise: [49],
  technology_platform: [29],
  mobile: [31],
  integrations: [32, 33],
  reporting_analytics: [34],
  time_attendance: [36],
  applicant_tracking: [37],
  expense_management: [38],
  performance_management: [39],
  learning: [40],
  global_workforce: [41],
  contractor_payments: [43],
  open_market_benefits: [63],
};
