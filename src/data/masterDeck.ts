// The TriNet master proposal deck, served from /deck. Slide numbers match the master deck's order.
export const MASTER_DECK_URL = "/deck/TriNet-Master-Proposal-Deck.pptx";
const pad = (n: number) => String(n).padStart(2, "0");
export const slideImage = (n: number) => `/deck/slides/${pad(n)}.jpg`;
export const slideThumb = (n: number) => `/deck/thumbs/${pad(n)}.jpg`;

export type DeckSection =
  | "First meeting"
  | "Opening"
  | "Value and partnership"
  | "Solutions"
  | "Technology"
  | "HR solutions and impact"
  | "Services model"
  | "Financial and benefits"
  | "Open Market Solutions"
  | "Pricing, timeline and close";

export type MasterSlide = {
  n: number;
  title: string;
  section: DeckSection;
  hidden?: boolean; // hidden in the master deck; unhidden when picked
  internal?: boolean; // TriNet-internal; not for clients
  note?: string; // what the rep should check before presenting
  fills?: string; // what the deck builder fills in from the quote
};

export const MASTER_SLIDES: MasterSlide[] = [
  { n: 1, section: "First meeting", title: "The HR expertise to help SMBs drive success" },
  { n: 2, section: "First meeting", title: "The HR expertise to help SMBs drive success (awards)" },
  { n: 3, section: "First meeting", title: "The PEO model lets you focus on what matters most" },
  { n: 4, section: "First meeting", title: "HR task list" },
  { n: 5, section: "First meeting", title: "TriNet vs. other PEOs" },
  { n: 6, section: "First meeting", title: "Let's get there together" },
  { n: 7, section: "First meeting", title: "Mutual action plan", note: "Fill in target dates and status." },
  { n: 8, section: "First meeting", title: "Central FM to decision blueprint", internal: true },
  { n: 9, section: "Opening", title: "Agenda" },
  { n: 10, section: "Opening", title: "We hear you…", fills: "Call transcript (AI)", note: "Without a call transcript: rewrite for this client's priorities." },
  { n: 11, section: "Opening", title: "Current state", fills: "Call transcript (AI)", note: "Without a call transcript: sample pain points, rewrite for this client." },
  { n: 12, section: "Value and partnership", title: "Values and Partnership (divider)" },
  { n: 13, section: "Value and partnership", title: "The HR expertise to help SMBs drive success" },
  { n: 14, section: "Value and partnership", title: "What this means for the client", fills: "Company name; benefits from the call transcript (AI)" },
  { n: 15, section: "Value and partnership", title: "TriNet vs. other PEOs" },
  { n: 16, section: "Value and partnership", title: "Full-service HR so you can focus on your business" },
  { n: 17, section: "Value and partnership", title: "Over three decades of incredible HR service", hidden: true },
  { n: 18, section: "Value and partnership", title: "Customer testimonial: Edge Electronics" },
  { n: 19, section: "Value and partnership", title: "Running a business is really hard", hidden: true },
  { n: 20, section: "Value and partnership", title: "Being an employer is risky" },
  { n: 21, section: "Value and partnership", title: "There's a race for talent" },
  { n: 22, section: "Value and partnership", title: "Benefits costs and complexity" },
  { n: 23, section: "Value and partnership", title: "Not enough time to focus on business" },
  { n: 24, section: "Value and partnership", title: "Prepare for the unexpected" },
  { n: 25, section: "Solutions", title: "The PEO model lets you focus on what matters most" },
  { n: 26, section: "Solutions", title: "Payroll services that cut complexity" },
  { n: 27, section: "Solutions", title: "Risk mitigation that helps you comply with certainty" },
  { n: 28, section: "Solutions", title: "Workers' compensation to protect you and your employees" },
  { n: 29, section: "Technology", title: "A technology platform with real-time access to HR" },
  { n: 30, section: "Technology", title: "HR task list" },
  { n: 31, section: "Technology", title: "TriNet Mobile" },
  { n: 32, section: "Technology", title: "Integration Center" },
  { n: 33, section: "Technology", title: "Marketplace" },
  { n: 34, section: "Technology", title: "Workforce analytics" },
  { n: 35, section: "Technology", title: "Document management" },
  { n: 36, section: "Technology", title: "Time & attendance" },
  { n: 37, section: "Technology", title: "Applicant tracking" },
  { n: 38, section: "Technology", title: "Expense management" },
  { n: 39, section: "Technology", title: "Performance management" },
  { n: 40, section: "Technology", title: "Learning management" },
  { n: 41, section: "Technology", title: "TriNet Global" },
  { n: 42, section: "Technology", title: "TriNet Perks" },
  { n: 43, section: "Technology", title: "Contractor payments" },
  { n: 44, section: "Technology", title: "The Wing customer community" },
  { n: 45, section: "Technology", title: "Partner Connect" },
  { n: 46, section: "HR solutions and impact", title: "HR solutions that flex to match your needs (ASO vs. PEO)" },
  { n: 47, section: "HR solutions and impact", title: "Making an impact: corporate stewardship" },
  { n: 48, section: "Services model", title: "Services Model (divider)" },
  { n: 49, section: "Services model", title: "HR expertise that helps you take care of your people" },
  { n: 50, section: "Services model", title: "Assigned support and relationship management" },
  { n: 51, section: "Services model", title: "TriNet premium suite of consulting capabilities" },
  { n: 52, section: "Financial and benefits", title: "Financial considerations and discussion (divider)" },
  { n: 53, section: "Financial and benefits", title: "Medical comparison (1 of 3)", note: "Paste in this client's medical comparison." },
  { n: 54, section: "Financial and benefits", title: "Medical comparison (2 of 3)", note: "Paste in this client's medical comparison." },
  { n: 55, section: "Financial and benefits", title: "Medical comparison (3 of 3)", note: "Paste in this client's medical comparison." },
  { n: 56, section: "Financial and benefits", title: "Benefit options that attract top talent" },
  { n: 57, section: "Financial and benefits", title: "Benefits decision support (Healthee)" },
  { n: 58, section: "Financial and benefits", title: "Personal Health Assistant" },
  { n: 59, section: "Financial and benefits", title: "Employee Assistance Program" },
  { n: 60, section: "Financial and benefits", title: "Health Advocate" },
  { n: 61, section: "Open Market Solutions", title: "Open Market Solutions (divider)", hidden: true },
  { n: 62, section: "Open Market Solutions", title: "Benefits are not one-size-fits-all", hidden: true },
  { n: 63, section: "Open Market Solutions", title: "What is Open Market Solutions?", hidden: true },
  { n: 64, section: "Open Market Solutions", title: "Why Open Market Solutions?", hidden: true },
  { n: 65, section: "Open Market Solutions", title: "TriNet voluntary benefits", hidden: true },
  { n: 66, section: "Open Market Solutions", title: "OMS PEO comparison job aid", hidden: true, internal: true },
  {
    n: 67, section: "Pricing, timeline and close", title: "Transparent pricing",
    fills: "Service fee, setup fee, price breaks, rate cap and months free",
    note: "Check the benefits decision support and minimum-fee lock lines.",
  },
  { n: 68, section: "Pricing, timeline and close", title: "Timeline & Next Steps (divider)" },
  {
    n: 69, section: "Pricing, timeline and close", title: "Recommended onboarding timeline",
    fills: "Payroll dates, first check, benefits start and paperwork deadline",
  },
  { n: 70, section: "Pricing, timeline and close", title: "Implementation and transition steps" },
  { n: 71, section: "Pricing, timeline and close", title: "Closing" },
];

export const slideByNumber = (n: number) => MASTER_SLIDES.find((s) => s.n === n)!;

// Master-deck slides shown as collateral on each quote page.
export const PAGE_SLIDES = {
  setup: [7, 69, 70],
  fees: [15, 67],
  benefits: [56, 57, 58, 59, 60],
  medical: [53, 56, 57],
  oms: [63, 64, 66],
  voluntary: [65],
  workersComp: [27, 28, 20],
  taxes: [26, 25],
  competitive: [5, 46, 16],
  vroi: [14, 23],
};
