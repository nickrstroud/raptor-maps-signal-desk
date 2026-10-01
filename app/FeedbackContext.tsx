"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Browser-only demo of the CSM feedback loop: votes live in this browser's
// localStorage. They reweight signal types live on this page (learnedWeights);
// in production they would be written to a shared store the daily run reads to
// reweight signal types and add labeled examples to the prompt.

export type Vote = "useful" | "noise";

export interface FeedbackEntry {
  vote: Vote;
  reason?: string;
  kind: "account" | "industry";
  updateType?: string;
  account?: string; // account signals only

  at: string;
}

interface FeedbackContextValue {
  votes: Record<string, FeedbackEntry>;
  setVote: (id: string, entry: Omit<FeedbackEntry, "at"> | null) => void;
  clearAll: () => void;
}

const STORAGE_KEY = "signal-desk-solar-feedback-v1";
const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function persist(votes: Record<string, FeedbackEntry>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
  } catch {
    // Private mode or blocked storage: votes still work for this page view.
  }
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [votes, setVotes] = useState<Record<string, FeedbackEntry>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setVotes(JSON.parse(raw));
    } catch {
      // Unreadable storage: start empty.
    }
  }, []);

  const setVote: FeedbackContextValue["setVote"] = (id, entry) => {
    setVotes((prev) => {
      const next = { ...prev };
      if (entry) next[id] = { ...entry, at: new Date().toISOString() };
      else delete next[id];
      persist(next);
      return next;
    });
  };

  const clearAll = () => {
    setVotes({});
    persist({});
  };

  return <FeedbackContext.Provider value={{ votes, setVote, clearAll }}>{children}</FeedbackContext.Provider>;
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used within a FeedbackProvider");
  return ctx;
}

// Stable id for an account signal (they have no id of their own).
export function accountSignalId(sourceLink: string, category: string): string {
  let h = 2166136261;
  for (const ch of `${sourceLink}|${category}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `a_${(h >>> 0).toString(36)}`;
}

// How votes turn into ranking weights. Each signal type starts at 1.0 and moves
// 0.25 per net vote, clamped to [0.25, 1.5]. "Wrong company" is a news-query
// problem, not a judgment on the signal type, so it doesn't count against it.
const STEP = 0.25;
const MIN_WEIGHT = 0.25;
const MAX_WEIGHT = 1.5;

export interface LearnedType {
  updateType: string;
  useful: number;
  noise: number;
  weight: number;
}

export interface Learned {
  types: LearnedType[]; // only types with at least one counted vote
  weightFor: (updateType: string | undefined) => number;
  queryFixes: string[]; // accounts flagged "Wrong company"
}

export function learnedWeights(votes: Record<string, FeedbackEntry>): Learned {
  const byType = new Map<string, { useful: number; noise: number }>();
  const queryFixes = new Set<string>();
  for (const v of Object.values(votes)) {
    if (v.reason === "Wrong company") {
      if (v.account) queryFixes.add(v.account);
      continue;
    }
    if (!v.updateType) continue;
    const t = byType.get(v.updateType) ?? { useful: 0, noise: 0 };
    if (v.vote === "useful") t.useful++;
    else t.noise++;
    byType.set(v.updateType, t);
  }
  const types = [...byType].map(([updateType, t]) => ({
    updateType,
    ...t,
    weight: Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, 1 + STEP * (t.useful - t.noise))),
  }));
  const map = new Map(types.map((t) => [t.updateType, t.weight]));
  return {
    types: types.sort((a, b) => a.weight - b.weight),
    weightFor: (u) => (u ? map.get(u) ?? 1 : 1),
    queryFixes: [...queryFixes],
  };
}
