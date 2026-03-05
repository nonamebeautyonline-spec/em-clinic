// app/api/platform/system/maintenance/route.ts
// プラットフォーム管理: メンテナンスモード切替API

import { NextRequest, NextResponse } from "next/server";
import { forbidden, serverError } from "@/lib/api-error";
import { z } from "zod";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";

// バリデーションスキーマ
const maintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().optional(),
});

/**
 * POST: メンテナンスモード切替
 * body: { enabled: boolean, message?: string }
 */
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return forbidden("権限がありません");

  const parsed = await parseBody(req, maintenanceSchema);
  if (parsed.error) return parsed.error;

  const { enabled, message } = parsed.data;

  try {
    // maintenance_mode を更新（upsert）
    const { error: modeErr } = await supabaseAdmin
      .from("platform_settings")
      .upsert(
        {
          key: "maintenance_mode",
          value: enabled ? "true" : "false",
          updated_by: admin.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );

    if (modeErr) {
      console.error("[platform/maintenance] upsert maintenance_mode error:", modeErr);
      return serverError("メンテナンスモードの更新に失敗しました");
    }

    // maintenance_message を更新（upsert）
    const { error: msgErr } = await supabaseAdmin
      .from("platform_settings")
      .upsert(
        {
          key: "maintenance_message",
          value: message || "",
          updated_by: admin.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );

    if (msgErr) {
      console.error("[platform/maintenance] upsert maintenance_message error:", msgErr);
      // メッセージの保存失敗は致命的ではないので続行
    }

    // 監査ログ記録
    logAudit(
      req,
      enabled ? "platform.maintenance.enabled" : "platform.maintenance.disabled",
      "platform_settings",
      "maintenance_mode",
      {
        enabled,
        message: message || null,
        updatedBy: admin.name,
      },
    );

    return NextResponse.json({
      ok: true,
      maintenance: {
        enabled,
        message: message || "",
      },
    });
  } catch (err) {
    console.error("[platform/maintenance] POST unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}
