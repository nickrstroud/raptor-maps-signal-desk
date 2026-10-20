import Anthropic from "@anthropic-ai/sdk";
import { buildAskContext } from "@/lib/ask-context";
import { VENDOR } from "@/lib/vendor";

// "Ask the agent": one Claude call per question, answered only from the
// dashboard's own data. Guarded by a site-wide daily question cap, plus the
// spend limit set on the API key itself.

export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-5-5";
const DAILY_LIMIT = 30;
const MAX_QUESTION_CHARS = 500;

const SYSTEM = `You are the account-intelligence assistant on ${VENDOR.name}'s customer success
dashboard. Answer the CSM's question using ONLY the briefing below: key accounts, their
relationship background, their news signals, and recent industry signals.

- Be concise and practical: a short direct answer, then a few bullets if useful. Under 200 words.
- Name the accounts and dates you rely on. If the briefing doesn't cover something, say so
  plainly instead of guessing; never add outside facts.
- Use plain text with simple "- " bullets and **bold** for emphasis. No headings or tables.
- Scores run from -2 (strong risk) to +2 (strong opportunity).`;

// --- Daily cap: Upstash Redis (connected through Vercel Storage) when configured,
// otherwise a per-instance in-memory counter (fine for local dev, loose in production).
const memory = new Map<string, number>();

function redisEnv() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function countToday(): Promise<number> {
  const key = `ask:${new Date().toISOString().slice(0, 10)}`;
  const redis = redisEnv();
  if (!redis) {
    const n = (memory.get(key) ?? 0) + 1;
    memory.set(key, n);
    return n;
  }
  const res = await fetch(`${redis.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${redis.token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, "172800"],
    ]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`counter unavailable (${res.status})`);
  const data = (await res.json()) as { result: number }[];
  return Number(data[0]?.result ?? 0);
}

let cachedContext: { at: number; text: string } | null = null;
function context(): string {
  // Rebuild at most every 10 minutes; the data only changes once a day.
  if (!cachedContext || Date.now() - cachedContext.at > 600_000) {
    cachedContext = { at: Date.now(), text: buildAskContext() };
  }
  return cachedContext.text;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Ask the agent isn't configured yet." }, { status: 503 });
  }

  let question = "";
  try {
    const body = (await req.json()) as { question?: unknown };
    question = typeof body.question === "string" ? body.question.trim() : "";
  } catch {
    // fall through to the validation below
  }
  if (!question) return Response.json({ error: "Please type a question." }, { status: 400 });
  if (question.length > MAX_QUESTION_CHARS) {
    return Response.json({ error: `Please keep questions under ${MAX_QUESTION_CHARS} characters.` }, { status: 400 });
  }

  let used: number;
  try {
    used = await countToday();
  } catch {
    return Response.json({ error: "The question counter is unavailable right now. Please try again later." }, { status: 503 });
  }
  if (used > DAILY_LIMIT) {
    return Response.json(
      { error: `Today's demo limit of ${DAILY_LIMIT} questions has been reached. It resets at midnight UTC.`, remaining: 0 },
      { status: 429 },
    );
  }

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: [
        { type: "text", text: SYSTEM },
        // The briefing is identical across questions, so it's cached: repeat
        // questions within a few minutes read it at a fraction of the price.
        { type: "text", text: context(), cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: question }],
    });
    const answer = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return Response.json({ answer: answer || "I couldn't produce an answer to that.", remaining: DAILY_LIMIT - used });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "The agent is busy right now. Try again in a minute." }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      return Response.json({ error: "The agent's API key was rejected or has hit its spend limit." }, { status: 503 });
    }
    console.error("ask failed:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Something went wrong answering that. Please try again." }, { status: 502 });
  }
}
