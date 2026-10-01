"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { IndustrySignal } from "@/lib/types";
import { playLabel, updateTypeLabel } from "@/lib/filters";
import { VENDOR, productLabel } from "@/lib/vendor";
import { RELEVANCE_META, formatDate } from "@/lib/score";
import { industryMatches } from "@/lib/match";
import { useFilters } from "./FilterContext";
import FeedbackButtons from "./FeedbackButtons";

export interface IndustryItem {
  signal: IndustrySignal;
  affectedAccounts: { name: string; slug: string }[];
}

export default function IndustryFeed({ items, limit }: { items: IndustryItem[]; limit?: number }) {
  const filters = useFilters();
  const visible = useMemo(() => {
    const filtered = items.filter((i) => industryMatches(i.signal, filters));
    return limit ? filtered.slice(0, limit) : filtered;
  }, [items, filters, limit]);

  if (visible.length === 0) {
    return <p className="text-sm text-slate-500">No industry signals match the current filters.</p>;
  }

  return (
    <div className="space-y-3">
      {visible.map(({ signal: s, affectedAccounts }) => {
        const rel = RELEVANCE_META[s.relevance];
        const play = playLabel(s.play);
        return (
          <article key={s.id} className="border border-slate-200 rounded-lg p-3.5 bg-white shadow-sm">
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${rel.classes}`}>{rel.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 bg-slate-50">
                {updateTypeLabel(s.updateType)}
              </span>
              <span className="text-[11px] text-slate-400 ml-auto">{formatDate(s.publishedAt)}</span>
            </div>
            <a
              href={s.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm font-medium text-slate-900 hover:text-brand-600 hover:underline leading-snug mb-1"
            >
              {s.title}
            </a>
            <p className="text-xs text-slate-600 mb-2">{s.summary}</p>
            <p className="text-xs text-slate-700 bg-brand-50/60 border border-brand-100 rounded-md px-2.5 py-1.5 mb-2">
              <span className="font-semibold text-brand-700">
                {VENDOR.name} angle{play ? ` · ${play}` : ""}:{" "}
              </span>
              {s.angle}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              {s.products.length === 0 ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">Market-wide</span>
              ) : (
                s.products.map((p) => (
                  <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {productLabel(p)}
                  </span>
                ))
              )}
            </div>
            {affectedAccounts.length > 0 && (
              <details className="mt-2 text-[11px] text-slate-500">
                <summary className="cursor-pointer hover:text-brand-700 select-none">
                  Affects {affectedAccounts.length} account{affectedAccounts.length === 1 ? "" : "s"}
                </summary>
                <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
                  {affectedAccounts.map((a) => (
                    <Link key={a.slug} href={`/account/${a.slug}`} className="text-brand-700 hover:underline">
                      {a.name}
                    </Link>
                  ))}
                </div>
              </details>
            )}
            <p className="text-[10px] text-slate-400 mt-2">{s.sourceName}</p>
            <div className="mt-2 pt-2 border-t border-slate-100">
              <FeedbackButtons id={`i_${s.id}`} kind="industry" updateType={s.updateType} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
