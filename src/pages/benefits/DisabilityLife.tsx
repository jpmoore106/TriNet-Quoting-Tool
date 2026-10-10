import { Section, TextField, labelClass, inputClass } from "../../components/form";
import { useQuote } from "../../state/QuoteContext";
import { RATE_BASIS, type RateBasis, type RiskCoverage } from "../../state/benefits";
import { riskPremium } from "../../lib/benefits";
import { usd } from "../../lib/pricing";
import { CellMoney, CellNumber, Totals } from "./fields";

export default function DisabilityLife() {
  const { quote, updateBenefits } = useQuote();
  const risk = quote.benefits.risk;
  const setCov = (id: RiskCoverage["id"], changes: Partial<RiskCoverage>) =>
    updateBenefits({ risk: risk.map((c) => (c.id === id ? { ...c, ...changes } : c)) });
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
                    <CellNumber label={`${c.name} employer %`} value={c.employerPct} suffix="%" onChange={(v) => setCov(c.id, { employerPct: Math.min(100, v) })} />
                  </div>
                </div>
                <p className="text-sm text-tngray-dark" data-testid={`${c.id}-totals`}>
                  {usd(p.premium)}/mo premium · <span className="font-semibold text-navy">{usd(p.employer)}/mo employer</span> · {usd(p.employee)}/mo employee
                </p>
              </>
            )}
          </Section>
        );
      })}
    </div>
  );
}
