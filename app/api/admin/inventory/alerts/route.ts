// app/api/admin/inventory/alerts/route.ts — 在庫アラート一覧API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { getUnresolvedAlerts, checkInventoryAlerts } from "@/lib/inventory-alert";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantId(req);

  try {
    // アラートチェックを実行（最新状態を反映）
    await checkInventoryAlerts(tenantId);

    // 未解消アラート一覧を取得
    const alerts = await getUnresolvedAlerts(tenantId);
    return NextResponse.json({ alerts });
  } catch (err) {
    console.error("[inventory/alerts] error:", err);
    return serverError(err instanceof Error ? err.message : "アラート取得エラー");
  }
}
