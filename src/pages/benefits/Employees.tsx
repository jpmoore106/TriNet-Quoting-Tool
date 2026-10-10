import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { inputClass } from "../../components/form";
import { useQuote } from "../../state/QuoteContext";
import { employeeCosts } from "../../lib/benefits";
import { usd } from "../../lib/pricing";
import { Totals } from "./fields";

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${usd(Math.abs(n))}`;

// Employee-by-employee monthly costs from the imported census, under the current funding strategy.
export default function Employees() {
  const { quote } = useQuote();
  const [query, setQuery] = useState("");
  const rows = useMemo(() => employeeCosts(quote.benefits), [quote.benefits]);
  const shown = rows.filter((r) => `${r.name} ${r.state} ${r.tierLabel} ${r.medical} ${r.current?.plan ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-5 sm:p-6 text-navy">
          <p className="font-semibold">No employee census yet.</p>
          <p className="text-sm text-tngray-dark mt-1">
            Upload a Benefit Strategy Summary on the <Link to="/" className="underline text-orange-dark">Setup page</Link> to see costs employee by employee.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
  const currentEr = sum((r) => r.current?.employer ?? 0);
  const currentEe = sum((r) => r.current?.employee ?? 0);
  const trinetEr = sum((r) => r.employer);
  const trinetEe = sum((r) => r.employee);

  return (
    <div className="space-y-6">
      <Totals items={[
        { label: "Employees", value: String(rows.length), testId: "emp-count" },
        { label: "Employer / month (TriNet)", value: usd(trinetEr), testId: "emp-trinet-er" },
        { label: "Employees pay / month (TriNet)", value: usd(trinetEe), testId: "emp-trinet-ee" },
        { label: "Employer change vs. current medical", value: signed(sum((r) => (r.medicalCost?.employer ?? 0) - (r.current?.employer ?? 0))), testId: "emp-medical-diff" },
      ]} />
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-navy">By employee</h3>
              <p className="text-sm text-tngray-dark">Monthly costs. TriNet costs follow the funding strategy on each benefit tab; current costs are medical only.</p>
            </div>
            <input type="search" aria-label="Search employees" placeholder="Search name, state, tier or plan"
              className={`${inputClass} max-w-xs py-1.5 text-sm`} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm" data-testid="employee-table">
              <thead>
                <tr className="text-left text-tngray-dark">
                  <th colSpan={3} />
                  <th colSpan={3} className="pb-1 font-semibold text-navy border-b-2 border-tngray-medium">Current medical</th>
                  <th colSpan={3} className="pb-1 pl-3 font-semibold text-navy border-b-2 border-orange">TriNet medical</th>
                  <th colSpan={2} className="pb-1 pl-3 font-semibold text-navy border-b-2 border-orange">Dental + vision</th>
                  <th colSpan={2} className="pb-1 pl-3 font-semibold text-navy border-b-2 border-orange">TriNet total</th>
                  <th />
                </tr>
                <tr className="text-left text-tngray-dark border-b border-tngray-light">
                  <th className="py-2 pr-3 font-semibold">Name</th>
                  <th className="py-2 pr-3 font-semibold">State</th>
                  <th className="py-2 pr-3 font-semibold">Tier</th>
                  <th className="py-2 pr-3 font-semibold">Plan</th>
                  <th className="py-2 pr-3 font-semibold text-right">ER</th>
                  <th className="py-2 pr-3 font-semibold text-right">EE</th>
                  <th className="py-2 pl-3 pr-3 font-semibold">Plan</th>
                  <th className="py-2 pr-3 font-semibold text-right">ER</th>
                  <th className="py-2 pr-3 font-semibold text-right">EE</th>
                  <th className="py-2 pl-3 pr-3 font-semibold text-right">ER</th>
                  <th className="py-2 pr-3 font-semibold text-right">EE</th>
                  <th className="py-2 pl-3 pr-3 font-semibold text-right">ER</th>
                  <th className="py-2 pr-3 font-semibold text-right">EE</th>
                  <th className="py-2 font-semibold text-right">Medical ER change</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const dv = { er: (r.dentalCost?.employer ?? 0) + (r.visionCost?.employer ?? 0), ee: (r.dentalCost?.employee ?? 0) + (r.visionCost?.employee ?? 0) };
                  const change = (r.medicalCost?.employer ?? 0) - (r.current?.employer ?? 0);
                  return (
                    <tr key={r.id} className="border-b border-tngray-light">
                      <td className="py-2 pr-3 font-semibold">{r.name}</td>
                      <td className="py-2 pr-3">{r.state}</td>
                      <td className="py-2 pr-3">{r.tierLabel}</td>
                      <td className="py-2 pr-3 text-tngray-dark">{r.current?.plan ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{r.current ? usd(r.current.employer) : "—"}</td>
                      <td className="py-2 pr-3 text-right">{r.current ? usd(r.current.employee) : "—"}</td>
                      <td className="py-2 pl-3 pr-3">{r.medicalCost?.plan ?? "Waived"}</td>
                      <td className="py-2 pr-3 text-right">{usd(r.medicalCost?.employer ?? 0)}</td>
                      <td className="py-2 pr-3 text-right">{usd(r.medicalCost?.employee ?? 0)}</td>
                      <td className="py-2 pl-3 pr-3 text-right">{usd(dv.er)}</td>
                      <td className="py-2 pr-3 text-right">{usd(dv.ee)}</td>
                      <td className="py-2 pl-3 pr-3 text-right font-semibold">{usd(r.employer)}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{usd(r.employee)}</td>
                      <td className="py-2 text-right">{r.current || r.medicalCost ? signed(change) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="py-2 pr-3" colSpan={4}>Total ({rows.length} employees)</td>
                  <td className="py-2 pr-3 text-right">{usd(currentEr)}</td>
                  <td className="py-2 pr-3 text-right">{usd(currentEe)}</td>
                  <td className="py-2 pl-3 pr-3" />
                  <td className="py-2 pr-3 text-right">{usd(sum((r) => r.medicalCost?.employer ?? 0))}</td>
                  <td className="py-2 pr-3 text-right">{usd(sum((r) => r.medicalCost?.employee ?? 0))}</td>
                  <td className="py-2 pl-3 pr-3 text-right">{usd(sum((r) => (r.dentalCost?.employer ?? 0) + (r.visionCost?.employer ?? 0)))}</td>
                  <td className="py-2 pr-3 text-right">{usd(sum((r) => (r.dentalCost?.employee ?? 0) + (r.visionCost?.employee ?? 0)))}</td>
                  <td className="py-2 pl-3 pr-3 text-right" data-testid="emp-total-er">{usd(trinetEr)}</td>
                  <td className="py-2 pr-3 text-right">{usd(trinetEe)}</td>
                  <td className="py-2 text-right">{signed(sum((r) => (r.medicalCost?.employer ?? 0) - (r.current?.employer ?? 0)))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-2 text-xs text-tngray-dark">The census stays in this browser. TriNet employer costs include any employer HSA contributions.</p>
        </CardContent>
      </Card>
    </div>
  );
}
