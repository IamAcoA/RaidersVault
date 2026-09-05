import { NextResponse } from "next/server";
import { databaseConfigured, databaseHealthy } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = databaseConfigured();
  const connected = configured ? await databaseHealthy() : false;
  return NextResponse.json({
    ok: true,
    service: "raiders-vault",
    version: "0.3.0",
    database: { configured, connected },
    time: new Date().toISOString()
  });
}
