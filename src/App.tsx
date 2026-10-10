import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Setup from "./pages/Setup";
import Outputs from "./pages/Outputs";
import ExecutiveSummary from "./pages/ExecutiveSummary";
import ComingSoon from "./pages/ComingSoon";
import PaperworkDeadlines from "./pages/PaperworkDeadlines";
import ProfessionalServiceFees from "./pages/ProfessionalServiceFees";
import { AuthProvider } from "./state/AuthContext";
import { ActiveCompany, RequireRep } from "./components/AccountGate";
import Login from "./pages/account/Login";
import Companies from "./pages/account/Companies";
import Team from "./pages/account/Team";
import Account from "./pages/account/Account";
import ProspectView from "./pages/prospect/ProspectView";
import BenefitsLayout from "./pages/benefits/BenefitsLayout";
import BenefitsSummary from "./pages/benefits/BenefitsSummary";
import HealthLinePage from "./pages/benefits/HealthLinePage";
import DisabilityLife from "./pages/benefits/DisabilityLife";
import Voluntary from "./pages/benefits/Voluntary";
import Retirement from "./pages/benefits/Retirement";
import Employees from "./pages/benefits/Employees";
import Taxes from "./pages/Taxes";
import WorkersComp from "./pages/WorkersComp";
import { PAGE_SLIDES } from "./data/masterDeck";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="p/:shareId" element={<ProspectView />} />
        <Route element={<RequireRep />}>
          <Route path="companies" element={<Companies />} />
          <Route path="team" element={<Team />} />
          <Route path="account" element={<Account />} />
          {/* Quote pages work on the open company. */}
          <Route element={<ActiveCompany />}>
            <Route path="outputs/executive-summary" element={<ExecutiveSummary />} />
            <Route element={<Layout />}>
              <Route index element={<Setup />} />
              <Route path="professional-service-fees" element={<ProfessionalServiceFees />} />
              <Route path="pepm" element={<Navigate to="/professional-service-fees" replace />} />
              <Route path="benefits" element={<BenefitsLayout />}>
                <Route index element={<BenefitsSummary />} />
                <Route path="medical" element={<HealthLinePage key="medical" lineKey="medical" title="Medical" />} />
                <Route path="dental" element={<HealthLinePage key="dental" lineKey="dental" title="Dental" />} />
                <Route path="vision" element={<HealthLinePage key="vision" lineKey="vision" title="Vision" />} />
                <Route path="disability-life" element={<DisabilityLife />} />
                <Route path="voluntary" element={<Voluntary />} />
                <Route path="401k" element={<Retirement />} />
                <Route path="employees" element={<Employees />} />
              </Route>
              <Route path="competitive-analysis" element={<ComingSoon title="Competitive Analysis" description="Compare TriNet with the incumbent providers." slides={PAGE_SLIDES.competitive} />} />
              <Route path="vroi" element={<ComingSoon title="vROI" description="Value and return on investment." slides={PAGE_SLIDES.vroi} />} />
              <Route path="workers-comp" element={<WorkersComp />} />
              <Route path="taxes" element={<Taxes />} />
              <Route path="wc-breakdown" element={<Navigate to="/workers-comp" replace />} />
              <Route path="suta" element={<Navigate to="/taxes" replace />} />
              <Route path="paperwork-deadlines" element={<PaperworkDeadlines />} />
              <Route path="outputs" element={<Outputs />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
