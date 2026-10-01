import { notFound } from "next/navigation";
import Link from "next/link";
import { getCompanies, getCompanyBySlug, getCompanyHistory, slugify } from "@/lib/data";
import { getAccountPriorities } from "@/lib/priority";
import { withAffectedAccounts, rankIndustry } from "@/lib/industry-view";
import { PRODUCTS } from "@/lib/vendor";
import { RENEWAL_WARNING_DAYS, STATUS_META, daysUntil, formatCurrency, formatDate, relativeDays } from "@/lib/score";
import AccountTimeline from "./AccountTimeline";
import CompanyLogo from "@/app/CompanyLogo";
import IndustryFeed from "@/app/IndustryFeed";
import ProductChips from "@/app/ProductChips";

export function generateStaticParams() {
  return getCompanies().map((c) => ({ slug: slugify(c.name) }));
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800 mt-0.5">{children}</dd>
    </div>
  );
}

export default async function AccountPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = getCompanyBySlug(slug);
  if (!company) notFound();

  const history = getCompanyHistory(slug).filter((r) => r.signals.length > 0);
  const ranked = getAccountPriorities();
  const p = ranked.find((a) => a.slug === slug)!;
  const rank = ranked.filter((a) => a.surfaced).findIndex((a) => a.slug === slug) + 1;
  const status = STATUS_META[p.status];
  const companies = getCompanies();
  const industryItems = withAffectedAccounts(rankIndustry(p.industryMatches), companies);
  const whitespaceItems = withAffectedAccounts(rankIndustry(p.whitespaceMatches), companies);
  const productValues = new Set(PRODUCTS.map((x) => x.value));
  const pointsTo = p.recentSignals.map((r) => r.signal.play).filter((x): x is string => !!x && productValues.has(x));
  const renewalDays = company.renewalDate ? daysUntil(company.renewalDate) : null;

  return (
    <div className="space-y-8">
      <Link href="/" className="text-xs text-slate-500 hover:text-brand-700">
        ← Key accounts
      </Link>

      <div className="border border-slate-200 rounded-xl bg-white shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CompanyLogo website={company.website} size={26} />
              <h1 className="text-xl font-semibold text-slate-900">{company.name}</h1>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${status.classes}`}>
                <span aria-hidden>{status.icon} </span>
                {status.label}
              </span>
            </div>
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-500 hover:text-slate-800 hover:underline"
            >
              {company.website}
            </a>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold text-brand-700 tabular-nums leading-none">{p.priority.toFixed(1)}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {company.pinned
                ? "priority · key account"
                : p.surfaced
                  ? `priority · #${rank} surfaced`
                  : "priority · below surfacing threshold"}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100">
          <Fact label="Type">{company.type ?? "—"}</Fact>
          <Fact label="ARR">{company.arr != null ? formatCurrency(company.arr) : "—"}</Fact>
          <Fact label="Renewal">
            {company.renewalDate && renewalDays != null ? (
              <span className={renewalDays < RENEWAL_WARNING_DAYS ? "text-red-700 font-bold" : ""}>
                {formatDate(company.renewalDate + "T12:00:00Z")} ({renewalDays}d)
              </span>
            ) : (
              "—"
            )}
          </Fact>
          <Fact label="Last checked">{relativeDays(p.lastCheckedAt)}</Fact>
        </dl>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">
            Product footprint <span className="normal-case tracking-normal">· ✓ owned · + a recent signal points here</span>
          </p>
          <ProductChips owned={company.products} highlight={pointsTo} />
        </div>
        {company.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Relationship background</p>
            <p className="text-sm text-slate-700">{company.notes}</p>
            {company.sponsors && company.sponsors.length > 0 && (
              <p className="text-xs text-slate-600 mt-2">
                <span className="text-slate-400">Sponsors: </span>
                {company.sponsors.map((x) => `${x.name} (${x.title})`).join(" · ")}
              </p>
            )}
            {company.caseStudyUrl && (
              <a href={company.caseStudyUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-brand-700 hover:underline">
                Public case study ↗
              </a>
            )}
          </div>
        )}
        <p className="text-[10px] text-slate-400 mt-3">
          Product mix is inferred from public case studies; ARR and renewal date, where shown, are illustrative demo values.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Account signals</h2>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-lg p-6 text-center">
              No account-specific signals yet. The agent checks this account&apos;s news daily.
            </p>
          ) : (
            <AccountTimeline history={history} />
          )}
        </section>
        <section className="min-w-0 space-y-8">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Affects what they own <span className="text-slate-400 font-normal">· last 30 days</span>
            </h2>
            {industryItems.length === 0 ? (
              <p className="text-sm text-slate-500">No industry signals on their products in the last 30 days.</p>
            ) : (
              <IndustryFeed items={industryItems} limit={6} />
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Upsell angles <span className="text-slate-400 font-normal">· products they don&apos;t own yet</span>
            </h2>
            <p className="text-[11px] text-slate-500 mb-3">Market news that opens a door to a cross-sell conversation.</p>
            {whitespaceItems.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing in the last 30 days.</p>
            ) : (
              <IndustryFeed items={whitespaceItems} limit={4} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
