import { NavLink, Outlet } from "react-router-dom";
import PageTitle from "../../components/PageTitle";

export const BENEFIT_TABS = [
  { to: "/benefits", label: "Summary", end: true },
  { to: "/benefits/medical", label: "Medical" },
  { to: "/benefits/dental", label: "Dental" },
  { to: "/benefits/vision", label: "Vision" },
  { to: "/benefits/disability-life", label: "STD / LTD / Life AD&D" },
  { to: "/benefits/voluntary", label: "Voluntary" },
  { to: "/benefits/401k", label: "401(k)" },
];

export default function BenefitsLayout() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageTitle eyebrow="Benefits" title="Benefits Quote" subtitle="Plans, rates, enrollment and employer funding, with a financial summary." />
      <nav aria-label="Benefits sections" className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {BENEFIT_TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                isActive ? "border-navy bg-navy text-white" : "border-tngray-light bg-white text-navy hover:border-navy"
              }`
            }>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
