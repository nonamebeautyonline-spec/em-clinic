// lib/cron-logger.ts — Cron実行ログのヘルパー
// 各Cronジョブの開始・終了をcron_execution_logsテーブルに記録する

import { supabaseAdmin } from "@/lib/supabase";
import { tenantPayload } from "@/lib/tenant";

/**
 * Cron実行ログを開始（statusをrunningで作成）
 * @param cronName Cron名（例: "send-scheduled", "collect-line-stats"）
 * @param tenantId テナントID（nullの場合デフォルトテナント）
 * @returns ログID（終了時にfinishCronLogへ渡す）。DB障害時はnull
 */
export async function startCronLog(
  cronName: string,
  tenantId: string | null = null,
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("cron_execution_logs")
      .insert({
        ...tenantPayload(tenantId),
        cron_name: cronName,
        started_at: new Date().toISOString(),
        status: "running",
      })
      .select("id")
      .single();

    if (error) {
      console.error(`[cron-logger] startCronLog失敗 (${cronName}):`, error.message);
      return null;
    }

    return data.id;
  } catch (e) {
    console.error(`[cron-logger] startCronLog例外 (${cronName}):`, (e as Error).message);
    return null;
  }
}

/**
 * Cron実行ログを終了（status/summary/error/durationを更新）
 * @param logId startCronLogの戻り値
 * @param status 結果ステータス
 * @param summary 結果サマリー（JSON）
 * @param errorMessage エラーメッセージ（失敗時）
 */
export async function finishCronLog(
  logId: string | null,
  status: "success" | "failed",
  summary?: Record<string, unknown>,
  errorMessage?: string,
): Promise<void> {
  if (!logId) return;

  try {
    const now = new Date();

    // started_atを取得してduration_msを計算
    const { data: log } = await supabaseAdmin
      .from("cron_execution_logs")
      .select("started_at")
      .eq("id", logId)
      .single();

    const durationMs = log?.started_at
      ? now.getTime() - new Date(log.started_at).getTime()
      : null;

    const { error } = await supabaseAdmin
      .from("cron_execution_logs")
      .update({
        status,
        finished_at: now.toISOString(),
        result_summary: summary ?? null,
        error_message: errorMessage ?? null,
        duration_ms: durationMs,
      })
      .eq("id", logId);

    if (error) {
      console.error(`[cron-logger] finishCronLog失敗 (${logId}):`, error.message);
    }
  } catch (e) {
    console.error(`[cron-logger] finishCronLog例外 (${logId}):`, (e as Error).message);
  }
}
