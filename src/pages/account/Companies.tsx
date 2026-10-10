import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, FolderOpen, Link2, Plus, Search, Trash2, Upload } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import PageTitle from "../../components/PageTitle";
import { Card, CardContent } from "../../components/ui/card";
import { inputClass, labelClass, primaryButton, secondaryButton } from "../../components/form";
import { useAuth, type Profile } from "../../state/AuthContext";
import { EMPTY_QUOTE } from "../../state/QuoteContext";
import { supabase } from "../../lib/cloud/supabase";
import {
  clearLegacyQuote, createCompany, deleteCompany, duplicateCompany, legacyQuote, listCompanies, setActiveCompany, type CompanyRow,
} from "../../lib/cloud/companies";
import { usd } from "../../lib/pricing";

type Person = Pick<Profile, "id" | "email" | "full_name">;
const personName = (p?: Person) => (p ? p.full_name || p.email : "Unknown");

export default function Companies() {
  const { profile, refreshProfile } = useAuth();
  const me = profile!;
  const navigate = useNavigate();
  const [rows, setRows] = useState<CompanyRow[] | null>(null);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [legacy, setLegacy] = useState(legacyQuote);
  const [name, setName] = useState(me.full_name);

  const load = useCallback(async () => {
    try {
      const [companies, { data: profiles }] = await Promise.all([
        listCompanies(),
        supabase.from("profiles").select("id,email,full_name"),
      ]);
      setRows(companies);
      setPeople(Object.fromEntries((profiles ?? []).map((p) => [p.id, p as Person])));
    } catch (e) {
      console.error(e);
      setError("Couldn't load companies. Check your connection and refresh.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const open = (id: string) => {
    setActiveCompany(me.id, id);
    navigate("/");
  };

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try { await action(); } catch (e) { console.error(e); setError("Something went wrong. Please try again."); }
    setBusy(false);
  }

  const newCompany = () => run(async () => open(await createCompany({ ...EMPTY_QUOTE, repName: me.full_name })));
  const importLegacy = () => run(async () => {
    const id = await createCompany(legacy!);
    clearLegacyQuote();
    setLegacy(null);
    open(id);
  });
  const duplicate = (id: string) => run(async () => { await duplicateCompany(id); await load(); });
  const remove = (row: CompanyRow) => {
    if (!window.confirm(`Delete ${row.name}? This removes the quote and its share links for good.`)) return;
    void run(async () => { await deleteCompany(row.id); await load(); });
  };
  const saveName = () => run(async () => {
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", me.id);
    if (error) throw error;
    await refreshProfile();
  });

  const q = search.trim().toLowerCase();
  const visible = useMemo(() => (rows ?? []).filter((r) => !q || r.name.toLowerCase().includes(q)), [rows, q]);
  const mine = visible.filter((r) => r.owner_id === me.id);
  const team = useMemo(() => {
    const groups = new Map<string, CompanyRow[]>();
    for (const r of visible) if (r.owner_id !== me.id) groups.set(r.owner_id, [...(groups.get(r.owner_id) ?? []), r]);
    return [...groups.entries()].sort((a, b) => personName(people[a[0]]).localeCompare(personName(people[b[0]])));
  }, [visible, me.id, people]);

  return (
    <div className="min-h-screen bg-canvas font-brand text-navy">
      <AppHeader />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <PageTitle eyebrow={me.role === "rep" ? "Your prospects" : me.role === "manager" ? "You and your team" : "Everyone"}
            title="Companies" subtitle="Each company holds one quote. Open one to work on it; changes save automatically." />
          <button type="button" onClick={newCompany} disabled={busy} className={primaryButton} data-testid="new-company">
            <Plus className="h-4 w-4" aria-hidden /> New company
          </button>
        </div>

        {error && <p role="alert" className="rounded-xl bg-white p-4 text-sm font-semibold text-alert">{error}</p>}

        {!me.full_name && (
          <Card>
            <CardContent className="p-5 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label htmlFor="my-name" className={labelClass}>Your name</label>
                <input id="my-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" />
                <p className="mt-1 text-xs text-tngray-dark">Shown to your manager and on proposals you share.</p>
              </div>
              <button type="button" className={secondaryButton} disabled={busy || !name.trim()} onClick={saveName}>Save name</button>
            </CardContent>
          </Card>
        )}

        {legacy && (
          <Card>
            <CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Quote saved in this browser</h2>
                <p className="text-sm text-tngray-dark">
                  {legacy.companyName || "An untitled quote"} was saved here before accounts. Import it to keep working on it.
                </p>
              </div>
              <button type="button" className={secondaryButton} onClick={importLegacy} disabled={busy} data-testid="import-legacy">
                <Upload className="h-4 w-4" aria-hidden /> Import as a company
              </button>
            </CardContent>
          </Card>
        )}

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tngray-dark" aria-hidden />
          <input aria-label="Search companies" className={`${inputClass} pl-9`} placeholder="Search companies" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>

        {rows === null && !error ? (
          <p role="status" className="text-sm text-tngray-dark">Loading companies…</p>
        ) : (
          <>
            <CompanyTable title="Your companies" rows={mine} empty={q ? "No matches." : "No companies yet. Click New company to start a quote."}
              testId="my-companies"
              actions={(r) => (
                <>
                  <IconButton label={`Open ${r.name}`} onClick={() => open(r.id)}><FolderOpen className="h-4 w-4" /> Open</IconButton>
                  <IconButton label={`Duplicate ${r.name}`} onClick={() => duplicate(r.id)} disabled={busy}><Copy className="h-4 w-4" /></IconButton>
                  <IconButton label={`Delete ${r.name}`} onClick={() => remove(r)} disabled={busy} danger><Trash2 className="h-4 w-4" /></IconButton>
                </>
              )} />
            {team.map(([ownerId, list]) => (
              <CompanyTable key={ownerId} title={personName(people[ownerId])} subtitle={people[ownerId]?.email} rows={list} empty="No matches."
                testId={`team-${people[ownerId]?.email ?? ownerId}`}
                actions={(r) => <IconButton label={`Open ${r.name}`} onClick={() => open(r.id)}><FolderOpen className="h-4 w-4" /> Open</IconButton>} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function CompanyTable({ title, subtitle, rows, empty, actions, testId }: {
  title: string; subtitle?: string; rows: CompanyRow[]; empty: string; actions: (r: CompanyRow) => React.ReactNode; testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-5 sm:p-6">
        <h2 className="text-lg font-bold">{title}</h2>
        {subtitle && subtitle !== title && <p className="text-sm text-tngray-dark">{subtitle}</p>}
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-tngray-dark">{empty}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-tngray-light text-left text-tngray-dark">
                  <th className="py-2 pr-4 font-medium">Company</th>
                  <th className="py-2 pr-4 font-medium">WSE</th>
                  <th className="py-2 pr-4 font-medium">FT PEPM</th>
                  <th className="py-2 pr-4 font-medium">Share links</th>
                  <th className="py-2 pr-4 font-medium">Last updated</th>
                  <th className="py-2 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const wse = (Number(r.ftWse) || 0) + (Number(r.ptWse) || 0);
                  const links = r.shares?.[0]?.count ?? 0;
                  return (
                    <tr key={r.id} className="border-b border-tngray-light last:border-0" data-testid="company-row">
                      <td className="py-2.5 pr-4 font-semibold">{r.name}</td>
                      <td className="py-2.5 pr-4">{wse || "—"}</td>
                      <td className="py-2.5 pr-4">{Number(r.ftPepm) ? usd(Number(r.ftPepm)) : "—"}</td>
                      <td className="py-2.5 pr-4">{links ? <span className="inline-flex items-center gap-1"><Link2 className="h-3.5 w-3.5" aria-hidden />{links}</span> : "—"}</td>
                      <td className="py-2.5 pr-4 whitespace-nowrap">{new Date(r.updated_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td>
                      <td className="py-2.5"><div className="flex justify-end gap-1">{actions(r)}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IconButton({ label, onClick, disabled, danger, children }: {
  label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold disabled:opacity-50 ${
        danger ? "text-tngray-dark hover:bg-alert/10 hover:text-alert" : "text-navy hover:bg-navy/5"}`}>
      {children}
    </button>
  );
}
