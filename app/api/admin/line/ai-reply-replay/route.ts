// AI返信 Replay API（Phase 3-3）
// 過去のドラフトを再生成し、新旧結果を比較

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// POST: 過去ドラフトを指定して再生成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const { draft_id } = await req.json();
    if (!draft_id) return badRequest("draft_idが必要です");

    // 元のドラフトとトレースを取得
    const [draftRes, traceRes] = await Promise.all([
      strictWithTenant(
        supabaseAdmin
          .from("ai_reply_drafts")
          .select("*")
          .eq("id", draft_id)
          .single(),
        tenantId
      ),
      strictWithTenant(
        supabaseAdmin
          .from("ai_reply_traces")
          .select("*")
          .eq("draft_id", draft_id)
          .maybeSingle(),
        tenantId
      ),
    ]);

    if (draftRes.error || !draftRes.data) {
      return badRequest("ドラフトが見つかりません");
    }

    return NextResponse.json({
      original: {
        draft: draftRes.data,
        trace: traceRes.data || null,
      },
      // 実際のreplay実行はクライアント側で別途APIを呼ぶ形式
      // ここでは元データの返却のみ（再生成はprocessAiReplyの再実行が必要で重いため）
      message: "Replay対象のドラフト情報を取得しました。再生成はai-reply-evals画面から実行してください。",
    });
  } catch (err) {
    console.error("[Replay API] エラー:", err);
    return serverError("Replay情報の取得に失敗しました");
  }
}
