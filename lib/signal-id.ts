// Stable id for an account signal (they have no id of their own). Shared by the
// pipeline (workflow generation) and the browser (feedback votes, workflow progress).
export function accountSignalId(sourceLink: string, category: string): string {
  let h = 2166136261;
  for (const ch of `${sourceLink}|${category}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `a_${(h >>> 0).toString(36)}`;
}
