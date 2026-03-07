// app/api/admin/ehr/status/route.ts — EHR接続ステータスモニタリング
import { NextRequest, NextResponse } from "next/server";
import { unauthorized, serverError } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { getSetting } from "@/lib/settings";
import { createAdapter } from "@/lib/ehr/sync";

/** 接続状態 */
type ConnectionStatus = "connected" | "disconnected" | "error";

/** 同期結果 */
type SyncResultStatus = "success" | "failed";

/** ステータスレスポンス型 */
interface EhrStatusResponse {
  /** 接続状態 */
  connectionStatus: ConnectionStatus;
  /** 最終同期日時 (ISO8601) */
  lastSyncAt: string | null;
  /** 最終同期結果 */
  lastSyncResult: SyncResultStatus | null;
  /** 直近24時間の同期統計 */
  syncStats: {
    success: number;
    failed: number;
    total: number;
  };
  /** EHRシステム情報 */
  system: {
    provider: string | null;
    providerLabel: string | null;
    version: string | null;
  };
}

const PROVIDER_LABELS: Record<string, string> = {
  orca: "ORCA（日医標準レセプトソフト）",
  csv: "CSV連携",
  fhir: "FHIR R4",
};

/**
 * GET: EHR接続ステータスを返す
 * - 接続状態（connected/disconnected/error）
 * - 最終同期日時・結果
 * - 直近24時間の成功/失敗数
 * - EHRシステム名・バージョン情報
 */
export async function GET(req: NextRequest) {
  // 管理者認証
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantId(req);

  try {
    // 1. EHRプロバイダー設定を取得
    const provider = await getSetting("ehr", "provider", tenantId ?? undefined);

    // プロバイダー未設定 → disconnected
    if (!provider) {
      const response: EhrStatusResponse = {
        connectionStatus: "disconnected",
        lastSyncAt: null,
        lastSyncResult: null,
        syncStats: { success: 0, failed: 0, total: 0 },
        system: {
          provider: null,
          providerLabel: null,
          version: null,
        },
      };
      return NextResponse.json(response);
    }

    // 2. 最終同期ログを取得
    let lastSyncQuery = supabaseAdmin
      .from("ehr_sync_logs")
      .select("created_at, status")
      .order("created_at", { ascending: false })
      .limit(1);

    if (tenantId) {
      lastSyncQuery = lastSyncQuery.eq("tenant_id", tenantId);
    }

    const { data: lastSyncData } = await lastSyncQuery;
    const lastLog = lastSyncData?.[0] ?? null;

    // 3. 直近24時間の同期統計を取得
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    let statsQuery = supabaseAdmin
      .from("ehr_sync_logs")
      .select("status")
      .gte("created_at", twentyFourHoursAgo);

    if (tenantId) {
      statsQuery = statsQuery.eq("tenant_id", tenantId);
    }

    const { data: statsData } = await statsQuery;
    const stats = (statsData ?? []).reduce(
      (acc, row) => {
        if (row.status === "success") acc.success++;
        else if (row.status === "error") acc.failed++;
        acc.total++;
        return acc;
      },
      { success: 0, failed: 0, total: 0 }
    );

    // 4. 接続状態の判定
    // - プロバイダー設定あり & 最終同期が成功 → connected
    // - プロバイダー設定あり & 最終同期がエラー → error
    // - プロバイダー設定あり & 同期ログなし → disconnected（まだ同期未実行）
    let connectionStatus: ConnectionStatus = "disconnected";
    if (lastLog) {
      connectionStatus = lastLog.status === "success" ? "connected" : "error";
    }

    // 5. バージョン情報を取得（設定がある場合）
    const version = await getSetting("ehr", "version", tenantId ?? undefined);

    const response: EhrStatusResponse = {
      connectionStatus,
      lastSyncAt: lastLog?.created_at ?? null,
      lastSyncResult: lastLog
        ? lastLog.status === "success"
          ? "success"
          : "failed"
        : null,
      syncStats: stats,
      system: {
        provider,
        providerLabel: PROVIDER_LABELS[provider] ?? provider,
        version: version ?? null,
      },
    };

    return NextResponse.json(response);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "ステータス取得に失敗しました";
    return serverError(message);
  }
}
