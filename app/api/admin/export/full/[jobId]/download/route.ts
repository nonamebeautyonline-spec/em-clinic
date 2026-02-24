// app/api/admin/export/full/[jobId]/download/route.ts — エクスポートデータダウンロードAPI
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";

// GET: 完了済みジョブのCSVデータをダウンロード
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const authed = await verifyAdminAuth(req);
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);
  const { jobId } = await params;

  const { data: job, error } = await withTenant(
    supabaseAdmin
      .from("export_jobs")
      .select("id, status, file_url, error_message")
      .eq("id", jobId),
    tenantId
  ).single();

  if (error || !job) {
    return NextResponse.json(
      { error: "ジョブが見つかりません" },
      { status: 404 }
    );
  }

  if (job.status !== "completed") {
    return NextResponse.json(
      { error: "エクスポートが完了していません", status: job.status },
      { status: 400 }
    );
  }

  if (!job.file_url) {
    return NextResponse.json(
      { error: "エクスポートデータが見つかりません" },
      { status: 404 }
    );
  }

  // file_url にはJSON形式で各テーブルのCSVデータが格納されている
  const exportData = JSON.parse(job.file_url);
  const fileName = `全データエクスポート_${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
