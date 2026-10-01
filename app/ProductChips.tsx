import { PRODUCTS } from "@/lib/vendor";

// Owned products as solid chips, whitespace as dashed ones. `highlight` marks
// products a recent signal points to.
export default function ProductChips({
  owned = [],
  highlight = [],
  showWhitespace = true,
}: {
  owned?: string[];
  highlight?: string[];
  showWhitespace?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {PRODUCTS.map((p) => {
        const has = owned.includes(p.value);
        if (!has && !showWhitespace) return null;
        const hot = highlight.includes(p.value);
        return (
          <span
            key={p.value}
            title={`${p.label}: ${has ? "owned" : "not owned yet"}${hot ? " · a recent signal points here" : ""}`}
            className={`text-[10px] px-1.5 py-0.5 rounded border ${
              has
                ? "bg-slate-100 text-slate-700 border-slate-200"
                : hot
                  ? "border-dashed border-emerald-400 text-emerald-700 bg-emerald-50"
                  : "border-dashed border-slate-300 text-slate-400"
            }`}
          >
            {has ? "✓ " : hot ? "+ " : ""}
            {p.label}
          </span>
        );
      })}
    </div>
  );
}
