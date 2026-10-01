"use client";

import { useRouter, usePathname } from "next/navigation";
import type { Company } from "@/lib/types";
import { slugify } from "@/lib/slug";

export default function AccountSwitcher({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSlug = pathname.startsWith("/account/") ? pathname.split("/")[2] : "";

  const sorted = [...companies].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <select
      aria-label="Jump to account"
      value={currentSlug}
      onChange={(e) => {
        const value = e.target.value;
        router.push(value ? `/account/${value}` : "/");
      }}
      className="text-[11px] bg-white border border-slate-300 text-slate-700 rounded-md px-2 py-1 max-w-[11rem] focus:outline-none focus:ring-2 focus:ring-brand-500/40"
    >
      <option value="">Jump to account…</option>
      {sorted.map((c) => (
        <option key={c.name} value={slugify(c.name)}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
