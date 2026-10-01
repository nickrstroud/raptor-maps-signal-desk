export function scoreLabel(score: number): string {
  switch (score) {
    case 2:
      return "Strong Opportunity";
    case 1:
      return "Opportunity";
    case 0:
      return "Neutral";
    case -1:
      return "Risk";
    case -2:
      return "Strong Risk";
    default:
      return "Unknown";
  }
}

export function scoreClasses(score: number): string {
  switch (score) {
    case 2:
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case 1:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case 0:
      return "bg-slate-100 text-slate-600 border-slate-300";
    case -1:
      return "bg-amber-100 text-amber-800 border-amber-300";
    case -2:
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-slate-100 text-slate-600 border-slate-300";
  }
}

export const STATUS_META = {
  expansion: { label: "Expansion", classes: "bg-emerald-50 text-emerald-800 border-emerald-300", icon: "↗" },
  risk: { label: "At risk", classes: "bg-red-50 text-red-800 border-red-300", icon: "!" },
  watch: { label: "Watch", classes: "bg-brand-50 text-brand-700 border-brand-200", icon: "◉" },
  quiet: { label: "Quiet", classes: "bg-slate-50 text-slate-500 border-slate-200", icon: "·" },
} as const;

export const RELEVANCE_META: Record<number, { label: string; classes: string }> = {
  3: { label: "Act this week", classes: "bg-brand-900 text-white border-brand-900" },
  2: { label: "Proactive touch", classes: "bg-brand-50 text-brand-700 border-brand-200" },
  1: { label: "Context", classes: "bg-slate-50 text-slate-500 border-slate-200" },
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function relativeDays(iso: string | null): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export const RENEWAL_WARNING_DAYS = 90;

export function daysUntil(dateIso: string): number {
  const target = new Date(dateIso + "T00:00:00Z").getTime();
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / 86_400_000);
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
