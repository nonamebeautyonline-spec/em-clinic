// app/api/platform/sessions/[sessionId]/route.ts — セッション削除API
// 指定セッションを無効化（現在のセッションは削除不可）
import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-error";
import { createHash } from "crypto";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // プラットフォーム管理者認証
    const admin = await verifyPlatformAdmin(req);
    if (!admin) {
      return unauthorized();
    }

    const { sessionId } = await params;

    if (!sessionId) {
      return badRequest("セッションIDは必須です");
    }

    // 対象セッションを取得（自分のセッションのみ操作可能）
    const { data: session, error: fetchError } = await supabaseAdmin
      .from("admin_sessions")
      .select("id, token_hash, admin_user_id")
      .eq("id", sessionId)
      .eq("admin_user_id", admin.userId)
      .single();

    if (fetchError || !session) {
      return notFound("セッションが見つかりません");
    }

    // 現在のセッションかどうかチェック
    const sessionCookie = req.cookies.get("admin_session")?.value;
    if (sessionCookie) {
      const currentTokenHash = createHash("sha256").update(sessionCookie).digest("hex");
      if (session.token_hash === currentTokenHash) {
        return badRequest("現在のセッションは削除できません");
      }
    }

    // セッション削除
    const { error: deleteError } = await supabaseAdmin
      .from("admin_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("admin_user_id", admin.userId);

    if (deleteError) {
      console.error("[Session Delete] DB error:", deleteError);
      return serverError("セッションの削除に失敗しました");
    }

    // 監査ログ
    logAudit(req, "platform.session.revoked", "admin_session", sessionId, {
      email: admin.email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Session Delete] Error:", err);
    return serverError("サーバーエラー");
  }
}
