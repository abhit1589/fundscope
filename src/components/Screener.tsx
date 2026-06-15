"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FundSummary } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { FundTable } from "./FundTable";

type SortKey = "oneYear" | "threeYear" | "expenseRatio" | "nav" | "name";

const PAGE_SIZE = 75;

export function Screener() {
  const [funds, setFunds] = useState<FundSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortKey>("threeYear");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [catalogSource, setCatalogSource] = useState<string>("");
  const [cacheDate, setCacheDate] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<
    { schemeCode: number; schemeName: string }[]
  >([]);
  const [searching, setSearching] = useState(false);

  const loadPage = useCallback(
    async (p: number, cat: string, showSpinner = true) => {
      if (showSpinner) setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          pageSize: String(PAGE_SIZE),
          full: "1",
          category: cat,
        });
        const res = await fetch(`/api/funds?${params}`);
        const data = (await res.json()) as {
          funds: FundSummary[];
          total?: number;
          totalAll?: number;
          totalPages?: number;
          page?: number;
          source?: string;
          cacheGeneratedAt?: string | null;
        };
        setFunds(data.funds ?? []);
        setTotal(data.total ?? 0);
        setTotalAll(data.totalAll ?? data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        setPage(data.page ?? p);
        if (data.source) setCatalogSource(data.source);
        if (data.cacheGeneratedAt) setCacheDate(data.cacheGeneratedAt);
      } catch {
        if (showSpinner) setFunds([]);
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadPage(page, category, true);
  }, [page, category, loadPage]);

  useEffect(() => {
    if (search.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`);
        const data = (await res.json()) as {
          results: { schemeCode: number; schemeName: string }[];
        };
        setSearchResults(data.results ?? []);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  function onCategoryChange(next: string) {
    setCategory(next);
    setPage(1);
  }

  const sorted = useMemo(() => {
    const list = [...funds];
    list.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.schemeName.localeCompare(b.schemeName);
        case "nav":
          return b.nav - a.nav;
        case "expenseRatio":
          return (a.expenseRatio ?? 99) - (b.expenseRatio ?? 99);
        case "oneYear":
          return (
            (b.returns.oneYear.value ?? -999) -
            (a.returns.oneYear.value ?? -999)
          );
        case "threeYear":
        default:
          return (
            (b.returns.threeYear.value ?? -999) -
            (a.returns.threeYear.value ?? -999)
          );
      }
    });
    return list;
  }, [funds, sortBy]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-[var(--muted)]">
        <strong className="text-emerald-400">Direct · growth · open-ended</strong>
        {totalAll > 0 && (
          <>
            {" "}
            — <strong className="text-white">{totalAll.toLocaleString()}</strong>{" "}
            funds total
          </>
        )}
        {category !== "All" && total > 0 && (
          <>
            {" "}
            · <strong className="text-white">{total}</strong> in{" "}
            <strong className="text-white">{category}</strong>
          </>
        )}
        {catalogSource && (
          <span className="text-xs">
            {" "}
            · data: {catalogSource}
            {cacheDate && (
              <> · updated {new Date(cacheDate).toLocaleDateString()}</>
            )}
          </span>
        )}
        {catalogSource === "live" && !cacheDate && (
          <p className="mt-2 text-xs text-amber-400/90">
            No cache — loading live NAV/returns (~30–60s/page). Run{" "}
            <code className="rounded bg-black/30 px-1">npm run sync:all</code> once.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <label className="mb-1 block text-xs text-[var(--muted)]">
              Jump to fund
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search any fund name…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-emerald-500/50"
            />
            {searchResults.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)] shadow-xl">
                {searchResults.map((r) => (
                  <li key={r.schemeCode}>
                    <a
                      href={`/fund/${r.schemeCode}`}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-emerald-500/10"
                    >
                      {r.schemeName}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {searching && (
              <p className="absolute right-3 top-9 text-xs text-[var(--muted)]">
                …
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">
              Category (all pages)
            </label>
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            >
              <option value="threeYear">3Y return</option>
              <option value="oneYear">1Y return</option>
              <option value="expenseRatio">Expense ratio</option>
              <option value="nav">NAV</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]">
        <span>
          {loading
            ? "Loading…"
            : `Page ${page} of ${totalPages} · showing ${sorted.length} funds`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-[var(--border)] px-3 py-1 disabled:opacity-40"
          >
            ← Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-[var(--border)] px-3 py-1 disabled:opacity-40"
          >
            Next →
          </button>
          <button
            type="button"
            onClick={() => loadPage(page, category, true)}
            className="text-emerald-400 hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>

      <FundTable funds={sorted} loading={loading} />
    </div>
  );
}
