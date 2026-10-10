import type React from "react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import TriNetLogo from "../../assets/trinet_logo_full_color.png";
import WingMotif from "../../components/WingMotif";
import EmailCodeForm from "../../components/EmailCodeForm";
import SetPasswordForm from "../../components/SetPasswordForm";
import { Card, CardContent } from "../../components/ui/card";
import { inputClass, labelClass, primaryButton } from "../../components/form";
import { useAuth } from "../../state/AuthContext";
import { isTrinetEmail, TRINET_DOMAIN } from "../../lib/cloud/supabase";

type Mode = "password" | "code" | "set-password";

// Sign-in for TriNet reps, managers and admins: email and password. First-time users and anyone who forgot
// their password verify their email with a one-time code, then create a password.
export default function Login() {
  const { session, profile, loading, signInWithPassword } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from || "/companies";
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Already signed in: go on, unless they just verified a code and are about to create a password.
  if (!loading && session && profile && mode === "password") return <Navigate to={from} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isTrinetEmail(email)) return setError(`Sign in with your TriNet email (ending in ${TRINET_DOMAIN}).`);
    if (!password) return setError("Enter your password.");
    setBusy(true);
    // On success the signed-in redirect above takes over; navigating here too would fire a second, late redirect.
    const err = await signInWithPassword(email, password);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas font-brand text-navy flex items-center justify-center px-4 py-10">
      <WingMotif size={140} thickness={34} className="right-0 top-0" />
      <Card className="relative w-full max-w-md">
        <CardContent className="p-6 sm:p-8">
          <img src={TriNetLogo} alt="TriNet" className="h-8 w-auto" />
          <h1 className="mt-6 text-2xl font-bold">Quoting Tool</h1>

          {mode === "password" && (
            <>
              <p className="mt-1 mb-6 text-sm text-tngray-dark">Sign in with your TriNet email and password.</p>
              <form onSubmit={submit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="login-email" className={labelClass}>TriNet email</label>
                  <input id="login-email" type="email" autoComplete="username" className={inputClass} value={email}
                    placeholder={`you${TRINET_DOMAIN}`} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="login-password" className={labelClass}>Password</label>
                  <input id="login-password" type="password" autoComplete="current-password" className={inputClass} value={password}
                    onChange={(e) => setPassword(e.target.value)} />
                </div>
                {error && <p role="alert" className="text-sm font-semibold text-alert">{error}</p>}
                <button type="submit" disabled={busy} className={`${primaryButton} w-full justify-center`}>{busy ? "Signing in…" : "Sign in"}</button>
              </form>
              <div className="mt-6 border-t border-tngray-light pt-4 text-sm">
                <p className="text-tngray-dark">First time here, or forgot your password?</p>
                <button type="button" className="mt-1 font-semibold text-navy underline" data-testid="setup-password"
                  onClick={() => { setMode("code"); setError(""); }}>
                  Set up your password with an email code
                </button>
              </div>
            </>
          )}

          {mode === "code" && (
            <>
              <p className="mt-1 mb-6 text-sm text-tngray-dark">
                We'll email you a one-time code to confirm it's you, then you'll create a password.
              </p>
              <EmailCodeForm trinetOnly onSignedIn={() => setMode("set-password")} />
              <button type="button" className="mt-4 text-sm font-semibold text-navy underline" onClick={() => setMode("password")}>
                Back to sign in with a password
              </button>
            </>
          )}

          {mode === "set-password" && (
            <>
              <p className="mt-1 mb-6 text-sm text-tngray-dark">You're verified. Create a password to sign in with from now on.</p>
              <SetPasswordForm submitLabel="Save password and continue" onDone={() => navigate(from, { replace: true })} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
