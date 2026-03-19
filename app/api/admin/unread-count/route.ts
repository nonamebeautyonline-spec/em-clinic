// 未読メッセージ数カウントAPI（サイドバーバッジ用・軽量）
import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  // friend_summaries（最新テキスト時刻）と chat_reads（既読時刻）を並列取得
  const [fsRes, crRes] = await Promise.all([
    strictWithTenant(
      supabaseAdmin
        .from("friend_summaries")
        .select("patient_id, last_msg_at"),
      tenantId
    ),
    strictWithTenant(
      supabaseAdmin
        .from("chat_reads")
        .select("patient_id, read_at"),
      tenantId
    ),
  ]);

  const reads: Record<string, string> = {};
  for (const row of crRes.data || []) {
    reads[row.patient_id] = row.read_at;
  }

  // 未読カウント: last_msg_at > read_at の患者数
  let count = 0;
  for (const row of fsRes.data || []) {
    if (!row.last_msg_at) continue;
    const readAt = reads[row.patient_id];
    if (!readAt || row.last_msg_at > readAt) {
      count++;
    }
  }

  return NextResponse.json({ count }, {
    headers: { "Cache-Control": "no-store" },
  });
}
