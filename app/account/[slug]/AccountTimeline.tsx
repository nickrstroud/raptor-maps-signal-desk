"use client";

import { useMemo } from "react";
import type { CompanyAnalysis } from "@/lib/types";
import { formatDate } from "@/lib/score";
import { signalMatches } from "@/lib/match";
import { useFilters } from "@/app/FilterContext";
import SignalCard from "@/app/SignalCard";

export default function AccountTimeline({ history }: { history: CompanyAnalysis[] }) {
  const filters = useFilters();

  const filteredRuns = useMemo(() => {
    return history
      .map((run) => ({
        ...run,
        visibleSignals: run.signals.filter((s) => signalMatches(s, s.publishedAt ?? run.runAt, filters)),
      }))
      .filter((run) => run.visibleSignals.length > 0);
  }, [history, filters]);

  if (filteredRuns.length === 0) {
    return <p className="text-sm text-slate-500">No signals match the current filters.</p>;
  }

  return (
    <div className="space-y-6">
      {filteredRuns.map((run, i) => (
        <div key={i} className="border-l-2 border-brand-100 pl-5 relative">
          <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-brand-300" />
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[11px] text-slate-400">{formatDate(run.runAt)}</p>
            {run.source === "backfill" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-500">historical</span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-800 mb-3">{run.headline}</p>
          <div className="space-y-3">
            {run.visibleSignals.map((signal, j) => (
              <SignalCard key={j} signal={signal} at={signal.publishedAt ?? run.runAt} account={run.company} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
