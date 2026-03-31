// app/api/admin/stripe-connect/auth/route.ts — Stripe Connect認可URL生成
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { createStripeConnectUrl } from "@/lib/stripe-connect";

export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(req);
    if (!tenantId) return badRequest("テナントIDが取得できません");

    const { connectUrl } = await createStripeConnectUrl(tenantId);
    return NextResponse.json({ ok: true, connectUrl });
  } catch (error) {
    console.error("[Stripe Connect Auth] エラー:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
