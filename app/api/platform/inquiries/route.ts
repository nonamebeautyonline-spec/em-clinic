// app/api/platform/inquiries/route.ts — お問い合わせ一覧取得 + ステータス更新
import { NextRequest, NextResponse } from "next/server";
import { forbidden, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET: お問い合わせ一覧取得
 * クエリ: status=unread|read|replied|all, page, limit
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "all";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("inquiries")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error("[platform/inquiries] GET error:", error);
      return serverError("お問い合わせ一覧の取得に失敗しました");
    }

    return NextResponse.json({
      ok: true,
      inquiries: data || [],
      pagination: { total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (err) {
    console.error("[platform/inquiries] GET unexpected:", err);
    return serverError("予期しないエラーが発生しました");
  }
}

/**
 * PATCH: お問い合わせステータス更新 + 管理者メモ
 * body: { id, status?: "unread" | "read" | "replied", note?: string }
 */
export async function PATCH(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  try {
    const body = await req.json();
    const { id, status, note } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "INVALID_PARAMS" }, { status: 400 });
    }

    if (status && !["unread", "read", "replied"].includes(status)) {
      return NextResponse.json({ ok: false, error: "INVALID_STATUS" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (note !== undefined) updates.note = note;

    const { error } = await supabaseAdmin
      .from("inquiries")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("[platform/inquiries] PATCH error:", error);
      return serverError("ステータスの更新に失敗しました");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[platform/inquiries] PATCH unexpected:", err);
    return serverError("予期しないエラーが発生しました");
  }
}
