import { fetchNews, type NewsItem } from "./fetch-news.ts";
import { analyzeCompany } from "./analyze.ts";
import { runIndustry } from "./industry.ts";
import type { CompanyAnalysis } from "../lib/types.ts";
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

// Seeds ~3 months of history so the queue has depth on day one. Uses Google
// News `after:`/`before:` windows (one Claude call per account-month that has
// coverage). Accounts that already have backfill entries are skipped, so it's
// safe to re-run after adding new accounts.

const MONTHS_BACK = 3;
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
      const existing = await loadHistory(company);
      if (existing.some((r) => r.source === "backfill")) return;

      const entries: CompanyAnalysis[] = [];
      const links: string[] = [];
      for (const w of windows) {
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

      // A marker entry, even when empty, so re-runs skip this account.
      if (entries.length === 0) {
        entries.push({
          company: company.name,
          runAt: windows[0].start.toISOString(),
          source: "backfill",
          headline: "No relevant coverage in the backfill window",
          signals: [],
        });
      }
      await appendHistory(company, entries);
      markAccountSeen(state, company, links);
      const n = entries.reduce((s, e) => s + e.signals.length, 0);
      console.log(`${company.name}: ${n} historical signal(s)`);
    });
    await saveState(state);
  }

  if (process.argv.includes("--accounts-only")) return;
  await runIndustry({ feedPages: 8, topicWindow: `${MONTHS_BACK * 30}d`, fedRegDaysBack: MONTHS_BACK * 30 });
}

main();
