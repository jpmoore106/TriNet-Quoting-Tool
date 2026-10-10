import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Copy, Mail, Trash2, UserPlus } from "lucide-react";
import { Navigate } from "react-router-dom";
import AppHeader from "../../components/AppHeader";
import PageTitle from "../../components/PageTitle";
import { Card, CardContent } from "../../components/ui/card";
import { Section, inputClass, labelClass, primaryButton } from "../../components/form";
import { deleteInvite, inviteEmail, listInvites, saveInvite, type Invite } from "../../lib/cloud/invites";
import { isTrinetEmail, TRINET_DOMAIN } from "../../lib/cloud/supabase";
import { useAuth, type Profile, type Role } from "../../state/AuthContext";
import { supabase } from "../../lib/cloud/supabase";

const ROLES: { value: Role; label: string }[] = [
  { value: "rep", label: "Rep" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

// Admins invite people with a role and manager, and change roles and managers. Managers see and edit their reps' companies.
export default function Team() {
  const { profile, refreshProfile } = useAuth();
  const [people, setPeople] = useState<Profile[] | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [form, setForm] = useState({ email: "", full_name: "", role: "rep" as Role, manager_id: "" });
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("profiles").select("id,email,full_name,role,manager_id").order("email");
    if (error) setError("Couldn't load the team.");
    else setPeople(data as Profile[]);
    // Invites need the database update in supabase/migrations/003_invites.sql.
    listInvites().then(setInvites).catch(() => setInvites(null));
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (profile?.role !== "admin") return <Navigate to="/companies" replace />;

  async function change(p: Profile, role: Role, managerId: string | null) {
    setError("");
    setStatus("");
    const { error } = await supabase.rpc("admin_update_profile", { target: p.id, new_role: role, new_manager: managerId });
    if (error) return setError(error.message);
    setStatus(`Saved ${p.full_name || p.email}.`);
    await load();
    if (p.id === profile!.id) await refreshProfile();
  }

  const managers = (people ?? []).filter((p) => p.role !== "rep");
  const joined = new Set((people ?? []).map((p) => p.email));
  const pending = (invites ?? []).filter((i) => !joined.has(i.email));
  const managerName = (id: string | null) => {
    const m = (people ?? []).find((p) => p.id === id);
    return m ? m.full_name || m.email : "—";
  };
  const from = profile!.full_name || profile!.email;

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("");
    const email = form.email.trim().toLowerCase();
    if (!isTrinetEmail(email)) return setError(`Invite a TriNet email (ending in ${TRINET_DOMAIN}).`);
    if (joined.has(email)) return setError(`${email} already has access. Change their role or manager in the table below.`);
    try {
      await saveInvite({ email, full_name: form.full_name.trim(), role: form.role, manager_id: form.manager_id || null });
    } catch (err) {
      console.error(err);
      return setError("Couldn't save the invite. Check that the database update (003_invites.sql) has been run.");
    }
    setForm({ email: "", full_name: "", role: "rep", manager_id: "" });
    setStatus(`Invite saved for ${email}. Send them the invite email below.`);
    await load();
  }

  async function copyInvite(i: Invite) {
    const { subject, body } = inviteEmail(i, from);
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(i.email);
      setTimeout(() => setCopied((c) => (c === i.email ? "" : c)), 2500);
    } catch {
      window.prompt("Copy this invite:", body);
    }
  }
  return (
    <div className="min-h-screen bg-canvas font-brand text-navy">
      <AppHeader />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <PageTitle eyebrow="Admin" title="Team"
          subtitle="Invite people with their role and manager before they sign in, or change anyone's role and manager below. Managers can see and edit their reps' companies." />

        <Section title="Invite people" description="Save an invite, then send the invite email. Their role and manager apply the first time they sign in.">
          <form onSubmit={invite} className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_0.8fr_1fr_auto] gap-3 items-end" noValidate data-testid="invite-form">
            <div>
              <label htmlFor="invite-email" className={labelClass}>TriNet email</label>
              <input id="invite-email" type="email" className={inputClass} placeholder={`name${TRINET_DOMAIN}`} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label htmlFor="invite-name" className={labelClass}>Name</label>
              <input id="invite-name" className={inputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="invite-role" className={labelClass}>Role</label>
              <select id="invite-role" className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="invite-manager" className={labelClass}>Manager</label>
              <select id="invite-manager" className={inputClass} value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
                <option value="">No manager</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
              </select>
            </div>
            <button type="submit" className={primaryButton} data-testid="invite-submit"><UserPlus className="h-4 w-4" aria-hidden /> Save invite</button>
          </form>
          {pending.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm" data-testid="pending-invites">
                <thead>
                  <tr className="border-b border-tngray-light text-left text-tngray-dark">
                    <th className="py-2 pr-4 font-medium">Invited (not signed in yet)</th>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    <th className="py-2 pr-4 font-medium">Manager</th>
                    <th className="py-2 font-medium"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((i) => (
                    <tr key={i.email} className="border-b border-tngray-light last:border-0" data-testid="invite-row">
                      <td className="py-2 pr-4"><span className="font-semibold">{i.full_name || i.email}</span>{i.full_name && <span className="block text-xs text-tngray-dark">{i.email}</span>}</td>
                      <td className="py-2 pr-4">{ROLES.find((r) => r.value === i.role)?.label}</td>
                      <td className="py-2 pr-4">{managerName(i.manager_id)}</td>
                      <td className="py-2">
                        <div className="flex justify-end gap-1">
                          <a href={inviteEmail(i, from).mailto} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-navy hover:bg-navy/5">
                            <Mail className="h-4 w-4" aria-hidden /> Email invite
                          </a>
                          <button type="button" onClick={() => copyInvite(i)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-navy hover:bg-navy/5">
                            <Copy className="h-4 w-4" aria-hidden /> {copied === i.email ? "Copied" : "Copy invite"}
                          </button>
                          <button type="button" aria-label={`Remove invite for ${i.email}`}
                            onClick={async () => { await deleteInvite(i.email); await load(); }}
                            className="inline-flex items-center rounded-lg px-2 py-1.5 text-tngray-dark hover:bg-alert/10 hover:text-alert">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {invites === null && <p className="text-sm text-tngray-dark">Invites need the latest database update (003_invites.sql).</p>}
        </Section>
        {error && <p role="alert" className="rounded-xl bg-white p-4 text-sm font-semibold text-alert">{error}</p>}
        <p role="status" className="text-sm text-navy min-h-[1.25rem]">{status}</p>
        <Card>
          <CardContent className="p-5 sm:p-6 overflow-x-auto">
            {!people ? <p className="text-sm text-tngray-dark">Loading…</p> : (
              <table className="w-full text-sm" data-testid="team-table">
                <thead>
                  <tr className="border-b border-tngray-light text-left text-tngray-dark">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    <th className="py-2 font-medium">Manager</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.id} className="border-b border-tngray-light last:border-0" data-testid={`team-row-${p.email}`}>
                      <td className="py-2 pr-4 font-semibold">{p.full_name || "—"}</td>
                      <td className="py-2 pr-4">{p.email}</td>
                      <td className="py-2 pr-4">
                        <select aria-label={`Role for ${p.email}`} className={`${inputClass} py-1.5`} value={p.role}
                          onChange={(e) => void change(p, e.target.value as Role, p.manager_id)}>
                          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </td>
                      <td className="py-2">
                        <select aria-label={`Manager for ${p.email}`} className={`${inputClass} py-1.5`} value={p.manager_id ?? ""}
                          onChange={(e) => void change(p, p.role, e.target.value || null)}>
                          <option value="">No manager</option>
                          {managers.filter((m) => m.id !== p.id).map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
