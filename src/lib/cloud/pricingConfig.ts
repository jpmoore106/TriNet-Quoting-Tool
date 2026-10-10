import { supabase } from "./supabase";
import type { RateCard } from "../../data/rateCard";

// The confidential rate card and promotions, readable by TriNet users only (null until an admin loads it).
export async function loadRateCard(): Promise<RateCard | null> {
  const { data, error } = await supabase.from("pricing_config").select("data").eq("id", "rate_card").maybeSingle();
  if (error) throw error;
  return (data?.data as RateCard | undefined) ?? null;
}
