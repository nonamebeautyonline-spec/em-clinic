// app/api/admin/export/full/route.ts — テナント全データエクスポートAPI
import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth, getAdminUserId } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { executeFullExport } from "@/lib/export-worker";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

// POST: エクスポートジョブ作成（パスワード再確認 + 理由入力必須）
export async function POST(req: NextRequest) {
  const authed = await verifyAdminAuth(req);
  if (!authed) {
    return unauthorized();
  }

  // リクエストbodyからパスワードと理由を取得
  let body: { password?: string; reason?: string } = {};
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストボディが不正です");
  }

  const { password, reason } = body;

  if (!password) {
    return badRequest("パスワードが必要です");
  }

  if (!reason || reason.trim() === "") {
    return badRequest("エクスポート理由が必要です");
  }

  // パスワード再確認: 現在のユーザーのハッシュと照合
  const adminUserId = await getAdminUserId(req);
  if (!adminUserId) {
    return unauthorized();
  }

  const { data: adminUser, error: userError } = await supabaseAdmin
    .from("admin_users")
    .select("password_hash")
    .eq("id", adminUserId)
    .single();

  if (userError || !adminUser?.password_hash) {
    return serverError("ユーザー情報の取得に失敗しました");
  }

  const passwordMatch = await bcrypt.compare(password, adminUser.password_hash);
  if (!passwordMatch) {
    return NextResponse.json({ message: "パスワードが一致しません" }, { status: 403 });
  }

  const tenantId = resolveTenantIdOrThrow(req);

  // エクスポートジョブ作成
  const { data: job, error } = await supabaseAdmin
    .from("export_jobs")
    .insert({
      tenant_id: tenantId,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !job) {
    return serverError("ジョブの作成に失敗しました");
  }

  // fire-and-forget でエクスポート実行
  executeFullExport(job.id, tenantId || "").catch(() => {
    // エラーは export-worker 内で処理される
  });

  logAudit(req, "export.create", "export", String(job.id), { reason: reason.trim() });
  return NextResponse.json({ jobId: job.id, status: "pending" });
}

// GET: ジョブ状態確認
export async function GET(req: NextRequest) {
  const authed = await verifyAdminAuth(req);
  if (!authed) {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return badRequest("jobIdパラメータが必要です");
  }

  const tenantIdForGet = resolveTenantIdOrThrow(req);
  const { data: job, error } = await strictWithTenant(
    supabaseAdmin
      .from("export_jobs")
      .select("id, status, record_counts, error_message, tables_included, created_at, completed_at")
      .eq("id", jobId),
    tenantIdForGet
  ).single();

  if (error || !job) {
    return notFound("ジョブが見つかりません");
  }

  return NextResponse.json(job);
}
