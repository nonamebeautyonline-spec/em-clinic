import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "@/lib/api-error";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET: 翌月予約枠が期限日を過ぎても未開放かチェック
// レスポンス: { alert: boolean }
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  // JSTで現在日時を取得
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);
  const currentDay = jstNow.getUTCDate();

  // 翌月のYYYY-MM
  const nextMonth = jstNow.getUTCMonth() + 2; // 1-indexed
  const nextYear = nextMonth > 12 ? jstNow.getUTCFullYear() + 1 : jstNow.getUTCFullYear();
  const nextMonthStr = `${nextYear}-${String(nextMonth > 12 ? 1 : nextMonth).padStart(2, "0")}`;

  // 予約設定からbooking_open_day（期限日）を取得
  const { data: settingsData } = await withTenant(
    supabaseAdmin.from("reservation_settings").select("booking_open_day"),
    tenantId
  ).single();
  const bookingOpenDay = settingsData?.booking_open_day ?? 5;

  // 期限日を過ぎていなければアラートなし
  if (currentDay < bookingOpenDay) {
    return NextResponse.json({ alert: false });
  }

  // 翌月の開放状態を確認
  const { data: openData } = await withTenant(
    supabaseAdmin
      .from("booking_open_settings")
      .select("is_open")
      .eq("target_month", nextMonthStr),
    tenantId
  ).single();

  const isOpen = openData?.is_open ?? false;

  return NextResponse.json({ alert: !isOpen });
}
