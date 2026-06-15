import { unstable_cache } from "next/cache";
import { readFileSync } from "fs";
import { join } from "path";
import { isDirectGrowthOpenEnded } from "@/lib/catalog-filter";
import { inferCategory } from "@/lib/categories";

const MFAPI_BASE = "https://api.mfapi.in";
const MFDATA_BASE = "https://api.mfdata.in/api/v1";

export interface CatalogEntry {
  schemeCode: number;
  schemeName: string;
  category?: string;
  nav?: number;
  amc?: string;
}

async function fetchMfdataCatalog(): Promise<CatalogEntry[] | null> {
  const results: CatalogEntry[] = [];
  const limit = 1000;
  let offset = 0;

  try {
    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12_000);
      const url = `${MFDATA_BASE}/schemes?plan_type=direct&exclude_fmp=true&limit=${limit}&offset=${offset}`;
      const res = await fetch(url, {
        signal: controller.signal,
        next: { revalidate: 86400 },
      });
      clearTimeout(timer);
      if (!res.ok) return null;

      const json = (await res.json()) as {
        status: string;
        data?: {
          scheme_code: number;
          scheme_name: string;
          category?: string;
          nav?: number;
          amc?: string;
        }[];
      };
      const batch = json.data ?? [];
      if (!batch.length) break;

      for (const row of batch) {
        if (!isDirectGrowthOpenEnded(row.scheme_name)) continue;
        results.push({
          schemeCode: row.scheme_code,
          schemeName: row.scheme_name,
          category: row.category ?? inferCategory(row.scheme_name),
          nav: row.nav,
          amc: row.amc,
        });
      }

      if (batch.length < limit) break;
      offset += limit;
    }
    return results.length ? results : null;
  } catch {
    return null;
  }
}

async function fetchMfapiCatalog(): Promise<CatalogEntry[]> {
  const results: CatalogEntry[] = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(
        `${MFAPI_BASE}/mf?limit=${limit}&offset=${offset}`,
        { signal: controller.signal, next: { revalidate: 86400 } }
      );
      if (!res.ok) break;
      const batch = (await res.json()) as {
        schemeCode: number;
        schemeName: string;
      }[];
      clearTimeout(timer);
      if (!batch?.length) break;

      for (const row of batch) {
        if (!isDirectGrowthOpenEnded(row.schemeName)) continue;
        results.push({
          schemeCode: row.schemeCode,
          schemeName: row.schemeName,
          category: inferCategory(row.schemeName),
        });
      }

      if (batch.length < limit) break;
      offset += limit;
    } catch {
      clearTimeout(timer);
      break;
    }
  }

  results.sort((a, b) => a.schemeName.localeCompare(b.schemeName));
  return results;
}

function loadStaticCatalog(): {
  schemes: CatalogEntry[];
  source: "mfdata" | "mfapi";
} | null {
  try {
    const path = join(process.cwd(), "src", "data", "direct-growth-catalog.json");
    const raw = readFileSync(path, "utf-8");
    const json = JSON.parse(raw) as {
      schemes: CatalogEntry[];
      source?: "mfapi" | "mfdata";
    };
    if (json.schemes?.length) {
      const schemes = json.schemes.map((s) => ({
        ...s,
        category: s.category ?? inferCategory(s.schemeName),
      }));
      return { schemes, source: json.source ?? "mfapi" };
    }
  } catch {
    /* no static file */
  }
  return null;
}

async function buildCatalog(): Promise<{
  schemes: CatalogEntry[];
  source: "mfdata" | "mfapi";
}> {
  const staticCatalog = loadStaticCatalog();
  if (staticCatalog) return staticCatalog;

  const mfdata = await fetchMfdataCatalog();
  if (mfdata?.length) {
    mfdata.sort((a, b) => a.schemeName.localeCompare(b.schemeName));
    return { schemes: mfdata, source: "mfdata" };
  }
  const mfapi = await fetchMfapiCatalog();
  return { schemes: mfapi, source: "mfapi" };
}

export const getDirectGrowthCatalog = unstable_cache(
  buildCatalog,
  ["direct-growth-open-catalog-v2"],
  { revalidate: 86400 }
);
