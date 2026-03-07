// app/api/admin/backup/restore/route.ts — リストア実行API
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { unauthorized, serverError, notFound, badRequest } from "@/lib/api-error";
import { resolveTenantId } from "@/lib/tenant";
import {
  getBackupStatus,
  decryptBackupData,
  importTenantData,
} from "@/lib/tenant-backup";

/** POST: リストア実行 */
export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) return unauthorized();

  const tenantId = resolveTenantId(request);
  if (!tenantId) return badRequest("テナントIDが必要です");

  try {
    const body = await request.json();
    const { backup_id, confirm } = body;

    if (!backup_id) {
      return badRequest("backup_id が必要です");
    }

    // 確認フラグ必須（全データ上書きの安全対策）
    if (confirm !== true) {
      return badRequest("リストアを実行するには confirm: true を指定してください。全データが上書きされます。");
    }

    // バックアップ存在・テナント所有確認
    const backup = await getBackupStatus(backup_id);
    if (!backup || backup.tenant_id !== tenantId) {
      return notFound("バックアップが見つかりません");
    }

    if (backup.status !== "completed" || !backup.file_url) {
      return badRequest("完了済みのバックアップのみリストア可能です");
    }

    // 暗号化データを復号
    const exportData = decryptBackupData(backup.file_url);

    // リストア実行
    const result = await importTenantData(tenantId, exportData);

    if (!result.success) {
      return serverError(`リストアに失敗しました: ${result.error}`);
    }

    return NextResponse.json({
      ok: true,
      message: "リストアが完了しました",
      record_counts: result.record_counts,
    });
  } catch (error) {
    console.error("リストアエラー:", error);
    return serverError("リストアの実行中にエラーが発生しました");
  }
}
