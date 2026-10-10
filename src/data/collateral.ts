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
