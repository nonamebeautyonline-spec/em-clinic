// app/api/platform/alerts/[alertId]/ack/route.ts
// プラットフォーム管理: セキュリティアラート確認済みAPI

import { NextRequest, NextResponse } from "next/server";
import { forbidden, notFound, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> },
) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return forbidden("権限がありません");

  const { alertId } = await params;

  try {
    // アラート存在チェック
    const { data: alert, error: alertErr } = await supabaseAdmin
      .from("security_alerts")
      .select("id, title, severity")
      .eq("id", alertId)
      .single();

    if (alertErr || !alert) {
      return notFound("アラートが見つかりません");
    }

    // 確認済みに更新
    const { error: updateErr } = await supabaseAdmin
      .from("security_alerts")
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: admin.userId,
      })
      .eq("id", alertId);

    if (updateErr) {
      console.error("[platform/alerts/ack] Update error:", updateErr);
      return serverError("アラートの更新に失敗しました");
    }

    // 監査ログ
    logAudit(req, "platform.alert.acknowledge", "security_alert", alertId, {
      title: alert.title,
      severity: alert.severity,
      acknowledgedBy: admin.userId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[platform/alerts/ack] Unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}
