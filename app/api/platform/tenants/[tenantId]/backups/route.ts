// app/api/platform/tenants/[tenantId]/backups/route.ts
// テナントバックアップ管理API（一覧・作成・リストア・削除）

import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { logAudit } from "@/lib/audit";
import {
  listBackups,
  createBackup,
  deleteBackup,
  decryptBackupData,
  importTenantData,
} from "@/lib/tenant-backup";
import { supabaseAdmin } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * GET: バックアップ一覧取得
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { tenantId } = await ctx.params;

  try {
    const backups = await listBackups(tenantId);
    return NextResponse.json({ ok: true, backups });
  } catch (err) {
    console.error("[backups] GET error:", err);
    return serverError("バックアップ一覧の取得に失敗しました");
  }
}

/**
 * POST: バックアップ作成 or リストア
 * body.action: "create" | "restore"
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { tenantId } = await ctx.params;

  let body: { action: string; name?: string; description?: string; backupId?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストボディが不正です");
  }

  try {
    if (body.action === "create") {
      // バックアップ作成
      const name = body.name || `バックアップ ${new Date().toLocaleString("ja-JP")}`;
      const backup = await createBackup(tenantId, name, body.description, admin.name);

      logAudit(req, "platform.backup.create", "tenant", tenantId, {
        backupId: backup.id,
        backupName: name,
      });

      return NextResponse.json({ ok: true, backup }, { status: 201 });
    }

    if (body.action === "restore") {
      // バックアップからリストア
      if (!body.backupId) {
        return badRequest("backupIdは必須です");
      }

      // バックアップ取得
      const { data: backupRecord, error: fetchErr } = await supabaseAdmin
        .from("tenant_backups")
        .select("*")
        .eq("id", body.backupId)
        .eq("tenant_id", tenantId)
        .single();

      if (fetchErr || !backupRecord) {
        return notFound("バックアップが見つかりません");
      }

      if (backupRecord.status !== "completed") {
        return badRequest("このバックアップはリストアに使用できません");
      }

      // データを復号してリストア
      const backupData = decryptBackupData(backupRecord.file_url);
      await importTenantData(tenantId, backupData);

      logAudit(req, "platform.backup.restore", "tenant", tenantId, {
        backupId: body.backupId,
        backupName: backupRecord.name,
      });

      return NextResponse.json({ ok: true });
    }

    return badRequest("actionは create または restore を指定してください");
  } catch (err) {
    console.error("[backups] POST error:", err);
    return serverError("バックアップ操作に失敗しました");
  }
}

/**
 * DELETE: バックアップ削除
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { tenantId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const backupId = searchParams.get("backupId");

  if (!backupId) {
    return badRequest("backupIdは必須です");
  }

  try {
    await deleteBackup(backupId, tenantId);

    logAudit(req, "platform.backup.delete", "tenant", tenantId, {
      backupId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[backups] DELETE error:", err);
    return serverError("バックアップの削除に失敗しました");
  }
}
