import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { DATA_DIR, loadCompanies, loadHistory, mapPool, writeJson } from "./common.ts";
import { MODEL } from "./analyze.ts";
import { VENDOR_CONTEXT } from "./vendor-context.ts";
import { PRODUCTS } from "../lib/vendor.ts";
import { WORKFLOW_PLAYS, STAGE_ORDER } from "../lib/workflow-plays.ts";
import { accountSignalId } from "../lib/signal-id.ts";
import type { AccountSignal, Company, Workflow } from "../lib/types.ts";

// Turns each account signal into a ready-to-run play: five stages, a customer
// email, an internal Slack note, and a CRM task. Generated once per signal and
// stored in data/workflows.json, so the dashboard shows it instantly (no live
// model calls from a public page). Neutral signals get no workflow.

const client = new Anthropic();
const FILE = path.join(DATA_DIR, "workflows.json");
const CONCURRENCY = 4;

const SYSTEM_PROMPT = `You design customer success plays. Given one signal about a customer
account, write a concrete, ready-to-run workflow a CSM could start today.

${VENDOR_CONTEXT}

Stages (always these five, in order):
- validate: confirm the signal and check account context (coverage, renewal, open issues)
- align: brief the right internal people (Sales for expansion, Ops/Support for risk, Product for feedback) and agree who leads
- engage: reach the customer with a reason to talk that is about their news, not our pitch
- act: the actual play (proposal, inspection or onboarding plan, save plan, reference ask)
- track: CRM logging, success measure, and closing the loop

Rules:
- 1-3 short, specific tasks per stage, written for this account and this signal.
- timing is relative, e.g. "Day 0", "Day 1-3", "Day 3-14", "Ongoing".
- Never put a real person's name in the email, Slack note, or tasks. Refer to customer
  contacts by role in square brackets, e.g. "Hi [VP Asset Management],".
- The email is short (90-140 words), warm, helpful, and specific to the news. No hard sell.
  For bad news (distress, damage, layoffs), lead with support.
- The Slack note is 2-4 sentences to internal colleagues: what happened, the play, who leads, the ask.
- doneWhen is one measurable outcome.`;

const TOOL: Anthropic.Tool = {
  name: "record_workflow",
  description: "Record the workflow for this signal.",
  input_schema: {
    type: "object",
    properties: {
      play: { type: "string", enum: WORKFLOW_PLAYS.map((p) => p.value) },
      goal: { type: "string", description: "One sentence: what this play achieves for the account" },
      owner: { type: "string", description: "Internal roles, e.g. 'CS Director + Account Executive'" },
      contactRole: { type: "string", description: "Customer contact role for the outreach, e.g. 'VP Asset Management'" },
      stages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string", enum: [...STAGE_ORDER] },
            timing: { type: "string" },
            tasks: { type: "array", items: { type: "string" } },
          },
          required: ["key", "timing", "tasks"],
        },
      },
      emailSubject: { type: "string" },
      emailBody: { type: "string" },
      slack: { type: "string" },
      crmTitle: { type: "string" },
      crmDue: { type: "string", description: "Relative due date, e.g. 'In 3 days'" },
      crmNotes: { type: "string" },
      doneWhen: { type: "string" },
    },
    required: [
      "play", "goal", "owner", "contactRole", "stages", "emailSubject", "emailBody",
      "slack", "crmTitle", "crmDue", "crmNotes", "doneWhen",
    ],
  },
};

const STAGE_TITLES: Record<string, string> = {
  validate: "Validate",
  align: "Align internally",
  engage: "Engage the customer",
  act: "Act",
  track: "Track & close the loop",
};

async function generate(company: Company, signal: AccountSignal, signalId: string): Promise<Workflow | null> {
  const owned = PRODUCTS.filter((p) => company.products?.includes(p.value)).map((p) => p.label);
  const profile = [
    `Account: ${company.name} (${company.type ?? "customer"})`,
    `Products owned: ${owned.join(", ") || "none recorded"}`,
    company.notes ? `Relationship background: ${company.notes}` : null,
    company.sponsors?.length ? `Known sponsor roles: ${company.sponsors.map((s) => s.title).join("; ")}` : null,
    "",
    `Signal (${signal.score > 0 ? "+" : ""}${signal.score}, ${signal.updateType ?? "update"}): ${signal.category}`,
    `Summary: ${signal.summary}`,
    `Suggested action from the analyst: ${signal.suggestedAction}`,
    signal.publishedAt ? `Date: ${signal.publishedAt.slice(0, 10)}` : null,
  ]
    .filter((l) => l != null)
    .join("\n");

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "record_workflow" },
    messages: [{ role: "user", content: profile }],
  });
  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return null;
  const w = toolUse.input as any;

  // Always exactly the five stages in order, whatever the model returned.
  const stages = STAGE_ORDER.map((key) => {
    const s = (w.stages ?? []).find((x: any) => x.key === key);
    return { key, title: STAGE_TITLES[key], timing: s?.timing ?? "", tasks: (s?.tasks ?? []).slice(0, 3) };
  });

  return {
    signalId,
    account: company.name,
    signalTitle: signal.category,
    play: w.play,
    goal: w.goal,
    owner: w.owner,
    contactRole: w.contactRole,
    stages,
    email: { subject: w.emailSubject, body: w.emailBody },
    slack: w.slack,
    crmTask: { title: w.crmTitle, due: w.crmDue, notes: w.crmNotes },
    doneWhen: w.doneWhen,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWorkflows() {
  const companies = await loadCompanies();
  const existing: Record<string, Workflow> = JSON.parse(await readFile(FILE, "utf-8").catch(() => "{}"));

  const todo: { company: Company; signal: AccountSignal; id: string }[] = [];
  for (const company of companies) {
    for (const run of await loadHistory(company)) {
      for (const signal of run.signals) {
        if (signal.score === 0 || !signal.sourceLink) continue;
        const id = accountSignalId(signal.sourceLink, signal.category);
        if (!existing[id]) todo.push({ company, signal, id });
      }
    }
  }
  console.log(`Workflows: ${todo.length} to generate`);

  let made = 0;
  await mapPool(todo, CONCURRENCY, async ({ company, signal, id }) => {
    try {
      const wf = await generate(company, signal, id);
      if (wf) {
        existing[id] = wf;
        made++;
      }
    } catch (err) {
      console.error(`  ${company.name} / ${signal.category}: failed —`, err instanceof Error ? err.message : err);
    }
  });

  await writeJson(FILE, existing);
  console.log(`Workflows: ${made} generated, ${Object.keys(existing).length} total`);
}

if (import.meta.main) {
  runWorkflows();
}
