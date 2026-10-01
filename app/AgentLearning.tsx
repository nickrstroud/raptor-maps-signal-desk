"use client";

import { useMemo } from "react";
import Link from "next/link";
import { updateTypeLabel } from "@/lib/filters";
import { slugify } from "@/lib/slug";
import { learnedWeights, useFeedback } from "./FeedbackContext";

// Makes the feedback loop visible: what the CSM's 👍/👎 votes have taught the
// agent so far, and how each lesson changes ranking.
export default function AgentLearning() {
  const { votes, clearAll } = useFeedback();
  const learned = useMemo(() => learnedWeights(votes), [votes]);
  const total = Object.keys(votes).length;

  return (
    <div className="border border-brand-200 rounded-xl bg-brand-50/40 p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h2 className="text-sm font-semibold text-slate-900">What the agent learned</h2>
        {total > 0 && (
          <button type="button" onClick={clearAll} className="text-[11px] text-slate-500 underline hover:text-slate-800 cursor-pointer">
            reset
          </button>
        )}
      </div>

      {total === 0 ? (
        <p className="text-xs text-slate-600">
          Rate any signal 👍 Useful or 👎 Noise. Signal types you keep marking as noise lose weight, the ones you find
          useful gain it, and the key accounts re-rank on the spot.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            From {total} rating{total === 1 ? "" : "s"}. Changes apply to ranking immediately.
          </p>
          {learned.types.length > 0 && (
            <ul className="space-y-1.5">
              {learned.types.map((t) => {
                const pct = Math.round((t.weight / 1.5) * 100);
                const up = t.weight > 1;
                const down = t.weight < 1;
                return (
                  <li key={t.updateType}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="text-slate-700 truncate">{updateTypeLabel(t.updateType) ?? t.updateType}</span>
                      <span
                        className={`tabular-nums font-medium shrink-0 ${up ? "text-emerald-700" : down ? "text-slate-500" : "text-slate-600"}`}
                      >
                        ×{t.weight.toFixed(2)} {up ? "boosted" : down ? "muted" : ""}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white border border-slate-200 mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${up ? "bg-emerald-500" : down ? "bg-slate-400" : "bg-brand-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {t.useful} useful · {t.noise} noise
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          {learned.queryFixes.length > 0 && (
            <div className="text-xs text-slate-600 border-t border-brand-100 pt-2">
              <p className="font-medium text-slate-700">News query to tighten</p>
              <p className="text-[11px] text-slate-500 mb-1">
                Marked &quot;Wrong company&quot;: the next run would narrow these searches instead of muting the signal type.
              </p>
              <div className="flex flex-wrap gap-x-2">
                {learned.queryFixes.map((name) => (
                  <Link key={name} href={`/account/${slugify(name)}`} className="text-brand-700 hover:underline">
                    {name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
