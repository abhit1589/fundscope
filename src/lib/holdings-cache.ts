import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { FundHolding } from "./types";

export interface HoldingsSnapshot {
  asOf: string | null;
  source: string;
  portfolioLabel?: string;
  holdings: FundHolding[];
}

export interface HoldingsCacheFile {
  generatedAt: string;
  total: number;
  funds: Record<string, HoldingsSnapshot>;
}

let memory: HoldingsCacheFile | null = null;

export function loadHoldingsCache(): HoldingsCacheFile | null {
  if (memory) return memory;
  const path = join(process.cwd(), "src", "data", "holdings-cache.json");
  if (!existsSync(path)) return null;
  try {
    memory = JSON.parse(readFileSync(path, "utf-8")) as HoldingsCacheFile;
    return memory;
  } catch {
    return null;
  }
}

export function getHoldingsForScheme(
  schemeCode: number
): HoldingsSnapshot | null {
  const cache = loadHoldingsCache();
  if (!cache) return null;
  return cache.funds[String(schemeCode)] ?? null;
}

export function getHoldingsMeta() {
  const cache = loadHoldingsCache();
  if (!cache) return null;
  return {
    generatedAt: cache.generatedAt,
    total: cache.total,
  };
}
