# FundScope — India MF Screener

Personal mutual fund screener. Free on Vercel. Fund data from AMFI via [MFapi.in](https://mfapi.in). Optional AI uses your OpenAI key.

## Run locally

```bash
npm install
npm run sync:all   # first time: download & cache ~3,800 funds (~10–15 min)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). After sync, pages load **instantly** from cache.

## Data caching

| What | How |
|------|-----|
| **~3,800 funds** | Direct · growth · open-ended (not all 14,000 AMFI variants) |
| **Cache file** | `src/data/fund-cache.json` (NAV + returns) |
| **Refresh** | `npm run sync:all` locally, or daily GitHub Action |

**Why not 2 minutes?** Listing 14k schemes is fast (~30s). Computing returns needs **one NAV history call per fund** — ~3,800 calls ≈ **10–15 min** with parallel requests. That's normal.

## Deploy to Vercel (free, with caching)

Vercel **cannot write files at runtime** (serverless). Use this pattern:

1. **GitHub Action** (included) runs daily → updates `fund-cache.json` → pushes to repo
2. **Vercel auto-deploys** with the new JSON baked in
3. App reads cache from disk — **no live API calls** for the screener

### Steps

1. Push repo to GitHub
2. Enable GitHub Actions (workflow: `.github/workflows/sync-fund-cache.yml`)
3. Run workflow once manually, or locally:
   ```bash
   npm run sync:all
   git add src/data/*.json && git commit -m "add fund cache" && git push
   ```
4. Import project on [vercel.com](https://vercel.com)
5. Optional: add `OPENAI_API_KEY` for AI explain on fund pages

**Do not** run `sync` during Vercel build — it will timeout. Always commit the cache file.

## Optional AI explain

```
OPENAI_API_KEY=sk-your-key
```

## Features

- **Screener** — all direct · growth · open-ended funds, category filter, pagination
- **Fund detail** — NAV, returns, chart, optional AI summary
- **Portfolio** — manual units in browser (not CAS import)

Not investment advice.
