import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { getCompanies } from "@/lib/data";
import AccountSwitcher from "./AccountSwitcher";
import FilterBar from "./FilterBar";
import { FilterProvider } from "./FilterContext";
import { FeedbackProvider } from "./FeedbackContext";
import { FOOTER, VENDOR } from "@/lib/vendor";

export const metadata: Metadata = {
  title: `${VENDOR.appName} · ${VENDOR.teamLabel}`,
  description: `An always-on agent that watches ${VENDOR.name}'s key accounts and the clean-energy market, and ranks who needs a conversation first.`,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const companies = getCompanies();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <FilterProvider>
          <FeedbackProvider>
          <header className="border-b border-slate-200 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
            <div className="h-1 bg-brand-500" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-brand-900 text-brand-300 text-xs" aria-hidden>
                    ◆
                  </span>
                  {VENDOR.appName}
                  <span className="text-[10px] font-medium text-brand-700 bg-brand-50 border border-brand-200 rounded px-1.5 py-0.5">
                    {VENDOR.teamLabel}
                  </span>
                </Link>
                <nav className="flex items-center gap-3 text-xs text-slate-500">
                  <Link href="/" className="hover:text-brand-700">Accounts</Link>
                  <Link href="/industry" className="hover:text-brand-700">Industry</Link>
                  <Link href="/about" className="hover:text-brand-700">How it works</Link>
                </nav>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <FilterBar />
                <AccountSwitcher companies={companies} />
              </div>
            </div>
          </header>
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>
          </FeedbackProvider>
        </FilterProvider>
        <footer className="border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
          {FOOTER}
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
