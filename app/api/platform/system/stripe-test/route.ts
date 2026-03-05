// app/api/platform/system/stripe-test/route.ts
// Stripe接続テストAPI

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { testStripeConnection } from "@/lib/stripe";
import { forbidden } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) {
    return forbidden();
  }

  const result = await testStripeConnection();
  return NextResponse.json(result);
}
