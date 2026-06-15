import type { MfapiLatestResponse, MfapiSearchResult } from "./types";

export { inferCategory, normalizeCategory } from "./categories";

const MFAPI_BASE = "https://api.mfapi.in";
const TIMEOUT_MS = 25_000;

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`MFapi ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchSchemes(query: string): Promise<MfapiSearchResult[]> {
  if (!query.trim()) return [];
  const encoded = encodeURIComponent(query.trim());
  return fetchJson<MfapiSearchResult[]>(`${MFAPI_BASE}/mf/search?q=${encoded}`);
}

export async function getLatestNav(
  schemeCode: number
): Promise<MfapiLatestResponse | null> {
  try {
    return await fetchJson<MfapiLatestResponse>(
      `${MFAPI_BASE}/mf/${schemeCode}/latest`
    );
  } catch {
    return null;
  }
}

export interface NavPoint {
  date: Date;
  nav: number;
}

export async function getNavHistory(
  schemeCode: number,
  startDate?: string,
  endDate?: string
): Promise<NavPoint[]> {
  let url = `${MFAPI_BASE}/mf/${schemeCode}`;
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (params.toString()) url += `?${params}`;

  try {
    const data = await fetchJson<{
      data?: { date: string; nav: string }[];
    }>(url);
    if (!data.data?.length) return [];

    return data.data
      .map((row) => ({
        date: parseIndianDate(row.date),
        nav: parseFloat(row.nav),
      }))
      .filter((p) => !isNaN(p.nav) && !isNaN(p.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch {
    return [];
  }
}

function parseIndianDate(d: string): Date {
  const [day, month, year] = d.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isDirectPlan(name: string): boolean {
  return /direct/i.test(name) && !/regular/i.test(name);
}
