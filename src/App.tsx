import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import ComingSoon from "./pages/ComingSoon";
import PaperworkDeadlines from "./pages/PaperworkDeadlines";
import ProfessionalServiceFees from "./pages/ProfessionalServiceFees";
import { QuoteProvider } from "./state/QuoteContext";

export default function App() {
  return (
    <QuoteProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="professional-service-fees" element={<ProfessionalServiceFees />} />
          <Route path="pepm" element={<Navigate to="/professional-service-fees" replace />} />
          <Route path="competitive-analysis" element={<ComingSoon title="Competitive Analysis" description="Compare TriNet with the incumbent providers." />} />
          <Route path="vroi" element={<ComingSoon title="vROI" description="Value and return on investment." />} />
          <Route path="wc-breakdown" element={<ComingSoon title="WC Breakdown" description="Workers' compensation cost breakdown." />} />
          <Route path="suta" element={<ComingSoon title="SUTA" description="State unemployment tax analysis." />} />
          <Route path="paperwork-deadlines" element={<PaperworkDeadlines />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </QuoteProvider>
  );
}
