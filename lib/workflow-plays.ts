// The plays a workflow can run. Also a model enum in scripts/workflows.ts.
export const WORKFLOW_PLAYS = [
  { value: "onboard_expand", label: "Onboard & expand" },
  { value: "protect_renewal", label: "Protect the renewal" },
  { value: "reestablish", label: "Re-establish the relationship" },
  { value: "help_first", label: "Help first" },
  { value: "advise", label: "Advise" },
  { value: "advocacy", label: "Ask for advocacy" },
];

export function workflowPlayLabel(value: string): string {
  return WORKFLOW_PLAYS.find((p) => p.value === value)?.label ?? value;
}

export const STAGE_ORDER = ["validate", "align", "engage", "act", "track"] as const;
