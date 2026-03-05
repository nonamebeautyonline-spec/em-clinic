// app/api/platform/system/stripe-test/route.ts
// Stripe接続テストAPI

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { testStripeConnection } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "権限がありません" }, { status: 403 });
  }

  const result = await testStripeConnection();
  return NextResponse.json(result);
}
