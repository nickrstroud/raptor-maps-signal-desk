import { readFileSync } from "node:fs";
import path from "node:path";
import { slugify } from "./slug";
import type { Company, CompanyAnalysis, IndustrySignal, PipelineState } from "./types";

export { slugify };
export type { Company, AccountSignal, CompanyAnalysis, IndustrySignal } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path.join(DATA_DIR, file), "utf-8"));
  } catch {
    return fallback;
  }
}

export function getCompanies(): Company[] {
  return readJson<Company[]>("companies.json", []);
}

export function getCompanyBySlug(slug: string): Company | undefined {
  return getCompanies().find((c) => slugify(c.name) === slug);
}

export function getCompanyHistory(slug: string): CompanyAnalysis[] {
  const history = readJson<CompanyAnalysis[]>(path.join("reports", `${slug}.json`), []);
  return [...history].sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime());
}

export function getIndustrySignals(): IndustrySignal[] {
  const signals = readJson<IndustrySignal[]>("industry.json", []);
  return [...signals].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function getPipelineState(): PipelineState {
  return readJson<PipelineState>("state.json", { accounts: {}, industrySeenLinks: [] });
}
