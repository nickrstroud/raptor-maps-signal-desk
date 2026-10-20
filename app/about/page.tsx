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
    title: "Turn signals into plays",
    body: "Each meaningful signal comes with a ready-to-run workflow, generated once by the daily run: a play (onboard and expand, protect the renewal, and so on), five stages (Validate, Align, Engage Customer, Act, Close Loop) with timing and tasks, a measurable \"done when\", and copy-ready drafts of the customer email, internal Slack note, and CRM task. Click ⚡ Trigger workflow to start one, tick stages off as you go, and track everything in progress from My workflows or the Workflow status filter. Customer emails are addressed by role, not by name.",
  },
  {
    n: "7",
    title: "Ask the book of business",
    body: "Ask the agent answers plain-English questions (which accounts are at risk, what changed at an account, who is exposed to a policy change) using only this dashboard's data: account background, every signal, and recent industry news. Answers name the accounts and dates they rely on, and say so when the data doesn't cover something. Powered by Claude Haiku 5.5, with a daily question cap for the demo.",
  },
  {
    n: "8",
    title: "Persist and publish",
    body: "A scheduled GitHub Action commits results back to the repo (the git history is the audit trail), and Vercel redeploys this dashboard automatically. If the API key is ever rejected, the run fails loudly instead of quietly skipping accounts.",
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

      <section className="border border-brand-200 rounded-xl bg-brand-50/40 p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">About the data</h2>
        <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
          <li>
            The key accounts are companies {VENDOR.name} names publicly as customers or partners in its published case
            studies and announcements. Products owned, relationship notes, and sponsors are inferred from those
            sources, not from {VENDOR.name}&apos;s systems.
          </li>
          <li>
            Every signal comes from public news coverage, linked to its source. Statuses such as &quot;At risk&quot; or
            &quot;Expansion&quot; are the agent&apos;s automated read of that coverage for a customer success
            conversation, not an assessment of any company&apos;s health and not {VENDOR.name} data.
          </li>
          <li>No contract values, renewal dates, or other non-public information are shown.</li>
          <li>
            This is an independent demo, not affiliated with or endorsed by {VENDOR.name}, and it isn&apos;t indexed
            by search engines.
          </li>
        </ul>
      </section>

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
          pass is a handful of batched calls. Each workflow is generated once per signal for a cent or two, and each
          Ask the agent question costs about a cent. Covering a full book of accounts costs a few dollars a day.
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
            Workflows as real team work: progress stored centrally (today it lives in your browser), stages synced to
            CRM tasks with owners and due dates, and outcomes fed back so the agent learns which plays work
          </li>
          <li>Ask the agent with sign-in, per-user history, and access to CRM and usage data alongside the news</li>
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
