import type { FundSummary } from "./types";
import {
  getLatestNav,
  getNavHistory,
  isDirectPlan,
  inferCategory,
} from "./mfapi";
import { getSchemeFromMfdata } from "./mfdata";
import { computeReturnsFromNav, buildReturns } from "./returns";

export async function getFundSummary(
  schemeCode: number,
  options?: { fullReturns?: boolean }
): Promise<FundSummary | null> {
  const fullReturns = options?.fullReturns ?? false;
  const [mfdata, latest] = await Promise.all([
    getSchemeFromMfdata(schemeCode),
    getLatestNav(schemeCode),
  ]);

  if (!latest?.meta) return null;

  const meta = latest.meta;
  const nav = parseFloat(latest.data[0]?.nav ?? "0");
  const navDate = latest.data[0]?.date ?? "";

  if (mfdata) {
    return {
      schemeCode,
      schemeName: mfdata.scheme_name ?? meta.scheme_name,
      fundHouse: mfdata.amc ?? meta.fund_house,
      category:
        mfdata.category ??
        inferCategory(meta.scheme_name, meta.scheme_category),
      nav: mfdata.nav ?? nav,
      navDate: mfdata.nav_date ?? navDate,
      returns: buildReturns({
        oneMonth: mfdata.returns?.["1m"]?.value ?? null,
        threeMonth: mfdata.returns?.["3m"]?.value ?? null,
        sixMonth: mfdata.returns?.["6m"]?.value ?? null,
        oneYear: mfdata.returns?.["1y"]?.value ?? null,
        threeYear: mfdata.returns?.["3y"]?.value ?? null,
        fiveYear: mfdata.returns?.["5y"]?.value ?? null,
      }),
      expenseRatio: mfdata.expense_ratio,
      aumCr: mfdata.aum_cr,
      rating: mfdata.rating ?? mfdata.morningstar,
      sharpe: mfdata.ratios?.sharpe,
      beta: mfdata.ratios?.beta,
      isDirect: mfdata.plan_type === "direct" || isDirectPlan(meta.scheme_name),
      dataSource: "mfdata",
    };
  }

  if (!fullReturns) {
    return {
      schemeCode,
      schemeName: meta.scheme_name,
      fundHouse: meta.fund_house,
      category: inferCategory(meta.scheme_name, meta.scheme_category),
      nav,
      navDate,
      returns: buildReturns({}),
      isDirect: isDirectPlan(meta.scheme_name),
      dataSource: "mfapi",
    };
  }

  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 6);
  const start = fiveYearsAgo.toISOString().slice(0, 10);
  const history = await getNavHistory(schemeCode, start);
  const computed = computeReturnsFromNav(history);

  return {
    schemeCode,
    schemeName: meta.scheme_name,
    fundHouse: meta.fund_house,
    category: inferCategory(meta.scheme_name, meta.scheme_category),
    nav,
    navDate,
    returns: buildReturns(computed),
    isDirect: isDirectPlan(meta.scheme_name),
    dataSource: "mfapi",
  };
}

export async function getFundSummaries(
  schemeCodes: number[],
  options?: { fullReturns?: boolean }
): Promise<FundSummary[]> {
  const batchSize = 8;
  const results: FundSummary[] = [];

  for (let i = 0; i < schemeCodes.length; i += batchSize) {
    const batch = schemeCodes.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((code) => getFundSummary(code, options))
    );
    results.push(
      ...batchResults.filter((f): f is FundSummary => f !== null)
    );
  }

  return results;
}
