// AI返信 学習例API（GET: 一覧 / DELETE: 削除）

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// 学習例一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const { data, error, count } = await strictWithTenant(
      supabaseAdmin
        .from("ai_reply_examples")
        .select("id, question, answer, source, used_count, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(100),
      tenantId
    );

    if (error) {
      console.error("[AI Reply Examples] 取得エラー:", error);
      return serverError("学習例の取得に失敗しました");
    }

    return NextResponse.json({ examples: data || [], total: count || 0 });
  } catch (err) {
    console.error("[AI Reply Examples] 例外:", err);
    return serverError("学習例の取得に失敗しました");
  }
}

// 学習例削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const { id } = await req.json();
    if (!id) return badRequest("IDが必要です");

    const { error } = await strictWithTenant(
      supabaseAdmin.from("ai_reply_examples").delete().eq("id", id),
      tenantId
    );

    if (error) {
      console.error("[AI Reply Examples] 削除エラー:", error);
      return serverError("学習例の削除に失敗しました");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[AI Reply Examples] 削除例外:", err);
    return serverError("学習例の削除に失敗しました");
  }
}
