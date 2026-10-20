"use client";

import { useState } from "react";
import { workflowPlayLabel } from "@/lib/workflow-plays";
import { useWorkflows } from "./WorkflowContext";

function CopyBlock({ label, text, mono = false }: { label: string; text: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the text is still selectable.
    }
  };
  return (
    <div className="border border-slate-200 rounded-md bg-white">
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="text-[10px] px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-700 cursor-pointer"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className={`px-2.5 py-2 text-xs text-slate-700 whitespace-pre-wrap ${mono ? "font-mono" : "font-sans"}`}>{text}</pre>
    </div>
  );
}

// The "Trigger workflow" button on a signal, and once triggered, the play:
// five stages to check off plus a customer email, Slack note, and CRM task.
export default function WorkflowPanel({ signalId, account }: { signalId: string; account: string }) {
  const { workflows, sponsors, progress, statusOf, trigger, toggleStage, reset } = useWorkflows();
  const [open, setOpen] = useState(true);
  const wf = workflows[signalId];
  if (!wf) return null;

  const status = statusOf(signalId);
  const p = progress[signalId];
  const doneCount = p?.done.length ?? 0;

  if (status === "none") {
    return (
      <button
        type="button"
        onClick={() => {
          trigger(signalId);
          setOpen(true);
        }}
        className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-brand-900 text-white hover:bg-brand-700 cursor-pointer"
      >
        ⚡ Trigger workflow
      </button>
    );
  }

  const accountSponsors = sponsors[account] ?? [];

  return (
    <div className="border border-brand-200 rounded-lg bg-brand-50/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left cursor-pointer hover:bg-brand-50"
      >
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">
            {status === "done" ? "✓ Workflow complete" : "Workflow in progress"}
          </span>
          <span className="text-xs font-medium text-slate-800">{workflowPlayLabel(wf.play)}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="w-20 h-1.5 rounded-full bg-white border border-slate-200 overflow-hidden">
            <span
              className={`block h-full ${status === "done" ? "bg-emerald-500" : "bg-brand-500"}`}
              style={{ width: `${(doneCount / wf.stages.length) * 100}%` }}
            />
          </span>
          <span className="text-[11px] text-slate-500 tabular-nums">
            {doneCount}/{wf.stages.length}
          </span>
          <span className="text-[11px] text-slate-400" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          <div className="text-xs text-slate-600 space-y-0.5">
            <p>
              <span className="text-slate-400">Goal: </span>
              {wf.goal}
            </p>
            <p>
              <span className="text-slate-400">Owner: </span>
              {wf.owner}
            </p>
          </div>

          <ol className="space-y-1.5">
            {wf.stages.map((s, i) => {
              const checked = p?.done.includes(s.key) ?? false;
              return (
                <li key={s.key} className="bg-white border border-slate-200 rounded-md px-2.5 py-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStage(signalId, s.key)}
                      className="mt-0.5 accent-[var(--color-brand-700)]"
                    />
                    <span className="min-w-0">
                      <span className={`text-xs font-medium ${checked ? "text-slate-400 line-through" : "text-slate-800"}`}>
                        {i + 1}. {s.title}
                      </span>
                      <span className="text-[10px] text-slate-400"> · {s.timing}</span>
                      <ul className={`mt-0.5 text-[11px] list-disc pl-4 ${checked ? "text-slate-400" : "text-slate-600"}`}>
                        {s.tasks.map((t, j) => (
                          <li key={j}>{t}</li>
                        ))}
                      </ul>
                    </span>
                  </label>
                </li>
              );
            })}
          </ol>

          <p className="text-xs text-slate-700 bg-white border border-emerald-200 rounded-md px-2.5 py-1.5">
            <span className="font-semibold text-emerald-700">Done when: </span>
            {wf.doneWhen}
          </p>

          <div className="space-y-2">
            <p className="text-[11px] text-slate-500">
              Send to: <span className="text-slate-700">{wf.contactRole}</span>
              {accountSponsors.length > 0 && (
                <> · known sponsors: {accountSponsors.map((x) => `${x.name} (${x.title})`).join(", ")}</>
              )}
            </p>
            <CopyBlock label="Customer email" text={`Subject: ${wf.email.subject}\n\n${wf.email.body}`} />
            <CopyBlock label="Internal Slack note" text={wf.slack} />
            <CopyBlock
              label="CRM task"
              text={`${wf.crmTask.title}\nAccount: ${account}\nDue: ${wf.crmTask.due}\n\n${wf.crmTask.notes}`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Play generated by the agent from this signal and the account&apos;s history.</span>
            <button type="button" onClick={() => reset(signalId)} className="underline hover:text-slate-700 cursor-pointer">
              reset workflow
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
