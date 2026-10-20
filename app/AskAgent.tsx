"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

const SUGGESTIONS = [
  "Which accounts have had ownership changes, and what's the renewal risk?",
  "What changed at Enel in the last 30 days?",
  "Which customers are exposed to the DJI drone restrictions?",
  "Draft three talking points for an MEI business review.",
];

// Renders **bold** and turns account names into links to their pages.
function inline(text: string, accounts: { name: string; slug: string }[], keyBase: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  const out: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      out.push(<strong key={`${keyBase}-b${i}`}>{part.slice(2, -2)}</strong>);
      return;
    }
    let rest = part;
    let j = 0;
    while (rest) {
      const hit = accounts
        .map((a) => ({ a, idx: rest.indexOf(a.name) }))
        .filter((h) => h.idx >= 0)
        .sort((x, y) => x.idx - y.idx)[0];
      if (!hit) {
        out.push(rest);
        break;
      }
      if (hit.idx > 0) out.push(rest.slice(0, hit.idx));
      out.push(
        <Link key={`${keyBase}-l${i}-${j++}`} href={`/account/${hit.a.slug}`} className="text-brand-700 hover:underline">
          {hit.a.name}
        </Link>,
      );
      rest = rest.slice(hit.idx + hit.a.name.length);
    }
  });
  return out;
}

function Answer({ text, accounts }: { text: string; accounts: { name: string; slug: string }[] }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (k: number) => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul${k}`} className="list-disc pl-5 space-y-1">
          {bullets.map((b, i) => (
            <li key={i}>{inline(b, accounts, `li${k}-${i}`)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  text.split("\n").forEach((line, k) => {
    const t = line.trim();
    if (/^[-*•]\s+/.test(t)) bullets.push(t.replace(/^[-*•]\s+/, ""));
    else {
      flush(k);
      if (t) blocks.push(<p key={`p${k}`}>{inline(t, accounts, `p${k}`)}</p>);
    }
  });
  flush(-1);
  return <div className="text-sm text-slate-700 space-y-2">{blocks}</div>;
}

// "Ask the agent": plain-English questions about the book of business,
// answered by Claude from the dashboard's own data.
export default function AskAgent({ accounts }: { accounts: { name: string; slug: string }[] }) {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || loading) return;
    setQuestion(text);
    setAsked(text);
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = (await res.json()) as { answer?: string; error?: string; remaining?: number };
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (!res.ok || data.error) setError(data.error ?? "Something went wrong.");
      else setAnswer(data.answer ?? "");
    } catch {
      setError("Couldn't reach the agent. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="border border-slate-200 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h2 className="text-sm font-semibold text-slate-900">Ask the agent</h2>
        <span className="text-[11px] text-slate-400">
          Answers from this dashboard&apos;s data only
          {remaining != null && <> · {remaining} questions left today</>}
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          placeholder="e.g. Which accounts are at risk this quarter, and why?"
          aria-label="Ask the agent a question"
          className="flex-1 min-w-0 text-sm border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="text-sm font-medium px-4 py-2 rounded-md bg-brand-900 text-white hover:bg-brand-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            disabled={loading}
            className="text-[11px] px-2 py-1 rounded-full border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-700 cursor-pointer disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {(loading || answer || error) && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          {asked && <p className="text-[11px] text-slate-400 mb-1.5">Q: {asked}</p>}
          {loading && <p className="text-sm text-slate-500">Reading the accounts and signals…</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
          {answer && <Answer text={answer} accounts={accounts} />}
        </div>
      )}
    </section>
  );
}
