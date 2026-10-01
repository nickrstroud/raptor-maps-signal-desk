import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fetchFederalRegister, fetchNews, fetchRss, type NewsItem } from "./fetch-news.ts";
import { DATA_DIR, dedupe, loadCompanies, loadState, saveState, writeJson } from "./common.ts";
import { MODEL } from "./analyze.ts";
import { VENDOR_CONTEXT, PLAY_ENUM, PRODUCT_ENUM, TAXONOMY_TEXT, UPDATE_TYPE_ENUM } from "./vendor-context.ts";
import { INDUSTRY_SCOPE, INDUSTRY_SOURCES, VENDOR } from "../lib/vendor.ts";
import type { Company, IndustrySignal } from "../lib/types.ts";

// Industry lane: climate tech news that is about solar or would heavily
// influence it. Rarely names a customer, but gives a reason to reach out to
// accounts that own, or could own, the affected products.

const client = new Anthropic();
const INDUSTRY_FILE = path.join(DATA_DIR, "industry.json");
const BATCH_SIZE = 15;

const SYSTEM_PROMPT = `You are an industry analyst supporting a customer success team.
You receive a batch of news items. Keep ONLY items within scope that a CSM could use as a
reason or talking point to reach out to customers (or a named account).

${VENDOR_CONTEXT}

${INDUSTRY_SCOPE}

For each kept item:
- relevance — use 3 sparingly (no more than 1-2 items per batch, often zero):
  3 = act this week: a final rule, tariff decision, or credit guidance with a deadline or
      immediate cost impact, a major weather event hitting solar plants, a drone rule
      change, or major news about a named account
  2 = worth a proactive touch to affected customers
  1 = background context
- products: the vendor products this item creates a conversation about (e.g. storm damage
  -> inspections/sentry; portfolio M&A -> platform/construction; module defects -> warranty).
  Usually one or two. Empty if it is a market-wide talking point with no product angle.
- mentionedAccounts: exact names from the provided account list ONLY if that exact
  organization is named in the item. Similar organizations do NOT count. Usually empty.
- angle: 1-2 sentences on why this matters for a ${VENDOR.name} customer conversation.
- summary: 1-2 sentences, factual.

${TAXONOMY_TEXT}`;

const RECORD_TOOL: Anthropic.Tool = {
  name: "record_industry_signals",
  description: "Record the industry items worth surfacing to the CS team.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "integer", description: "The [n] index of the item" },
            updateType: { type: "string", enum: UPDATE_TYPE_ENUM },
            relevance: { type: "integer", enum: [1, 2, 3] },
            summary: { type: "string" },
            angle: { type: "string" },
            play: { type: "string", enum: PLAY_ENUM },
            products: { type: "array", items: { type: "string", enum: PRODUCT_ENUM } },
            mentionedAccounts: { type: "array", items: { type: "string" } },
          },
          required: ["index", "updateType", "relevance", "summary", "angle", "play", "products", "mentionedAccounts"],
        },
      },
    },
    required: ["items"],
  },
};

async function analyzeBatch(batch: NewsItem[], companies: Company[]): Promise<IndustrySignal[]> {
  const accountList = companies.map((c) => c.name).join("; ");
  const itemBlock = batch
    .map((n, i) => `[${i}] ${n.title} (${n.source}, ${n.publishedAt})\n${n.snippet}`)
    .join("\n\n");

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 6000,
    system: SYSTEM_PROMPT,
    tools: [RECORD_TOOL],
    tool_choice: { type: "tool", name: "record_industry_signals" },
    messages: [{ role: "user", content: `Account list: ${accountList}\n\nNews items:\n\n${itemBlock}` }],
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return [];
  const parsed = toolUse.input as { items?: any[] };
  const names = new Set(companies.map((c) => c.name));
  const now = new Date().toISOString();

  return (parsed.items ?? [])
    .filter((it) => batch[it.index])
    .map((it) => {
      const src = batch[it.index];
      const published = new Date(src.publishedAt);
      return {
        id: Buffer.from(src.link).toString("base64url").slice(-24),
        title: src.title.replace(/\s+-\s+[^-]+$/, ""),
        link: src.link,
        sourceName: src.source,
        publishedAt: Number.isNaN(published.getTime()) ? now : published.toISOString(),
        analyzedAt: now,
        updateType: it.updateType,
        relevance: it.relevance,
        summary: it.summary,
        angle: it.angle,
        play: it.play,
        products: it.products ?? [],
        // Hard guard: a named mention outweighs a direct signal in ranking, so
        // the account's name must literally appear in the item.
        mentionedAccounts: (it.mentionedAccounts ?? []).filter(
          (n: string) => names.has(n) && `${src.title} ${src.snippet}`.toLowerCase().includes(n.toLowerCase()),
        ),
      };
    });
}

export interface IndustryOptions {
  feedPages: number; // pages per RSS feed, where the feed supports paging
  topicWindow: string; // Google News `when:` value, e.g. "7d"
  fedRegDaysBack: number;
}

async function safe<T>(label: string, p: Promise<T[]>): Promise<T[]> {
  try {
    return await p;
  } catch (err) {
    console.error(`  ${label} failed: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

export async function runIndustry(opts: IndustryOptions) {
  const companies = await loadCompanies();
  const state = await loadState();
  const seen = new Set(state.industrySeenLinks);

  console.log("Industry: fetching sources...");
  const sources: NewsItem[] = [];
  for (const feed of INDUSTRY_SOURCES.rss) {
    const pages = "pagedUrl" in feed && feed.pagedUrl ? opts.feedPages : 1;
    for (let p = 1; p <= pages; p++) {
      const url = p === 1 ? feed.url : feed.pagedUrl!.replace("{n}", String(p));
      sources.push(...(await safe(feed.name, fetchRss(url, feed.name))));
    }
  }
  for (const q of INDUSTRY_SOURCES.topicQueries) {
    sources.push(...(await safe(`Google News "${q}"`, fetchNews(`${q} when:${opts.topicWindow}`, 15))));
  }
  const since = new Date(Date.now() - opts.fedRegDaysBack * 86_400_000).toISOString();
  sources.push(...(await safe("Federal Register", fetchFederalRegister(since, INDUSTRY_SOURCES.federalRegister))));

  const fresh = dedupe(sources).filter((n) => n.link && !seen.has(n.link));
  console.log(`Industry: ${sources.length} fetched, ${fresh.length} new to analyze`);

  const existing: IndustrySignal[] = JSON.parse(await readFile(INDUSTRY_FILE, "utf-8").catch(() => "[]"));
  const existingKeys = new Set(existing.map((e) => e.link));
  let added = 0;

  for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
    const batch = fresh.slice(i, i + BATCH_SIZE);
    try {
      const signals = await analyzeBatch(batch, companies);
      for (const s of signals) {
        if (existingKeys.has(s.link)) continue;
        existing.push(s);
        existingKeys.add(s.link);
        added++;
      }
      batch.forEach((b) => seen.add(b.link));
      console.log(`  batch ${i / BATCH_SIZE + 1}: kept ${signals.length}/${batch.length}`);
    } catch (err) {
      console.error(`  batch ${i / BATCH_SIZE + 1} failed:`, err instanceof Error ? err.message : err);
    }
  }

  existing.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  await writeJson(INDUSTRY_FILE, existing);

  // Reload state: account runs may have written to it concurrently.
  const latest = await loadState();
  latest.industrySeenLinks = [...seen].slice(-3000);
  latest.lastIndustryRunAt = new Date().toISOString();
  await saveState(latest);
  console.log(`Industry: ${added} new signal(s) saved`);
}

if (import.meta.main) {
  runIndustry({ feedPages: 2, topicWindow: "7d", fedRegDaysBack: 14 });
}
