import Link from "next/link";
import { notFound } from "next/navigation";
import { FundDetail } from "@/components/FundDetail";
import { getCachedFund } from "@/lib/fund-cache";
import { getHoldingsForScheme } from "@/lib/holdings-cache";
import { getFundSummary } from "@/lib/fund-service";
import { getNavHistory } from "@/lib/mfapi";

export default async function FundPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const schemeCode = parseInt(code, 10);
  if (!schemeCode) notFound();

  const cached = getCachedFund(schemeCode);
  const fund =
    cached ?? (await getFundSummary(schemeCode, { fullReturns: true }));
  if (!fund) notFound();

  let chart: { date: string; nav: number }[] = [];
  try {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const history = await getNavHistory(
      schemeCode,
      fiveYearsAgo.toISOString().slice(0, 10)
    );
    chart = history.slice(-120).map((p) => ({
      date: p.date.toISOString().slice(0, 10),
      nav: p.nav,
    }));
  } catch {
    /* chart optional if API slow */
  }

  const holdings = getHoldingsForScheme(schemeCode);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-block text-sm text-[var(--muted)] hover:text-emerald-400"
      >
        ← Back to screener
      </Link>
      <FundDetail fund={fund} chart={chart} holdings={holdings} />
    </div>
  );
}
