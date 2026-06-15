/**
 * Download AMC monthly portfolio Excel files and build full holdings cache.
 * Usage: node scripts/sync-holdings.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { AMC_SOURCES, FETCH_HEADERS } from "./lib/amc-registry.mjs";
import { parsePortfolioWorkbook } from "./lib/portfolio-parser.mjs";
import {
  normalizeSchemeFamily,
  schemeFamilyKey,
  namesLikelyMatch,
} from "./lib/scheme-name.mjs";

const CACHE_PATH = join(process.cwd(), "src", "data", "fund-cache.json");
const HOLDINGS_PATH = join(process.cwd(), "src", "data", "holdings-cache.json");
const CONCURRENCY = 6;
const MAX_FILES_PER_AMC = 500;

function titleToSchemeLabel(title) {
  return title
    .replace(/^monthly\s+/i, "")
    .replace(/\s*-\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}\s*\.xlsx?$/i, "")
    .replace(/\.xlsx?$/i, "")
    .trim();
}

function fundHouseMatches(fundHouse, hints) {
  const h = fundHouse.toLowerCase();
  return hints.some((hint) => h.includes(hint.toLowerCase()));
}

async function runPool(items, fn, concurrency) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        const r = await fn(items[idx], idx);
        if (r) results.push(r);
      } catch (e) {
        console.warn("  skip:", e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  if (!existsSync(CACHE_PATH)) {
    console.error("Run npm run sync first.");
    process.exit(1);
  }

  const cache = JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
  const catalogFunds = cache.funds;

  /** @type {Map<string, { schemeCodes: number[], fundHouse: string }>} */
  const familyIndex = new Map();
  for (const fund of catalogFunds) {
    const key = schemeFamilyKey(fund.schemeName, fund.fundHouse);
    const entry = familyIndex.get(key) ?? {
      schemeCodes: [],
      fundHouse: fund.fundHouse,
      label: fund.schemeName,
    };
    entry.schemeCodes.push(fund.schemeCode);
    familyIndex.set(key, entry);
  }

  /** @type {Record<string, { asOf: string|null, source: string, holdings: object[] }>} */
  const bySchemeCode = {};
  let filesProcessed = 0;
  let holdingsAssigned = 0;

  for (const amc of AMC_SOURCES) {
    console.log(`\n[${amc.id}] ${amc.indexUrl}`);
    const res = await fetch(amc.indexUrl, {
      headers: { ...FETCH_HEADERS, ...(amc.fetchHeaders ?? {}) },
    });
    if (!res.ok) {
      console.warn(`  index HTTP ${res.status}, skip`);
      continue;
    }
    const html = await res.text();
    const files = amc.extractFiles(html).slice(0, MAX_FILES_PER_AMC);
    console.log(`  ${files.length} portfolio files`);

    const parsed = await runPool(
      files,
      async (file) => {
        const label = titleToSchemeLabel(file.title || file.url);
        const labelKey = normalizeSchemeFamily(label);

        /** Match catalog families for this AMC */
        const matches = [];
        for (const [key, entry] of familyIndex) {
          if (!fundHouseMatches(entry.fundHouse, amc.fundHouseHints)) continue;
          if (
            key.endsWith(`:${labelKey}`) ||
            namesLikelyMatch(label, entry.label)
          ) {
            matches.push(entry);
          }
        }
        if (!matches.length) return null;

        const dl = await fetch(file.url, {
          headers: { ...FETCH_HEADERS, ...(amc.fetchHeaders ?? {}) },
        });
        if (!dl.ok) throw new Error(`${file.url} → ${dl.status}`);
        const buf = Buffer.from(await dl.arrayBuffer());
        const { asOf, holdings } = parsePortfolioWorkbook(buf);
        if (!holdings.length) return null;

        return { label, asOf, holdings, matches, source: amc.id };
      },
      CONCURRENCY
    );

    for (const item of parsed) {
      filesProcessed++;
      for (const entry of item.matches) {
        for (const code of entry.schemeCodes) {
          const key = String(code);
          if (bySchemeCode[key]?.holdings?.length >= item.holdings.length)
            continue;
          bySchemeCode[key] = {
            asOf: item.asOf,
            source: item.source,
            portfolioLabel: item.label,
            holdings: item.holdings,
          };
          holdingsAssigned++;
        }
      }
    }
    console.log(`  parsed ${parsed.length} files with holdings`);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    total: Object.keys(bySchemeCode).length,
    filesProcessed,
    funds: bySchemeCode,
  };

  writeFileSync(HOLDINGS_PATH, JSON.stringify(out));
  console.log(
    `\nWrote holdings for ${out.total} schemes (${holdingsAssigned} assignments, ${filesProcessed} files)`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
