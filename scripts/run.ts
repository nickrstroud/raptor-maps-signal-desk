import { fetchNews } from "./fetch-news.ts";
import { analyzeCompany } from "./analyze.ts";
import { runIndustry } from "./industry.ts";
import { slugify } from "../lib/slug.ts";
import {
  appendHistory,
  dedupe,
  defaultNewsQuery,
  loadCompanies,
  loadState,
  mapPool,
  markAccountSeen,
  saveState,
  seenKey,
} from "./common.ts";

// Daily run. Built for thousands of accounts: every account gets a cheap news
// fetch, but Claude is only called when there are articles we haven't already
// analyzed. Quiet accounts cost nothing beyond the RSS request.

const CONCURRENCY = 4;

async function main() {
  const companies = await loadCompanies();
  const state = await loadState();
  let analyzed = 0;
  let quiet = 0;
  let signals = 0;

  await mapPool(companies, CONCURRENCY, async (company) => {
    try {
      const seen = new Set(state.accounts[slugify(company.name)]?.seenLinks ?? []);
      const news = dedupe(await fetchNews(`${defaultNewsQuery(company)} when:7d`, 10)).filter(
        (n) => !seen.has(n.link) && !seen.has(seenKey(n.title)),
      );

      if (news.length === 0) {
        markAccountSeen(state, company, []);
        quiet++;
        return;
      }

      const analysis = await analyzeCompany(company, news);
      analyzed++;
      signals += analysis.signals.length;
      if (analysis.signals.length > 0) await appendHistory(company, [analysis]);
      markAccountSeen(state, company, news.flatMap((n) => [n.link, seenKey(n.title)]));
      console.log(`${company.name}: ${news.length} new article(s) -> ${analysis.signals.length} signal(s)`);
    } catch (err) {
      console.error(`${company.name}: failed —`, err instanceof Error ? err.message : err);
    }
  });

  await saveState(state);
  console.log(`\nAccounts: ${companies.length} checked, ${quiet} quiet, ${analyzed} sent to Claude, ${signals} signal(s)`);

  await runIndustry({ feedPages: 2, topicWindow: "7d", fedRegDaysBack: 14 });
}

main();
