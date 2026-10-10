import type React from "react";
import { Link, NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import TriNetLogo from "../assets/trinet_logo_reversed.png";
import { useAuth } from "../state/AuthContext";

const topLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-2.5 py-1.5 text-sm font-semibold ${isActive ? "bg-white/15 text-white" : "text-white/80 hover:text-white"}`;

// The navy app header: TriNet logo, account links and, inside a company, whatever `children` adds below.
export default function AppHeader({ right, children }: { right?: React.ReactNode; children?: React.ReactNode }) {
  const { profile, email, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-20 bg-navy">
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* On TriNet Navy, use the reversed-out logo. */}
        <Link to="/companies" className="flex items-center gap-4">
          <img src={TriNetLogo} alt="TriNet" className="h-7 w-auto" />
          <span className="h-6 w-px bg-white/30" aria-hidden />
          <span className="text-lg font-semibold text-white">Quoting Tool</span>
        </Link>
        <div className="flex-1" />
        {right}
        {profile && (
          <nav aria-label="Account" className="flex items-center gap-1">
            <NavLink to="/companies" className={topLink}>Companies</NavLink>
            {profile.role === "admin" && <NavLink to="/team" className={topLink}>Team</NavLink>}
            <NavLink to="/account" className={topLink} title={email} data-testid="signed-in-as">
              Account<span className="hidden lg:inline font-normal text-white/70"> · {email}</span>
            </NavLink>
            <button type="button" onClick={() => void signOut()} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-semibold text-white/80 hover:text-white">
              <LogOut className="h-4 w-4" aria-hidden /> Sign out
            </button>
          </nav>
        )}
      </div>
      {children}
    </header>
  );
}
