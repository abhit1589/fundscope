import { writeFileSync } from "fs";
import { join } from "path";

const MFAPI = "https://api.mfapi.in";

function isDirectGrowthOpenEnded(name) {
  if (!/\bdirect\b/i.test(name) || /\bregular\b/i.test(name)) return false;
  if (!/\bgrowth\b/i.test(name)) return false;
  if (/\b(dividend|idcw|id cw|bonus|reinvestment|demat|reward)\b/i.test(name))
    return false;
  if (/\b(fmp|fixed maturity|fixed term|interval fund|close[- ]ended)\b/i.test(name))
    return false;
  if (/\b(cpo|daf|capital protection|segregated|segregate)\b/i.test(name))
    return false;
  if (/\b\d+\s*(m|d)\b/i.test(name) && /\b(days?|month)\b/i.test(name))
    return false;
  if (
    /\b(weekly|monthly|quarterly|half[- ]yearly|daily|annual)\b/i.test(name) &&
    /\b(dividend|idcw|payout)\b/i.test(name)
  )
    return false;
  return true;
}

async function fetchPage(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`MFapi ${res.status}`);
      return res.json();
    } catch (e) {
      if (attempt === retries) throw e;
      console.log(`  retry ${attempt}/${retries} for ${url}`);
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    } finally {
      clearTimeout(timer);
    }
  }
}

async function main() {
  const results = [];
  const limit = 1000;
  let offset = 0;

  console.log("Fetching AMFI scheme list from MFapi.in…");

  while (true) {
    const url = `${MFAPI}/mf?limit=${limit}&offset=${offset}`;
    const batch = await fetchPage(url);
    if (!batch.length) break;

    for (const row of batch) {
      if (isDirectGrowthOpenEnded(row.schemeName)) {
        results.push({
          schemeCode: row.schemeCode,
          schemeName: row.schemeName,
        });
      }
    }

    console.log(`  offset ${offset}: +${batch.length} scanned, ${results.length} matched`);
    if (batch.length < limit) break;
    offset += limit;
  }

  results.sort((a, b) => a.schemeName.localeCompare(b.schemeName));

  const out = {
    generatedAt: new Date().toISOString(),
    source: "mfapi",
    total: results.length,
    schemes: results,
  };

  const path = join(process.cwd(), "src", "data", "direct-growth-catalog.json");
  writeFileSync(path, JSON.stringify(out, null, 2));
  console.log(`Wrote ${results.length} funds to ${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
