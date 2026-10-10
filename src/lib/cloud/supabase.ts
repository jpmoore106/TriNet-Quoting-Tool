import { createClient } from "@supabase/supabase-js";

// Public project URL and publishable key: safe in the browser. Access is enforced by the
// database's row-level security rules (supabase/schema.sql).
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://hepfuwxczuekdnkoafsq.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "sb_publishable_2x9uaclg-Hj2iRG0Fg0yFA_oTcM5lhY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export const TRINET_DOMAIN = "@trinet.com";
export const isTrinetEmail = (email: string) => email.trim().toLowerCase().endsWith(TRINET_DOMAIN);
