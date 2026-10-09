import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent } from "../components/ui/card";
import PageTitle from "../components/PageTitle";
import { NAV_ITEMS } from "../components/Layout";
import { useQuote } from "../state/QuoteContext";

const PAYROLL_PROVIDERS = [
  "ADP", "Paychex", "Gusto", "Paylocity", "Paycom", "Paycor", "Rippling", "Justworks", "Insperity",
  "Workday", "UKG", "Ceridian Dayforce", "QuickBooks Payroll", "Intuit", "Namely", "Zenefits", "Bamboo HR",
  "Deel", "Sequoia", "In-house / Manual",
];

const MEDICAL_CARRIERS = [
  "Aetna", "Anthem", "Blue Cross Blue Shield", "Blue Shield of California", "Cigna", "Florida Blue",
  "Harvard Pilgrim", "Highmark", "Humana", "Kaiser Permanente", "Oscar", "Regence", "Tufts Health Plan",
  "UnitedHealthcare", "None (no current plan)",
];

const MAX_LOGO_BYTES = 1024 * 1024;

const labelClass = "block text-sm font-medium mb-1 text-[#0B0134]";
const inputClass = "w-full border border-slate-700 bg-slate-900 rounded-lg px-3 py-2 text-slate-100";

export default function Home() {
  const { quote, update, reset, totalWse } = useQuote();
  const [logoError, setLogoError] = useState("");

  function onLogoSelected(file: File | undefined) {
    setLogoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Please choose an image file (PNG, JPG, SVG, etc.).");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo must be 1 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update({ companyLogo: reader.result as string });
    reader.readAsDataURL(file);
  }

  const toCount = (v: string) => Math.max(0, parseInt(v || "0", 10) || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageTitle title="Quote Details" subtitle="Enter the prospect's details. They're saved in this browser and used across every page." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-slate-800">
          <CardContent className="p-4 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="ft-wse" className={labelClass}>FT WSE count</label>
                <input id="ft-wse" type="number" min={0} className={inputClass}
                  value={quote.ftWse || ""} placeholder="0"
                  onChange={(e) => update({ ftWse: toCount(e.target.value) })} />
              </div>
              <div>
                <label htmlFor="pt-wse" className={labelClass}>PT WSE count</label>
                <input id="pt-wse" type="number" min={0} className={inputClass}
                  value={quote.ptWse || ""} placeholder="0"
                  onChange={(e) => update({ ptWse: toCount(e.target.value) })} />
              </div>
              <div>
                <span className={labelClass}>Total WSE</span>
                <div className="rounded-lg px-3 py-2 bg-slate-100 text-[#0B0134] font-semibold">{totalWse}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="payroll" className={labelClass}>Incumbent payroll provider</label>
                <input id="payroll" list="payroll-providers" className={inputClass}
                  value={quote.incumbentPayroll} placeholder="Start typing or pick from the list"
                  onChange={(e) => update({ incumbentPayroll: e.target.value })} />
                <datalist id="payroll-providers">
                  {PAYROLL_PROVIDERS.map((p) => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div>
                <label htmlFor="carrier" className={labelClass}>Incumbent medical carrier</label>
                <input id="carrier" list="medical-carriers" className={inputClass}
                  value={quote.incumbentMedicalCarrier} placeholder="Start typing or pick from the list"
                  onChange={(e) => update({ incumbentMedicalCarrier: e.target.value })} />
                <datalist id="medical-carriers">
                  {MEDICAL_CARRIERS.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="renewal" className={labelClass}>Medical renewal date</label>
                <input id="renewal" type="date" className={`dark-date ${inputClass}`}
                  value={quote.medicalRenewalDate}
                  onChange={(e) => update({ medicalRenewalDate: e.target.value })} />
              </div>
              <div>
                <label htmlFor="logo" className={labelClass}>Company logo</label>
                <input id="logo" type="file" accept="image/*"
                  className="w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-slate-100 hover:file:bg-slate-800"
                  onChange={(e) => { onLogoSelected(e.target.files?.[0]); e.target.value = ""; }} />
                {logoError && <p className="mt-1 text-sm text-red-600">{logoError}</p>}
              </div>
            </div>

            {quote.companyLogo && (
              <div className="flex items-center gap-4">
                <img src={quote.companyLogo} alt="Client logo" className="h-16 max-w-[240px] object-contain rounded border border-slate-200 p-2" />
                <button type="button" className="text-sm text-red-600 underline" onClick={() => update({ companyLogo: null })}>
                  Remove logo
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200">
              <button type="button" className="text-sm text-slate-500 underline hover:text-slate-700"
                onClick={() => { if (window.confirm("Clear all quote details?")) reset(); }}>
                Clear all quote details
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-800">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-3 text-[#0B0134]">Quote summary</h3>
            <dl className="text-sm space-y-2">
              <SummaryRow label="FT / PT WSE" value={`${quote.ftWse} / ${quote.ptWse} (${totalWse} total)`} />
              <SummaryRow label="Payroll provider" value={quote.incumbentPayroll || "—"} />
              <SummaryRow label="Medical carrier" value={quote.incumbentMedicalCarrier || "—"} />
              <SummaryRow label="Medical renewal"
                value={quote.medicalRenewalDate ? format(new Date(quote.medicalRenewalDate + "T00:00:00"), "MMM d, yyyy") : "—"} />
            </dl>
            <h3 className="text-sm font-semibold mt-6 mb-2 text-[#0B0134]">Next steps</h3>
            <ul className="text-sm space-y-1">
              {NAV_ITEMS.filter((n) => n.to !== "/").map((n) => (
                <li key={n.to}>
                  <Link to={n.to} className="underline text-[#FD5000] hover:opacity-80">{n.label}</Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-[#0B0134]">{value}</dd>
    </div>
  );
}
