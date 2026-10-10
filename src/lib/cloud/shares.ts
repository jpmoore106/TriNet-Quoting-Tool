import { supabase } from "./supabase";
import { EMPTY_QUOTE, normalizeQuote, type QuoteInputs } from "../../state/QuoteContext";
import { setupFeeSchedule } from "../pricing";
import type { HealthLine } from "../../state/benefits";

// What a prospect sees: the quote minus internal detail, plus the rep's contact details and onboarding dates.
export type ProspectSnapshot = {
  version: 1;
  publishedAt: string; // ISO timestamp
  rep: { name: string; email: string };
  quote: QuoteInputs;
  timeline: { payrollStart: string; payrollEnd: string; firstCheck: string; benefitsStart: string; paperworkDeadline: string };
};

export type ShareView = { viewer_email: string; viewed_at: string };
export type Share = {
  id: string;
  company_id: string;
  prospect_emails: string[];
  snapshot: ProspectSnapshot;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
  updated_at: string;
  share_views: ShareView[];
};

const limitOnly = (line: HealthLine): HealthLine => ({ ...line, appendix: line.appendix.filter((p) => p.id === line.funding.limitPlanId) });

// Leaves out list prices and discounts, setup-fee notes, the employee census, the Chevron proposal, deck picks and call insights.
export function prospectSnapshot(q: QuoteInputs, rep: { name: string; email: string }): ProspectSnapshot {
  const setup = setupFeeSchedule(q);
  const pay = q.chevron?.payroll;
  return {
    version: 1,
    publishedAt: new Date().toISOString(),
    rep,
    quote: {
      ...q,
      repName: rep.name || q.repName,
      setupFee: { amount: setup.net, discount: 0, installments: setup.count, firstInvoiceDate: q.setupFee.firstInvoiceDate, notes: "" },
      // The prospect sees quoted plans only, not the whole BSS appendix or option lists. An appendix plan used as the
      // contribution limit stays, since employer costs are capped by it.
      benefits: {
        ...q.benefits, census: [], source: null, riskOptions: { disability: [], life: [] },
        medical: limitOnly(q.benefits.medical),
        dental: limitOnly(q.benefits.dental),
        vision: limitOnly(q.benefits.vision),
      },
      chevron: null,
      deck: EMPTY_QUOTE.deck,
      callInsights: null, // call notes, concerns and quotes are internal
    },
    timeline: {
      payrollStart: pay?.trinetPayBegin ?? "",
      payrollEnd: pay?.trinetPayEnd ?? "",
      firstCheck: pay?.firstCheck ?? "",
      benefitsStart: q.benefits.effectiveDate,
      paperworkDeadline: q.deck.paperworkDeadline,
    },
  };
}

export const shareUrl = (id: string) => `${window.location.origin}/p/${id}`;

export const parseEmails = (text: string) =>
  [...new Set(text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
export const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export async function listShares(companyId: string): Promise<Share[]> {
  const { data, error } = await supabase
    .from("shares")
    .select("id,company_id,prospect_emails,snapshot,expires_at,revoked,created_at,updated_at,share_views(viewer_email,viewed_at)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Share[];
}

export async function createShare(companyId: string, emails: string[], expiresAt: string | null, snapshot: ProspectSnapshot) {
  const { data, error } = await supabase
    .from("shares")
    .insert({ company_id: companyId, prospect_emails: emails, expires_at: expiresAt, snapshot })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateShare(id: string, changes: Partial<Pick<Share, "prospect_emails" | "expires_at" | "revoked" | "snapshot">>) {
  const { error } = await supabase.from("shares").update(changes).eq("id", id);
  if (error) throw error;
}

export async function deleteShare(id: string) {
  const { error } = await supabase.from("shares").delete().eq("id", id);
  if (error) throw error;
}

// For the prospect: the database only returns the link if it was sent to their email and is still live.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function openShare(id: string): Promise<ProspectSnapshot | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await supabase.from("shares").select("snapshot").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const s = data.snapshot as ProspectSnapshot;
  return { ...s, quote: normalizeQuote(s.quote) };
}

export async function recordView(id: string) {
  await supabase.from("share_views").insert({ share_id: id });
}
