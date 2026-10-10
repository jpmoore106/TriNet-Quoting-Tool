import type React from "react";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { inputClass, labelClass, primaryButton } from "./form";
import { useAuth } from "../state/AuthContext";

export const MIN_PASSWORD = 8;

// Create or change the signed-in user's password.
export default function SetPasswordForm({ onDone, submitLabel = "Save password" }: { onDone?: () => void; submitLabel?: string }) {
  const { setPassword } = useAuth();
  const [password, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    const err = await setPassword(password);
    setBusy(false);
    if (err) return setError(err);
    setPw("");
    setConfirm("");
    setSaved(true);
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="new-password" className={labelClass}>New password</label>
        <input id="new-password" type="password" autoComplete="new-password" className={inputClass} value={password}
          onChange={(e) => setPw(e.target.value)} />
        <p className="mt-1 text-xs text-tngray-dark">At least {MIN_PASSWORD} characters.</p>
      </div>
      <div>
        <label htmlFor="confirm-password" className={labelClass}>Confirm password</label>
        <input id="confirm-password" type="password" autoComplete="new-password" className={inputClass} value={confirm}
          onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-alert">{error}</p>}
      {saved && !onDone && <p role="status" className="text-sm font-semibold text-navy">Password saved.</p>}
      <button type="submit" disabled={busy} className={`${primaryButton} w-full justify-center`}>
        <KeyRound className="h-4 w-4" aria-hidden /> {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
