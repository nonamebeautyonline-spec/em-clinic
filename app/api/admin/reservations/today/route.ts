import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 今日の日付範囲を計算（JST）
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNowMs = now.getTime() + jstOffset;
    const jstNow = new Date(jstNowMs);

    const year = jstNow.getUTCFullYear();
    const month = jstNow.getUTCMonth();
    const date = jstNow.getUTCDate();

    const startOfDay = new Date(Date.UTC(year, month, date, 0, 0, 0) - jstOffset);
    const endOfDay = new Date(Date.UTC(year, month, date + 1, 0, 0, 0) - jstOffset);

    // 本日の予約を取得
    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("*")
      .gte("reserved_time", startOfDay.toISOString())
      .lt("reserved_time", endOfDay.toISOString())
      .order("reserved_time", { ascending: true });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
