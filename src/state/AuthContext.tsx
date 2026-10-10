import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/cloud/supabase";

export type Role = "rep" | "manager" | "admin";
export type Profile = { id: string; email: string; full_name: string; role: Role; manager_id: string | null };

type AuthValue = {
  loading: boolean;
  session: Session | null;
  email: string;
  profile: Profile | null; // TriNet users only; prospects have none
  sendCode: (email: string) => Promise<string | null>; // error message, or null when sent
  verifyCode: (email: string, code: string) => Promise<string | null>;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  setPassword: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

// TriNet users sign in with email and password, set the first time (or reset) with an emailed code.
// Prospects sign in with an emailed code. Reps, managers and admins have a profile; prospects don't.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) return setProfile(null);
    const { data } = await supabase.from("profiles").select("id,email,full_name,role,manager_id").eq("id", s.user.id).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (active) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Token refreshes keep the same user; only reload the profile when the user changes.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void loadProfile(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value: AuthValue = {
    loading,
    session,
    email: session?.user.email?.toLowerCase() ?? "",
    profile,
    sendCode: async (email) => {
      // If the email shows a link instead of a code, the link signs in on this page.
      const emailRedirectTo = window.location.origin + window.location.pathname;
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true, emailRedirectTo } });
      return error ? friendlyError(error.message) : null;
    },
    signInWithPassword: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) {
        return /invalid login credentials/i.test(error.message)
          ? "Email or password is incorrect. First time here or forgot your password? Set it up with an email code below."
          : friendlyError(error.message);
      }
      setSession(data.session);
      await loadProfile(data.session);
      return null;
    },
    setPassword: async (password) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) return null;
      if (/same.*(old|previous)|different from the old/i.test(error.message)) return "That's your current password. Choose a new one.";
      if (/weak|at least|characters/i.test(error.message)) return "Choose a stronger password: at least 8 characters, mixing letters and numbers.";
      return error.message;
    },
    verifyCode: async (email, code) => {
      const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
      if (error) return friendlyError(error.message);
      setSession(data.session);
      await loadProfile(data.session);
      return null;
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
    },
    refreshProfile: () => loadProfile(session),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function friendlyError(message: string) {
  if (/expired|invalid/i.test(message)) return "That code is incorrect or has expired. Check the latest email, or send a new code.";
  if (/rate limit|security purposes|too many/i.test(message)) return "Too many codes requested. Please wait a minute and try again.";
  return message;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
