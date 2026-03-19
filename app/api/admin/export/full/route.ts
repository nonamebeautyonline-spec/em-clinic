// app/api/admin/export/full/route.ts — テナント全データエクスポートAPI
import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { executeFullExport } from "@/lib/export-worker";

// POST: エクスポートジョブ作成
export async function POST(req: NextRequest) {
  const authed = await verifyAdminAuth(req);
  if (!authed) {
    return unauthorized();
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
