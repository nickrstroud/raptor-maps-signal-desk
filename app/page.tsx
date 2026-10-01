import Link from "next/link";
import { getCompanies, getIndustrySignals, getPipelineState } from "@/lib/data";
import { getAccountPriorities } from "@/lib/priority";
import { rankIndustry, withAffectedAccounts } from "@/lib/industry-view";
import { relativeDays } from "@/lib/score";
import OpportunityQueue from "./OpportunityQueue";
import IndustryFeed from "./IndustryFeed";
import QuietAccounts from "./QuietAccounts";
import AgentPrecision from "./AgentPrecision";
import AgentLearning from "./AgentLearning";

const DAY = 86_400_000;

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-slate-200 rounded-xl bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 tabular-nums leading-tight mt-0.5">{value}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{detail}</p>
    </div>
  );
}

export default function Home() {
  const companies = getCompanies();
  const priorities = getAccountPriorities();
  // With no accounts pinned, every account is treated as a key account.
  const anyPinned = priorities.some((p) => p.company.pinned);
  const key = priorities.filter((p) => !anyPinned || p.company.pinned);
  const rest = priorities.filter((p) => anyPinned && !p.company.pinned);
  const surfaced = rest.filter((p) => p.surfaced);
  const quiet = rest.filter((p) => !p.surfaced);
  const state = getPipelineState();

  const industry = getIndustrySignals();
  const industry30 = industry.filter((i) => Date.now() - new Date(i.publishedAt).getTime() <= 30 * DAY);
  const laneItems = withAffectedAccounts(rankIndustry(industry30), companies);

  const withNews = key.filter((p) => p.recentSignals.length > 0).length;
  const atRisk = priorities.filter((p) => p.status === "risk").length;
  const upsell = key.reduce((n, p) => n + p.whitespaceMatches.length, 0);
  const actNow = industry30.filter((i) => i.relevance === 3).length;
  const lastRun = [state.lastIndustryRunAt, ...Object.values(state.accounts).map((a) => a.lastCheckedAt)]
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <div className="space-y-10">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Key accounts</h1>
            <p className="text-sm text-slate-500">
              The agent reads the news on every account and the clean-energy market daily, then ranks your key
              accounts by who needs a conversation first.
            </p>
          </div>
          <p className="text-[11px] text-slate-400">Last agent run {relativeDays(lastRun ?? null)}</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatTile label="Key accounts" value={String(key.length)} detail={`${withNews} with news in 90 days`} />
          <StatTile label="At risk" value={String(atRisk)} detail="recent risk signals outweigh upside" />
          <StatTile label="Industry signals (30d)" value={String(industry30.length)} detail={`${actNow} flagged act-this-week`} />
          <StatTile label="Upsell angles" value={String(upsell)} detail="market news on products they don't own" />
          <AgentPrecision />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 min-w-0 space-y-10">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Ranked by priority <span className="text-slate-400 font-normal">· learns from your 👍 / 👎</span>
            </h2>
            <OpportunityQueue accounts={key} pinned />
          </div>
          {surfaced.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-3">
                Also surfaced <span className="text-slate-400 font-normal">· rest of the book, above threshold</span>
              </h2>
              <OpportunityQueue accounts={surfaced} />
            </div>
          )}
        </section>

        <section className="min-w-0 space-y-6">
          <AgentLearning />
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Industry signals <span className="text-slate-400 font-normal">· last 30 days</span>
              </h2>
              <Link href="/industry" className="text-[11px] text-brand-700 hover:underline">
                View all →
              </Link>
            </div>
            <IndustryFeed items={laneItems} limit={8} />
          </div>
        </section>
      </div>

      {quiet.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Quiet accounts <span className="text-slate-400 font-normal">· {quiet.length}</span>
          </h2>
          <QuietAccounts accounts={quiet} />
        </section>
      )}
    </div>
  );
}
