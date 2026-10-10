// TriNet collateral shown on quote pages. Highlights quote the source documents; downloads are served from /collateral.
export type Collateral = {
  title: string;
  intro: string;
  highlights: { heading: string; points: string[] }[];
  downloads: { label: string; href: string }[];
  disclosure?: string;
};

export const RETIREMENT_COLLATERAL: Collateral = {
  title: "TriNet 401(k) Plan through Empower",
  intro:
    "Offering retirement benefits may help attract talent and give your company a competitive advantage. The TriNet 401(k) Plan " +
    "through Empower can make offering a retirement plan to your worksite employees more affordable and easier to administer.",
  highlights: [
    {
      heading: "Company fees",
      points: [
        "No set-up fees or on-going maintenance fee",
        "$1,000 TriNet termination fee (additional fees may apply for non-standard services such as profit-sharing allocations and plan amendments)",
      ],
    },
    {
      heading: "Participant fees",
      points: [
        "Annual participant administration fee of $63 ($5.25 deducted from the participant's account monthly)",
        "Transaction-based fees, for example loan origination ($75), quarterly loan maintenance ($10) and distributions ($40)",
      ],
    },
    {
      heading: "Administration handled for you",
      points: [
        "Transmitting contributions and participant data",
        "Nondiscrimination testing and required government filings, including Form 5500",
        "Managing the annual independent audit",
        "Approving and administering loans and distributions",
      ],
    },
    {
      heading: "For worksite employees",
      points: [
        "Investment choices from American Funds, BlackRock, PIMCO and Vanguard, including target date and index funds",
        "Single sign-on through TriNet, plus 24-hour website and phone access",
        "On-site and online bilingual enrollment and education support",
      ],
    },
  ],
  downloads: [
    { label: "401(k) cost flyer", href: "/collateral/TriNet_401k_Cost_Flyer.pdf" },
    { label: "All the advantages without the hassle", href: "/collateral/TriNet_401k_Plan_Advantages_Without_the_Hassle.pdf" },
    { label: "Adding value to your benefits offering", href: "/collateral/TriNet_401k_Plan_Adding_Value.pdf" },
  ],
  disclosure:
    "Fees shown are as of 01/2023 and do not reflect all possible fees. Empower Retirement, LLC and its affiliates are not affiliated with TriNet. " +
    "Securities are offered and/or distributed by Empower Financial Services, Inc., Member FINRA/SIPC.",
};

// TriNet 401(k) Plan fees: no company set-up or maintenance fees; participant fees come out of participant accounts.
export const TRINET_401K_DEFAULTS = {
  provider: "TriNet 401(k) Plan through Empower",
  adminFeeAnnual: 0,
  perParticipantFeeAnnual: 63,
  employerPaysFees: false,
};

// From the TriNet EPLI Coverage Summary (APR 2023).
export const EPLI_COLLATERAL: Collateral = {
  title: "$1M employment practices liability insurance, included",
  intro:
    "TriNet secures Employment Practices Liability Insurance (EPLI) to help protect TriNet and its client companies from many of the " +
    "liabilities inherent in the employment relationship. Coverage is included in the Professional Service Fee.",
  highlights: [
    {
      heading: "Coverage",
      points: [
        "$1,000,000 per claim limit of liability; claims from multiple plaintiffs over the same or related acts may be treated as one claim",
        "Claims alleging wrongful termination, discrimination, harassment, retaliation and employment-related workplace torts",
        "Administrative agency proceedings, plus punitive damages where allowed by law",
        "Claims-made and reported basis: claims must be first made, and reported, during the coverage term",
      ],
    },
    {
      heading: "How claims work",
      points: [
        "Forward any claim to TriNet (Connect 360) the same day it's received, and no later than 72 hours",
        "The insurer appoints defense counsel and makes coverage decisions; don't settle without the insurer's consent",
        "Retention amounts are set in the TriNet service agreement",
        "TriNet's policy is excess of any EPLI the company buys itself",
      ],
    },
    {
      heading: "Good to know",
      points: [
        "No coverage for events before the company's TriNet start date; a standalone policy can avoid a gap",
        "Coverage ends when the service agreement ends; consider tail coverage with a broker",
      ],
    },
    {
      heading: "Not covered (examples)",
      points: [
        "Wage and hour claims (FLSA, overtime, minimum wage), except Equal Pay Act claims",
        "ERISA, NLRA, WARN, COBRA and OSHA claims, except for retaliation",
        "Prior acts, deliberate criminal or fraudulent acts, bodily injury, breach of a written contract and biometric information claims",
      ],
    },
  ],
  downloads: [{ label: "EPLI coverage summary", href: "/collateral/TriNet_EPLI_Coverage_Summary.pdf" }],
  disclosure:
    "Summary only; the policy and the TriNet service agreement control. The insurer has sole authority over coverage decisions.",
};

// From the Legal Hotline FAQ (Fisher Phillips).
export const LEGAL_HOTLINE_COLLATERAL: Collateral = {
  title: "Legal Hotline with Fisher Phillips",
  intro:
    "TriNet has partnered with Fisher Phillips, a national employment law firm, to give TriNet clients a Legal Hotline for general " +
    "legal advice on HR and employment law questions beyond the scope of TriNet's HR advice. It's free for current TriNet clients.",
  highlights: [
    {
      heading: "About Fisher Phillips",
      points: [
        "National law firm with 37 offices and 550 attorneys across the U.S.",
        "Over 80 years representing employers in all aspects of workplace law",
        "Harassment and discrimination, leave and disability, wage-hour, immigration, trade secrets, labor relations and more",
      ],
    },
    {
      heading: "How it works",
      points: [
        "Start with TriNet; when legal advice is needed, TriNet refers you to Fisher Phillips",
        "An attorney responds within 48 hours of the referral, usually from the nearest office or a subject specialist",
        "No limit on referrals for unique questions; calls are generally up to 30 minutes",
        "Protected by attorney-client privilege: TriNet only sees the company name, client ID and a general call topic",
      ],
    },
    {
      heading: "Examples of what's in scope",
      points: [
        "What courts and the EEOC consider harassment, and steps for investigating a complaint",
        "When FMLA or state leave laws apply and how leave interacts with disability accommodation",
        "General wage and hour rules, such as pay timing, records and exempt tests",
      ],
    },
    {
      heading: "Not included",
      points: [
        "Active litigation, drafting or reviewing documents, legal research or ongoing advice on the same matter",
        "Deciding whether a specific personnel action should be taken",
        "Reporting a claim or lawsuit; report claims to TriNet under the EPLI policy",
      ],
    },
  ],
  downloads: [{ label: "Legal Hotline FAQ", href: "/collateral/Fisher_Phillips_Legal_Hotline_FAQ.pdf" }],
  disclosure: "For ongoing advice beyond the Hotline, companies can retain Fisher Phillips directly at the firm's rates.",
};
