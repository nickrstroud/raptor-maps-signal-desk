import { fetchNews, type NewsItem } from "./fetch-news.ts";
import { analyzeCompany } from "./analyze.ts";
import { runIndustry } from "./industry.ts";
import type { CompanyAnalysis } from "../lib/types.ts";
import { slugify } from "../lib/slug.ts";
import {
  appendHistory,
  dedupe,
  defaultNewsQuery,
  loadCompanies,
  loadHistory,
  loadState,
  mapPool,
  markAccountSeen,
  saveState,
  seenKey,
} from "./common.ts";

// Seeds history so accounts have depth on day one. Uses Google News
// `after:`/`before:` windows (one Claude call per account-month that has
// coverage). Each account records how far back it's been backfilled
// (state.backfilledFrom), so re-running with a larger --months only fetches the
// older months still missing. Safe to re-run after adding new accounts.

const monthsArg = process.argv.find((a) => a.startsWith("--months="));
const MONTHS_BACK = monthsArg ? Number(monthsArg.split("=")[1]) : 12;
const INDUSTRY_MONTHS = 3;
// Accounts backfilled before coverage was tracked got the 3 most recent months.
const LEGACY_BACKFILL_DAYS = 90;
const CONCURRENCY = 3;

function monthWindows(months: number) {
  const day = 86_400_000;
  const now = Date.now();
  return Array.from({ length: months }, (_, k) => {
    const i = months - k;
    const end = new Date(now - (i - 1) * 30 * day);
    const start = new Date(end.getTime() - 30 * day);
    return { start, end, label: start.toISOString().slice(0, 7) };
  });
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const companies = await loadCompanies();
  const state = await loadState();
  const windows = monthWindows(MONTHS_BACK);
  const onlyIndustry = process.argv.includes("--industry-only");

  if (!onlyIndustry) {
    await mapPool(companies, CONCURRENCY, async (company) => {
      const slug = slugify(company.name);
      const existing = await loadHistory(company);
      const legacy = existing.some((r) => r.source === "backfill")
        ? new Date(Date.now() - LEGACY_BACKFILL_DAYS * 86_400_000).toISOString()
        : null;
      const coveredFrom = state.accounts[slug]?.backfilledFrom ?? legacy;
      // Only months that end before what's already covered (small slack for rounding).
      const todo = coveredFrom
        ? windows.filter((w) => w.end.getTime() <= new Date(coveredFrom).getTime() + 86_400_000)
        : windows;
      if (todo.length === 0) return;

      const entries: CompanyAnalysis[] = [];
      const links: string[] = [];
      for (const w of todo) {
        let news: NewsItem[];
        try {
          news = dedupe(
            await fetchNews(`${defaultNewsQuery(company)} after:${ymd(w.start)} before:${ymd(w.end)}`, 10),
          );
        } catch (err) {
          console.error(`${company.name} ${w.label}: fetch failed`);
          continue;
        }
        if (news.length === 0) continue;
        links.push(...news.flatMap((n) => [n.link, seenKey(n.title)]));
        try {
          const analysis = await analyzeCompany(company, news, {
            runAt: w.end.toISOString(),
            source: "backfill",
            periodLabel: w.label,
          });
          if (analysis.signals.length > 0) entries.push(analysis);
        } catch (err) {
          console.error(`${company.name} ${w.label}: analysis failed —`, err instanceof Error ? err.message : err);
        }
      }

      if (entries.length > 0) await appendHistory(company, entries);
      markAccountSeen(state, company, links);
      state.accounts[slug].backfilledFrom = todo[0].start.toISOString();
      const n = entries.reduce((s, e) => s + e.signals.length, 0);
      console.log(`${company.name}: ${n} historical signal(s)`);
    });
    await saveState(state);
  }

  if (process.argv.includes("--accounts-only")) return;
  await runIndustry({ feedPages: 8, topicWindow: `${INDUSTRY_MONTHS * 30}d`, fedRegDaysBack: INDUSTRY_MONTHS * 30 });
}

main();
