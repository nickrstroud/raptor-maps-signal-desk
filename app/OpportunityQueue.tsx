"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { AccountPriority } from "@/lib/priority";
import { PRODUCTS } from "@/lib/vendor";
import { RENEWAL_WARNING_DAYS, STATUS_META, daysUntil, formatCurrency } from "@/lib/score";
import { signalMatches, industryMatches } from "@/lib/match";
import { useFilters } from "./FilterContext";
import { learnedWeights, useFeedback } from "./FeedbackContext";
import CompanyLogo from "./CompanyLogo";
import ProductChips from "./ProductChips";
import SignalCard from "./SignalCard";

const PRODUCT_VALUES = new Set(PRODUCTS.map((p) => p.value));

function monthsAgo(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / (30 * 86_400_000));
  return m <= 1 ? "about a month ago" : `${m} months ago`;
}

// Ranked account cards. Used for the pinned key accounts (`pinned`: always
// shown, even with nothing matching the filters) and for other accounts that
// surface on their own. Priority is recomputed here with the weights learned
// from 👍/👎 votes, so the order responds to feedback immediately.
export default function OpportunityQueue({ accounts, pinned = false }: { accounts: AccountPriority[]; pinned?: boolean }) {
  const filters = useFilters();
  const { votes } = useFeedback();
  const learned = useMemo(() => learnedWeights(votes), [votes]);
  const signalFilterActive = filters.selectedScores.size > 0 || filters.updateType !== "all" || filters.period !== "all";

  const visible = useMemo(() => {
    return accounts
      .map((a) => {
        const reweighted = a.recentSignals
          .map((r) => ({ ...r, weight: r.weight * learned.weightFor(r.signal.updateType) }))
          .sort((x, y) => y.weight - x.weight);
        const signalWeight = reweighted.reduce((sum, r) => sum + r.weight, 0);
        const adjusted = Math.round((signalWeight + a.industryWeight) * a.valueWeight * 10) / 10;
        const matching = reweighted.filter((r) => signalMatches(r.signal, r.at, filters));
        const lead = signalFilterActive
          ? matching[0] ?? null
          : a.status === "risk"
            ? a.topSignal
            : reweighted[0] ?? null;
        const pointsTo = reweighted.map((r) => r.signal.play).filter((p): p is string => !!p && PRODUCT_VALUES.has(p));
        return { ...a, adjusted, lead, pointsTo };
      })
      .filter((a) => filters.product === "all" || a.company.products?.includes(filters.product) || a.pointsTo.includes(filters.product))
      .filter(
        (a) =>
          pinned ||
          !signalFilterActive ||
          a.lead != null ||
          (filters.selectedScores.size === 0 && a.industryMatches.some((i) => industryMatches(i, filters))),
      )
      .sort((x, y) => y.adjusted - x.adjusted || x.company.name.localeCompare(y.company.name));
  }, [accounts, filters, signalFilterActive, learned, pinned]);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-lg p-6 text-center">
        Nothing surfaced for the current filters.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {visible.map((a, idx) => {
        const status = STATUS_META[a.status];
        const renewalDays = a.company.renewalDate ? daysUntil(a.company.renewalDate) : null;
        const moreSignals = a.recentSignals.length - (a.lead ? 1 : 0);
        const delta = Math.round((a.adjusted - a.priority) * 10) / 10;
        return (
          <li key={a.slug} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-xs font-semibold text-slate-400 tabular-nums w-5 pt-0.5">{idx + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <CompanyLogo website={a.company.website} />
                    <Link href={`/account/${a.slug}`} className="font-semibold text-slate-900 hover:text-brand-700 hover:underline">
                      {a.company.name}
                    </Link>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${status.classes}`}>
                      <span aria-hidden>{status.icon} </span>
                      {status.label}
                    </span>
                  </div>
                  {(a.company.arr != null || renewalDays != null) && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {a.company.arr != null && <>{formatCurrency(a.company.arr)} ARR</>}
                      {renewalDays != null && (
                        <span className={renewalDays < RENEWAL_WARNING_DAYS ? "text-red-700 font-bold" : ""}>
                          {a.company.arr != null && " · "}renews in {renewalDays}d
                        </span>
                      )}
                    </p>
                  )}
                  <div className="mt-1.5">
                    <ProductChips owned={a.company.products} highlight={a.pointsTo} />
                  </div>
                </div>
              </div>
              <div
                className="text-right shrink-0"
                title="Priority = signal strength × recency decay × learned type weight × account value, plus industry signals on products they own"
              >
                <p className="text-lg font-semibold text-brand-700 tabular-nums leading-none">{a.adjusted.toFixed(1)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  priority
                  {delta !== 0 && (
                    <span className={delta > 0 ? "text-emerald-700" : "text-slate-500"}>
                      {" "}
                      {delta > 0 ? "▲" : "▼"}
                      {Math.abs(delta).toFixed(1)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="px-4 pb-3 pl-12">
              {a.lead ? (
                <SignalCard signal={a.lead.signal} at={a.lead.at} account={a.company.name} compact />
              ) : !signalFilterActive && a.lastEvent ? (
                <div>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    Quiet for 90 days. Last notable event, {monthsAgo(a.lastEvent.at)} (context only, not in the score):
                  </p>
                  <SignalCard signal={a.lastEvent.signal} at={a.lastEvent.at} account={a.company.name} compact />
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  {signalFilterActive
                    ? "No signals match the current filters."
                    : a.industryMatches.length > 0
                      ? `No direct news in 90 days. ${a.industryMatches.length} industry signal${a.industryMatches.length === 1 ? "" : "s"} touch products they own.`
                      : "Quiet: no direct news in the last 90 days. The agent checks daily."}
                </p>
              )}
            </div>

            {(moreSignals > 0 || a.industryMatches.length > 0 || a.whitespaceMatches.length > 0) && (
              <Link
                href={`/account/${a.slug}`}
                className="flex items-center justify-between gap-2 px-4 py-2 pl-12 border-t border-slate-100 bg-slate-50/70 text-[11px] text-slate-500 hover:text-brand-700"
              >
                <span>
                  {[
                    moreSignals > 0 && `+${moreSignals} more signal${moreSignals === 1 ? "" : "s"}`,
                    a.industryMatches.length > 0 &&
                      `${a.industryMatches.length} industry signal${a.industryMatches.length === 1 ? "" : "s"} on owned products`,
                    a.whitespaceMatches.length > 0 && `${a.whitespaceMatches.length} upsell angle${a.whitespaceMatches.length === 1 ? "" : "s"}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span aria-hidden>→</span>
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}
