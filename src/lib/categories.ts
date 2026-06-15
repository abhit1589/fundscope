/** SEBI-style categories for screener filters */
export const CATEGORIES = [
  "All",
  "Flexi Cap",
  "Large Cap",
  "Large & Mid Cap",
  "Mid Cap",
  "Small Cap",
  "Multi Cap",
  "ELSS",
  "Focused",
  "Value / Contra",
  "Index",
  "Sectoral / Thematic",
  "Hybrid",
  "Debt / Liquid",
  "Fund of Funds",
  "Other",
] as const;

export function normalizeCategory(schemeCategory: string): string {
  const c = schemeCategory.toLowerCase();

  if (c.includes("flexi cap") || c.includes("flexicap")) return "Flexi Cap";
  if (c.includes("large & mid") || c.includes("large and mid"))
    return "Large & Mid Cap";
  if (c.includes("large cap") || c.includes("largecap")) return "Large Cap";
  if (c.includes("mid cap") || c.includes("midcap")) return "Mid Cap";
  if (c.includes("small cap") || c.includes("smallcap")) return "Small Cap";
  if (c.includes("multi cap") || c.includes("multicap")) return "Multi Cap";
  if (c.includes("elss") || c.includes("tax saver")) return "ELSS";
  if (c.includes("focused")) return "Focused";
  if (c.includes("contra") || c.includes("value fund")) return "Value / Contra";
  if (c.includes("index") || c.includes("nifty") || c.includes("sensex"))
    return "Index";
  if (c.includes("sector") || c.includes("thematic")) return "Sectoral / Thematic";
  if (c.includes("hybrid") || c.includes("balanced") || c.includes("arbitrage"))
    return "Hybrid";
  if (c.includes("fund of fund") || c.includes("fof")) return "Fund of Funds";
  if (
    c.includes("debt") ||
    c.includes("liquid") ||
    c.includes("bond") ||
    c.includes("gilt")
  )
    return "Debt / Liquid";

  return "Other";
}

export function inferCategory(
  schemeName: string,
  schemeCategory?: string
): string {
  if (schemeCategory) {
    const fromMeta = normalizeCategory(schemeCategory);
    if (fromMeta !== "Other") return fromMeta;
  }

  const n = schemeName.toLowerCase();

  if (/\bfund\s*of\s*funds\b|\bfof\b/i.test(n)) return "Fund of Funds";
  if (/\bindex\b/i.test(n)) return "Index";
  if (/flexi\s*(debt|bond)/i.test(schemeName)) return "Debt / Liquid";
  if (/\bflexi\s*cap\b|\bflexicap\b/i.test(n)) return "Flexi Cap";
  if (/large\s*&\s*mid|large and mid/i.test(n)) return "Large & Mid Cap";
  if (/\blarge\s*cap\b|\blargecap\b|\bbluechip\b|\btop\s*100\b/i.test(n))
    return "Large Cap";
  if (/\bmid\s*cap\b|\bmidcap\b/i.test(n)) return "Mid Cap";
  if (/\bsmall\s*cap\b|\bsmallcap\b/i.test(n)) return "Small Cap";
  if (/\bmulti\s*cap\b|\bmulticap\b/i.test(n)) return "Multi Cap";
  if (/\belss\b|tax\s*saver/i.test(n)) return "ELSS";
  if (/\bfocused\b/i.test(n)) return "Focused";
  if (/\bcontra\b|\bvalue\b/i.test(n)) return "Value / Contra";
  if (/\bindex\b|\bnifty\b|\bsensex\b/i.test(n)) return "Index";
  if (
    /\b(pharma|banking|technology|digital|consumption|infrastructure|healthcare|auto)\b/i.test(
      n
    )
  )
    return "Sectoral / Thematic";
  if (/\bhybrid\b|\bbalanced\b|\barbitrage\b/i.test(n)) return "Hybrid";
  if (/\bfund\s*of\s*funds\b|\bfof\b/i.test(n)) return "Fund of Funds";
  if (/\b(debt|liquid|overnight|bond|gilt|income)\b/i.test(n))
    return "Debt / Liquid";

  return "Other";
}
