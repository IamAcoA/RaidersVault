import { NextResponse } from "next/server";
import { getLiveCoverage } from "@/lib/coverage-live";

export const revalidate = 1800;

export async function GET() {
  const items = await getLiveCoverage(20);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    count: items.length,
    items
  }, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400" } });
}
