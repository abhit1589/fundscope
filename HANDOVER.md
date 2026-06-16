# FundScope — Agent Handover

**Project:** India mutual fund screener (direct · growth · open-ended)  
**User:** Non-tech founder (airline pilot), building free micro-SaaS on Vercel  
**Repo:** https://github.com/abhit1589/fundscope  
**Live:** https://llmcouncil-azure.vercel.app (Vercel project `llmcouncil`, linked to repo)  
**Local path:** `c:\Users\flyam\OneDrive\Desktop\llmcouncil`

---

## What this app is

**FundScope** — free MF screener with optional OpenAI “explain” feature. No database; data lives in JSON files committed to the repo and served by Next.js.

| Feature | Status |
|---------|--------|
| Screener (~3,820 funds), category filter, pagination | Done |
| NAV + returns (1M–5Y) | Done (from `fund-cache.json`) |
| TER + AUM columns | Done (~1,600+ funds via AMFI enrichment) |
| Fund detail: chart, TER, AUM, full holdings table | Done |
| Portfolio (manual units, `localStorage`) | Done |
| Local search dropdown (AMC + fund name) | Done (`src/lib/search.ts`, searches local cache) |
| Full holdings all AMCs | **Partial** — HDFC only (~70 schemes) |
| GitHub Actions auto-sync | Workflows exist; **user must enable Actions on repo** |
| AI explain | Needs `OPENAI_API_KEY` in Vercel env |

---

## Architecture (no DB)

```
MFapi.in (NAV)     ──► scripts/sync-fund-cache.mjs ──► fund-cache.json (~2 MB)
AMFI TER/AUM APIs  ──► scripts/sync-enrichment.mjs ──► merged into fund-cache.json
AMC portfolio XLSX ──► scripts/sync-holdings.mjs   ──► holdings-cache.json (~0.85 MB)
                              │
                              ▼
                    Next.js reads JSON at build/runtime
                              │
                              ▼
              Vercel redeploys on every git push (including Action commits)
```

**Auto-update without opening the app:** GitHub Action runs daily → commits cache → Vercel redeploys. User does not need to visit the site.

---

## Key commands

```bash
npm run dev              # localhost:3000
npm run catalog          # regenerate direct-growth-catalog.json from MFapi
npm run sync             # NAV + returns → fund-cache.json (~2 min, 3820 funds)
npm run sync:enrichment  # TER + AUM from AMFI (~1 min)
npm run sync:holdings    # Full portfolio from AMC Excel files
npm run sync:all         # catalog + sync + enrichment
npm run sync:full        # sync:all + holdings
npm run build
```

**Python (optional, for probing AMFI):** `pip install amfipy` — used during dev, not in CI.

---

## Important files

| Path | Purpose |
|------|---------|
| `src/data/fund-cache.json` | NAV, returns, TER, AUM for all funds |
| `src/data/holdings-cache.json` | Full portfolio per scheme (HDFC only today) |
| `src/data/direct-growth-catalog.json` | Scheme list filter source |
| `scripts/sync-fund-cache.mjs` | Daily NAV/returns builder |
| `scripts/sync-enrichment.mjs` | AMFI TER + quarterly AAUM |
| `scripts/sync-holdings.mjs` | AMC monthly portfolio scraper |
| `scripts/lib/amc-registry.mjs` | AMC index URLs + extractors (extensible) |
| `scripts/lib/portfolio-parser.mjs` | SEBI-style Excel → holdings JSON |
| `scripts/lib/amfi-enrichment.mjs` | AMFI TER/AUM download + parse |
| `src/lib/search.ts` | Local catalog search (replaces broken MFapi search) |
| `src/lib/catalog-filter.ts` | `isDirectGrowthOpenEnded`, `isActiveFund` |
| `src/app/api/funds/route.ts` | Paginated screener API; filters inactive funds |
| `src/app/api/search/route.ts` | Search API (local cache) |
| `src/components/Screener.tsx` | Main UI |
| `src/components/FundDetail.tsx` | Detail + holdings table |
| `.github/workflows/sync-fund-cache.yml` | Daily cron 2:30 UTC (~8 AM IST) |
| `HANDOVER.md` | This file — agent context |

---

## Data sources

| Data | Source | Update frequency |
|------|--------|------------------|
| NAV, returns | MFapi.in | Daily (business days) |
| TER | AMFI `populate-te-rdata-revised` Excel | Monthly |
| AUM | AMFI `average-aum-schemewise` Excel | Quarterly |
| Holdings | AMC websites (monthly portfolio Excel) | Monthly |
| mfdata.in | Was planned enrichment; **unreachable** (403/timeout) — do not rely on it |

---

| `.github/workflows/sync-holdings.yml` | Monthly cron 12th, 4:00 UTC |

---

## Recent changes (committed)

1. **Local search** — `src/lib/search.ts` + `/api/search` query fund-cache by AMC/fund name (fixes empty “HDFC” dropdown).
2. **Safe returns** — `normalizeReturns()` / `getReturnValue()` across table, detail, portfolio, APIs.
3. **Inactive fund filter** — `isActiveFund()` hides schemes with NAV stale >120 days (dead CPO/DAF/merged funds).
4. **Catalog filter** — Exclude CPO, DAF, fixed-term, segregated in `catalog-filter.ts` + `generate-catalog.mjs`.
5. **Cache-first fund pages** — Detail + `/api/fund/[code]` prefer `getCachedFund` over live MFapi.

**Note:** Run `npm run catalog` to apply tighter catalog filters to `direct-growth-catalog.json` (not run in this commit).

---

## Known issues (still open)

1. **GitHub Actions not enabled** — User must enable at https://github.com/abhit1589/fundscope/settings/actions then run workflows manually once.
2. **Holdings only HDFC** — `amc-registry.mjs` has HDFC (works), PPFAS/Axis (broken). Need scrapers for SBI, ICICI, Axis, Kotak, Nippon, etc. HDFC uses `__NEXT_DATA__` JSON on their portfolio page; needs browser-like `User-Agent` + `Referer`.
3. **mfapi.in flaky locally** — Connect timeouts common; sync works when API is up. Do **not** use `undici` Agent in sync scripts (was causing 0 successes).
4. **NAV looks "days old" on Monday** — Normal: Friday NAV until Monday evening publish. Weekend has no NAV.
5. **~6 new HDFC funds** — Null 1Y returns (fund too new); expected.
6. **Screener sort is per-page only** — Client sorts current 75 funds, not global ranking across all pages.
7. **Temp files** — `tmp-ter.xlsx`, `tmp-hdfc-flexi.xlsx` may exist locally; in `.gitignore` as `tmp-*.xlsx`.
8. **Probe scripts** — `scripts/_probe-*.mjs` may still exist; safe to delete.

---

## Holdings pipeline (how to extend)

1. Add entry to `scripts/lib/amc-registry.mjs` with `indexUrl`, `fundHouseHints`, `extractFiles(html)`.
2. AMC sites vary: HDFC embeds xlsx URLs in Next.js `__NEXT_DATA__`; others need custom parsing.
3. `sync-holdings.mjs` matches portfolio file titles to catalog via `scheme-name.mjs` fuzzy match.
4. `portfolio-parser.mjs` parses SEBI Excel format (ISIN, name, % NAV, sector).
5. Holdings stored at **family level** (same portfolio for direct growth variants).

---

## Deploy

- **Vercel:** Connected to `abhit1589/fundscope`, auto-deploy on push to `master`.
- **Optional env:** `OPENAI_API_KEY` for `/api/explain`.
- **No DB, no Supabase** — intentional for free tier.

```bash
git add -A && git commit -m "..." && git push origin master
# Vercel redeploys automatically
```

---

## User context & product direction

- Wants **ET Money–style** completeness eventually; understands paid data vs free scraping tradeoff.
- Chose **no database** for v1 (JSON + GitHub Actions).
- Wants **full holdings** (not top 10), automated monthly.
- Not a developer — explain simply, run commands yourself, don’t ask them to debug.

### Sensible next steps (priority)

1. **Enable GitHub Actions** + verify daily sync workflow runs (add `npm ci` to fund-cache workflow if deps needed).
2. **Add AMC scrapers** — SBI, ICICI Pru, Axis (biggest AUM coverage).
3. **Run `npm run catalog`** after filter changes, then `npm run sync:full`.
4. **Global sort** — optional: pre-sort in API or load sorted index.
5. **Fund house filter** in screener UI (filter table by AMC, not just jump-to-fund).

---

## Git history

See `git log` — latest commit should include search, returns safety, inactive filter, and HANDOVER.md.

---

## Quick verification

```bash
# After sync
node -e "const c=require('./src/data/fund-cache.json'); console.log(c.total, c.funds.find(f=>f.schemeCode===118955)?.returns?.oneYear)"

# Search test (after building search.ts)
node --input-type=module -e "import{searchFunds}from'./src/lib/search.ts'; ..."
# "hdfc flexi" should return HDFC Flexi Cap (118955)

# Production
curl "https://llmcouncil-azure.vercel.app/api/funds?page=1&category=Flexi%20Cap&pageSize=5"
```

---

## Conversation transcript

Full prior context:  
`C:\Users\flyam\.cursor\projects\c-Users-flyam-OneDrive-Desktop-llmcouncil\agent-transcripts\022c7d16-6356-4789-abac-9d46f3796d44\022c7d16-6356-4789-abac-9d46f3796d44.jsonl`
