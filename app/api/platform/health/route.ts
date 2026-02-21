// app/api/platform/health/route.ts
// プラットフォーム管理: システムヘルスチェックAPI

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  const checks: Record<string, { status: string; responseMs: number; error?: string }> = {};
  const stats: Record<string, number> = {};

  // 1. Supabase接続チェック
  try {
    const dbStart = Date.now();
    const { error: dbErr } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .limit(1);
    const dbMs = Date.now() - dbStart;

    if (dbErr) {
      checks.database = { status: "unhealthy", responseMs: dbMs, error: dbErr.message };
    } else {
      checks.database = {
        status: dbMs < 100 ? "healthy" : dbMs < 500 ? "degraded" : "unhealthy",
        responseMs: dbMs,
      };
    }
  } catch (err) {
    checks.database = {
      status: "unhealthy",
      responseMs: 0,
      error: err instanceof Error ? err.message : "接続失敗",
    };
  }

  // 2. Redis接続チェック
  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      checks.redis = { status: "unconfigured", responseMs: 0, error: "環境変数未設定" };
    } else {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({ url: redisUrl, token: redisToken });
      const redisStart = Date.now();
      await redis.ping();
      const redisMs = Date.now() - redisStart;

      checks.redis = {
        status: redisMs < 100 ? "healthy" : redisMs < 500 ? "degraded" : "unhealthy",
        responseMs: redisMs,
      };
    }
  } catch (err) {
    checks.redis = {
      status: "unhealthy",
      responseMs: 0,
      error: err instanceof Error ? err.message : "接続失敗",
    };
  }

  // 3. アクティブセッション数
  try {
    const { count } = await supabaseAdmin
      .from("admin_sessions")
      .select("id", { count: "exact", head: true })
      .gt("expires_at", new Date().toISOString());
    stats.activeSessions = count || 0;
  } catch {
    stats.activeSessions = 0;
  }

  // 4. テナント統計
  try {
    const { count: totalCount } = await supabaseAdmin
      .from("tenants")
      .select("id", { count: "exact", head: true });
    stats.totalTenants = totalCount || 0;

    const { count: activeCount } = await supabaseAdmin
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    stats.activeTenants = activeCount || 0;
  } catch {
    stats.totalTenants = 0;
    stats.activeTenants = 0;
  }

  // 5. 直近24時間の監査ログ件数
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: auditCount } = await supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h);
    stats.auditLogs24h = auditCount || 0;
  } catch {
    stats.auditLogs24h = 0;
  }

  // 6. 直近24時間のエラー件数
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: errorCount } = await supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h)
      .or("action.ilike.%error%,action.ilike.%fail%");
    stats.errors24h = errorCount || 0;
  } catch {
    stats.errors24h = 0;
  }

  // 全体ステータス判定
  const allHealthy = Object.values(checks).every(
    (c) => c.status === "healthy" || c.status === "unconfigured",
  );

  return NextResponse.json({
    ok: allHealthy,
    checks,
    stats,
    timestamp: new Date().toISOString(),
  });
}
