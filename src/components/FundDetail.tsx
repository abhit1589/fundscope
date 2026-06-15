"use client";

import { useState } from "react";
import type { FundSummary, HoldingsSnapshot } from "@/lib/types";
import { formatReturn, returnColor } from "@/lib/returns";

interface ChartPoint {
  date: string;
  nav: number;
}

interface Props {
  fund: FundSummary;
  chart: ChartPoint[];
  holdings?: HoldingsSnapshot | null;
}

export function FundDetail({ fund, chart, holdings }: Props) {
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  async function handleExplain() {
    setExplaining(true);
    setExplainError(null);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemeCode: fund.schemeCode }),
      });
      const data = (await res.json()) as {
        explanation?: string;
        error?: string;
      };
      if (!res.ok) {
        setExplainError(data.error ?? "Failed");
        return;
      }
      setExplanation(data.explanation ?? "");
    } catch {
      setExplainError("Network error");
    } finally {
      setExplaining(false);
    }
  }

  function addToPortfolio() {
    const key = "fundscope-portfolio";
    const raw = localStorage.getItem(key);
    const holdings = raw ? JSON.parse(raw) : [];
    if (holdings.some((h: { schemeCode: number }) => h.schemeCode === fund.schemeCode)) {
      setAdded(true);
      return;
    }
    holdings.push({
      schemeCode: fund.schemeCode,
      schemeName: fund.schemeName,
      units: 0,
      addedAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(holdings));
    setAdded(true);
  }

  const minNav = Math.min(...chart.map((c) => c.nav));
  const maxNav = Math.max(...chart.map((c) => c.nav));
  const range = maxNav - minNav || 1;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-emerald-400">{fund.fundHouse}</p>
            <h1 className="mt-1 text-xl font-semibold text-white">
              {fund.schemeName}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {fund.category} · {fund.isDirect ? "Direct" : "Regular"} · Source:{" "}
              {fund.dataSource}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-semibold text-white">
              ₹{fund.nav.toFixed(4)}
            </p>
            <p className="text-xs text-[var(--muted)]">NAV · {fund.navDate}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {(
            [
              "oneMonth",
              "threeMonth",
              "sixMonth",
              "oneYear",
              "threeYear",
              "fiveYear",
              "ytd",
            ] as const
          ).map((key) => (
            <Stat
              key={key}
              label={fund.returns[key].label}
              value={formatReturn(fund.returns[key].value)}
              color={returnColor(fund.returns[key].value)}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Expense ratio"
            value={
              fund.expenseRatio != null
                ? `${fund.expenseRatio.toFixed(2)}%`
                : "—"
            }
          />
          <Stat
            label="AUM"
            value={
              fund.aumCr != null
                ? `₹${fund.aumCr.toLocaleString("en-IN")} Cr`
                : "—"
            }
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addToPortfolio}
            className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30"
          >
            {added ? "✓ In portfolio" : "+ Add to portfolio"}
          </button>
          <button
            type="button"
            onClick={handleExplain}
            disabled={explaining}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] transition hover:border-emerald-500/40 hover:text-white disabled:opacity-50"
          >
            {explaining ? "Explaining…" : "✨ AI explain (your API key)"}
          </button>
        </div>

        {explainError && (
          <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {explainError}
          </p>
        )}
        {explanation && (
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-sm leading-relaxed text-[var(--muted)]">
            {explanation}
          </div>
        )}
      </div>

      {chart.length > 1 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-sm font-medium text-white">NAV trend (~5Y)</h2>
          <div className="mt-4 flex h-40 items-end gap-px">
            {chart.map((point, i) => {
              const h = ((point.nav - minNav) / range) * 100;
              return (
                <div
                  key={`${point.date}-${i}`}
                  title={`${point.date}: ₹${point.nav}`}
                  className="min-w-0 flex-1 rounded-t bg-emerald-500/40 transition hover:bg-emerald-400/70"
                  style={{ height: `${Math.max(h, 2)}%` }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-[var(--muted)]">
            <span>{chart[0]?.date}</span>
            <span>{chart[chart.length - 1]?.date}</span>
          </div>
        </div>
      )}

      <HoldingsSection holdings={holdings} />
    </div>
  );
}

function HoldingsSection({
  holdings,
}: {
  holdings?: HoldingsSnapshot | null;
}) {
  if (!holdings?.holdings?.length) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-sm font-medium text-white">Full portfolio</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Holdings not synced yet for this fund. Monthly AMC disclosures are
          refreshed automatically — check back after the next sync.
        </p>
      </div>
    );
  }

  const sorted = [...holdings.holdings].sort(
    (a, b) => b.weightPct - a.weightPct
  );
  const equity = sorted.filter((h) => h.instrumentType === "Equity");
  const debt = sorted.filter((h) => h.instrumentType === "Debt");
  const other = sorted.filter(
    (h) => h.instrumentType !== "Equity" && h.instrumentType !== "Debt"
  );

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-white">Full portfolio</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {sorted.length} holdings
            {holdings.asOf ? ` · as of ${holdings.asOf}` : ""}
            {holdings.source ? ` · ${holdings.source}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
          {equity.length > 0 && (
            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5">
              Equity {equity.length}
            </span>
          )}
          {debt.length > 0 && (
            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5">
              Debt {debt.length}
            </span>
          )}
          {other.length > 0 && (
            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5">
              Other {other.length}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="px-2 py-2 font-medium">Instrument</th>
              <th className="px-2 py-2 font-medium">Type</th>
              <th className="px-2 py-2 font-medium">Sector</th>
              <th className="px-2 py-2 font-medium text-right">% NAV</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((h, i) => (
              <tr
                key={`${h.isin ?? h.name}-${i}`}
                className="border-b border-[var(--border)]/50"
              >
                <td className="px-2 py-2">
                  <p className="text-white">{h.name}</p>
                  {h.isin && (
                    <p className="text-[10px] text-[var(--muted)]">{h.isin}</p>
                  )}
                </td>
                <td className="px-2 py-2 text-xs text-[var(--muted)]">
                  {h.instrumentType}
                </td>
                <td className="px-2 py-2 text-xs text-[var(--muted)]">
                  {h.sector ?? "—"}
                </td>
                <td className="px-2 py-2 text-right font-mono text-xs text-white">
                  {h.weightPct.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg bg-[var(--bg)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className={`mt-1 font-mono text-sm font-medium ${color}`}>{value}</p>
    </div>
  );
}
