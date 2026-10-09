// What's included in the Professional Service Fee (PEPM).
// DRAFT: placeholder wording to be replaced with TriNet's official list of included services.
import type { LucideIcon } from "lucide-react";
import { Banknote, HeartPulse, Users, ShieldCheck, MonitorSmartphone, Headset } from "lucide-react";

export type InclusionCategory = {
  title: string;
  icon: LucideIcon;
  summary: string;
  items: string[];
};

export const SERVICE_INCLUSIONS: InclusionCategory[] = [
  {
    title: "Payroll & Tax Administration",
    icon: Banknote,
    summary: "Accurate, on-time pay and tax filings.",
    items: [
      "Full-service payroll processing",
      "Federal, state and local payroll tax filing and payment",
      "Year-end W-2 preparation",
      "Wage garnishment administration",
    ],
  },
  {
    title: "Benefits",
    icon: HeartPulse,
    summary: "Big-company benefits for a small-business team.",
    items: [
      "Access to large-group medical, dental and vision plans",
      "Benefits administration and open enrollment",
      "COBRA administration",
      "Commuter and flexible spending account options",
    ],
  },
  {
    title: "HR Expertise",
    icon: Users,
    summary: "HR professionals on call for everyday questions.",
    items: [
      "Access to HR experts",
      "Onboarding and offboarding support",
      "Employee handbook and policy guidance",
      "Performance and employee relations guidance",
    ],
  },
  {
    title: "Risk Mitigation & Compliance",
    icon: ShieldCheck,
    summary: "Help staying on the right side of employment law.",
    items: [
      "Federal and state employment law guidance",
      "Workers' compensation administration",
      "Unemployment claims management",
      "Required workplace postings and notices",
    ],
  },
  {
    title: "Technology",
    icon: MonitorSmartphone,
    summary: "One platform for the whole team.",
    items: [
      "Online HR platform and mobile app",
      "Employee and manager self-service",
      "Reporting and analytics",
      "Integrations with popular business tools",
    ],
  },
  {
    title: "Service & Support",
    icon: Headset,
    summary: "A team that knows your business.",
    items: [
      "Dedicated service team",
      "Implementation and onboarding to TriNet",
      "Online help center and training resources",
    ],
  },
];
