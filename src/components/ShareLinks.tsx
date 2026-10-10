import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { addDays, format } from "date-fns";
import { Check, Copy, ExternalLink, Link2, RefreshCw, Trash2 } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { inputClass, labelClass, primaryButton } from "./form";
import { useQuote } from "../state/QuoteContext";
import { useAuth } from "../state/AuthContext";
import {
  createShare, deleteShare, isEmail, listShares, parseEmails, prospectSnapshot, shareUrl, updateShare, type Share,
} from "../lib/cloud/shares";

const EXPIRY_OPTIONS = [
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
  { days: 60, label: "60 days" },
  { days: 90, label: "90 days" },
  { days: 0, label: "Never" },
];

const when = (iso: string) => format(new Date(iso), "MMM d, yyyy h:mm a");

function status(s: Share) {
  if (s.revoked) return { label: "Revoked", tone: "bg-tngray-light text-navy" };
  if (s.expires_at && new Date(s.expires_at) <= new Date()) return { label: "Expired", tone: "bg-tngray-light text-navy" };
  return { label: "Live", tone: "bg-navy text-white" };
}

// Customer-facing links: the prospect signs in with an emailed code to see a read-only proposal.
export default function ShareLinks() {
  const { quote, companyId, readOnly } = useQuote();
  const { profile } = useAuth();
  const [shares, setShares] = useState<Share[] | null>(null);
  const [emails, setEmails] = useState("");
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    if (!companyId) return;
    try { setShares(await listShares(companyId)); } catch (e) { console.error(e); setError("Couldn't load share links."); }
  }, [companyId]);
  useEffect(() => { void load(); }, [load]);
  if (!companyId) return null;

  const rep = { name: profile?.full_name || quote.repName, email: profile?.email ?? "" };

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try { await action(); await load(); } catch (e) { console.error(e); setError("Something went wrong. Please try again."); }
    setBusy(false);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const list = parseEmails(emails);
    const bad = list.filter((x) => !isEmail(x));
    if (list.length === 0) return setError("Enter the prospect's email address.");
    if (bad.length) return setError(`Check ${bad.join(", ")}: not a valid email address.`);
    await run(async () => {
      const expires = days ? addDays(new Date(), days).toISOString() : null;
      const id = await createShare(companyId!, list, expires, prospectSnapshot(quote, rep));
      setEmails("");
      await copy(id);
    });
  }

  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(shareUrl(id));
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? "" : c)), 2500);
    } catch {
      window.prompt("Copy this link:", shareUrl(id));
    }
  }

  return (
    <Card data-testid="share-links">
      <CardContent className="p-5 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-wider text-orange-dark">Customer-facing</p>
        <h3 className="text-xl font-bold text-navy">Share with the prospect</h3>
        <p className="mt-1 max-w-3xl text-sm text-tngray-dark">
          Send the prospect a private link to a read-only proposal: fees, benefits, what's included and the onboarding timeline.
          They sign in with a code emailed to the address you enter, so only they can open it. Internal details (list price,
          discounts, notes and the employee census) aren't included.
        </p>

        {!readOnly && (
          <form onSubmit={create} className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end" noValidate>
            <div>
              <label htmlFor="share-emails" className={labelClass}>Prospect email(s)</label>
              <input id="share-emails" className={inputClass} placeholder="name@prospect.com, cfo@prospect.com" value={emails}
                onChange={(e) => setEmails(e.target.value)} />
            </div>
            <div>
              <label htmlFor="share-expiry" className={labelClass}>Link expires</label>
              <select id="share-expiry" className={inputClass} value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {EXPIRY_OPTIONS.map((o) => <option key={o.days} value={o.days}>{o.label}</option>)}
              </select>
            </div>
            <button type="submit" className={primaryButton} disabled={busy} data-testid="create-share">
              <Link2 className="h-4 w-4" aria-hidden /> Create link
            </button>
          </form>
        )}
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-alert">{error}</p>}

        <div className="mt-5 space-y-3" data-testid="share-list">
          {shares === null ? <p className="text-sm text-tngray-dark">Loading…</p> : shares.length === 0 ? (
            <p className="text-sm text-tngray-dark">No share links yet.</p>
          ) : shares.map((s) => {
            const st = status(s);
            const views = [...s.share_views].sort((a, b) => b.viewed_at.localeCompare(a.viewed_at));
            return (
              <div key={s.id} className="rounded-xl border border-tngray-light p-4" data-testid="share-row">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-navy">
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${st.tone}`}>{st.label}</span>
                      {s.prospect_emails.join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-tngray-dark">
                      Created {when(s.created_at)} · Quote as of {when(s.snapshot.publishedAt)} ·{" "}
                      {s.expires_at ? `Expires ${when(s.expires_at)}` : "Never expires"}
                    </p>
                    <p className="mt-1 text-xs text-tngray-dark" data-testid="share-views">
                      {views.length === 0 ? "Not opened yet" : `Opened ${views.length} time${views.length > 1 ? "s" : ""}, last ${when(views[0].viewed_at)} by ${views[0].viewer_email}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <SmallButton onClick={() => copy(s.id)} label="Copy link">
                      {copied === s.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied === s.id ? "Copied" : "Copy link"}
                    </SmallButton>
                    <a href={shareUrl(s.id)} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-navy hover:bg-navy/5">
                      <ExternalLink className="h-4 w-4" aria-hidden /> Preview
                    </a>
                    {!readOnly && (
                      <>
                        <SmallButton disabled={busy} label="Update to the latest quote"
                          onClick={() => run(() => updateShare(s.id, { snapshot: prospectSnapshot(quote, rep) }))}>
                          <RefreshCw className="h-4 w-4" /> Update quote
                        </SmallButton>
                        <SmallButton disabled={busy} label={s.revoked ? "Restore link" : "Revoke link"}
                          onClick={() => run(() => updateShare(s.id, { revoked: !s.revoked }))}>
                          {s.revoked ? "Restore" : "Revoke"}
                        </SmallButton>
                        <SmallButton disabled={busy} label="Delete link" danger
                          onClick={() => { if (window.confirm("Delete this share link? The prospect will lose access.")) void run(() => deleteShare(s.id)); }}>
                          <Trash2 className="h-4 w-4" />
                        </SmallButton>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SmallButton({ onClick, label, disabled, danger, children }: {
  onClick: () => void; label: string; disabled?: boolean; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold disabled:opacity-50 ${
        danger ? "text-tngray-dark hover:bg-alert/10 hover:text-alert" : "text-navy hover:bg-navy/5"}`}>
      {children}
    </button>
  );
}
