import { INDUSTRY_SOURCES, VENDOR } from "@/lib/vendor";

const STEPS = [
  {
    n: "1",
    title: "Watch every account, cheaply",
    body: "Each day the agent pulls recent news for every account from Google News RSS (accounts were backfilled with 12 months of history for context). Articles it has already analyzed are skipped, so a quiet day costs one free RSS request and zero model calls.",
  },
  {
    n: "2",
    title: "Only call Claude when something is new",
    body: `New articles go to Claude Haiku with a ${VENDOR.name}-specific rubric that knows which products the account already owns. It ignores namesakes and noise, and returns a score (−2 risk to +2 opportunity), an update type, and a play: expand a product they own, cross-sell one they don't, protect the renewal, or ask for advocacy.`,
  },
  {
    n: "3",
    title: "Watch the industry, not just the accounts",
    body: `A second pass reads ${INDUSTRY_SOURCES.rss.map((f) => f.name).join(", ")}, the Federal Register (DOE, Treasury/IRS, FERC/NERC, FAA, and trade rules), and topic searches on ${INDUSTRY_SOURCES.topicsBlurb}. Claude keeps only items a CSM could act on and tags the products each one affects. News on a product an account owns is a reason to check in; news on a product they don't own is an upsell angle.`,
  },
  {
    n: "4",
    title: "Rank, don't list",
    body: "Every signal gets a weight by strength, counts only if it's from the last 90 days, decays with a 30-day half-life, and risk weighs slightly more than equal-strength upside. Industry news that names the account counts like a +1 (capped), and news on solutions they own nudges ranking without outranking real account news. With CRM data, ARR and the 90-day renewal window would multiply the score. Key accounts are always on top; any other account that crosses the threshold surfaces on its own.",
  },
  {
    n: "5",
    title: "Learn from the CSM",
    body: "Every signal has 👍 Useful / 👎 Noise buttons. Votes reweight their signal type (±0.25 per net vote, between ×0.25 and ×1.5) and the accounts re-rank immediately. \"Wrong company\" votes flag the account's news search for tightening instead of muting the signal type. Agent precision, the share of rated signals marked useful, is the agent's own quality metric.",
  },
  {
    n: "6",
    title: "Persist and publish",
    body: "A scheduled GitHub Action commits results back to the repo (the git history is the audit trail), and Vercel redeploys this static dashboard automatically.",
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">How it works</h1>
        <p className="text-sm text-slate-600 mt-1">
          A CSM can&apos;t read every trade publication, tariff ruling, and press release that touches their accounts.
          This agent does the reading every day, then tells you which key account needs a conversation first and
          why: expand what they own, cross-sell what they don&apos;t, protect the renewal, or turn them into an
          advocate.
        </p>
      </div>

      <ol className="space-y-4">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-4">
            <span className="shrink-0 w-7 h-7 rounded-full bg-brand-900 text-white text-sm font-semibold flex items-center justify-center">
              {s.n}
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{s.title}</h2>
              <p className="text-sm text-slate-600 mt-0.5">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="border border-slate-200 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Priority formula</h2>
        <pre className="text-xs bg-slate-50 border border-slate-200 rounded-md p-3 overflow-x-auto text-slate-700">
{`priority = value × ( Σ signal_weight × type_weight × 0.5^(age_days / 30)
                   + min(Σ named_industry_mentions × 5, 10)
                   + min(owned_product_industry_boost, 1.3) )

signal_weight:  +2 → 10   +1 → 5   0 → 0.5   −1 → 6   −2 → 12
                (brand/press × 0.5; a −2 in the last 45 days flags "At risk")
type_weight:    1.0, learned from 👍 / 👎 (×0.25 – ×1.5)
value:          ARR >$25k 1.5   >$10k 1.25   >$3k 1.1   else 1.0
                × 1.25 if renewing within 90 days
surfaces at:    priority ≥ 3`}
        </pre>
      </section>

      <section className="border border-slate-200 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">What it costs</h2>
        <p className="text-sm text-slate-600">
          News fetches are free. Claude Haiku costs roughly a cent per account with new coverage, and the industry
          pass is a handful of batched calls. Covering a full book of accounts costs a few dollars a day.
        </p>
      </section>

      <section className="border border-slate-200 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">What production would add</h2>
        <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
          <li>
            The CRM as the account source of truth (products owned, ARR, renewal, owner, contacts), with signals written
            back as tasks on the owning CSM&apos;s queue
          </li>
          <li>First-party signals: MW onboarded, inspection and credit consumption, Sentry flight volume, logins, support tickets, NPS</li>
          <li>
            A shared feedback loop. Today votes live in your browser. In production they&apos;d be stored centrally, the
            daily run would apply the learned type weights, and recent labeled examples would go into Claude&apos;s
            prompt so the agent picks up the team&apos;s judgment.
          </li>
        </ul>
      </section>
    </div>
  );
}
