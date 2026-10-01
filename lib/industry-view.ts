import type { Company, IndustrySignal } from "./types";
import { slugify } from "./slug";
import { industryTouchesOwned } from "./vendor";

// Resolves each industry signal to the monitored accounts it touches: named
// mentions first, then every account that owns an affected product.
export function withAffectedAccounts(signals: IndustrySignal[], companies: Company[]) {
  return signals.map((signal) => {
    const named = companies.filter((c) => signal.mentionedAccounts.includes(c.name));
    const owners = companies.filter(
      (c) => !signal.mentionedAccounts.includes(c.name) && industryTouchesOwned(c.products, signal),
    );
    return {
      signal,
      affectedAccounts: [...named, ...owners].map((c) => ({ name: c.name, slug: slugify(c.name) })),
    };
  });
}

// Lane ordering: relevance first, then recency — so a "act this week" rule
// from 10 days ago still outranks yesterday's background item.
export function rankIndustry(signals: IndustrySignal[]): IndustrySignal[] {
  const ageDays = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86_400_000;
  const score = (s: IndustrySignal) => s.relevance * Math.pow(0.5, ageDays(s.publishedAt) / 10);
  return [...signals].sort((a, b) => score(b) - score(a));
}
