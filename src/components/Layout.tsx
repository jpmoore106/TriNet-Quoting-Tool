import { NavLink, Outlet } from "react-router-dom";
import TriNetLogo from "../assets/trinet_logo_reversed.png";
import { useQuote } from "../state/QuoteContext";

export const NAV_ITEMS = [
  { to: "/", label: "Setup" },
  { to: "/professional-service-fees", label: "Professional Service Fees" },
  { to: "/competitive-analysis", label: "Competitive Analysis" },
  { to: "/vroi", label: "vROI" },
  { to: "/wc-breakdown", label: "WC Breakdown" },
  { to: "/suta", label: "SUTA" },
  { to: "/paperwork-deadlines", label: "Paperwork Deadlines" },
  { to: "/outputs", label: "Outputs" },
];

export default function Layout() {
  const { quote } = useQuote();
  return (
    <div className="min-h-screen bg-canvas font-brand text-navy">
      <header className="sticky top-0 z-20 bg-navy">
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-2 flex items-center gap-4">
          {/* On TriNet Navy, use the reversed-out logo. */}
          <img src={TriNetLogo} alt="TriNet" className="h-7 w-auto" />
          <span className="h-6 w-px bg-white/30" aria-hidden />
          <h1 className="flex-1 text-lg font-semibold text-white">Quoting Tool</h1>
          {quote.companyLogo && (
            <img src={quote.companyLogo} alt="Client logo" className="h-10 max-w-[160px] object-contain rounded bg-white p-1" />
          )}
        </div>
        <nav className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
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
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
