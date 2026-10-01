"use client";

import { useFeedback } from "./FeedbackContext";

// The agent's own quality metric: share of CSM-rated signals marked useful.
export default function AgentPrecision() {
  const { votes, clearAll } = useFeedback();
  const all = Object.values(votes);
  const useful = all.filter((v) => v.vote === "useful").length;
  const pct = all.length ? Math.round((useful / all.length) * 100) : null;

  return (
    <div className="col-span-2 lg:col-span-1 border border-brand-200 rounded-xl bg-brand-50/50 px-4 py-3 shadow-sm">
      <p className="text-[11px] text-brand-700">Agent precision</p>
      <p className="text-2xl font-semibold text-slate-900 tabular-nums leading-tight mt-0.5">
        {pct == null ? "—" : `${pct}%`}
      </p>
      <p className="text-[11px] text-slate-500 mt-0.5">
        {all.length === 0 ? (
          "share of rated signals marked useful"
        ) : (
          <>
            {useful} useful · {all.length - useful} noise ·{" "}
            <button type="button" onClick={clearAll} className="underline hover:text-slate-800 cursor-pointer">
              reset
            </button>
          </>
        )}
      </p>
    </div>
  );
}
