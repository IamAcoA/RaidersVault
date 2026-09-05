import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, service: "raiders-vault", version: "0.2.0", time: new Date().toISOString() });
}
