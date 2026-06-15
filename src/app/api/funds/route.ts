import { NextResponse } from "next/server";
import { getCachedFunds, getCacheMeta } from "@/lib/fund-cache";
import { getFundSummaries } from "@/lib/fund-service";
import { getDirectGrowthCatalog } from "@/lib/catalog";
import { inferCategory } from "@/lib/categories";
import { buildReturns } from "@/lib/returns";
import type { FundSummary } from "@/lib/types";

export const revalidate = 86400;

const DEFAULT_PAGE_SIZE = 75;

function catalogStub(entry: {
  schemeCode: number;
  schemeName: string;
  category?: string;
  amc?: string;
}): FundSummary {
  return {
    schemeCode: entry.schemeCode,
    schemeName: entry.schemeName,
    fundHouse: entry.amc ?? "—",
    category: entry.category ?? inferCategory(entry.schemeName),
    nav: 0,
    navDate: "",
    returns: buildReturns({}),
    isDirect: true,
    dataSource: "catalog",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const codesParam = searchParams.get("codes");
  const categoryFilter = searchParams.get("category") ?? "All";

  if (codesParam) {
    const codes = codesParam.split(",").map(Number).filter(Boolean);
    const cache = getCachedFunds();
    const fromCache = cache.filter((f) => codes.includes(f.schemeCode));
    if (fromCache.length === codes.length) {
      return NextResponse.json({
        funds: fromCache,
        count: fromCache.length,
        source: "cache",
      });
    }
    const funds = await getFundSummaries(codes, { fullReturns: true });
    return NextResponse.json({ funds, count: funds.length, source: "live" });
  }

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    150,
    Math.max(25, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10))
  );

  const cache = getCachedFunds();
  const cacheMeta = getCacheMeta();
  const hasCache = cache.length > 0;

  let catalogEntries: {
    schemeCode: number;
    schemeName: string;
    category?: string;
    amc?: string;
  }[];

  if (hasCache) {
    catalogEntries = cache.map((f) => ({
      schemeCode: f.schemeCode,
      schemeName: f.schemeName,
      category: f.category,
      amc: f.fundHouse,
    }));
  } else {
    const { schemes } = await getDirectGrowthCatalog();
    catalogEntries = schemes.map((s) => ({
      schemeCode: s.schemeCode,
      schemeName: s.schemeName,
      category: s.category ?? inferCategory(s.schemeName),
      amc: s.amc,
    }));
  }

  const filtered =
    categoryFilter === "All"
      ? catalogEntries
      : catalogEntries.filter(
          (s) => (s.category ?? inferCategory(s.schemeName)) === categoryFilter
        );

  const total = filtered.length;
  const totalAll = catalogEntries.length;
  const start = (page - 1) * pageSize;
  const slice = filtered.slice(start, start + pageSize);
  const codes = slice.map((s) => s.schemeCode);

  let funds: FundSummary[];

  if (hasCache) {
    const byCode = new Map(cache.map((f) => [f.schemeCode, f]));
    funds = slice
      .map((s) => byCode.get(s.schemeCode))
      .filter((f): f is FundSummary => f != null);
  } else {
    const enriched = await getFundSummaries(codes, { fullReturns: true });
    const byCode = new Map(enriched.map((f) => [f.schemeCode, f]));
    funds = slice.map((entry) => byCode.get(entry.schemeCode) ?? catalogStub(entry));
  }

  return NextResponse.json(
    {
      funds,
      total,
      totalAll,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      scope: "direct-growth",
      source: hasCache ? "cache" : "live",
      category: categoryFilter,
      cacheGeneratedAt: cacheMeta?.generatedAt ?? null,
    },
    {
      headers: {
        "Cache-Control": hasCache
          ? "public, s-maxage=86400, stale-while-revalidate=3600"
          : "no-store",
      },
    }
  );
}
