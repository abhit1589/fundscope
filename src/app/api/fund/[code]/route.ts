import { NextResponse } from "next/server";
import { getCachedFund } from "@/lib/fund-cache";
import { getFundSummary } from "@/lib/fund-service";
import { getNavHistory } from "@/lib/mfapi";
import { normalizeReturns } from "@/lib/returns";

export const revalidate = 3600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const schemeCode = parseInt(code, 10);
  if (!schemeCode) {
    return NextResponse.json({ error: "Invalid scheme code" }, { status: 400 });
  }

  const cached = getCachedFund(schemeCode);
  const raw =
    cached ?? (await getFundSummary(schemeCode, { fullReturns: true }));
  if (!raw) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  }
  const fund = { ...raw, returns: normalizeReturns(raw.returns) };

  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const history = await getNavHistory(
    schemeCode,
    fiveYearsAgo.toISOString().slice(0, 10)
  );

  const chart = history.slice(-120).map((p) => ({
    date: p.date.toISOString().slice(0, 10),
    nav: p.nav,
  }));

  return NextResponse.json({ fund, chart });
}
