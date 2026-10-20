"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Workflow, WorkflowStageKey } from "@/lib/types";
import { STAGE_ORDER } from "@/lib/workflow-plays";

// Workflow content is pre-generated (data/workflows.json). Which workflows a CSM
// has triggered, and which stages they've checked off, lives in this browser's
// localStorage, like feedback votes. In production this would be a shared store
// (or tasks in the CRM) so the whole team sees each other's progress.

export interface WorkflowProgress {
  startedAt: string;
  done: WorkflowStageKey[];
  completedAt?: string;
  open?: boolean; // details expanded; remembered so a collapsed workflow stays collapsed
}

export type WorkflowStatus = "none" | "active" | "done";

export interface Sponsor {
  name: string;
  title: string;
}

interface WorkflowContextValue {
  workflows: Record<string, Workflow>;
  sponsors: Record<string, Sponsor[]>; // by account name
  progress: Record<string, WorkflowProgress>;
  statusOf: (signalId: string) => WorkflowStatus;
  trigger: (signalId: string) => void;
  toggleStage: (signalId: string, stage: WorkflowStageKey) => void;
  reset: (signalId: string) => void;
  setOpen: (signalId: string, open: boolean) => void;
}

const STORAGE_KEY = "signal-desk-solar-workflows-v1";
const WorkflowContext = createContext<WorkflowContextValue | null>(null);

function persist(progress: Record<string, WorkflowProgress>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Private mode or blocked storage: progress still works for this page view.
  }
}

export function WorkflowProvider({
  workflows,
  sponsors,
  children,
}: {
  workflows: Record<string, Workflow>;
  sponsors: Record<string, Sponsor[]>;
  children: ReactNode;
}) {
  const [progress, setProgress] = useState<Record<string, WorkflowProgress>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProgress(JSON.parse(raw));
    } catch {
      // Unreadable storage: start empty.
    }
  }, []);

  const update = (fn: (prev: Record<string, WorkflowProgress>) => Record<string, WorkflowProgress>) =>
    setProgress((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });

  const statusOf = (id: string): WorkflowStatus => {
    const p = progress[id];
    if (!p) return "none";
    return p.completedAt ? "done" : "active";
  };

  const trigger = (id: string) =>
    update((prev) => (prev[id] ? prev : { ...prev, [id]: { startedAt: new Date().toISOString(), done: [], open: true } }));

  const setOpen = (id: string, open: boolean) =>
    update((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], open } } : prev));

  const toggleStage = (id: string, stage: WorkflowStageKey) =>
    update((prev) => {
      const p = prev[id] ?? { startedAt: new Date().toISOString(), done: [] };
      const done = p.done.includes(stage) ? p.done.filter((s) => s !== stage) : [...p.done, stage];
      const complete = STAGE_ORDER.every((s) => done.includes(s));
      return { ...prev, [id]: { ...p, done, completedAt: complete ? new Date().toISOString() : undefined } };
    });

  const reset = (id: string) =>
    update((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  return (
    <WorkflowContext.Provider value={{ workflows, sponsors, progress, statusOf, trigger, toggleStage, reset, setOpen }}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflows(): WorkflowContextValue {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error("useWorkflows must be used within a WorkflowProvider");
  return ctx;
}

// The first stage not yet checked off, for "next step" summaries.
export function nextStage(wf: Workflow, p: WorkflowProgress | undefined) {
  return wf.stages.find((s) => !p?.done.includes(s.key)) ?? null;
}
