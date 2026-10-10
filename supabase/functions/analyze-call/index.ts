// Supabase Edge Function: analyze a sales call transcript (e.g. a Gong export) with Claude and return structured
// call insights for the quote's executive summary and proposal deck.
// Secrets: ANTHROPIC_API_KEY (Edge Functions -> Secrets). Only signed-in TriNet users (with a profile) may call it.
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";

const MAX_TRANSCRIPT_CHARS = 400_000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// TriNet capabilities the deck has slides for; the model tags which ones the prospect cares about.
const TOPICS = [
  "payroll", "benefits", "risk_compliance", "workers_comp", "hr_expertise", "technology_platform", "mobile",
  "integrations", "reporting_analytics", "time_attendance", "applicant_tracking", "expense_management",
  "performance_management", "learning", "global_workforce", "contractor_payments", "open_market_benefits",
] as const;

const item = (description: string) => ({
  type: "object",
  description,
  properties: {
    title: { type: "string", description: "A short heading, 3-8 words." },
    detail: { type: "string", description: "One or two sentences grounded in what was said on the call." },
  },
  required: ["title", "detail"],
  additionalProperties: false,
});

const SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "Client-facing 'Where you are today' paragraph for the executive summary, 3-5 sentences, written to the prospect " +
        "(\"you\"). Who they are, how they operate, what they're trying to achieve and why it matters now.",
    },
    priorities: { type: "array", description: "3-5 business goals the prospect wants to achieve.", items: item("A goal or priority.") },
    pain_points: {
      type: "array",
      description: "3-6 current challenges or gaps, in the prospect's terms.",
      items: {
        ...item("A challenge."),
        properties: {
          ...item("").properties,
          quote: { type: "string", description: "A short verbatim quote from the prospect supporting it, or an empty string." },
        },
        required: ["title", "detail", "quote"],
      },
    },
    requirements: { type: "array", description: "Specific capabilities or integrations they need (systems named on the call).", items: item("A requirement.") },
    concerns: { type: "array", description: "Open questions, gaps or objections that still need an answer. Internal; not client-facing.", items: item("A concern.") },
    next_steps: {
      type: "array",
      description: "Agreed or implied next steps.",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          owner: { type: "string", description: "Person or team responsible, or an empty string if unclear." },
        },
        required: ["action", "owner"],
        additionalProperties: false,
      },
    },
    stakeholders: {
      type: "array",
      description: "Prospect-side participants only (not TriNet).",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          title: { type: "string", description: "Job title if stated, else an empty string." },
          focus: { type: "string", description: "What they care about, from the call." },
        },
        required: ["name", "title", "focus"],
        additionalProperties: false,
      },
    },
    topics: { type: "array", description: "TriNet capabilities the prospect showed interest in.", items: { type: "string", enum: TOPICS } },
    deck: {
      type: "object",
      description: "Wording for proposal deck slides. Short, punchy, no trailing periods unless a full sentence.",
      properties: {
        we_hear_you: { type: "array", description: "Exactly 4 statements of what the prospect wants from a partner, each under 90 characters.", items: { type: "string" } },
        current_state: { type: "array", description: "Exactly 6 short current-state challenge labels, each under 55 characters.", items: { type: "string" } },
        themes: { type: "string", description: "One line naming the 2-4 themes of the deal, e.g. 'Integration, Time & Labor, Scalability'." },
        employee_benefits: { type: "array", description: "4-5 ways TriNet helps their employees, tied to the call, each under 80 characters.", items: { type: "string" } },
        company_benefits: { type: "array", description: "4-5 ways TriNet helps the company, tied to the call, each under 90 characters.", items: { type: "string" } },
        financial_benefits: { type: "array", description: "4-6 financial benefits, tied to the call, each under 80 characters.", items: { type: "string" } },
      },
      required: ["we_hear_you", "current_state", "themes", "employee_benefits", "company_benefits", "financial_benefits"],
      additionalProperties: false,
    },
  },
  required: ["summary", "priorities", "pain_points", "requirements", "concerns", "next_steps", "stakeholders", "topics", "deck"],
  additionalProperties: false,
};

const SYSTEM = `You help TriNet sales consultants turn a recorded sales call with a prospect into proposal content. TriNet is a
PEO (professional employer organization) offering payroll, benefits, HR expertise, risk mitigation and compliance, and an HR
technology platform to small and medium-sized businesses.

Work only from the transcript. Don't invent facts, numbers, systems, names or commitments that weren't said; if something
is unclear, leave it out. Transcripts are machine-generated, so fix obvious transcription errors in names and product terms
(for example "trinet" is TriNet, "Netsuite" is NetSuite, "chronos" is Kronos, "ukg" is UKG) and ignore small talk.

The summary, priorities, pain points, requirements and deck wording go in front of the prospect: write them in plain,
confident business language from the prospect's point of view, without overpromising what TriNet will do. Concerns and
next steps are for the TriNet team.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  // Only TriNet users: the caller's session must belong to a user with a profile (row-level security returns only their own).
  const auth = req.headers.get("Authorization") ?? "";
  const apikey = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Sign in first." }, 401);
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: auth, apikey } });
  if (!userRes.ok) return json({ error: "Your session has expired. Sign in again." }, 401);
  const user = await userRes.json();
  const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&id=eq.${user.id}`, { headers: { Authorization: auth, apikey } });
  const profiles = profileRes.ok ? await profileRes.json() : [];
  if (!Array.isArray(profiles) || profiles.length === 0) return json({ error: "Only TriNet team members can analyze calls." }, 403);

  let body: { transcript?: string; companyName?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Send the transcript as JSON." }, 400);
  }
  const transcript = (body.transcript ?? "").trim();
  if (transcript.length < 200) return json({ error: "That transcript is too short to analyze." }, 400);
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    return json({ error: `That transcript is too long (${transcript.length.toLocaleString()} characters; the limit is ${MAX_TRANSCRIPT_CHARS.toLocaleString()}).` }, 413);
  }
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "AI isn't set up yet: add the ANTHROPIC_API_KEY secret to this Edge Function." }, 500);

  const client = new Anthropic({ apiKey, timeout: 140_000, maxRetries: 1 });
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{
        role: "user",
        content:
          `Prospect company (from the quote): ${body.companyName?.trim() || "not entered yet"}\n` +
          `Call: ${body.title?.trim() || "untitled"}\n\n<transcript>\n${transcript}\n</transcript>\n\n` +
          "Produce the call insights.",
      }],
    });

    if (response.stop_reason === "refusal") return json({ error: "The AI declined to analyze this transcript." }, 422);
    if (response.stop_reason === "max_tokens") return json({ error: "The analysis was cut off. Try a shorter transcript." }, 422);
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "The AI returned no analysis. Please try again." }, 502);
    return json({ insights: JSON.parse(text.text), model: response.model, usage: response.usage });
  } catch (e) {
    console.error(e);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "The AI is busy right now. Try again in a minute." }, 429);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "The ANTHROPIC_API_KEY secret isn't valid." }, 500);
    if (e instanceof Anthropic.APIError) return json({ error: `The AI request failed (${e.status ?? "network"}). Please try again.` }, 502);
    return json({ error: "Something went wrong analyzing the call. Please try again." }, 500);
  }
});
