import { supabase } from "./supabase";
import { EMPTY_QUOTE, normalizeQuote, type QuoteInputs } from "../../state/QuoteContext";

export type CompanyRow = {
  id: string;
  owner_id: string;
  name: string;
  updated_at: string;
  created_at: string;
  ftWse: number | null;
  ptWse: number | null;
  ftPepm: number | null;
  shares: { count: number }[];
};

export type Company = { id: string; owner_id: string; name: string; quote: QuoteInputs; updated_at: string };

const companyName = (q: QuoteInputs) => q.companyName.trim() || "Untitled company";

// Every company the signed-in user can see: their own, their team's (managers) or everyone's (admins).
export async function listCompanies(): Promise<CompanyRow[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("id,owner_id,name,updated_at,created_at,ftWse:quote->ftWse,ptWse:quote->ptWse,ftPepm:quote->ftPepm,shares(count)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CompanyRow[];
}

export async function getCompany(id: string): Promise<Company | null> {
  const { data, error } = await supabase.from("companies").select("id,owner_id,name,quote,updated_at").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? { ...data, quote: normalizeQuote(data.quote) } : null;
}

export async function createCompany(quote: QuoteInputs = EMPTY_QUOTE): Promise<string> {
  const { data, error } = await supabase.from("companies").insert({ name: companyName(quote), quote }).select("id").single();
  if (error) throw error;
  return data.id;
}

// Thrown when someone else saved the company since it was opened, so this save would overwrite their changes.
export class ConflictError extends Error {
  constructor() {
    super("This company was changed by someone else.");
    this.name = "ConflictError";
  }
}

// Saves only if the company hasn't changed since `version` (its updated_at); returns the new version.
export async function saveCompany(id: string, quote: QuoteInputs, version: string): Promise<string> {
  const { data, error } = await supabase
    .from("companies")
    .update({ name: companyName(quote), quote })
    .eq("id", id)
    .eq("updated_at", version)
    .select("updated_at");
  if (error) throw error;
  if (!data || data.length === 0) throw new ConflictError();
  return data[0].updated_at;
}

// Owners, their managers and admins can edit a company. Until the database has can_edit_company
// (supabase/migrations/002), team members get a read-only view.
export async function canEditCompany(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_edit_company", { c: id });
  if (error) {
    console.warn("can_edit_company unavailable; opening read-only", error.message);
    return false;
  }
  return data === true;
}

export async function ownerOf(ownerId: string) {
  const { data } = await supabase.from("profiles").select("email,full_name").eq("id", ownerId).maybeSingle();
  return data ? data.full_name || data.email : "";
}

export async function deleteCompany(id: string) {
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateCompany(id: string): Promise<string> {
  const c = await getCompany(id);
  if (!c) throw new Error("Company not found");
  return createCompany({ ...c.quote, companyName: `${c.quote.companyName || "Untitled company"} (copy)` });
}

// The company open in the quote pages, remembered per user in this browser.
const activeKey = (userId: string) => `trinet-active-company:${userId}`;
export function getActiveCompany(userId: string) {
  try { return localStorage.getItem(activeKey(userId)); } catch { return null; }
}
export function setActiveCompany(userId: string, id: string | null) {
  try {
    if (id) localStorage.setItem(activeKey(userId), id);
    else localStorage.removeItem(activeKey(userId));
  } catch {
    // Storage unavailable: the user picks the company again next visit.
  }
}

// Quote saved in this browser before accounts existed; offered for import as a company.
const LEGACY_KEY = "trinet-quote-inputs";
export function legacyQuote(): QuoteInputs | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const q = normalizeQuote(JSON.parse(raw));
    const used = q.companyName || q.ftWse || q.ftPepm || q.benefits.medical.plans.length || q.chevron;
    return used ? q : null;
  } catch {
    return null;
  }
}
export function clearLegacyQuote() {
  try { localStorage.removeItem(LEGACY_KEY); } catch { /* nothing to clear */ }
}
