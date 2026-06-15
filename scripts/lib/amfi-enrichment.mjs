import XLSX from "xlsx";

const AMFI = "https://www.amfiindia.com";

async function fetchBuffer(url, referer) {
  const res = await fetch(url, {
    headers: { Referer: `${AMFI}/${referer}` },
  });
  if (!res.ok) throw new Error(`AMFI ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function fetchLatestTerMonth(year = "2025-2026") {
  const res = await fetch(`${AMFI}/api/populate-ter-month?year=${year}`, {
    headers: { Referer: `${AMFI}/ter-of-mf-schemes` },
  });
  if (!res.ok) throw new Error(`TER months ${res.status}`);
  const months = await res.json();
  if (!months?.length) throw new Error("No TER months");
  return months[0].MonthNumber;
}

export async function downloadTerExcel(month) {
  const url = `${AMFI}/api/populate-te-rdata-revised?MF_ID=All&Month=${month}&strCat=-1&strType=-1&excel=true`;
  return fetchBuffer(url, "ter-of-mf-schemes");
}

export function parseTerExcel(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    defval: "",
  });
  const byName = new Map();
  for (const row of rows) {
    const name = row["Scheme Name"];
    const ter = row["Direct Plan - Total TER (%)"];
    if (!name || ter === "" || ter == null) continue;
    const value = Number(ter);
    if (Number.isNaN(value)) continue;
    byName.set(String(name).trim().toLowerCase(), value);
  }
  return { month: null, byName, rowCount: byName.size };
}

export async function downloadAumExcel() {
  const headers = { Referer: `${AMFI}/aum-data/average-aum` };
  const fyRes = await fetch(`${AMFI}/api/average-aum-fundwise`, { headers });
  const fyJson = await fyRes.json();
  const fyId = fyJson.data?.[0]?.id ?? fyJson[0]?.id;
  const pRes = await fetch(`${AMFI}/api/average-aum-fundwise?fyId=${fyId}`, {
    headers,
  });
  const pJson = await pRes.json();
  const periodId = pJson.data?.periods?.[0]?.id ?? pJson.periods?.[0]?.id;
  const url = `${AMFI}/api/average-aum-schemewise?strType=Categorywise&fyId=${fyId}&periodId=${periodId}&MF_ID=0&excel=true`;
  const buf = await fetchBuffer(url, "aum-data/average-aum");
  return { buffer: buf, fyId, periodId };
}

/** Returns Map<schemeCode, aumCr> — AAUM lakhs → ₹ Cr */
export function parseAumExcel(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const matrix = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    defval: "",
  });
  const byCode = new Map();
  for (const row of matrix) {
    const code = row[0];
    const name = row[1];
    const aumLakh = row[2];
    if (typeof code !== "number" || !name) continue;
    const lakhs = Number(aumLakh);
    if (Number.isNaN(lakhs)) continue;
    byCode.set(code, lakhs / 100);
  }
  return byCode;
}

export function lookupTer(terByName, schemeName) {
  const lower = schemeName.toLowerCase();
  if (terByName.has(lower)) return terByName.get(lower);

  const stripped = lower
    .replace(/\s*-\s*direct\s*plan\s*/g, " ")
    .replace(/\s*-\s*growth\s*$/g, "")
    .replace(/\s*direct\s*plan\s*growth\s*$/g, "")
    .trim();
  if (terByName.has(stripped)) return terByName.get(stripped);

  for (const [key, val] of terByName) {
    if (lower.includes(key) || key.includes(stripped)) return val;
    const keyNorm = key.replace(/\s*-\s*direct\s*plan.*/g, "").trim();
    if (stripped.includes(keyNorm) && keyNorm.length >= 10) return val;
  }
  return undefined;
}
