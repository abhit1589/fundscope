/** Normalize scheme / portfolio file names for fuzzy family matching. */
export function normalizeSchemeFamily(name) {
  return String(name)
    .toLowerCase()
    .replace(/^monthly\s+/i, "")
    .replace(/\s*-\s*\d{1,2}\s+[a-z]+\s+\d{4}\s*$/i, "")
    .replace(/\.xlsx?$/i, "")
    .replace(/\bdirect\s*plan\b/g, "")
    .replace(/\bregular\s*plan\b/g, "")
    .replace(/\bdirect\b/g, "")
    .replace(/\bregular\b/g, "")
    .replace(/\bgrowth\b/g, "")
    .replace(/\bplan\b/g, "")
    .replace(/\bidcw\b/g, "")
    .replace(/\bdividend\b/g, "")
    .replace(/\bbonus\b/g, "")
    .replace(/\bpayout\b/g, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function schemeFamilyKey(schemeName, fundHouse = "") {
  const house = normalizeSchemeFamily(fundHouse).slice(0, 24);
  const fund = normalizeSchemeFamily(schemeName);
  return house ? `${house}:${fund}` : fund;
}

export function namesLikelyMatch(a, b) {
  const na = normalizeSchemeFamily(a);
  const nb = normalizeSchemeFamily(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  if (shorter.length >= 12 && longer.startsWith(shorter)) return true;
  return false;
}
