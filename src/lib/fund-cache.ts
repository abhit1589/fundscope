import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { FundSummary } from "./types";

export interface FundCacheFile {
  generatedAt: string;
  source: string;
  total: number;
  funds: FundSummary[];
}

let memoryCache: FundCacheFile | null = null;

export function loadFundCache(): FundCacheFile | null {
  if (memoryCache) return memoryCache;

  const path = join(process.cwd(), "src", "data", "fund-cache.json");
  if (!existsSync(path)) return null;

  try {
    const raw = readFileSync(path, "utf-8");
    memoryCache = JSON.parse(raw) as FundCacheFile;
    return memoryCache;
  } catch {
    return null;
  }
}

export function getCachedFunds(): FundSummary[] {
  return loadFundCache()?.funds ?? [];
}

export function getCacheMeta() {
  const cache = loadFundCache();
  if (!cache) return null;
  return {
    generatedAt: cache.generatedAt,
    source: cache.source,
    total: cache.total,
  };
}

export function getCachedFund(schemeCode: number): FundSummary | null {
  return getCachedFunds().find((f) => f.schemeCode === schemeCode) ?? null;
}
