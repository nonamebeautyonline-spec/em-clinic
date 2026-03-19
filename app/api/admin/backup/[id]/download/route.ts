// app/api/admin/backup/[id]/download/route.ts — バックアップデータダウンロードAPI
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { unauthorized, serverError, notFound, badRequest } from "@/lib/api-error";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { getBackupStatus, decryptBackupData } from "@/lib/tenant-backup";

type Params = { params: Promise<{ id: string }> };

/** GET: バックアップデータダウンロード（復号済みJSON） */
export async function GET(request: NextRequest, { params }: Params) {
  if (!(await verifyAdminAuth(request))) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(request);
  if (!tenantId) return badRequest("テナントIDが必要です");

  const { id } = await params;
  try {
    const backup = await getBackupStatus(id);
    if (!backup || backup.tenant_id !== tenantId) {
      return notFound("バックアップが見つかりません");
    }

    if (backup.status !== "completed" || !backup.file_url) {
      return badRequest("バックアップがまだ完了していません");
    }

    // 暗号化データを復号
    const exportData = decryptBackupData(backup.file_url);

    // JSONファイルとしてダウンロード
    const jsonString = JSON.stringify(exportData, null, 2);
    const fileName = `backup_${backup.name.replace(/\s/g, "_")}_${backup.created_at.slice(0, 10)}.json`;

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("バックアップダウンロードエラー:", error);
    return serverError("バックアップのダウンロードに失敗しました");
  }
}
