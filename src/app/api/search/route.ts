import { NextResponse } from "next/server";
import { searchSchemes } from "@/lib/mfapi";

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }
  const results = await searchSchemes(q);
  const direct = results.filter(
    (r) => /direct/i.test(r.schemeName) && !/regular/i.test(r.schemeName)
  );
  return NextResponse.json({
    results: (direct.length ? direct : results).slice(0, 15),
  });
}
