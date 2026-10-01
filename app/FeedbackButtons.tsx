"use client";

import { useFeedback, type FeedbackEntry } from "./FeedbackContext";

const NOISE_REASONS = ["Wrong company", "Not actionable", "Already knew", "Wrong play"];

const base = "text-[10px] leading-none px-2 py-1 rounded-full border cursor-pointer transition-colors";

export default function FeedbackButtons({
  id,
  kind,
  updateType,
  account,
}: {
  id: string;
  kind: FeedbackEntry["kind"];
  updateType?: string;
  account?: string;
}) {
  const { votes, setVote } = useFeedback();
  const current = votes[id];

  const toggle = (vote: FeedbackEntry["vote"]) =>
    setVote(id, current?.vote === vote ? null : { vote, kind, updateType, account });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] text-slate-400">Was this helpful?</span>
      <button
        type="button"
        aria-pressed={current?.vote === "useful"}
        onClick={() => toggle("useful")}
        className={`${base} ${
          current?.vote === "useful"
            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
            : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
        }`}
      >
        <span aria-hidden>👍 </span>Useful
      </button>
      <button
        type="button"
        aria-pressed={current?.vote === "noise"}
        onClick={() => toggle("noise")}
        className={`${base} ${
          current?.vote === "noise"
            ? "bg-slate-100 text-slate-700 border-slate-400"
            : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
        }`}
      >
        <span aria-hidden>👎 </span>Noise
      </button>
      {current?.vote === "noise" &&
        NOISE_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={current.reason === r}
            onClick={() => setVote(id, { ...current, reason: current.reason === r ? undefined : r })}
            className={`${base} ${
              current.reason === r
                ? "bg-brand-50 text-brand-700 border-brand-300"
                : "border-dashed border-slate-300 text-slate-500 hover:text-slate-700"
            }`}
          >
            {r}
          </button>
        ))}
    </div>
  );
}
