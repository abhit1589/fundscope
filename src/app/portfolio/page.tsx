"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { FundSummary, PortfolioHolding } from "@/lib/types";
import { formatReturn, returnColor } from "@/lib/returns";

const STORAGE_KEY = "fundscope-portfolio";

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [funds, setFunds] = useState<FundSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: PortfolioHolding[] = raw ? JSON.parse(raw) : [];
    setHoldings(parsed);

    if (!parsed.length) {
      setLoading(false);
      return;
    }

    const codes = parsed.map((h) => h.schemeCode).join(",");
    const res = await fetch(`/api/funds?codes=${codes}`);
    const data = (await res.json()) as { funds: FundSummary[] };
    setFunds(data.funds ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateUnits(code: number, units: number) {
    const next = holdings.map((h) =>
      h.schemeCode === code ? { ...h, units } : h
    );
    setHoldings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function remove(code: number) {
    const next = holdings.filter((h) => h.schemeCode !== code);
    setHoldings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setFunds(funds.filter((f) => f.schemeCode !== code));
  }

  const totalValue = funds.reduce((sum, f) => {
    const h = holdings.find((x) => x.schemeCode === f.schemeCode);
    return sum + (h?.units ?? 0) * f.nav;
  }, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">My Portfolio</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Stored in your browser only — not your CAS/broker data. Add funds from
        the screener, then enter units manually.
      </p>

      {loading ? (
        <p className="mt-8 text-[var(--muted)]">Loading…</p>
      ) : holdings.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[var(--border)] p-12 text-center">
          <p className="text-[var(--muted)]">No holdings yet.</p>
          <Link
            href="/"
            className="mt-4 inline-block text-emerald-400 hover:underline"
          >
            Go to screener →
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs text-[var(--muted)]">Est. current value</p>
            <p className="font-mono text-2xl font-semibold text-white">
              ₹
              {totalValue.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}
            </p>
          </div>

          <ul className="mt-6 space-y-3">
            {holdings.map((h) => {
              const fund = funds.find((f) => f.schemeCode === h.schemeCode);
              const value = fund ? h.units * fund.nav : 0;
              return (
                <li
                  key={h.schemeCode}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/fund/${h.schemeCode}`}
                        className="font-medium text-white hover:text-emerald-400"
                      >
                        {fund?.schemeName ?? h.schemeName}
                      </Link>
                      {fund && (
                        <p
                          className={`mt-1 font-mono text-xs ${returnColor(fund.returns.oneYear.value)}`}
                        >
                          1Y {formatReturn(fund.returns.oneYear.value)} · NAV ₹
                          {fund.nav.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(h.schemeCode)}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <span className="text-[var(--muted)]">Units</span>
                      <input
                        type="number"
                        min={0}
                        step="0.001"
                        value={h.units || ""}
                        onChange={(e) =>
                          updateUnits(
                            h.schemeCode,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-28 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1 font-mono text-sm"
                      />
                    </label>
                    {fund && h.units > 0 && (
                      <span className="font-mono text-sm text-emerald-400">
                        ≈ ₹{value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
