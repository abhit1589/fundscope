"use client";

import Link from "next/link";
import type { FundSummary } from "@/lib/types";
import { formatReturn, formatNav, returnColor } from "@/lib/returns";

interface Props {
  funds: FundSummary[];
  loading?: boolean;
}

const RETURN_COLS: { key: keyof FundSummary["returns"]; label: string }[] = [
  { key: "oneMonth", label: "1M" },
  { key: "threeMonth", label: "3M" },
  { key: "sixMonth", label: "6M" },
  { key: "oneYear", label: "1Y" },
  { key: "threeYear", label: "3Y" },
  { key: "fiveYear", label: "5Y" },
];

export function FundTable({ funds, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--muted)]">
        Loading NAV & returns… (first page ~30–60s without cache)
      </div>
    );
  }

  if (!funds.length) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--muted)]">
        No funds match your filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase tracking-wider text-[var(--muted)]">
              <th className="px-3 py-3 font-medium">Fund</th>
              <th className="px-3 py-3 font-medium">Category</th>
              <th className="px-3 py-3 font-medium text-right">NAV</th>
              <th className="px-2 py-3 font-medium text-right">TER</th>
              <th className="px-2 py-3 font-medium text-right">AUM</th>
              {RETURN_COLS.map((c) => (
                <th key={c.key} className="px-2 py-3 font-medium text-right">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {funds.map((fund) => (
              <tr
                key={fund.schemeCode}
                className="border-b border-[var(--border)]/60 transition hover:bg-[var(--surface-2)]/50"
              >
                <td className="px-3 py-3">
                  <Link
                    href={`/fund/${fund.schemeCode}`}
                    className="font-medium text-white hover:text-emerald-400"
                  >
                    {shortName(fund.schemeName)}
                  </Link>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {fund.fundHouse}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--muted)]">
                    {fund.category}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs">
                  {formatNav(fund.nav)}
                </td>
                <td className="px-2 py-3 text-right font-mono text-xs text-[var(--muted)]">
                  {fund.expenseRatio != null
                    ? `${fund.expenseRatio.toFixed(2)}%`
                    : "—"}
                </td>
                <td className="px-2 py-3 text-right font-mono text-xs text-[var(--muted)]">
                  {fund.aumCr != null
                    ? `${fund.aumCr.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                    : "—"}
                </td>
                {RETURN_COLS.map((c) => (
                  <td
                    key={c.key}
                    className={`px-2 py-3 text-right font-mono text-xs ${returnColor(fund.returns[c.key].value)}`}
                  >
                    {formatReturn(fund.returns[c.key].value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function shortName(name: string): string {
  return name
    .replace(/ - Direct Plan - Growth$/i, "")
    .replace(/ - Direct Growth$/i, "")
    .replace(/ - Growth$/i, "");
}
