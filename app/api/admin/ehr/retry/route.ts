// app/api/admin/ehr/retry/route.ts — EHR同期リトライAPI
import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { parseBody } from "@/lib/validations/helpers";
import { ehrRetrySchema, ehrBulkRetrySchema, ehrLogsQuerySchema } from "@/lib/validations/ehr";
import { createAdapter, pushPatient, pullPatient, pushKarte, pullKarte } from "@/lib/ehr/sync";
import { logAudit } from "@/lib/audit";

/**
 * POST: 失敗した同期ジョブをリトライ
 * ボディ: { sync_id: string } または { sync_ids: string[] }
 */
export async function POST(req: NextRequest) {
  // 管理者認証
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  // ボディをパース（sync_id / sync_ids どちらかを受け付ける）
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストの形式が不正です");
  }

  // 単件 or 一括を判定
  const isBulk = "sync_ids" in body;
  let syncIds: string[];

  if (isBulk) {
    const parsed = ehrBulkRetrySchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map(
        (e) => `${e.path.join(".")}: ${e.message}`,
      );
      return NextResponse.json(
        { ok: false, error: "パラメータが不正です", details: messages },
        { status: 400 },
      );
    }
    syncIds = parsed.data.sync_ids;
  } else {
    const parsed = ehrRetrySchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map(
        (e) => `${e.path.join(".")}: ${e.message}`,
      );
      return NextResponse.json(
        { ok: false, error: "パラメータが不正です", details: messages },
        { status: 400 },
      );
    }
    syncIds = [parsed.data.sync_id];
  }

  try {
    // アダプター生成
    const adapter = await createAdapter(tenantId ?? undefined);
    if (!adapter) {
      return badRequest("EHRプロバイダーが設定されていません");
    }

    // 対象ログを取得
    let query = supabaseAdmin
      .from("ehr_sync_logs")
      .select("*")
      .in("id", syncIds)
      .eq("status", "error");

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data: failedLogs, error: fetchError } = await query;

    if (fetchError) {
      return serverError(`ログ取得に失敗しました: ${fetchError.message}`);
    }

    if (!failedLogs || failedLogs.length === 0) {
      return notFound("リトライ対象のエラーログが見つかりません");
    }

    // 各ログのステータスを「retrying」に更新
    const logIds = failedLogs.map((log) => log.id);
    await supabaseAdmin
      .from("ehr_sync_logs")
      .update({ status: "retrying" })
      .in("id", logIds);

    // リトライ実行
    const results: Array<{
      sync_id: string;
      status: "success" | "error" | "skipped";
      detail?: string;
    }> = [];

    for (const log of failedLogs) {
      try {
        let result;

        if (log.resource_type === "patient") {
          if (log.direction === "push") {
            result = await pushPatient(
              log.patient_id!,
              adapter,
              tenantId ?? undefined,
            );
          } else {
            result = await pullPatient(
              log.external_id!,
              adapter,
              tenantId ?? undefined,
            );
          }
        } else {
          // karte
          if (log.direction === "push") {
            result = await pushKarte(
              log.patient_id!,
              adapter,
              tenantId ?? undefined,
            );
          } else {
            result = await pullKarte(
              log.patient_id!,
              adapter,
              tenantId ?? undefined,
            );
          }
        }

        results.push({
          sync_id: log.id,
          status: result.status,
          detail: result.detail,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({
          sync_id: log.id,
          status: "error",
          detail: `リトライ失敗: ${msg}`,
        });
      }
    }

    // 集計
    const summary = {
      total: results.length,
      success: results.filter((r) => r.status === "success").length,
      error: results.filter((r) => r.status === "error").length,
      skipped: results.filter((r) => r.status === "skipped").length,
    };

    logAudit(req, "ehr.retry", "ehr", "retry");
    return NextResponse.json({ ok: true, summary, results });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "リトライ処理に失敗しました";
    return serverError(message);
  }
}

/**
 * GET: 失敗ログ一覧を取得（最新50件、ステータスフィルタ対応）
 */
export async function GET(req: NextRequest) {
  // 管理者認証
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  // クエリパラメータのバリデーション
  const url = new URL(req.url);
  const rawQuery = {
    limit: url.searchParams.get("limit") || undefined,
    provider: url.searchParams.get("provider") || undefined,
    status: url.searchParams.get("status") || undefined,
  };

  const parseResult = ehrLogsQuerySchema.safeParse(rawQuery);
  if (!parseResult.success) {
    const messages = parseResult.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`,
    );
    return NextResponse.json(
      { ok: false, error: "パラメータが不正です", details: messages },
      { status: 400 },
    );
  }

  const { limit, provider, status } = parseResult.data;

  try {
    // デフォルトではエラーログのみ取得
    let query = supabaseAdmin
      .from("ehr_sync_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    // ステータスフィルタ（指定がなければ error のみ）
    if (status) {
      query = query.eq("status", status);
    } else {
      query = query.eq("status", "error");
    }

    if (provider) {
      query = query.eq("provider", provider);
    }

    const { data, error } = await query;

    if (error) {
      return serverError(`ログ取得に失敗しました: ${error.message}`);
    }

    return NextResponse.json({ ok: true, logs: data || [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "ログ取得に失敗しました";
    return serverError(message);
  }
}
