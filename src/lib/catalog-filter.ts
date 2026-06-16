export function isDirectGrowthOpenEnded(schemeName: string): boolean {
  const name = schemeName.trim();
  if (!/\bdirect\b/i.test(name) || /\bregular\b/i.test(name)) return false;
  if (!/\bgrowth\b/i.test(name)) return false;

  if (/\b(dividend|idcw|id cw|bonus|reinvestment|demat|reward)\b/i.test(name))
    return false;
  if (/\b(fmp|fixed maturity|fixed term|interval fund|close[- ]ended)\b/i.test(name))
    return false;
  if (
    /\b(cpo|daf|capital protection|segregated|segregate)\b/i.test(name)
  )
    return false;
  if (/\b\d+\s*(m|d)\b/i.test(name) && /\b(days?|month)\b/i.test(name))
    return false;
  if (
    /\b(weekly|monthly|quarterly|half[- ]yearly|daily|annual)\b/i.test(name) &&
    /\b(dividend|idcw|payout)\b/i.test(name)
  ) {
    return false;
  }

  return true;
}

export function parseNavDate(navDate: string): Date | null {
  const parts = navDate.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

/** Drop merged/closed schemes — NAV not updated in months. */
export function isActiveFund(
  fund: { navDate: string; nav: number },
  maxStaleDays = 120
): boolean {
  if (!fund.nav || fund.nav <= 0) return false;
  const d = parseNavDate(fund.navDate);
  if (!d || Number.isNaN(d.getTime())) return false;
  const daysAgo = (Date.now() - d.getTime()) / 86_400_000;
  return daysAgo <= maxStaleDays;
}
