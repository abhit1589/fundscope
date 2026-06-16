export interface SearchEntry {
  schemeCode: number;
  schemeName: string;
  fundHouse?: string;
  category?: string;
  aumCr?: number;
}

function normalizeForSearch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compactForSearch(s: string): string {
  return normalizeForSearch(s).replace(/\s+/g, "");
}

export function searchFunds(
  entries: SearchEntry[],
  query: string,
  limit = 25
): SearchEntry[] {
  const tokens = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  const tokensC = tokens.map(compactForSearch);
  const queryC = tokensC.join("");
  const scored: { entry: SearchEntry; score: number }[] = [];

  for (const entry of entries) {
    const blob = `${entry.schemeName} ${entry.fundHouse ?? ""} ${entry.category ?? ""}`;
    const hay = normalizeForSearch(blob);
    const hayC = compactForSearch(blob);
    const nameC = compactForSearch(entry.schemeName);

    const allMatch = tokens.every(
      (t, i) => hay.includes(t) || hayC.includes(tokensC[i])
    );
    if (!allMatch) continue;

    let score = 0;
    if (nameC.startsWith(queryC)) score += 200;
    else if (nameC.includes(queryC)) score += 120;

    const houseC = compactForSearch(entry.fundHouse ?? "");
    if (tokens.length === 1 && houseC.includes(tokensC[0])) {
      score += 80;
      score += Math.min(entry.aumCr ?? 0, 5000) / 100;
    }

    for (const t of tokensC) {
      if (nameC.includes(t)) score += 20;
      if (houseC.includes(t)) score += 10;
    }

    scored.push({ entry, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entry.schemeName.localeCompare(b.entry.schemeName);
  });

  return scored.slice(0, limit).map((s) => s.entry);
}
