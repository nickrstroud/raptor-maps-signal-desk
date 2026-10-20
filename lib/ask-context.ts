import { getCompanies, getCompanyHistory, getIndustrySignals, slugify } from "./data";
import { PRODUCTS, VENDOR, productLabel } from "./vendor";

// Everything "Ask the agent" may answer from, as one compact text briefing.
// Built from the same files the dashboard renders, so answers match the page.
// Kept well under 100K tokens (Haiku 5.5's lower price tier).

const INDUSTRY_DAYS = 60;

function day(iso: string | undefined): string {
  return iso ? iso.slice(0, 10) : "unknown date";
}

export function buildAskContext(): string {
  const lines: string[] = [];
  lines.push(`# ${VENDOR.name} key accounts (as of ${new Date().toISOString().slice(0, 10)})`);
  lines.push(`Solutions: ${PRODUCTS.map((p) => p.label).join(", ")}`);

  for (const c of getCompanies()) {
    const owned = (c.products ?? []).map(productLabel);
    const notOwned = PRODUCTS.filter((p) => !c.products?.includes(p.value)).map((p) => p.label);
    lines.push("", `## ${c.name} (/account/${slugify(c.name)})`);
    if (c.type) lines.push(`Type: ${c.type}`);
    lines.push(`Owns: ${owned.join(", ") || "none recorded"} | Not yet: ${notOwned.join(", ")}`);
    if (c.sponsors?.length) lines.push(`Sponsors: ${c.sponsors.map((s) => `${s.name} (${s.title})`).join("; ")}`);
    if (c.notes) lines.push(`Background: ${c.notes}`);

    const signals = getCompanyHistory(slugify(c.name)).flatMap((run) =>
      run.signals.map((s) => ({ ...s, at: s.publishedAt ?? run.runAt })),
    );
    signals.sort((a, b) => b.at.localeCompare(a.at));
    if (signals.length) lines.push("Signals (newest first):");
    for (const s of signals) {
      lines.push(
        `- ${day(s.at)} [${s.score > 0 ? "+" : ""}${s.score}] ${s.category}: ${s.summary} (Suggested: ${s.suggestedAction}) [${s.sourceName ?? "source"}]`,
      );
    }
  }

  const cutoff = Date.now() - INDUSTRY_DAYS * 86_400_000;
  const industry = getIndustrySignals().filter((i) => new Date(i.publishedAt).getTime() >= cutoff && i.relevance >= 2);
  lines.push("", `# Industry signals (last ${INDUSTRY_DAYS} days, relevance 2-3)`);
  for (const i of industry) {
    const tags = [
      i.products.length ? i.products.map(productLabel).join("/") : "market-wide",
      i.mentionedAccounts.length ? `names: ${i.mentionedAccounts.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("; ");
    lines.push(`- ${day(i.publishedAt)} [rel ${i.relevance}] ${i.title} (${tags}): ${i.summary} Angle: ${i.angle} [${i.sourceName}]`);
  }

  return lines.join("\n");
}
