"use client";

import Link from "next/link";
import { slugify } from "@/lib/slug";
import { workflowPlayLabel } from "@/lib/workflow-plays";
import { relativeDays } from "@/lib/score";
import { useFilters } from "./FilterContext";
import { nextStage, useWorkflows } from "./WorkflowContext";

// "Where do I stand": every triggered workflow, its progress, and the next step.
export default function MyWorkflows() {
  const { workflows, progress } = useWorkflows();
  const { setWorkflow } = useFilters();

  const entries = Object.entries(progress)
    .filter(([id]) => workflows[id])
    .map(([id, p]) => ({ id, p, wf: workflows[id] }))
    .sort((a, b) => b.p.startedAt.localeCompare(a.p.startedAt));
  const active = entries.filter((e) => !e.p.completedAt);
  const done = entries.length - active.length;

  return (
    <div className="border border-slate-200 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h2 className="text-sm font-semibold text-slate-900">My workflows</h2>
        <span className="text-[11px] text-slate-500">
          {active.length} in progress · {done} completed
        </span>
      </div>

      {active.length === 0 ? (
        <p className="text-xs text-slate-600">
          Click <span className="font-medium">⚡ Trigger workflow</span> on any signal to turn it into a play: five
          stages to work through, plus a ready-to-send email, Slack note, and CRM task.
        </p>
      ) : (
        <>
          <ul className="space-y-2.5">
            {active.map(({ id, p, wf }) => {
              const next = nextStage(wf, p);
              return (
                <li key={id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <Link
                      href={`/account/${slugify(wf.account)}`}
                      className="text-xs font-medium text-slate-800 hover:text-brand-700 hover:underline truncate"
                    >
                      {wf.account}
                    </Link>
                    <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                      {p.done.length}/{wf.stages.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {workflowPlayLabel(wf.play)} · {wf.signalTitle}
                  </p>
                  <div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
                    <div className="h-full bg-brand-500" style={{ width: `${(p.done.length / wf.stages.length) * 100}%` }} />
                  </div>
                  {next && (
                    <p className="text-[11px] text-slate-600 mt-1">
                      <span className="text-slate-400">Next: </span>
                      {next.title} <span className="text-slate-400">({next.timing})</span>
                      <span className="text-slate-400"> · started {relativeDays(p.startedAt)}</span>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => setWorkflow("active")}
            className="mt-3 text-[11px] text-brand-700 hover:underline cursor-pointer"
          >
            Show only accounts with workflows in progress →
          </button>
        </>
      )}
    </div>
  );
}
