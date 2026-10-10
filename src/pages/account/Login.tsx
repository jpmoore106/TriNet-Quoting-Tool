import { Navigate, useLocation, useNavigate } from "react-router-dom";
import TriNetLogo from "../../assets/trinet_logo_full_color.png";
import WingMotif from "../../components/WingMotif";
import EmailCodeForm from "../../components/EmailCodeForm";
import { Card, CardContent } from "../../components/ui/card";
import { useAuth } from "../../state/AuthContext";

// Sign-in for TriNet reps, managers and admins.
export default function Login() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from || "/companies";
  if (!loading && session && profile) return <Navigate to={from} replace />;

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas font-brand text-navy flex items-center justify-center px-4 py-10">
      <WingMotif size={140} thickness={34} className="right-0 top-0" />
      <Card className="relative w-full max-w-md">
        <CardContent className="p-6 sm:p-8">
          <img src={TriNetLogo} alt="TriNet" className="h-8 w-auto" />
          <h1 className="mt-6 text-2xl font-bold">Quoting Tool</h1>
          <p className="mt-1 mb-6 text-sm text-tngray-dark">Sign in with your TriNet email. We'll email you a one-time code; no password needed.</p>
          <EmailCodeForm trinetOnly onSignedIn={() => navigate(from, { replace: true })} />
        </CardContent>
      </Card>
    </div>
  );
}
