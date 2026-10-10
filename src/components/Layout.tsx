import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Eye } from "lucide-react";
import AppHeader from "./AppHeader";
import { useQuote, type SaveState } from "../state/QuoteContext";

export const NAV_ITEMS = [
  { to: "/", label: "Setup" },
  { to: "/professional-service-fees", label: "Professional Service Fees" },
  { to: "/benefits", label: "Benefits" },
  { to: "/workers-comp", label: "Worker's Comp & EPLI" },
  { to: "/taxes", label: "Taxes" },
  { to: "/vroi", label: "vROI" },
  { to: "/competitive-analysis", label: "Competitive Analysis" },
  { to: "/outputs", label: "Outputs" },
];

const SAVE_LABELS: Record<SaveState, string> = {
  saved: "All changes saved",
  saving: "Saving…",
  error: "Couldn't save. Retrying on your next change.",
  readonly: "View only",
};

export default function Layout() {
  const { quote, readOnly, saveState } = useQuote();
  // Read-only viewers (managers looking at a rep's company) can still use Outputs to download documents.
  const lockInputs = readOnly && !useLocation().pathname.startsWith("/outputs");
  return (
    <div className="min-h-screen bg-canvas font-brand text-navy">
      <AppHeader
        right={
          <div className="flex items-center gap-3 min-w-0">
            {quote.companyLogo && (
              <img src={quote.companyLogo} alt="Client logo" className="h-10 max-w-[140px] object-contain rounded bg-white p-1" />
            )}
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-white" data-testid="active-company">{quote.companyName || "Untitled company"}</p>
              <p className={`text-xs ${saveState === "error" ? "text-orange-light" : "text-white/70"}`} data-testid="save-state" role="status">
                {SAVE_LABELS[saveState]}
              </p>
            </div>
          </div>
        }>
        <nav aria-label="Quote" className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-[3px] px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive ? "border-orange text-white" : "border-transparent text-white/75 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </AppHeader>
      {readOnly && (
        <div role="note" className="bg-orange/15 text-navy" data-testid="readonly-banner">
          <p className="max-w-7xl mx-auto px-4 py-2 text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 shrink-0" aria-hidden />
            You're viewing a team member's company. Changes aren't saved. <Link to="/companies" className="underline font-semibold">Back to companies</Link>
          </p>
        </div>
      )}
      <main>
        <fieldset disabled={lockInputs} className="contents">
          <Outlet />
        </fieldset>
      </main>
    </div>
  );
}
