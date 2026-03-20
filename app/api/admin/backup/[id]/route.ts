// app/api/admin/backup/[id]/route.ts — バックアップ詳細/削除API
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { unauthorized, serverError, notFound, badRequest } from "@/lib/api-error";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { getBackupStatus, deleteBackup } from "@/lib/tenant-backup";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

/** GET: バックアップ詳細取得 */
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

    // file_url（暗号化データ）は詳細APIでは返さない
    const { file_url: _, ...safeBackup } = backup;
    return NextResponse.json({ ok: true, backup: safeBackup });
  } catch (error) {
    console.error("バックアップ詳細取得エラー:", error);
    return serverError();
  }
}

/** DELETE: バックアップ削除 */
export async function DELETE(request: NextRequest, { params }: Params) {
  if (!(await verifyAdminAuth(request))) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(request);
  if (!tenantId) return badRequest("テナントIDが必要です");

  const { id } = await params;
  try {
    // テナント所有確認
    const backup = await getBackupStatus(id);
    if (!backup || backup.tenant_id !== tenantId) {
      return notFound("バックアップが見つかりません");
    }

    const success = await deleteBackup(id, tenantId);
    if (!success) {
      return serverError("バックアップの削除に失敗しました");
    }

    logAudit(request, "backup.delete", "backup", String(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("バックアップ削除エラー:", error);
    return serverError();
  }
}
