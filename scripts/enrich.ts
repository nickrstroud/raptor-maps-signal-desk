import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import { DATA_DIR, loadCompanies, writeJson } from "./common.ts";
import { MODEL } from "./analyze.ts";
import { VENDOR } from "../lib/vendor.ts";
import type { Company } from "../lib/types.ts";

// Fills in blanks on companies.json: a disambiguated news query when the bare
// name is likely to collide with unrelated entities. Never overwrites values you supplied.

const client = new Anthropic();
const BATCH = 20;

const TOOL: Anthropic.Tool = {
  name: "record_profiles",
  description: "Record inferred account profiles.",
  input_schema: {
    type: "object",
    properties: {
      profiles: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            newsQuery: {
              type: "string",
              description:
                'Google News query. Default: the exact quoted name, e.g. "\\"Acme Solar\\"". Add a disambiguating OR-group only if the name is generic, e.g. "\\"Summit\\" (solar OR energy)"',
            },
          },
          required: ["name", "newsQuery"],
        },
      },
    },
    required: ["profiles"],
  },
};

async function main() {
  const companies = await loadCompanies();
  const todo = companies.filter((c) => !c.newsQuery);
  console.log(`${todo.length} of ${companies.length} account(s) need enrichment`);

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "record_profiles" },
      messages: [
        {
          role: "user",
          content: `Write a Google News query for each of these customers of ${VENDOR.name} (${VENDOR.summary}).

Organizations:
${batch.map((c) => `- ${c.name} (${c.website})`).join("\n")}`,
        },
      ],
    });
    const toolUse = message.content.find((b) => b.type === "tool_use");
    const profiles = (toolUse?.type === "tool_use" ? (toolUse.input as any).profiles : []) as Required<
      Pick<Company, "name" | "newsQuery">
    >[];

    for (const p of profiles) {
      const c = companies.find((x) => x.name === p.name);
      if (!c) continue;
      c.newsQuery ??= p.newsQuery;
      console.log(`  ${c.name}: ${c.newsQuery}`);
    }
  }

  await writeJson(path.join(DATA_DIR, "companies.json"), companies);
}

main();
