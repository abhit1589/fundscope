export function isDirectGrowthOpenEnded(schemeName: string): boolean {
  const name = schemeName.trim();
  if (!/\bdirect\b/i.test(name) || /\bregular\b/i.test(name)) return false;
  if (!/\bgrowth\b/i.test(name)) return false;

  if (/\b(dividend|idcw|id cw|bonus|reinvestment|demat|reward)\b/i.test(name))
    return false;
  if (/\b(fmp|fixed maturity|interval fund|close[- ]ended)\b/i.test(name))
    return false;
  if (
    /\b(weekly|monthly|quarterly|half[- ]yearly|daily|annual)\b/i.test(name) &&
    /\b(dividend|idcw|payout)\b/i.test(name)
  ) {
    return false;
  }

  return true;
}
