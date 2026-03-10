// app/api/platform/applications/route.ts — 申し込み一覧取得 + ステータス更新
import { NextRequest, NextResponse } from "next/server";
import { forbidden, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET: 申し込み一覧取得
 * クエリ: status=pending|approved|rejected|all, page, limit
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
      .from("applications")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error("[platform/applications] GET error:", error);
      return serverError("申し込み一覧の取得に失敗しました");
    }

    return NextResponse.json({
      ok: true,
      applications: data || [],
      pagination: { total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (err) {
    console.error("[platform/applications] GET unexpected:", err);
    return serverError("予期しないエラーが発生しました");
  }
}

/**
 * PATCH: 申し込みステータス更新
 * body: { id, status: "approved" | "rejected" }
 */
export async function PATCH(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ ok: false, error: "INVALID_PARAMS" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("[platform/applications] PATCH error:", error);
      return serverError("ステータスの更新に失敗しました");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[platform/applications] PATCH unexpected:", err);
    return serverError("予期しないエラーが発生しました");
  }
}
