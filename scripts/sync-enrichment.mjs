/**
 * Merge AMFI TER + AAUM into fund-cache.json
 * Usage: node scripts/sync-enrichment.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import {
  fetchLatestTerMonth,
  downloadTerExcel,
  parseTerExcel,
  downloadAumExcel,
  parseAumExcel,
  lookupTer,
} from "./lib/amfi-enrichment.mjs";

const CACHE_PATH = join(process.cwd(), "src", "data", "fund-cache.json");

async function main() {
  if (!existsSync(CACHE_PATH)) {
    console.error("Run npm run sync first (fund-cache.json missing).");
    process.exit(1);
  }

  const cache = JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
  console.log("Fetching AMFI TER…");
  const terMonth = await fetchLatestTerMonth();
  const terBuf = await downloadTerExcel(terMonth);
  const { byName: terByName, rowCount } = parseTerExcel(terBuf);
  console.log(`  TER month ${terMonth}, ${rowCount} schemes`);

  console.log("Fetching AMFI AAUM…");
  const { buffer: aumBuf } = await downloadAumExcel();
  const aumByCode = parseAumExcel(aumBuf);
  console.log(`  AUM rows ${aumByCode.size}`);

  let terHits = 0;
  let aumHits = 0;

  for (const fund of cache.funds) {
    const ter = lookupTer(terByName, fund.schemeName);
    if (ter != null) {
      fund.expenseRatio = ter;
      terHits++;
    }
    const aum = aumByCode.get(fund.schemeCode);
    if (aum != null) {
      fund.aumCr = Math.round(aum * 100) / 100;
      aumHits++;
    }
  }

  cache.enrichedAt = new Date().toISOString();
  cache.terMonth = terMonth;
  writeFileSync(CACHE_PATH, JSON.stringify(cache));
  console.log(
    `Enriched ${cache.funds.length} funds — TER: ${terHits}, AUM: ${aumHits}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
