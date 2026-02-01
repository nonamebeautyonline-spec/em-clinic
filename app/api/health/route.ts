// app/api/health/route.ts
// 環境変数とSupabase接続をチェックするヘルスチェックAPI

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const health = {
    timestamp: new Date().toISOString(),
    env: {
      supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + "..." : "❌ MISSING",
      supabaseAnonKey: supabaseAnonKey ? supabaseAnonKey.substring(0, 15) + "..." : "❌ MISSING",
    },
    supabase: {
      connection: "未テスト",
      error: null as string | null,
    },
  };

  // Supabase接続テスト
  try {
    const { data, error } = await supabase
      .from("intake")
      .select("patient_id")
      .limit(1);

    if (error) {
      health.supabase.connection = "❌ エラー";
      health.supabase.error = error.message;
    } else {
      health.supabase.connection = "✅ 成功";
    }
  } catch (e: any) {
    health.supabase.connection = "❌ 例外";
    health.supabase.error = e.message || String(e);
  }

  return NextResponse.json(health, { status: 200 });
}
