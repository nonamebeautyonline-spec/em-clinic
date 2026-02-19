// app/api/platform/system/settings/route.ts
// プラットフォーム管理: システム設定API

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";

// PUT用バリデーションスキーマ
const updateSettingsSchema = z.array(
  z.object({
    key: z.string().min(1, "キーは必須です"),
    value: z.string(),
  }),
);

/**
 * GET: プラットフォーム設定一覧
 * platform_settings テーブルの全レコードを返す
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  try {
    const { data: settings, error: settingsErr } = await supabaseAdmin
      .from("platform_settings")
      .select("*")
      .order("key", { ascending: true });

    if (settingsErr) {
      console.error("[platform/system/settings] GET error:", settingsErr);
      return NextResponse.json(
        { ok: false, error: "設定の取得に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      settings: settings || [],
    });
  } catch (err) {
    console.error("[platform/system/settings] GET unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}

/**
 * PUT: 設定一括更新
 * body: [{ key: string, value: string }, ...]
 */
export async function PUT(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  const parsed = await parseBody(req, updateSettingsSchema);
  if (parsed.error) return parsed.error;

  const items = parsed.data;

  try {
    const results: { key: string; success: boolean }[] = [];

    for (const item of items) {
      // upsert: キーが存在すれば更新、なければ挿入
      const { error: upsertErr } = await supabaseAdmin
        .from("platform_settings")
        .upsert(
          {
            key: item.key,
            value: item.value,
            updated_by: admin.userId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" },
        );

      if (upsertErr) {
        console.error(
          `[platform/system/settings] upsert error for key=${item.key}:`,
          upsertErr,
        );
        results.push({ key: item.key, success: false });
      } else {
        results.push({ key: item.key, success: true });
      }
    }

    // 監査ログ記録
    const updatedKeys = results
      .filter((r) => r.success)
      .map((r) => r.key);
    if (updatedKeys.length > 0) {
      logAudit(req, "platform.settings.update", "platform_settings", "batch", {
        keys: updatedKeys,
        updatedBy: admin.name,
      });
    }

    const allSuccess = results.every((r) => r.success);

    return NextResponse.json({
      ok: allSuccess,
      results,
      ...(allSuccess ? {} : { error: "一部の設定の保存に失敗しました" }),
    });
  } catch (err) {
    console.error("[platform/system/settings] PUT unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "予期しないエラーが発生しました" },
      { status: 500 },
    );
  }
}
