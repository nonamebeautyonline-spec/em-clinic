// app/api/admin/inventory/alerts/count/route.ts — 未解消アラート件数API（バッジ用）
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { getUnresolvedAlertCount } from "@/lib/inventory-alert";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantId(req);

  try {
    const count = await getUnresolvedAlertCount(tenantId);
    return NextResponse.json({ count });
  } catch (err) {
    console.error("[inventory/alerts/count] error:", err);
    return serverError(err instanceof Error ? err.message : "アラート件数取得エラー");
  }
}
