import type { AccountSignal } from "@/lib/types";
import { playLabel, updateTypeLabel } from "@/lib/filters";
import { scoreClasses, scoreLabel, formatDate } from "@/lib/score";
import FeedbackButtons from "./FeedbackButtons";
import { accountSignalId } from "./FeedbackContext";

// One account signal. Used in the queue (compact) and the account timeline.
export default function SignalCard({
  signal,
  at,
  account,
  compact = false,
}: {
  signal: AccountSignal;
  at: string;
  account: string;
  compact?: boolean;
}) {
  const type = updateTypeLabel(signal.updateType);
  const play = playLabel(signal.play);
  return (
    <div className={compact ? "" : "border border-slate-200 rounded-lg p-3 bg-white shadow-sm"}>
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-slate-700">{signal.category}</span>
          {type && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 bg-slate-50">{type}</span>
          )}
        </div>
        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${scoreClasses(signal.score)}`}>
          {scoreLabel(signal.score)}
        </span>
      </div>
      <p className="text-sm text-slate-700 mb-2">{signal.summary}</p>
      <div className="text-xs text-slate-600 bg-brand-50/60 border border-brand-100 rounded-md px-2.5 py-1.5 mb-2">
        {play && <span className="font-semibold text-brand-700">{play} · </span>}
        {signal.suggestedAction}
      </div>
      <div className="flex items-center justify-between gap-2">
        {signal.sourceLink ? (
          <a
            href={signal.sourceLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-slate-500 hover:text-slate-800 hover:underline truncate"
          >
            {signal.sourceName ?? "Source"} ↗
          </a>
        ) : (
          <span />
        )}
        <span className="text-[11px] text-slate-400 shrink-0">{formatDate(at)}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-100">
        <FeedbackButtons
          id={accountSignalId(signal.sourceLink, signal.category)}
          kind="account"
          updateType={signal.updateType}
          account={account}
        />
      </div>
    </div>
  );
}
