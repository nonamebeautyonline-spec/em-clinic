// app/api/health/route.ts
// ヘルスチェックAPI（UptimeRobot等の死活監視用）
// 正常時: 200 / 異常時: 503

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CheckResult {
  status: "ok" | "error";
  latencyMs?: number;
  error?: string;
}

export async function GET() {
  const checks: Record<string, CheckResult> = {};

  // Supabase 接続チェック
  const dbStart = Date.now();
  try {
    const { error } = await supabaseAdmin
      .from("intake")
      .select("id")
      .limit(1);

    if (error) {
      checks.supabase = { status: "error", error: error.message };
    } else {
      checks.supabase = { status: "ok", latencyMs: Date.now() - dbStart };
    }
  } catch (e: unknown) {
    checks.supabase = {
      status: "error",
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // Redis 接続チェック
  const redisStart = Date.now();
  try {
    await redis.ping();
    checks.redis = { status: "ok", latencyMs: Date.now() - redisStart };
  } catch (e: unknown) {
    checks.redis = {
      status: "error",
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok");

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 },
  );
}
