import { NextResponse } from "next/server";
import { getFundSummary } from "@/lib/fund-service";
import { getNavHistory } from "@/lib/mfapi";

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

  const fund = await getFundSummary(schemeCode, { fullReturns: true });
  if (!fund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  }

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
