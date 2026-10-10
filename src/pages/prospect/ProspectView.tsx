import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Mail, Printer } from "lucide-react";
import TriNetLogo from "../../assets/trinet_logo_full_color.png";
import WingMotif from "../../components/WingMotif";
import EmailCodeForm from "../../components/EmailCodeForm";
import { Loading } from "../../components/AccountGate";
import { Card, CardContent } from "../../components/ui/card";
import { primaryButton } from "../../components/form";
import { useAuth } from "../../state/AuthContext";
import { openShare, recordView, type ProspectSnapshot } from "../../lib/cloud/shares";
import { carveOutNote, inclusionsFor } from "../../data/serviceInclusions";
import { feeSummary, formatDate, freeMonthsCredit, priceBreakRows, rateCapLimits, setupFeeSchedule, usd } from "../../lib/pricing";
import { benefitsSummary, currentVsTrinet, employerContribution, hsaContribution } from "../../lib/benefits";
import { TIERS, TIER_LABELS, type HealthLine } from "../../state/benefits";
import { DesignList } from "../benefits/PlanDesign";

// The page a prospect opens from a share link. They sign in with an emailed code; the database only
// returns the proposal if the link was sent to their email and hasn't expired or been revoked.
export default function ProspectView() {
  const { shareId = "" } = useParams();
  const { loading, session, email, profile, signOut } = useAuth();
  const [state, setState] = useState<{ status: "idle" | "loading" | "ready" | "missing" | "error"; snapshot?: ProspectSnapshot }>({ status: "idle" });
  const recorded = useRef(false);

  useEffect(() => {
    if (!session) return setState({ status: "idle" });
    let live = true;
    setState({ status: "loading" });
    openShare(shareId)
      .then((snapshot) => {
        if (!live) return;
        setState(snapshot ? { status: "ready", snapshot } : { status: "missing" });
        // Count prospect visits only; TriNet users previewing the link aren't recorded.
        if (snapshot && !profile && !recorded.current) { recorded.current = true; void recordView(shareId); }
      })
      .catch(() => live && setState({ status: "error" }));
    return () => { live = false; };
  }, [session, shareId, profile]);

  if (loading || state.status === "loading") return <Loading label="Opening your proposal…" />;

  if (!session) {
    return (
      <Shell>
        <h1 className="mt-6 text-2xl font-bold">Your TriNet proposal</h1>
        <p className="mt-1 mb-6 text-sm text-tngray-dark">
          This proposal is confidential. Enter the email address it was sent to, and we'll email you a one-time code to open it.
        </p>
        <EmailCodeForm />
      </Shell>
    );
  }

  if (state.status !== "ready" || !state.snapshot) {
    return (
      <Shell>
        <h1 className="mt-6 text-2xl font-bold">{state.status === "error" ? "Couldn't open this proposal" : "This link isn't available"}</h1>
        <p className="mt-2 text-sm text-tngray-dark" data-testid="share-unavailable">
          {state.status === "error"
            ? "Check your connection and try again."
            : `You're signed in as ${email}. This proposal wasn't shared with that email, or the link has expired or been turned off. Contact your TriNet representative for a new link.`}
        </p>
        <button type="button" className={`${primaryButton} mt-5`} onClick={() => void signOut()}>Sign in with a different email</button>
      </Shell>
    );
  }

  return <Proposal snapshot={state.snapshot} email={email} onSignOut={() => void signOut()} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas font-brand text-navy flex items-center justify-center px-4 py-10">
      <WingMotif size={140} thickness={34} className="right-0 top-0" />
      <Card className="relative w-full max-w-md">
        <CardContent className="p-6 sm:p-8">
          <img src={TriNetLogo} alt="TriNet" className="h-8 w-auto" />
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

function Proposal({ snapshot, email, onSignOut }: { snapshot: ProspectSnapshot; email: string; onSignOut: () => void }) {
  const q = snapshot.quote;
  const carveOuts = { medical: q.benefits.medicalCarvedOut, workersComp: q.workersCompCarvedOut };
  const company = q.companyName || "Your company";
  const fees = feeSummary(q);
  const breaks = priceBreakRows(q);
  const cap = rateCapLimits(q);
  const setup = setupFeeSchedule(q);
  const free = freeMonthsCredit(q);
  const benefits = benefitsSummary(q.benefits);
  const benefitLines = benefits.lines.filter((l) => l.premium > 0);
  const comparison = currentVsTrinet(q.benefits, q.medicalRenewalDate);
  const hasCurrent = comparison.current.employer + comparison.current.employee > 0;
  const t = snapshot.timeline;
  const timeline = [
    { label: "Paperwork deadline", value: t.paperworkDeadline },
    { label: "First TriNet payroll period", value: t.payrollStart && t.payrollEnd ? `${formatDate(t.payrollStart)} – ${formatDate(t.payrollEnd)}` : "" },
    { label: "First TriNet paycheck", value: t.firstCheck },
    { label: "Benefits start", value: t.benefitsStart },
  ].filter((x) => x.value);

  return (
    <div className="min-h-screen bg-canvas print:bg-white font-brand text-navy" data-testid="prospect-proposal">
      <div className="no-print bg-navy">
        <div className="max-w-5xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm text-white/80">
          <span>Signed in as {email}</span>
          <span className="flex gap-3">
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 font-semibold text-white"><Printer className="h-4 w-4" aria-hidden /> Print</button>
            <button type="button" onClick={onSignOut} className="font-semibold text-white">Sign out</button>
          </span>
        </div>
      </div>

      <article className="relative max-w-5xl mx-auto bg-white shadow-sm print:shadow-none overflow-hidden sm:my-6 sm:rounded-2xl">
        <WingMotif size={96} thickness={24} className="right-0 top-0" />
        <header className="px-6 sm:px-10 pt-8 pb-6 border-b border-tngray-light flex flex-wrap items-end justify-between gap-6">
          <div>
            <img src={TriNetLogo} alt="TriNet" className="h-8 w-auto" />
            <h1 className="mt-5 text-3xl sm:text-4xl font-bold leading-tight">
              <span className="block text-orange">Proposal for</span>{company}
            </h1>
            <p className="mt-2 text-sm text-tngray-dark">
              {snapshot.rep.name ? `Prepared by ${snapshot.rep.name} · ` : ""}Pricing as of {formatDate(snapshot.publishedAt.slice(0, 10), "MMMM d, yyyy")}
            </p>
          </div>
          {q.companyLogo && <img src={q.companyLogo} alt={`${company} logo`} className="h-16 max-w-[200px] object-contain sm:mr-16" />}
        </header>

        <div className="px-6 sm:px-10 py-8 space-y-10">
          <Section title="Your investment">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Tile label={fees.hasPt ? "Blended PEPM" : "Per employee per month"} value={usd(fees.pepm)} highlight />
              <Tile label="Monthly service fee" value={fees.monthly > 0 ? usd(fees.monthly, 0) : "—"} />
              <Tile label="Annual service fee" value={fees.annual > 0 ? usd(fees.annual, 0) : "—"} />
              <Tile label="Setup fee" value={setup.gross > 0 ? usd(setup.net, 0) : "—"}
                detail={setup.count > 1 ? `${setup.count} payments of ${usd(setup.schedule[0].amount)}` : undefined} />
            </div>
            <p className="mt-3 text-sm text-tngray-dark">
              {fees.totalWse} employees{fees.hasPt ? ` (${fees.ft} full-time at ${usd(q.ftPepm)} and ${fees.pt} part-time at ${usd(q.ptPepm)} per month)` : ""}.
              {fees.minimumApplied ? ` Includes the ${usd(q.serviceFeeMinimum, 0)} monthly minimum service fee.` : ""}
            </p>
            {free.months > 0 && fees.monthly > 0 && (
              <p className="mt-3 rounded-xl bg-orange/10 px-4 py-3 font-semibold" data-testid="prospect-free-months">
                {free.months} month{free.months > 1 ? "s" : ""} free: a {usd(free.credit, 0)} credit in your first year, so your year-one service fee is {usd(free.yearOne, 0)}.
              </p>
            )}
            {(breaks.length > 0 || cap) && (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                {breaks.length > 0 && (
                  <div>
                    <h3 className="font-bold">Price breaks as you grow</h3>
                    <table className="mt-2 w-full text-sm">
                      <thead><tr className="border-b text-left text-tngray-dark"><th className="py-1 font-medium">Headcount</th><th className="py-1 font-medium">Full-time PEPM</th></tr></thead>
                      <tbody>{breaks.map((b) => <tr key={b.id} className="border-b border-tngray-light"><td className="py-1.5">{b.headcount}+</td><td className="py-1.5 font-semibold">{usd(b.pepm)}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
                {cap && (
                  <div>
                    <h3 className="font-bold">Rate protection</h3>
                    <p className="mt-2 text-sm">
                      {cap.percent > 0 ? `At your year 2 renewal, your PEPM won't increase more than ${cap.percent}%` : "Your PEPM won't increase at your year 2 renewal"}
                      {cap.percent > 0 ? ` (a maximum of ${usd(cap.ftMax)}${fees.hasPt ? ` full-time and ${usd(cap.ptMax)} part-time` : ""}).` : "."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Section>

          {benefitLines.length > 0 && (
            <Section title="Your benefits">
              <p className="text-sm text-tngray-dark">
                Monthly costs{q.benefits.effectiveDate ? `, effective ${formatDate(q.benefits.effectiveDate, "MMMM d, yyyy")}` : ""}.
              </p>
              <table className="mt-3 w-full text-sm" data-testid="prospect-benefits">
                <thead>
                  <tr className="border-b text-left text-tngray-dark">
                    <th className="py-1.5 font-medium">Benefit</th><th className="py-1.5 font-medium text-right">Company pays</th>
                    <th className="py-1.5 font-medium text-right">Employees pay</th><th className="py-1.5 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {benefitLines.map((l) => (
                    <tr key={l.key} className="border-b border-tngray-light">
                      <td className="py-1.5 font-semibold">{l.label}</td><td className="py-1.5 text-right">{usd(l.employer, 0)}</td>
                      <td className="py-1.5 text-right">{usd(l.employee, 0)}</td><td className="py-1.5 text-right">{usd(l.premium, 0)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2">Total</td><td className="py-2 text-right">{usd(benefits.total.employer, 0)}</td>
                    <td className="py-2 text-right">{usd(benefits.total.employee, 0)}</td><td className="py-2 text-right">{usd(benefits.total.premium, 0)}</td>
                  </tr>
                </tbody>
              </table>
              {(["medical", "dental", "vision"] as const).map((k) => q.benefits[k].plans.length > 0 && (
                <PlanTable key={k} title={k[0].toUpperCase() + k.slice(1)} line={q.benefits[k]} />
              ))}
              {q.benefits.risk.some((c) => c.enabled) && (
                <div className="mt-6">
                  <h3 className="font-bold">Disability and life</h3>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {q.benefits.risk.filter((c) => c.enabled).map((c) => (
                      <div key={c.id} className="rounded-xl bg-canvas p-4">
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-xs text-tngray-dark">{c.benefit}{c.employeePaid ? " · Employee paid" : ""}</p>
                        <div className="mt-2"><DesignList design={c.design} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {hasCurrent && (
            <Section title="Today vs. TriNet">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-tngray-dark">
                    <th className="py-1.5 font-medium">Monthly</th><th className="py-1.5 font-medium text-right">Today: company</th>
                    <th className="py-1.5 font-medium text-right">Today: employees</th><th className="py-1.5 font-medium text-right">TriNet: company</th>
                    <th className="py-1.5 font-medium text-right">TriNet: employees</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map((r) => (
                    <tr key={r.key} className="border-b border-tngray-light">
                      <td className="py-1.5 font-semibold">{r.label}</td>
                      <td className="py-1.5 text-right">{usd(r.current.employer, 0)}</td><td className="py-1.5 text-right">{usd(r.current.employee, 0)}</td>
                      <td className="py-1.5 text-right">{usd(r.trinet.employer, 0)}</td><td className="py-1.5 text-right">{usd(r.trinet.employee, 0)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right">{usd(comparison.current.employer, 0)}</td><td className="py-2 text-right">{usd(comparison.current.employee, 0)}</td>
                    <td className="py-2 text-right">{usd(comparison.trinet.employer, 0)}</td><td className="py-2 text-right">{usd(comparison.trinet.employee, 0)}</td>
                  </tr>
                </tbody>
              </table>
              {comparison.renewal && q.benefits.current.anticipatedRenewalPct > 0 && (
                <p className="mt-2 text-xs text-tngray-dark">
                  Today's medical includes an anticipated {q.benefits.current.anticipatedRenewalPct}% increase at your {comparison.renewal.currentRenewal} renewal.
                </p>
              )}
            </Section>
          )}

          <Section title="What's included">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {inclusionsFor(carveOuts).map((c) => (
                <div key={c.title} className="flex gap-3">
                  <img src={c.icon} alt="" className="h-9 w-9 shrink-0 object-contain" />
                  <div>
                    <p className="font-bold">{c.title}</p>
                    <ul className="mt-1 space-y-0.5 text-sm text-tngray-dark">{c.items.map((i) => <li key={i}>{i}</li>)}</ul>
                  </div>
                </div>
              ))}
            </div>
            {carveOutNote(carveOuts) && <p className="mt-4 text-sm text-tngray-dark" data-testid="carve-out-note">{carveOutNote(carveOuts)}</p>}
          </Section>

          {timeline.length > 0 && (
            <Section title="Getting started">
              <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {timeline.map((x) => (
                  <li key={x.label} className="rounded-xl bg-canvas p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-tngray-dark">{x.label}</p>
                    <p className="mt-1 text-lg font-bold">{/^\d{4}-\d{2}-\d{2}$/.test(x.value) ? formatDate(x.value, "MMMM d, yyyy") : x.value}</p>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          <Section title="Questions?">
            <p className="text-sm">
              {snapshot.rep.name || "Your TriNet representative"} is here to help.
              {snapshot.rep.email && (
                <a href={`mailto:${snapshot.rep.email}`} className="ml-2 inline-flex items-center gap-1 font-semibold text-orange-dark underline">
                  <Mail className="h-4 w-4" aria-hidden /> {snapshot.rep.email}
                </a>
              )}
            </p>
            <p className="mt-4 text-xs text-tngray-dark">
              This proposal is confidential and intended only for {company}. Pricing is an estimate based on the information provided
              and is subject to change.
            </p>
          </Section>
        </div>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><span className="h-3 w-3 bg-orange" aria-hidden />{title}</h2>
      {children}
    </section>
  );
}

function Tile({ label, value, detail, highlight }: { label: string; value: string; detail?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "bg-navy text-white" : "bg-canvas"}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${highlight ? "text-white/80" : "text-tngray-dark"}`}>{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {detail && <p className={`text-xs ${highlight ? "text-white/80" : "text-tngray-dark"}`}>{detail}</p>}
    </div>
  );
}

// Each plan's monthly premium and the employee's share by coverage tier.
function PlanTable({ title, line }: { title: string; line: HealthLine }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <h3 className="font-bold">{title} plans: employee cost per month</h3>
      <table className="mt-2 w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b text-left text-tngray-dark">
            <th className="py-1.5 font-medium">Plan</th>
            {TIERS.map((t) => <th key={t} className="py-1.5 font-medium text-right">{TIER_LABELS[t]}</th>)}
          </tr>
        </thead>
        <tbody>
          {line.plans.map((p) => (
            <tr key={p.id} className="border-b border-tngray-light">
              <td className="py-1.5 pr-3 align-top">
                <span className="font-semibold">{p.name || "Plan"}</span>{p.carrier ? <span className="block text-xs text-tngray-dark">{p.carrier}</span> : null}
                {p.design?.some((d) => d.value) && <div className="mt-1"><DesignList design={p.design} /></div>}
              </td>
              {TIERS.map((t) => {
                const premium = p.rates[t] || 0;
                const employee = premium - employerContribution(p, line, t);
                const hsa = hsaContribution(p, line, t);
                return (
                  <td key={t} className="py-1.5 text-right align-top">
                    <span className="font-semibold">{premium ? usd(employee) : "—"}</span>
                    {premium > 0 && <span className="block text-xs text-tngray-dark">of {usd(premium)}{hsa ? ` · +${usd(hsa)} HSA` : ""}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
