import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { inputClass } from "../../components/form";
import { useQuote } from "../../state/QuoteContext";
import { employeeCosts, remapEmployee, retierEmployee, type CensusLine } from "../../lib/benefits";
import { TIERS, TIER_LABELS, type HealthLine, type Tier } from "../../state/benefits";
import { usd } from "../../lib/pricing";
import { Totals } from "./fields";

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${usd(Math.abs(n))}`;

// Employee-by-employee monthly costs from the imported census, under the current funding strategy.
export default function Employees() {
  const { quote, update } = useQuote();
  const b = quote.benefits;
  const setPlan = (id: string, key: CensusLine, plan: string) => update({ benefits: remapEmployee(b, id, key, plan) });
  const setTier = (id: string, tier: Tier) => update({ benefits: retierEmployee(b, id, tier) });
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
              <p className="text-sm text-tngray-dark">
                Monthly costs. Change any employee's tier or plans; costs use the BSS rates, and plan enrollment on the Medical, Dental
                and Vision tabs updates to match. Current costs are medical only.
              </p>
            </div>
            <input type="search" aria-label="Search employees" placeholder="Search name, state, tier or plan"
              className={`${inputClass} max-w-xs py-1.5 text-sm`} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[2000px] text-sm" data-testid="employee-table">
              <thead>
                <tr className="text-left text-tngray-dark">
                  <th colSpan={3} />
                  <th colSpan={3} className="pb-1 font-semibold text-navy border-b-2 border-tngray-medium">Current medical</th>
                  <th colSpan={3} className="pb-1 pl-3 font-semibold text-navy border-b-2 border-orange">TriNet medical</th>
                  <th colSpan={3} className="pb-1 pl-3 font-semibold text-navy border-b-2 border-orange">Dental</th>
                  <th colSpan={3} className="pb-1 pl-3 font-semibold text-navy border-b-2 border-orange">Vision</th>
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
                  {(["Medical", "Dental", "Vision"] as const).map((l) => (
                    <Fragment key={l}>
                      <th className="py-2 pl-3 pr-3 font-semibold">Plan</th>
                      <th className="py-2 pr-3 font-semibold text-right">ER</th>
                      <th className="py-2 pr-3 font-semibold text-right">EE</th>
                    </Fragment>
                  ))}
                  <th className="py-2 pl-3 pr-3 font-semibold text-right">ER</th>
                  <th className="py-2 pr-3 font-semibold text-right">EE</th>
                  <th className="py-2 font-semibold text-right">Medical ER change</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const change = (r.medicalCost?.employer ?? 0) - (r.current?.employer ?? 0);
                  const costs = { medical: r.medicalCost, dental: r.dentalCost, vision: r.visionCost };
                  return (
                    <tr key={r.id} className="border-b border-tngray-light" data-testid="employee-row">
                      <td className="py-2 pr-3 font-semibold whitespace-nowrap">{r.name}</td>
                      <td className="py-2 pr-3">{r.state}</td>
                      <td className="py-2 pr-3">
                        <select aria-label={`${r.name} tier`} className={`${inputClass} py-1 px-1.5 text-sm min-w-[170px]`} value={r.tier}
                          onChange={(e) => setTier(r.id, e.target.value as Tier)}>
                          {TIERS.map((t) => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-3 text-tngray-dark">{r.current?.plan ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{r.current ? usd(r.current.employer) : "—"}</td>
                      <td className="py-2 pr-3 text-right">{r.current ? usd(r.current.employee) : "—"}</td>
                      {(["medical", "dental", "vision"] as const).map((k) => (
                        <Fragment key={k}>
                          <td className="py-2 pl-3 pr-3">
                            <PlanSelect label={`${r.name} ${k} plan`} line={b[k]} tier={r.tier} value={r[k]} onChange={(v) => setPlan(r.id, k, v)} />
                          </td>
                          <td className="py-2 pr-3 text-right">{usd(costs[k]?.employer ?? 0)}</td>
                          <td className="py-2 pr-3 text-right">{usd(costs[k]?.employee ?? 0)}</td>
                        </Fragment>
                      ))}
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
                  {(["medicalCost", "dentalCost", "visionCost"] as const).map((k) => (
                    <Fragment key={k}>
                      <td className="py-2 pl-3 pr-3" />
                      <td className="py-2 pr-3 text-right">{usd(sum((r) => r[k]?.employer ?? 0))}</td>
                      <td className="py-2 pr-3 text-right">{usd(sum((r) => r[k]?.employee ?? 0))}</td>
                    </Fragment>
                  ))}
                  <td className="py-2 pl-3 pr-3 text-right" data-testid="emp-total-er">{usd(trinetEr)}</td>
                  <td className="py-2 pr-3 text-right">{usd(trinetEe)}</td>
                  <td className="py-2 text-right">{signed(sum((r) => (r.medicalCost?.employer ?? 0) - (r.current?.employer ?? 0)))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-2 text-xs text-tngray-dark">
            The census is saved with this company and is never included in share links. TriNet employer costs include any employer HSA contributions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Quoted plans first, then the rest of the BSS appendix; each shows this employee's tier rate.
function PlanSelect({ label, line, tier, value, onChange }: {
  label: string; line: HealthLine; tier: Tier; value: string; onChange: (plan: string) => void;
}) {
  const quoted = new Set(line.plans.map((p) => p.name));
  const others = line.appendix.filter((p) => !quoted.has(p.name)).sort((a, c) => a.rates[tier] - c.rates[tier]);
  return (
    <select aria-label={label} className={`${inputClass} py-1 px-1.5 text-sm min-w-[200px] max-w-[260px]`} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Waived</option>
      <optgroup label="Quoted plans">
        {line.plans.map((p) => <option key={p.id} value={p.name}>{p.name} ({usd(p.rates[tier])})</option>)}
      </optgroup>
      {others.length > 0 && (
        <optgroup label="Other plans in the BSS">
          {others.map((p) => <option key={p.id} value={p.name}>{p.name} ({usd(p.rates[tier])})</option>)}
        </optgroup>
      )}
    </select>
  );
}
