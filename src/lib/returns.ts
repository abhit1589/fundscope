import type { NavPoint } from "./mfapi";
import type { FundSummary } from "./types";

function findNavOnOrBefore(points: NavPoint[], target: Date): number | null {
  let result: number | null = null;
  for (const p of points) {
    if (p.date.getTime() <= target.getTime()) result = p.nav;
    else break;
  }
  return result;
}

function pctChange(from: number, to: number): number {
  return ((to - from) / from) * 100;
}

export function cagr(
  startNav: number,
  endNav: number,
  years: number
): number | null {
  if (startNav <= 0 || endNav <= 0 || years <= 0) return null;
  return (Math.pow(endNav / startNav, 1 / years) - 1) * 100;
}

export function computeReturnsFromNav(points: NavPoint[]): {
  oneMonth: number | null;
  threeMonth: number | null;
  sixMonth: number | null;
  ytd: number | null;
  oneYear: number | null;
  threeYear: number | null;
  fiveYear: number | null;
} {
  const empty = {
    oneMonth: null,
    threeMonth: null,
    sixMonth: null,
    ytd: null,
    oneYear: null,
    threeYear: null,
    fiveYear: null,
  };
  if (points.length < 2) return empty;

  const latest = points[points.length - 1];
  const now = latest.date;

  const monthsAgo = (m: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - m);
    return d;
  };

  const jan1 = new Date(now.getFullYear(), 0, 1);
  const nav1m = findNavOnOrBefore(points, monthsAgo(1));
  const nav3m = findNavOnOrBefore(points, monthsAgo(3));
  const nav6m = findNavOnOrBefore(points, monthsAgo(6));
  const ytdStart = findNavOnOrBefore(points, jan1);
  const nav1y = findNavOnOrBefore(points, monthsAgo(12));
  const nav3y = findNavOnOrBefore(points, monthsAgo(36));
  const nav5y = findNavOnOrBefore(points, monthsAgo(60));

  return {
    oneMonth: nav1m ? pctChange(nav1m, latest.nav) : null,
    threeMonth: nav3m ? pctChange(nav3m, latest.nav) : null,
    sixMonth: nav6m ? pctChange(nav6m, latest.nav) : null,
    ytd: ytdStart ? pctChange(ytdStart, latest.nav) : null,
    oneYear: nav1y ? pctChange(nav1y, latest.nav) : null,
    threeYear: nav3y ? cagr(nav3y, latest.nav, 3) : null,
    fiveYear: nav5y ? cagr(nav5y, latest.nav, 5) : null,
  };
}

export function buildReturns(r: {
  oneMonth?: number | null;
  threeMonth?: number | null;
  sixMonth?: number | null;
  ytd?: number | null;
  oneYear?: number | null;
  threeYear?: number | null;
  fiveYear?: number | null;
}): FundSummary["returns"] {
  return {
    oneMonth: { value: r.oneMonth ?? null, label: "1M" },
    threeMonth: { value: r.threeMonth ?? null, label: "3M" },
    sixMonth: { value: r.sixMonth ?? null, label: "6M" },
    ytd: { value: r.ytd ?? null, label: "YTD" },
    oneYear: { value: r.oneYear ?? null, label: "1Y" },
    threeYear: { value: r.threeYear ?? null, label: "3Y" },
    fiveYear: { value: r.fiveYear ?? null, label: "5Y" },
  };
}

export function formatReturn(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatNav(nav: number): string {
  if (!nav || nav <= 0) return "—";
  return `₹${nav.toFixed(2)}`;
}

export function returnColor(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "text-slate-500";
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-rose-400";
  return "text-slate-400";
}
