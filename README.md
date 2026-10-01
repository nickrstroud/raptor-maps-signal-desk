# Signal Desk · Raptor Maps CS

An always-on agent that watches Raptor Maps' key solar accounts and the clean-energy
market, and ranks which account needs a conversation first: expand what they own,
cross-sell what they don't, protect the renewal, or turn them into an advocate. It's an
independent demo built for the Raptor Maps Director of Customer Success interview and
isn't affiliated with Raptor Maps.

The eight key accounts are public Raptor Maps customers and partners from published case
studies. Product mix and relationship notes are inferred from those case studies; no
contract values are shown.

## What's on the page

- **Key accounts**: pinned accounts, always on top, ranked by priority. Each card shows
  the top signal with a suggested next step, the solutions owned (✓) vs. whitespace, and
  links to more signals, industry items on owned products, and upsell angles.
- **Industry signals**: climate-tech news that is about solar or would heavily
  influence it (tariffs, tax credits, drone rules, storm damage, portfolio M&A, NERC/OT
  security, grid access), tagged by the Raptor Maps solution it creates a conversation about.
- **Feedback loop**: 👍 Useful / 👎 Noise on every signal. Votes reweight signal types
  live and re-rank the accounts; "What the agent learned" shows the weights. "Wrong
  company" votes flag the account's news search instead of muting the type.
- **Account pages**: relationship background and sponsors from the case study, product
  footprint, signal timeline, and industry news split into "affects what they own" and
  "upsell angles".

## How it works

1. **Accounts** (`scripts/run.ts`): daily Google News RSS check per account. Articles
   already analyzed are skipped (`data/state.json`), so a quiet account costs one free
   RSS request and no model call.
2. **Analysis** (`scripts/analyze.ts`): new articles go to Claude Haiku 4.5 with the
   account's products, relationship background, and sponsors. It returns a score (−2 risk
   to +2 opportunity), an update type, a play (one of the four solutions, retention, or
   advocacy), and a concrete next step. One signal per article; source links come from our
   own article list, never from model output.
3. **Industry lane** (`scripts/industry.ts`): pv magazine USA, Solar Power World, PV
   Tech, Utility Dive, Canary Media, the Federal Register (DOE, IRS, FERC, FAA, ITA), and
   Google News topic searches. Claude keeps in-scope items, rates relevance 1–3, and tags
   affected solutions. Named-account mentions are verified in code against the article text.
4. **Ranking** (`lib/priority.ts`): signal weight × 30-day half-life decay × learned type
   weight, plus industry items naming the account or touching a solution it owns (capped).
5. **Schedule**: a GitHub Action runs daily and commits `data/` back to the repo; Vercel
   redeploys the static Next.js site on each commit.

## Customizing

Everything company-specific is in `lib/vendor.ts`: the four solutions, the CS motion,
the account scoring rubric, the industry scope, and the news sources. Brand colors are in
`app/globals.css`. Accounts are in `data/companies.json`:

```json
{
  "name": "Example Solar IPP",
  "website": "https://example.com/",
  "pinned": true,
  "type": "Utility-scale owner-operator",
  "newsQuery": "\"Example Solar\"",
  "products": ["raptor_solar", "inspections"],
  "notes": "Relationship background the agent uses to tailor actions.",
  "sponsors": [{ "name": "Jane Doe", "title": "VP Asset Management" }]
}
```

Optional `arr` (USD) and `renewalDate` (`YYYY-MM-DD`) add a value weight and a 90-day
renewal flag.

## Setup

```bash
bun install
cp .env.local.example .env.local      # add ANTHROPIC_API_KEY
bun run enrich      # fill in missing newsQuery values
bun run backfill    # ~3 months of account + industry history
bun run run         # one daily run
bun --bun next dev  # preview locally
```

## Cost

News is free. Haiku is about a cent per account with new coverage, and the industry pass
is a handful of batched calls, so a daily run costs cents.
