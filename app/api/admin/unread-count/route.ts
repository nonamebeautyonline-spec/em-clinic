// 未読メッセージ数カウントAPI（サイドバーバッジ用・軽量）
// SQL JOIN版RPC使用（PostgREST 5000行制限を回避）
import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await supabaseAdmin.rpc("count_unread_patients", {
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error("[unread-count] RPC error:", error);
    return NextResponse.json({ count: 0 }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ count: data ?? 0 }, {
    headers: { "Cache-Control": "no-store" },
  });
}
