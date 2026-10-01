import Anthropic from "@anthropic-ai/sdk";
import type { NewsItem } from "./fetch-news.ts";
import type { AccountSignal, Company, CompanyAnalysis } from "../lib/types.ts";
import { ACCOUNT_RUBRIC, EXAMPLE_ACTION, PRODUCTS, VENDOR } from "../lib/vendor.ts";
import { VENDOR_CONTEXT, PLAY_ENUM, TAXONOMY_TEXT, UPDATE_TYPE_ENUM } from "./vendor-context.ts";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
export const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `You are an account-intelligence analyst supporting a customer
success team. Given recent public news about ONE customer account, extract signals
relevant to the vendor relationship — not general news summarization.

${VENDOR_CONTEXT}

You are told which products the account already owns and which it does not. Use that:
growth in an area they already buy is an expansion play on that product; a move into an
area served by a product they don't own is a cross-sell play on that product.

Score each distinct signal from -2 (strong renewal/relationship risk) to +2 (strong
expansion opportunity):

${ACCOUNT_RUBRIC}

IMPORTANT relevance rules:
- Only use articles clearly about THIS organization. Namesakes and unrelated entities
  with a similar name must be ignored.
- If nothing is relevant, return an empty signals array. Quiet weeks are normal.
- One signal per distinct event, even if several articles cover it.

${TAXONOMY_TEXT}

Use the relationship background, when given, to make actions specific (build on what
they already do with ${VENDOR.name}; don't pitch what they already have).

The account itself is the ${VENDOR.name} customer. Its own customers, partners, and
investors are not. Frame actions around the account. The play field must match the
product the suggestedAction proposes.

suggestedAction: one concrete next step a CSM would take this week, written for this
account (e.g. ${EXAMPLE_ACTION}), not a generic platitude.`;

const RECORD_ANALYSIS_TOOL: Anthropic.Tool = {
  name: "record_analysis",
  description: "Record the account-relationship analysis for this account's recent news.",
  input_schema: {
    type: "object",
    properties: {
      headline: { type: "string", description: "One-line summary of this run's overall picture" },
      signals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string", description: "Short label, e.g. 'New 200 MW project', 'CFO departure'" },
            updateType: { type: "string", enum: UPDATE_TYPE_ENUM },
            play: { type: "string", enum: PLAY_ENUM },
            score: { type: "integer", enum: [-2, -1, 0, 1, 2] },
            summary: { type: "string" },
            suggestedAction: { type: "string" },
            articleIndex: { type: "integer", description: "The [n] index of the main supporting article" },
          },
          required: ["category", "updateType", "play", "score", "summary", "suggestedAction", "articleIndex"],
        },
      },
    },
    required: ["headline", "signals"],
  },
};

export interface AnalyzeOptions {
  runAt?: string;
  source?: "daily" | "backfill";
  periodLabel?: string;
}

export async function analyzeCompany(
  company: Company,
  news: NewsItem[],
  opts: AnalyzeOptions = {},
): Promise<CompanyAnalysis> {
  const articleBlock = news
    .map((n, i) => `[${i}] ${n.title} (${n.source}, ${n.publishedAt})\n${n.snippet}`)
    .join("\n\n");

  const owned = PRODUCTS.filter((p) => company.products?.includes(p.value));
  const profile = [
    `Account: ${company.name}`,
    `Website: ${company.website}`,
    `Products owned: ${owned.map((p) => p.label).join(", ") || "none recorded"}`,
    `Not yet owned (whitespace): ${PRODUCTS.filter((p) => !owned.includes(p)).map((p) => p.label).join(", ")}`,
    company.type ? `Account type: ${company.type}` : null,
    company.notes ? `Relationship background: ${company.notes}` : null,
    company.sponsors?.length
      ? `Known sponsors (champions): ${company.sponsors.map((x) => `${x.name}, ${x.title}`).join("; ")}`
      : null,
    company.newsQuery ? `News search used: ${company.newsQuery}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [RECORD_ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: "record_analysis" },
    messages: [
      {
        role: "user",
        content: `${profile}\n\n${opts.periodLabel ?? "Recent"} articles:\n\n${articleBlock}`,
      },
    ],
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`no tool_use block in response for ${company.name} (stop_reason=${message.stop_reason})`);
  }
  const parsed = toolUse.input as {
    headline?: string;
    signals?: (Omit<AccountSignal, "sourceName" | "sourceLink"> & { articleIndex: number })[];
  };

  // Source attribution comes from our own article list, not model output, so
  // links can't be hallucinated.
  const all: AccountSignal[] = (parsed.signals ?? []).map(({ articleIndex, ...s }) => {
    const article = news[articleIndex] ?? news[0];
    return {
      ...s,
      sourceName: article?.source,
      sourceLink: article?.link ?? "",
      publishedAt: article?.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
    };
  });

  // One signal per event: the model sometimes splits one story into a signal per
  // product play, which would count it several times in ranking. Keep the strongest
  // per source article; the others' plays usually show up in its suggested action.
  const byLink = new Map<string, AccountSignal>();
  for (const sig of all) {
    const prev = byLink.get(sig.sourceLink);
    if (!prev || Math.abs(sig.score) > Math.abs(prev.score)) byLink.set(sig.sourceLink, sig);
  }
  const signals = [...byLink.values()];

  return {
    company: company.name,
    runAt: opts.runAt ?? new Date().toISOString(),
    source: opts.source ?? "daily",
    headline: parsed.headline ?? "",
    signals,
  };
}
