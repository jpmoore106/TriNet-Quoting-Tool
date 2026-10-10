import { Section, TextField, labelClass, inputClass } from "../../components/form";
import { useQuote } from "../../state/QuoteContext";
import {
  RATE_BASIS, RISK_DESIGN_FIELDS, designOrBlank, riskDesignFromName,
  type DisabilityOption, type LifeOption, type RateBasis, type RiskCoverage,
} from "../../state/benefits";
import { Card, CardContent } from "../../components/ui/card";
import { DesignFields } from "./PlanDesign";
import { riskPremium } from "../../lib/benefits";
import { usd } from "../../lib/pricing";
import { CellMoney, CellNumber, Totals } from "./fields";

export default function DisabilityLife() {
  const { quote, updateBenefits } = useQuote();
  const risk = quote.benefits.risk;
  // Editing the rate inputs switches from the imported quoted cost to rate × volume.
  const setCov = (id: RiskCoverage["id"], changes: Partial<RiskCoverage>) => {
    const recalc = "rate" in changes || "volume" in changes || "basis" in changes;
    updateBenefits({ risk: risk.map((c) => (c.id === id ? { ...c, ...changes, ...(recalc ? { quotedMonthly: 0 } : {}) } : c)) });
  };
  const options = quote.benefits.riskOptions;

  // Apply a disability package from the BSS: its STD and LTD plans (an employee-paid side has no employer cost).
  const useDisability = (o: DisabilityOption) => {
    const side = (id: "std" | "ltd"): RiskCoverage => {
      const base = risk.find((c) => c.id === id)!;
      const rows = o.rows.filter((r) => r.type === id.toUpperCase());
      // A package lists no plan for an employee-paid side (e.g. "STD Employee Paid & 60% LTD Company Paid").
      const employeePaid = rows.length === 0 && /Employee Paid/i.test(o.name);
      if (rows.length === 0) {
        const benefit = employeePaid ? `${id.toUpperCase()} Employee Paid` : "";
        return { ...base, enabled: employeePaid, employeePaid, employerPct: 0, benefit, rate: 0, volume: 0, quotedMonthly: 0, employees: 0, design: riskDesignFromName(id, benefit) };
      }
      const benefit = rows[0].plan;
      return {
        ...base, enabled: true, employeePaid: false, employerPct: 100, carrier: base.carrier || "TriNet", benefit,
        rate: rows[0].rate, basis: rows[0].basis,
        volume: rows.reduce((a, r) => a + r.volume, 0),
        quotedMonthly: Math.round(rows.reduce((a, r) => a + r.monthly, 0) * 100) / 100,
        employees: rows.reduce((a, r) => a + r.employees, 0),
        design: riskDesignFromName(id, benefit),
      };
    };
    const b = quote.benefits;
    updateBenefits({
      risk: risk.map((c) => (c.id === "std" ? side("std") : c.id === "ltd" ? side("ltd") : c)),
      source: b.source ? { ...b.source, disabilityPackage: o.name } : b.source,
    });
  };
  const useLife = (o: LifeOption) => updateBenefits({
    risk: risk.map((c) => c.id !== "life" ? c : {
      ...c, enabled: true, employeePaid: false, employerPct: 100, carrier: c.carrier || "TriNet", benefit: o.plan, rate: o.rate,
      basis: "per1000", volume: o.volume, quotedMonthly: o.monthly, employees: o.employees, design: riskDesignFromName("life", o.plan),
    }),
  });

  const total = risk.map(riskPremium).reduce((a, r) => ({ premium: a.premium + r.premium, employer: a.employer + r.employer, employee: a.employee + r.employee }), { premium: 0, employer: 0, employee: 0 });

  return (
    <div className="space-y-6">
      <Totals items={[
        { label: "Monthly premium", value: usd(total.premium), testId: "risk-premium" },
        { label: "Employer / month", value: usd(total.employer), testId: "risk-employer" },
        { label: "Employee / month", value: usd(total.employee) },
        { label: "Employer / year", value: usd(total.employer * 12, 0) },
      ]} />
      {risk.map((c) => {
        const p = riskPremium(c);
        return (
          <Section key={c.id} title={c.name}>
            <label className="flex items-center gap-2 text-sm font-semibold text-navy">
              <input id={`${c.id}-enabled`} type="checkbox" checked={c.enabled} onChange={(e) => setCov(c.id, { enabled: e.target.checked })} />
              Include {c.name}
            </label>
            {c.enabled && (
              <label className="flex items-center gap-2 text-sm font-semibold text-navy">
                <input id={`${c.id}-employee-paid`} type="checkbox" checked={c.employeePaid}
                  onChange={(e) => setCov(c.id, { employeePaid: e.target.checked, employerPct: e.target.checked ? 0 : 100 })} />
                Employee paid <span className="font-normal text-tngray-dark">(voluntary: employees pay the full premium)</span>
              </label>
            )}
            {c.enabled && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField id={`${c.id}-carrier`} label="Carrier" value={c.carrier} onChange={(v) => setCov(c.id, { carrier: v })} />
                  <TextField id={`${c.id}-benefit`} label="Benefit" value={c.benefit} onChange={(v) => setCov(c.id, { benefit: v })}
                    placeholder={c.id === "life" ? "e.g. 1x salary to $50,000" : c.id === "std" ? "e.g. 60% to $1,000/week" : "e.g. 60% to $5,000/month"} />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className={labelClass}>Monthly rate</label>
                    <CellMoney label={`${c.name} rate`} value={c.rate} onChange={(v) => setCov(c.id, { rate: v })} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor={`${c.id}-basis`}>Rate basis</label>
                    <select id={`${c.id}-basis`} className={`${inputClass} py-1.5 text-sm`} value={c.basis}
                      onChange={(e) => setCov(c.id, { basis: e.target.value as RateBasis })}>
                      {(Object.keys(RATE_BASIS) as RateBasis[]).map((b) => <option key={b} value={b}>{RATE_BASIS[b].label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{RATE_BASIS[c.basis].volumeLabel}</label>
                    <CellNumber label={`${c.name} volume`} value={c.volume} step={0.01} onChange={(v) => setCov(c.id, { volume: v })} />
                  </div>
                  <div>
                    <label className={labelClass}>Employer pays</label>
                    {c.employeePaid
                      ? <p className="py-1.5 text-sm text-tngray-dark">0% (employee paid)</p>
                      : <CellNumber label={`${c.name} employer %`} value={c.employerPct} suffix="%" onChange={(v) => setCov(c.id, { employerPct: Math.min(100, v) })} />}
                  </div>
                </div>
                {c.quotedMonthly > 0 && (
                  <p className="text-sm text-tngray-dark">
                    Monthly cost of {usd(c.quotedMonthly)} is from the imported quote{c.employees ? ` (${c.employees} employees)` : ""}. Editing the rate, basis or volume recalculates it.
                  </p>
                )}
                <DesignFields idPrefix={c.id} title="Plan design" design={designOrBlank(c.design, RISK_DESIGN_FIELDS[c.id])}
                  onChange={(design) => setCov(c.id, { design })} />
                <p className="text-sm text-tngray-dark" data-testid={`${c.id}-totals`}>
                  {usd(p.premium)}/mo premium · <span className="font-semibold text-navy">{usd(p.employer)}/mo employer</span> · {usd(p.employee)}/mo employee
                </p>
              </>
            )}
          </Section>
        );
      })}

      {options.disability.length > 0 && (
        <Card>
          <CardContent className="p-5 sm:p-6 overflow-x-auto">
            <h3 className="text-lg font-bold text-navy">Disability plan options</h3>
            <p className="text-sm text-tngray-dark mb-3">Every STD and LTD package in the BSS. Use one to replace the STD and LTD above.</p>
            <table className="w-full min-w-[720px] text-sm" data-testid="disability-options">
              <thead>
                <tr className="text-left text-tngray-dark border-b border-tngray-light">
                  <th className="py-2 pr-3 font-semibold">Package</th>
                  <th className="py-2 pr-3 font-semibold">STD</th>
                  <th className="py-2 pr-3 font-semibold">LTD</th>
                  <th className="py-2 pr-3 font-semibold text-right">Monthly cost</th>
                  <th className="py-2 font-semibold"><span className="sr-only">Use</span></th>
                </tr>
              </thead>
              <tbody>
                {options.disability.map((o) => {
                  const desc = (t: "STD" | "LTD") => {
                    const rows = o.rows.filter((r) => r.type === t);
                    return rows.length ? `${rows[0].plan} · ${usd(rows.reduce((a, r) => a + r.monthly, 0))}/mo` : /Employee Paid/i.test(o.name) ? "Employee paid" : "—";
                  };
                  const active = quote.benefits.source?.disabilityPackage === o.name;
                  return (
                    <tr key={o.name} className={`border-b border-tngray-light last:border-0 ${active ? "bg-orange/5" : ""}`}>
                      <td className="py-2 pr-3 font-semibold">{o.name}{active && <span className="ml-2 rounded bg-navy px-1.5 py-0.5 text-[11px] font-bold text-white">In quote</span>}</td>
                      <td className="py-2 pr-3">{desc("STD")}</td>
                      <td className="py-2 pr-3">{desc("LTD")}</td>
                      <td className="py-2 pr-3 text-right">{usd(o.monthly)}</td>
                      <td className="py-2 text-right">
                        <button type="button" className="text-sm font-semibold text-navy underline" onClick={() => useDisability(o)}
                          aria-label={`Use ${o.name}`}>Use</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {options.life.length > 0 && (
        <Card>
          <CardContent className="p-5 sm:p-6 overflow-x-auto">
            <h3 className="text-lg font-bold text-navy">Life and AD&D plan options</h3>
            <p className="text-sm text-tngray-dark mb-3">Every basic life and AD&D option in the BSS.</p>
            <table className="w-full min-w-[560px] text-sm" data-testid="life-options">
              <thead>
                <tr className="text-left text-tngray-dark border-b border-tngray-light">
                  <th className="py-2 pr-3 font-semibold">Plan</th>
                  <th className="py-2 pr-3 font-semibold text-right">Rate per $1,000</th>
                  <th className="py-2 pr-3 font-semibold text-right">Covered volume</th>
                  <th className="py-2 pr-3 font-semibold text-right">Monthly cost</th>
                  <th className="py-2 font-semibold"><span className="sr-only">Use</span></th>
                </tr>
              </thead>
              <tbody>
                {options.life.map((o) => {
                  const active = risk.find((c) => c.id === "life")?.benefit === o.plan;
                  return (
                    <tr key={o.plan} className={`border-b border-tngray-light last:border-0 ${active ? "bg-orange/5" : ""}`}>
                      <td className="py-2 pr-3 font-semibold">{o.plan}{active && <span className="ml-2 rounded bg-navy px-1.5 py-0.5 text-[11px] font-bold text-white">In quote</span>}</td>
                      <td className="py-2 pr-3 text-right">${o.rate.toFixed(4)}</td>
                      <td className="py-2 pr-3 text-right">{usd(o.volume, 0)}</td>
                      <td className="py-2 pr-3 text-right">{usd(o.monthly)}</td>
                      <td className="py-2 text-right">
                        <button type="button" className="text-sm font-semibold text-navy underline" onClick={() => useLife(o)} aria-label={`Use ${o.plan}`}>Use</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
