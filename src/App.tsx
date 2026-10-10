import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Setup from "./pages/Setup";
import Outputs from "./pages/Outputs";
import ExecutiveSummary from "./pages/ExecutiveSummary";
import ComingSoon from "./pages/ComingSoon";
import PaperworkDeadlines from "./pages/PaperworkDeadlines";
import ProfessionalServiceFees from "./pages/ProfessionalServiceFees";
import { QuoteProvider } from "./state/QuoteContext";
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
    <QuoteProvider>
      <Routes>
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
      </Routes>
    </QuoteProvider>
  );
}
