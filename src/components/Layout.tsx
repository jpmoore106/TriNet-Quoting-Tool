import { NavLink, Outlet } from "react-router-dom";
import TriNetLogo from "../assets/trinet_white_rgb_md.png";
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
    <div
      className="min-h-screen"
      style={{ fontFamily: "'Avenir Next','Avenir',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif" }}
    >
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={TriNetLogo} alt="TriNet Logo" className="h-8 w-auto" />
          <h1 className="flex-1 text-2xl font-bold text-white">TriNet Quoting Tool</h1>
          {quote.companyLogo && (
            <img src={quote.companyLogo} alt="Client logo" className="h-10 max-w-[160px] object-contain rounded bg-white p-1" />
          )}
        </div>
        <nav className="max-w-7xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-[#FD5000] text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
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
