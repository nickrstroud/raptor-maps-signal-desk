import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Company, CompanyAnalysis, PipelineState } from "../lib/types.ts";
import { slugify } from "../lib/slug.ts";

export const DATA_DIR = path.resolve(import.meta.dirname, "../data");
export const REPORTS_DIR = path.join(DATA_DIR, "reports");
const MAX_SEEN_PER_ACCOUNT = 400;

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf-8"));
  } catch {
    return fallback;
  }
}

export async function writeJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + "\n");
}

export function loadCompanies(): Promise<Company[]> {
  return readJson(path.join(DATA_DIR, "companies.json"), []);
}

export function loadState(): Promise<PipelineState> {
  return readJson(path.join(DATA_DIR, "state.json"), { accounts: {}, industrySeenLinks: [] });
}

export function saveState(state: PipelineState) {
  return writeJson(path.join(DATA_DIR, "state.json"), state);
}

export function loadHistory(company: Company): Promise<CompanyAnalysis[]> {
  return readJson(path.join(REPORTS_DIR, `${slugify(company.name)}.json`), []);
}

export async function appendHistory(company: Company, entries: CompanyAnalysis[]) {
  const history = await loadHistory(company);
  history.push(...entries);
  history.sort((a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime());
  await writeJson(path.join(REPORTS_DIR, `${slugify(company.name)}.json`), history);
}

export function markAccountSeen(state: PipelineState, company: Company, links: string[]) {
  const slug = slugify(company.name);
  const prev = state.accounts[slug]?.seenLinks ?? [];
  state.accounts[slug] = {
    lastCheckedAt: new Date().toISOString(),
    seenLinks: [...new Set([...prev, ...links])].slice(-MAX_SEEN_PER_ACCOUNT),
  };
}

export function defaultNewsQuery(company: Company): string {
  return company.newsQuery ?? `"${company.name}"`;
}

// Normalized title key — the same story syndicated across outlets collapses to one.
export function titleKey(title: string): string {
  return title.toLowerCase().replace(/\s+-\s+[^-]+$/, "").replace(/[^a-z0-9]+/g, " ").trim();
}

// Google News gives the same article different links per query, so seen-tracking
// stores a title key alongside each link.
export function seenKey(title: string): string {
  return `t:${titleKey(title)}`;
}

export function dedupe<T extends { title: string; link: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = titleKey(i.title);
    if (seen.has(k) || seen.has(i.link)) return false;
    seen.add(k);
    seen.add(i.link);
    return true;
  });
}

// Small promise pool: keeps a few requests in flight without hammering sources.
export async function mapPool<T, R>(items: T[], size: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return results;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
