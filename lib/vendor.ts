// Everything specific to the company this demo is built for lives here: name,
// product lineup, how the CS team works, how the agent scores news, and where
// industry news comes from. Prompts, plays, filters, and page copy read from it.
//
// Product lineup is from raptormaps.com and public announcements; the plays and
// the product split are this dashboard's own framing of it.

export interface Product {
  value: string; // stable id used in companies.json `products`
  label: string;
  description: string; // what it is, for the model
  core?: boolean; // the platform nearly every account owns: too broad to link an account to routine industry news
}

export const VENDOR = {
  name: "Raptor Maps",
  website: "https://raptormaps.com/",
  appName: "Signal Desk",
  teamLabel: "Raptor Maps CS", // header badge
  role: "Director of Customer Success", // footer: "built for the <role> conversation"
  summary: `an MIT-born climate tech company whose software platform runs remotely managed
solar operations (digital twins, drone and robotic inspections, analytics) for utility-scale
and C&I solar owners, operators, O&M providers, and EPCs, across 150+ GW in 50+ countries`,
  csMotion: `The customer success team owns gross revenue retention and expansion ARR across
a book of solar owners (IPPs, utilities), O&M providers, and EPCs. Revenue scales with the
megawatts and sites a customer runs on the platform and with inspection/robotics usage
(a consumption, credit-style model). The job: know what is happening at each key account
before they bring it up, protect renewals, grow coverage to new sites and products, and
bring structured customer insight back to Product.`,
};

// The four solutions as Raptor Maps presents them.
export const PRODUCTS: Product[] = [
  {
    value: "raptor_solar",
    label: "Raptor Solar (RS)",
    core: true,
    description:
      "core platform: performance intelligence and workflows to increase project rate of return (digital twin, SCADA/performance analytics, mobile app, work orders); scales with MW/sites covered",
  },
  {
    value: "sentry",
    label: "RS Sentry",
    description:
      "continuous monitoring and rapid remote response without someone on site: autonomous drone docks for scheduled, alert-triggered, and storm-response flights",
  },
  {
    value: "inspections",
    label: "RS Inspections",
    description:
      "solar's most comprehensive visual analytics suite: aerial thermography and visual inspections (DC health, cracks, erosion, vegetation, storm damage, construction/commissioning QA, warranty evidence)",
  },
  {
    value: "comply",
    label: "Raptor Comply",
    description: "OT security and compliance platform tailored to NERC reliability standards (NERC CIP) for solar and storage plants",
  },
];

// Whether an industry signal is about something this account owns. The core
// platform only counts for act-this-week items, other products from relevance 2.
export function industryTouchesOwned(owned: string[] | undefined, signal: { products: string[]; relevance: number }): boolean {
  return signal.products.some((v) => {
    if (!owned?.includes(v)) return false;
    const core = PRODUCTS.find((p) => p.value === v)?.core;
    return core ? signal.relevance >= 3 : signal.relevance >= 2;
  });
}

// The mirror image: an industry signal on a solution the account doesn't own yet.
export function industryTouchesWhitespace(owned: string[] | undefined, signal: { products: string[]; relevance: number }): boolean {
  return signal.products.some((v) => {
    if (owned?.includes(v)) return false;
    const core = PRODUCTS.find((p) => p.value === v)?.core;
    return core ? signal.relevance >= 3 : signal.relevance >= 2;
  });
}

export function productLabel(value: string): string {
  return PRODUCTS.find((p) => p.value === value)?.label ?? value;
}

// How the account agent scores one customer's news. Each line: event -> score (play).
export const ACCOUNT_RUBRIC = `- Acquires a solar portfolio, adds MW under management, or wins a new O&M contract -> +2
  (onboard the new sites to Raptor Solar; baseline RS Inspections)
- New projects reaching construction or COD -> +1/+2 (commissioning RS Inspections, then Raptor Solar)
- Hail, storm, hurricane, wildfire, or flood damage at their sites -> +1 (storm-response
  inspections or Sentry; keep the tone helpful, not opportunistic)
- Underperformance, availability problems, module defects, or tracker failures in their
  fleet -> +1 (Raptor Solar performance intelligence; RS Inspections for warranty evidence)
- Large plants crossing NERC registration thresholds, NERC CIP audits/penalties, or OT
  cybersecurity incidents at the account -> +1/+2 (Raptor Comply)
- Funding, refinancing, or tax-equity deals closed -> +1 (budget to expand)
- Expanding their own drone/robotics or remote-operations program -> +1 (RS Sentry)
- New CEO/COO/VP Asset Management/VP O&M -> 0 or +1 (re-introduction; new leaders review vendors)
- Named champion leaving -> -1
- Selling sites or a portfolio, or being acquired -> -2 (MW leaving the platform; consolidation risk)
- Layoffs, project cancellations, missed guidance, bankruptcy -> -1/-2
- A competing inspection/APM vendor named as a new supplier (e.g. Zeitview, Heliolytics,
  Sitemark, Power Factors) -> -1/-2
- Awards, rankings, positive press -> 0/+1 (advocacy / case-study ask)
- Materiality: judge size relative to the account. One 20 MW project at a 10 GW owner is
  routine (0 or +1); for a 500 MW C&I portfolio it is material.`;

export const EXAMPLE_ACTION = `"Ask their VP Asset Management whether the 600 MW they just
acquired will be onboarded to Raptor Solar this quarter, and offer a baseline inspection plan
for the new sites"`;

// Industry lane: what to keep. Scope per the brief: climate tech news that is
// about solar, or that would heavily influence the solar field.
export const INDUSTRY_SCOPE = `Scope: climate tech news that is about solar power, or that would
heavily influence the solar field (policy, tax credits, tariffs and trade, grid and
interconnection, storage paired with solar, capital markets and M&A, extreme weather, drone
and robotics rules, solar technology and reliability). Keep such items even when they do not
map to a specific vendor product: they are talking points for a solar customer conversation.
Drop climate tech items with no meaningful effect on solar (e.g. EV-only, carbon capture,
hydrogen, wind-only) and anything generic, promotional, or opinion-only.

Strongest reasons to keep an item:
- Portfolio M&A, financing, and IPP/O&M consolidation (MW changing hands)
- Hail, storms, wildfire, or heat events damaging solar plants; module or tracker reliability findings
- FAA BVLOS rules, drone restrictions (e.g. DJI/FCC), or robotics news affecting automated inspections
- Tax-credit guidance or legislation (48E, 45Y, 45X), tariffs, FEOC/domestic-content rules
- Interconnection, curtailment, grid, or market rules that change solar plant economics
- NERC CIP / FERC reliability standards, inverter-based resource rules, or OT/grid
  cybersecurity threats affecting solar and storage plants
- Big solar build-out, procurement, or capacity numbers; labor and O&M cost trends`;

// Industry lane sources. RSS feeds are fetched directly; topic queries go to
// Google News; the Federal Register pulls formal rules from the listed agencies.
export const INDUSTRY_SOURCES = {
  rss: [
    { name: "pv magazine USA", url: "https://pv-magazine-usa.com/feed/", pagedUrl: "https://pv-magazine-usa.com/feed/?paged={n}" },
    { name: "Solar Power World", url: "https://www.solarpowerworldonline.com/feed/", pagedUrl: "https://www.solarpowerworldonline.com/feed/?paged={n}" },
    { name: "PV Tech", url: "https://www.pv-tech.org/feed/" },
    { name: "Utility Dive", url: "https://www.utilitydive.com/feeds/news/" },
    { name: "Canary Media", url: "https://www.canarymedia.com/rss.rss" },
  ],
  topicQueries: [
    "solar farm (hail OR storm OR hurricane OR wildfire) damage",
    "solar portfolio acquisition MW",
    "solar O&M contract (awarded OR selects)",
    "drone BVLOS FAA rule",
    "(DJI OR drone) ban FCC",
    "solar module (cracking OR defects OR reliability) report",
    "solar tax credit (48E OR 45X OR 45Y OR FEOC) guidance",
    "solar tariffs (AD/CVD OR \"Section 232\" OR \"Section 201\")",
    "solar curtailment OR interconnection queue",
    "NERC (CIP OR \"inverter-based resources\") solar",
    "solar inverter cybersecurity OR \"grid cybersecurity\"",
  ],
  topicsBlurb: "portfolio M&A, storm damage, drone rules, module reliability, NERC and OT security, tax credits, tariffs, and grid access",
  federalRegister: {
    term: 'solar | photovoltaic | "energy storage" | interconnection | "unmanned aircraft" | "reliability standard" | "inverter-based"',
    agencies: [
      "energy-department",
      "internal-revenue-service",
      "federal-energy-regulatory-commission",
      "international-trade-administration",
      "federal-aviation-administration",
    ],
  },
  description:
    "Climate tech news that is about solar or would heavily influence it: portfolio M&A, extreme-weather damage, drone and robotics rules, module reliability, NERC compliance and OT security, tax credits, tariffs, and grid access.",
};

export const FOOTER = `Independent demo built by Nick Stroud for the ${VENDOR.name} ${VENDOR.role} conversation. Not affiliated with or endorsed by ${VENDOR.name}. Updates daily via a scheduled Claude agent.`;
