// app/api/admin/setup-status/route.ts — テナント初期セットアップ完了状態API
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { supabaseAdmin } from "@/lib/supabase";

/** テーブルにデータが存在するかを安全にチェック（テーブルが存在しない場合はfalse） */
async function tableHasData(
  tableName: string,
  tenantId: string | null,
  minCount = 1
): Promise<boolean> {
  try {
    let query = supabaseAdmin
      .from(tableName)
      .select("id", { count: "exact", head: true });
    query = withTenant(query, tenantId);
    const { count, error } = await query;
    if (error) return false;
    return (count || 0) >= minCount;
  } catch {
    return false;
  }
}

/** tenant_settings の特定カテゴリにデータがあるかチェック */
async function hasSettingsForCategory(
  category: string,
  tenantId: string | null
): Promise<boolean> {
  try {
    let query = supabaseAdmin
      .from("tenant_settings")
      .select("id", { count: "exact", head: true })
      .eq("category", category);
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }
    const { count, error } = await query;
    if (error) return false;
    return (count || 0) > 0;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const authed = await verifyAdminAuth(req);
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  // 1. LINE Messaging API 設定確認
  const lineToken = await getSettingOrEnv(
    "line",
    "channel_access_token",
    "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN",
    tenantId ?? undefined,
  );
  const lineConfigured = !!lineToken;

  // 2. 決済設定: tenant_settingsのcategory='payment'にデータがあるか
  const paymentConfigured = await hasSettingsForCategory("payment", tenantId);

  // 3. 商品登録: productsテーブルに1件以上あるか
  const productsRegistered = await tableHasData("products", tenantId);

  // 4. 予約スロット設定: doctor_weekly_rulesテーブルにデータがあるか
  const scheduleConfigured = await tableHasData("doctor_weekly_rules", tenantId);

  // 5. スタッフ追加: tenant_membersテーブルに2人以上いるか
  const staffAdded = await tableHasData("tenant_members", tenantId, 2);

  // 6. リッチメニュー設定: rich_menusテーブルにデータがあるか
  const richMenuConfigured = await tableHasData("rich_menus", tenantId);

  const steps = {
    line: lineConfigured,
    payment: paymentConfigured,
    products: productsRegistered,
    schedule: scheduleConfigured,
    staff: staffAdded,
    richMenu: richMenuConfigured,
  };

  // 全ステップ完了かどうか
  const setupComplete = Object.values(steps).every(Boolean);

  return NextResponse.json({
    ok: true,
    setupComplete,
    completedCount: Object.values(steps).filter(Boolean).length,
    totalCount: Object.keys(steps).length,
    steps,
  });
}
