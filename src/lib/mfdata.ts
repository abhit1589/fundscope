import type { MfdataScheme } from "./types";

const MFDATA_BASE = "https://api.mfdata.in/api/v1";
const TIMEOUT_MS = 8_000;

export async function getSchemeFromMfdata(
  schemeCode: number
): Promise<MfdataScheme | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${MFDATA_BASE}/schemes/${schemeCode}`, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status: string;
      data?: MfdataScheme;
    };
    return json.status === "success" && json.data ? json.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
