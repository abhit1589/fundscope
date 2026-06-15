/**
 * Daily fund cache sync — run locally or in GitHub Actions before deploy.
 * Fetches all direct-growth open-ended funds + latest NAV + returns.
 *
 * Usage: node scripts/sync-fund-cache.mjs
 * Typical runtime: ~8–15 min for ~3,800 funds (not 2 min if computing returns).
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const MFAPI = "https://api.mfapi.in";
const CONCURRENCY = 15;
const CATALOG_PATH = join(process.cwd(), "src", "data", "direct-growth-catalog.json");
const CACHE_PATH = join(process.cwd(), "src", "data", "fund-cache.json");

function inferCategory(schemeName, schemeCategory) {
  if (schemeCategory) {
    const c = schemeCategory.toLowerCase();
    if (c.includes("flexi cap") || c.includes("flexicap")) return "Flexi Cap";
    if (c.includes("large cap")) return "Large Cap";
    if (c.includes("mid cap")) return "Mid Cap";
    if (c.includes("small cap")) return "Small Cap";
    if (c.includes("elss") || c.includes("tax saver")) return "ELSS";
    if (c.includes("index") || c.includes("nifty")) return "Index";
    if (c.includes("debt") || c.includes("liquid") || c.includes("bond"))
      return "Debt / Liquid";
    if (c.includes("hybrid") || c.includes("balanced")) return "Hybrid";
  }
  const n = schemeName.toLowerCase();
  if (/\bfund\s*of\s*funds\b|\bfof\b/i.test(n)) return "Fund of Funds";
  if (/\bindex\b/i.test(n)) return "Index";
  if (/flexi\s*(debt|bond)/i.test(schemeName)) return "Debt / Liquid";
  if (/\bflexi\s*cap\b|\bflexicap\b/i.test(n)) return "Flexi Cap";
  if (/\blarge\s*cap\b|\bbluechip\b/i.test(n)) return "Large Cap";
  if (/\bmid\s*cap\b/i.test(n)) return "Mid Cap";
  if (/\bsmall\s*cap\b/i.test(n)) return "Small Cap";
  if (/\belss\b/i.test(n)) return "ELSS";
  if (/\b(debt|liquid|bond|gilt)\b/i.test(n)) return "Debt / Liquid";
  if (/\bhybrid\b|\bbalanced\b/i.test(n)) return "Hybrid";
  return "Other";
}

function parseIndianDate(d) {
  const [day, month, year] = d.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function findNavOnOrBefore(points, target) {
  let result = null;
  for (const p of points) {
    if (p.date.getTime() <= target.getTime()) result = p.nav;
    else break;
  }
  return result;
}

function computeReturns(points) {
  const empty = {
    oneMonth: null,
    threeMonth: null,
    sixMonth: null,
    ytd: null,
    oneYear: null,
    threeYear: null,
    fiveYear: null,
  };
  if (points.length < 2) return empty;
  const latest = points[points.length - 1];
  const now = latest.date;
  const monthsAgo = (m) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - m);
    return d;
  };
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const nav1m = findNavOnOrBefore(points, monthsAgo(1));
  const nav3m = findNavOnOrBefore(points, monthsAgo(3));
  const nav6m = findNavOnOrBefore(points, monthsAgo(6));
  const ytdStart = findNavOnOrBefore(points, jan1);
  const nav1y = findNavOnOrBefore(points, monthsAgo(12));
  const nav3y = findNavOnOrBefore(points, monthsAgo(36));
  const nav5y = findNavOnOrBefore(points, monthsAgo(60));
  const pct = (from, to) => ((to - from) / from) * 100;
  const cagr = (start, end, years) =>
    start > 0 && end > 0 && years > 0
      ? (Math.pow(end / start, 1 / years) - 1) * 100
      : null;
  return {
    oneMonth: nav1m ? pct(nav1m, latest.nav) : null,
    threeMonth: nav3m ? pct(nav3m, latest.nav) : null,
    sixMonth: nav6m ? pct(nav6m, latest.nav) : null,
    ytd: ytdStart ? pct(ytdStart, latest.nav) : null,
    oneYear: nav1y ? pct(nav1y, latest.nav) : null,
    threeYear: nav3y ? cagr(nav3y, latest.nav, 3) : null,
    fiveYear: nav5y ? cagr(nav5y, latest.nav, 5) : null,
  };
}

async function fetchJson(url, timeoutMs = 60_000, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    } finally {
      clearTimeout(timer);
    }
  }
}

async function fetchFund(schemeCode, startDate) {
  try {
    const latest = await fetchJson(`${MFAPI}/mf/${schemeCode}/latest`);
    if (!latest?.meta) return null;

    const meta = latest.meta;
    const nav = parseFloat(latest.data[0]?.nav ?? "0");
    const navDate = latest.data[0]?.date ?? "";
    let returns = {
      oneMonth: null,
      threeMonth: null,
      sixMonth: null,
      ytd: null,
      oneYear: null,
      threeYear: null,
      fiveYear: null,
    };

    try {
      const hist = await fetchJson(
        `${MFAPI}/mf/${schemeCode}?startDate=${startDate}`,
        45_000
      );
      if (hist?.data?.length) {
        const points = hist.data
          .map((row) => ({
            date: parseIndianDate(row.date),
            nav: parseFloat(row.nav),
          }))
          .filter((p) => !isNaN(p.nav))
          .sort((a, b) => a.date.getTime() - b.date.getTime());
        returns = computeReturns(points);
      }
    } catch {
      /* returns stay null */
    }

    return {
      schemeCode,
      schemeName: meta.scheme_name,
      fundHouse: meta.fund_house,
      category: inferCategory(meta.scheme_name, meta.scheme_category),
      nav,
      navDate,
      returns: {
        oneMonth: { value: returns.oneMonth, label: "1M" },
        threeMonth: { value: returns.threeMonth, label: "3M" },
        sixMonth: { value: returns.sixMonth, label: "6M" },
        ytd: { value: returns.ytd, label: "YTD" },
        oneYear: { value: returns.oneYear, label: "1Y" },
        threeYear: { value: returns.threeYear, label: "3Y" },
        fiveYear: { value: returns.fiveYear, label: "5Y" },
      },
      isDirect: true,
      dataSource: "cache",
    };
  } catch {
    return null;
  }
}

async function runPool(items, fn, concurrency) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const r = await fn(items[idx], idx);
      if (r) results.push(r);
      if ((idx + 1) % 100 === 0) {
        console.log(`  ${idx + 1}/${items.length} processed, ${results.length} ok`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  if (!existsSync(CATALOG_PATH)) {
    console.error("Run npm run catalog first.");
    process.exit(1);
  }

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf-8"));
  const codes = catalog.schemes.map((s) => s.schemeCode);
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 6);
  const startStr = startDate.toISOString().slice(0, 10);

  console.log(`Syncing ${codes.length} funds (concurrency ${CONCURRENCY})…`);
  const t0 = Date.now();

  const funds = await runPool(
    codes,
    (code) => fetchFund(code, startStr),
    CONCURRENCY
  );

  funds.sort((a, b) => a.schemeName.localeCompare(b.schemeName));

  const out = {
    generatedAt: new Date().toISOString(),
    source: "mfapi",
    total: funds.length,
    funds,
  };

  writeFileSync(CACHE_PATH, JSON.stringify(out));
  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`Wrote ${funds.length} funds to fund-cache.json in ${mins} min`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
