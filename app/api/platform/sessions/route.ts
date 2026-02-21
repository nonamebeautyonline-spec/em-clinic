// app/api/platform/sessions/route.ts — セッション一覧API
// 現在のユーザーの有効セッション一覧を返す
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    // プラットフォーム管理者認証
    const admin = await verifyPlatformAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "認証が必要です" },
        { status: 401 }
      );
    }

    // 現在のセッションのトークンハッシュを計算
    const sessionCookie = req.cookies.get("admin_session")?.value;
    const currentTokenHash = sessionCookie
      ? createHash("sha256").update(sessionCookie).digest("hex")
      : null;

    // 有効セッション一覧を取得
    const { data: sessions, error } = await supabaseAdmin
      .from("admin_sessions")
      .select("id, ip_address, user_agent, created_at, last_activity, expires_at, token_hash")
      .eq("admin_user_id", admin.userId)
      .gt("expires_at", new Date().toISOString())
      .order("last_activity", { ascending: false });

    if (error) {
      console.error("[Sessions] DB error:", error);
      return NextResponse.json(
        { ok: false, error: "セッション情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    // 現在のセッションを判別してレスポンスに含める（token_hashは返さない）
    const result = (sessions || []).map((s) => ({
      id: s.id,
      ipAddress: s.ip_address,
      userAgent: s.user_agent,
      createdAt: s.created_at,
      lastActivity: s.last_activity,
      expiresAt: s.expires_at,
      isCurrent: currentTokenHash ? s.token_hash === currentTokenHash : false,
    }));

    return NextResponse.json({ ok: true, sessions: result });
  } catch (err) {
    console.error("[Sessions] Error:", err);
    return NextResponse.json(
      { ok: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
