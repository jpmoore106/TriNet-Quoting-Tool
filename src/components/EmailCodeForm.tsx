import type React from "react";
import { useState } from "react";
import { Mail } from "lucide-react";
import { inputClass, labelClass, primaryButton } from "./form";
import { useAuth } from "../state/AuthContext";
import { isTrinetEmail, TRINET_DOMAIN } from "../lib/cloud/supabase";

// Two steps: enter an email and get a code, then enter the code. `trinetOnly` limits sign-in to TriNet emails.
export default function EmailCodeForm({ trinetOnly = false, onSignedIn }: { trinetOnly?: boolean; onSignedIn?: () => void }) {
  const { sendCode, verifyCode } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setError("Enter a valid email address.");
    if (trinetOnly && !isTrinetEmail(value)) return setError(`Sign in with your TriNet email (ending in ${TRINET_DOMAIN}).`);
    setBusy(true);
    const err = await sendCode(value);
    setBusy(false);
    if (err) return setError(err);
    setEmail(value);
    setStep("code");
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\d{6,10}$/.test(code.trim())) return setError("Enter the code from the email.");
    setBusy(true);
    const err = await verifyCode(email, code);
    setBusy(false);
    if (err) return setError(err);
    onSignedIn?.();
  }

  return step === "email" ? (
    <form onSubmit={submitEmail} className="space-y-4" noValidate>
      <div>
        <label htmlFor="signin-email" className={labelClass}>{trinetOnly ? "TriNet email" : "Email"}</label>
        <input id="signin-email" type="email" autoComplete="email" className={inputClass} value={email}
          placeholder={trinetOnly ? `you${TRINET_DOMAIN}` : "you@company.com"} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-alert">{error}</p>}
      <button type="submit" disabled={busy} className={`${primaryButton} w-full justify-center`}>
        <Mail className="h-4 w-4" aria-hidden /> {busy ? "Sending…" : "Email me a sign-in code"}
      </button>
    </form>
  ) : (
    <form onSubmit={submitCode} className="space-y-4" noValidate>
      <p className="text-sm text-tngray-dark">
        We sent a code to <span className="font-semibold text-navy">{email}</span>. It may take a minute to arrive; check spam if you don't see it.
      </p>
      <div>
        <label htmlFor="signin-code" className={labelClass}>Sign-in code</label>
        <input id="signin-code" inputMode="numeric" autoComplete="one-time-code" maxLength={10}
          className={`${inputClass} text-2xl tracking-[0.3em]`} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-alert">{error}</p>}
      {notice && !error && <p role="status" className="text-sm text-navy">{notice}</p>}
      <button type="submit" disabled={busy} className={`${primaryButton} w-full justify-center`}>{busy ? "Checking…" : "Sign in"}</button>
      <div className="flex justify-between text-sm">
        <button type="button" className="underline text-navy" onClick={() => { setStep("email"); setCode(""); setError(""); }}>Use a different email</button>
        <button type="button" className="underline text-navy" disabled={busy}
          onClick={async () => { setError(""); setNotice(""); const err = await sendCode(email); if (err) setError(err); else setNotice("We sent a new code."); }}>
          Send a new code
        </button>
      </div>
    </form>
  );
}
