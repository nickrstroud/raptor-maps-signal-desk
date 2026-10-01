import { withinPeriod } from "./filters";
import type { AccountSignal, IndustrySignal } from "./types";

export interface ActiveFilters {
  selectedScores: Set<number>;
  period: string;
  updateType: string;
  product: string;
}

export function signalMatches(signal: AccountSignal, at: string, f: ActiveFilters): boolean {
  if (f.selectedScores.size > 0 && !f.selectedScores.has(signal.score)) return false;
  if (f.updateType !== "all" && signal.updateType !== f.updateType) return false;
  return withinPeriod(at, f.period);
}

// Industry signals have no sentiment score, so the score chips don't apply.
export function industryMatches(i: IndustrySignal, f: ActiveFilters): boolean {
  if (f.updateType !== "all" && i.updateType !== f.updateType) return false;
  if (f.product !== "all" && !i.products.includes(f.product)) return false;
  return withinPeriod(i.publishedAt, f.period);
}
