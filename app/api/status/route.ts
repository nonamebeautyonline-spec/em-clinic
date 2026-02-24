// app/api/status/route.ts — 公開ヘルスチェックAPI（認証不要）
// テナント非依存: 全体のシステム稼働状態を返す
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // テナント解決（テナント横断のヘルスチェックだが、アーキテクチャ準拠のため呼び出し）
  const _tenantId = resolveTenantId(req);
  const services: Record<string, string> = {};

  // 1. データベースチェック（テナント非依存テーブルで確認）
  try {
    const { error } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .limit(1);
    services.database = error ? "unhealthy" : "healthy";
  } catch {
    services.database = "unhealthy";
  }

  // 2. Redisチェック
  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!redisUrl || !redisToken) {
      services.cache = "unconfigured";
    } else {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({ url: redisUrl, token: redisToken });
      await redis.ping();
      services.cache = "healthy";
    }
  } catch {
    services.cache = "degraded";
  }

  // 3. API（常にhealthy — このエンドポイント自体が応答している）
  services.api = "healthy";

  // 全体ステータス判定
  const allValues = Object.values(services);
  let overallStatus: string;
  if (allValues.some((s) => s === "unhealthy")) {
    overallStatus = "unhealthy";
  } else if (allValues.some((s) => s === "degraded")) {
    overallStatus = "degraded";
  } else {
    overallStatus = "healthy";
  }

  // 過去30日のインシデント取得
  let incidents: any[] = [];
  try {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabaseAdmin
      .from("incidents")
      .select("id, title, description, severity, status, started_at, resolved_at")
      .gte("started_at", since30d)
      .order("started_at", { ascending: false })
      .limit(50);
    incidents = data || [];
  } catch {
    // incidents テーブルが存在しない場合は空配列
  }

  return NextResponse.json({
    status: overallStatus,
    services,
    incidents,
    timestamp: new Date().toISOString(),
  });
}
