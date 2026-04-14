import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(req);

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
    const { data: reservations, error } = await strictWithTenant(
      supabaseAdmin
        .from("reservations")
        .select("*")
        .gte("reserved_time", startOfDay.toISOString())
        .lt("reserved_time", endOfDay.toISOString())
        .order("reserved_time", { ascending: true }),
      tenantId
    );

    if (error) {
      console.error("Supabase error:", error);
      return serverError("Database error");
    }

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error("API error:", error);
    return serverError("Server error");
  }
}
