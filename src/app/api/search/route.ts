import { NextResponse } from "next/server";
import { getCachedFunds } from "@/lib/fund-cache";
import { getDirectGrowthCatalog } from "@/lib/catalog";
import { isActiveFund } from "@/lib/catalog-filter";
import { searchFunds } from "@/lib/search";

export const revalidate = 86400;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const cache = getCachedFunds();
  let entries =
    cache.length > 0
      ? cache.filter(isActiveFund).map((f) => ({
          schemeCode: f.schemeCode,
          schemeName: f.schemeName,
          fundHouse: f.fundHouse,
          category: f.category,
          aumCr: f.aumCr,
        }))
      : [];

  if (!entries.length) {
    const { schemes } = await getDirectGrowthCatalog();
    entries = schemes.map((s) => ({
      schemeCode: s.schemeCode,
      schemeName: s.schemeName,
      fundHouse: s.amc,
      category: s.category,
    }));
  }

  const results = searchFunds(entries, q, 25);

  return NextResponse.json({
    results: results.map((r) => ({
      schemeCode: r.schemeCode,
      schemeName: r.schemeName,
      fundHouse: r.fundHouse,
      category: r.category,
    })),
    source: cache.length > 0 ? "cache" : "catalog",
  });
}
