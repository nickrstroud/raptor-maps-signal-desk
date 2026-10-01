import { getCompanies, getIndustrySignals } from "@/lib/data";
import { withAffectedAccounts } from "@/lib/industry-view";
import { INDUSTRY_SOURCES } from "@/lib/vendor";
import IndustryFeed from "../IndustryFeed";

export default function IndustryPage() {
  const items = withAffectedAccounts(getIndustrySignals(), getCompanies());

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Industry signals</h1>
        <p className="text-sm text-slate-500">
          {INDUSTRY_SOURCES.description} Sources: {INDUSTRY_SOURCES.rss.map((f) => f.name).join(", ")}, the Federal
          Register, and Google News topic searches, filtered and tagged by product by Claude.
        </p>
      </div>
      <IndustryFeed items={items} />
    </div>
  );
}
