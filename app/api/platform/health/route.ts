// app/api/platform/health/route.ts
// プラットフォーム管理: システムヘルスチェックAPI

import { NextRequest, NextResponse } from "next/server";
import { forbidden } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return forbidden("権限がありません");

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

  // 7. LINE Messaging API接続チェック
  try {
    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!lineToken) {
      checks.line = { status: "unconfigured", responseMs: 0, error: "環境変数未設定" };
    } else {
      const lineStart = Date.now();
      const lineRes = await fetch("https://api.line.me/v2/bot/info", {
        headers: { Authorization: `Bearer ${lineToken}` },
      });
      const lineMs = Date.now() - lineStart;
      checks.line = {
        status: lineRes.ok ? (lineMs < 500 ? "healthy" : "degraded") : "unhealthy",
        responseMs: lineMs,
        ...(lineRes.ok ? {} : { error: `HTTP ${lineRes.status}` }),
      };
    }
  } catch (err) {
    checks.line = {
      status: "unhealthy",
      responseMs: 0,
      error: err instanceof Error ? err.message : "接続失敗",
    };
  }

  // 8. OpenAI API接続チェック（embedding用）
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      checks.openai = { status: "unconfigured", responseMs: 0, error: "環境変数未設定" };
    } else {
      const oaiStart = Date.now();
      const oaiRes = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${openaiKey}` },
      });
      const oaiMs = Date.now() - oaiStart;
      checks.openai = {
        status: oaiRes.ok ? (oaiMs < 1000 ? "healthy" : "degraded") : "unhealthy",
        responseMs: oaiMs,
        ...(oaiRes.ok ? {} : { error: `HTTP ${oaiRes.status}` }),
      };
    }
  } catch (err) {
    checks.openai = {
      status: "unhealthy",
      responseMs: 0,
      error: err instanceof Error ? err.message : "接続失敗",
    };
  }

  // 9. Webhook関連の監査ログ統計（直近24時間）
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: webhookCount } = await supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h)
      .ilike("action", "%webhook%");
    stats.webhookEvents24h = webhookCount || 0;

    const { count: webhookErrCount } = await supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h)
      .ilike("action", "%webhook%fail%");
    stats.webhookErrors24h = webhookErrCount || 0;
  } catch {
    stats.webhookEvents24h = 0;
    stats.webhookErrors24h = 0;
  }

  // 10. Cron実行状況（直近24時間）
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: cronCount } = await supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h)
      .ilike("action", "%cron%");
    stats.cronRuns24h = cronCount || 0;

    const { count: cronErrCount } = await supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h)
      .or("action.ilike.%cron%fail%,action.ilike.%cron%error%");
    stats.cronErrors24h = cronErrCount || 0;
  } catch {
    stats.cronRuns24h = 0;
    stats.cronErrors24h = 0;
  }

  // 11. 未解決インシデント数
  try {
    const { count: incidentCount } = await supabaseAdmin
      .from("incidents")
      .select("id", { count: "exact", head: true })
      .neq("status", "resolved");
    stats.activeIncidents = incidentCount || 0;
  } catch {
    stats.activeIncidents = 0;
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
