"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AccountPriority } from "@/lib/priority";
import { productLabel } from "@/lib/vendor";
import { RENEWAL_WARNING_DAYS, daysUntil, formatCurrency, formatDate, relativeDays } from "@/lib/score";
import { useFilters } from "./FilterContext";
import CompanyLogo from "./CompanyLogo";

function RenewalCell({ date }: { date: string }) {
  const days = daysUntil(date);
  const soon = days <= RENEWAL_WARNING_DAYS;
  return (
    <span className={soon ? "text-red-700 font-bold" : "text-slate-500"}>
      {formatDate(date + "T12:00:00Z")}
      {soon && ` (${days}d)`}
    </span>
  );
}

export default function QuietAccounts({ accounts }: { accounts: AccountPriority[] }) {
  const { product } = useFilters();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts
      .filter((a) => product === "all" || a.company.products?.includes(product))
      .filter((a) => !q || a.company.name.toLowerCase().includes(q))
      .sort((a, b) => a.company.name.localeCompare(b.company.name));
  }, [accounts, product, query]);

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
        <p className="text-xs text-slate-500">
          Checked daily. Nothing actionable, so they stay out of the queue until something changes.
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search accounts…"
          aria-label="Search quiet accounts"
          className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-slate-400 bg-slate-50/70">
            <tr>
              <th className="text-left font-medium px-4 py-2">Account</th>
              <th className="text-left font-medium px-3 py-2">Products</th>
              <th className="text-right font-medium px-3 py-2">ARR</th>
              <th className="text-left font-medium px-3 py-2">Renewal</th>
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">Last signal</th>
              <th className="text-right font-medium px-4 py-2">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((a) => (
              <tr key={a.slug} className="hover:bg-slate-50/70">
                <td className="px-4 py-2">
                  <Link href={`/account/${a.slug}`} className="flex items-center gap-1.5 text-slate-800 hover:text-brand-700 hover:underline">
                    <CompanyLogo website={a.company.website} size={14} />
                    <span className="truncate">{a.company.name}</span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {a.company.products?.length ? a.company.products.map(productLabel).join(", ") : "—"}
                </td>
                <td className="px-3 py-2 text-slate-500 text-right tabular-nums">
                  {a.company.arr != null ? formatCurrency(a.company.arr) : "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {a.company.renewalDate ? (
                    <RenewalCell date={a.company.renewalDate} />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{relativeDays(a.lastSignalAt)}</td>
                <td className="px-4 py-2 text-slate-400 text-right tabular-nums">{a.priority.toFixed(1)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No quiet accounts match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">
        Products, ARR, and renewal dates are illustrative
      </p>
    </div>
  );
}
