import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AppHeader from "../../components/AppHeader";
import PageTitle from "../../components/PageTitle";
import { Card, CardContent } from "../../components/ui/card";
import { inputClass } from "../../components/form";
import { useAuth, type Profile, type Role } from "../../state/AuthContext";
import { supabase } from "../../lib/cloud/supabase";

const ROLES: { value: Role; label: string }[] = [
  { value: "rep", label: "Rep" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

// Admins set each person's role and manager. Managers see their reps' companies (read-only).
export default function Team() {
  const { profile, refreshProfile } = useAuth();
  const [people, setPeople] = useState<Profile[] | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("profiles").select("id,email,full_name,role,manager_id").order("email");
    if (error) setError("Couldn't load the team.");
    else setPeople(data as Profile[]);
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
  return (
    <div className="min-h-screen bg-canvas font-brand text-navy">
      <AppHeader />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <PageTitle eyebrow="Admin" title="Team"
          subtitle="People appear here after they first sign in. Assign each rep to a manager; managers can view their reps' companies." />
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
