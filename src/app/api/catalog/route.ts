import { NextResponse } from "next/server";
import { getDirectGrowthCatalog } from "@/lib/catalog";

export const revalidate = 86400;

export async function GET() {
  const { schemes, source } = await getDirectGrowthCatalog();
  return NextResponse.json({
    total: schemes.length,
    source,
    schemes,
  });
}
