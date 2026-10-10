import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { QuoteProvider } from "../state/QuoteContext";
import {
  canEditCompany, getActiveCompany, getCompany, ownerOf, saveCompany, setActiveCompany, type Company,
} from "../lib/cloud/companies";
import { primaryButton } from "./form";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="min-h-screen bg-canvas font-brand flex items-center justify-center text-navy" role="status">
      <span className="h-5 w-5 mr-3 animate-spin rounded-full border-2 border-navy border-t-transparent" aria-hidden />
      {label}
    </div>
  );
}

// Pages for TriNet users only: sends everyone else to sign in.
export function RequireRep() {
  const { loading, session, profile, email, signOut } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!profile) {
    return (
      <div className="min-h-screen bg-canvas font-brand flex items-center justify-center px-4 text-navy">
        <div className="max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold">This tool is for TriNet team members</h1>
          <p className="mt-2 text-sm text-tngray-dark">
            You're signed in as {email}. Sign in with your TriNet email to build quotes. If someone shared a proposal with
            you, open the link they sent.
          </p>
          <button type="button" className={`${primaryButton} mt-4`} onClick={() => void signOut()}>Sign out</button>
        </div>
      </div>
    );
  }
  return <Outlet />;
}

// Quote pages work on the open company. Without one, the rep picks one on the Companies page.
export function ActiveCompany() {
  const { profile } = useAuth();
  const userId = profile!.id;
  const [state, setState] = useState<{
    status: "loading" | "ready" | "none" | "error"; company?: Company; canEdit?: boolean; ownerName?: string;
  }>({ status: "loading" });
  const version = useRef("");
  const activeId = getActiveCompany(userId);

  useEffect(() => {
    let live = true;
    if (!activeId) { setState({ status: "none" }); return; }
    setState({ status: "loading" });
    getCompany(activeId)
      .then(async (company) => {
        if (!company) {
          if (live) { setActiveCompany(userId, null); setState({ status: "none" }); }
          return;
        }
        const mine = company.owner_id === userId;
        const [canEdit, ownerName] = await Promise.all([mine || canEditCompany(company.id), mine ? "" : ownerOf(company.owner_id)]);
        if (!live) return;
        version.current = company.updated_at;
        setState({ status: "ready", company, canEdit, ownerName });
      })
      .catch(() => live && setState({ status: "error" }));
    return () => { live = false; };
  }, [activeId, userId]);

  if (state.status === "none") return <Navigate to="/companies" replace />;
  if (state.status === "error") {
    return (
      <div className="min-h-screen bg-canvas font-brand flex items-center justify-center text-navy px-4">
        <p role="alert">Couldn't load this company. Check your connection and <button type="button" className="underline" onClick={() => window.location.reload()}>try again</button>.</p>
      </div>
    );
  }
  if (state.status === "loading" || !state.company) return <Loading label="Opening company…" />;
  const c = state.company;
  const readOnly = !state.canEdit;
  const save = async (q: typeof c.quote) => { version.current = await saveCompany(c.id, q, version.current); };
  return (
    <QuoteProvider key={c.id} initial={c.quote} readOnly={readOnly} companyId={c.id} ownerId={c.owner_id}
      ownerName={c.owner_id === userId ? "" : state.ownerName || "a team member"} save={readOnly ? undefined : save}>
      <Outlet />
    </QuoteProvider>
  );
}
