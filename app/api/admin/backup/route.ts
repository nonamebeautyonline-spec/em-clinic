// app/api/admin/backup/route.ts — バックアップ一覧取得/新規作成API
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth, getAdminUserId } from "@/lib/admin-auth";
import { unauthorized, serverError, badRequest } from "@/lib/api-error";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { listBackups, createBackup, BACKUP_TABLES } from "@/lib/tenant-backup";
import { logAudit } from "@/lib/audit";

/** GET: バックアップ一覧取得 */
export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(request);
  if (!tenantId) return badRequest("テナントIDが必要です");

  try {
    const backups = await listBackups(tenantId);
    return NextResponse.json({ ok: true, backups });
  } catch (error) {
    console.error("バックアップ一覧取得エラー:", error);
    return serverError();
  }
}

/** POST: 新規バックアップ作成 */
export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(request);
  if (!tenantId) return badRequest("テナントIDが必要です");

  try {
    const body = await request.json();
    const name = body.name || `バックアップ ${new Date().toLocaleDateString("ja-JP")}`;
    const description = body.description || null;
    const tables = body.tables || undefined;
    const userId = await getAdminUserId(request);

    // テーブル名のバリデーション
    if (tables) {
      const validTables = new Set<string>(BACKUP_TABLES);
      for (const t of tables) {
        if (!validTables.has(t)) {
          return badRequest(`無効なテーブル名: ${t}`);
        }
      }
    }

    const backup = await createBackup(tenantId, name, description, userId ?? undefined, tables);
    logAudit(request, "backup.create", "backup", "unknown");
    return NextResponse.json({ ok: true, backup }, { status: 201 });
  } catch (error) {
    console.error("バックアップ作成エラー:", error);
    return serverError("バックアップの作成に失敗しました");
  }
}
