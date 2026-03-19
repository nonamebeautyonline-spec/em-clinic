// app/api/admin/setup-status/route.ts — テナント初期セットアップ完了状態API
import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
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
    query = strictWithTenant(query, tenantId);
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
    return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  // 0. 基本情報（クリニック名）設定確認
  const clinicName = await getSettingOrEnv(
    "general",
    "clinic_name",
    "CLINIC_NAME",
    tenantId ?? undefined,
  );
  const generalConfigured = !!clinicName;

  // 1. LINE Messaging API 設定確認
  const lineToken = await getSettingOrEnv(
    "line",
    "channel_access_token",
    "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN",
    tenantId ?? undefined,
  );
  const lineConfigured = !!lineToken;

  // 2. 決済設定: Square or GMO が設定済みか（DB設定 or 環境変数フォールバック）
  const squareToken = await getSettingOrEnv(
    "square",
    "access_token",
    "SQUARE_ACCESS_TOKEN",
    tenantId ?? undefined,
  );
  const gmoShopId = await getSettingOrEnv(
    "gmo",
    "shop_id",
    "GMO_SHOP_ID",
    tenantId ?? undefined,
  );
  const paymentProvider = await hasSettingsForCategory("payment", tenantId);
  const paymentConfigured = !!squareToken || !!gmoShopId || paymentProvider;

  // 3. 商品登録: productsテーブルに1件以上あるか
  const productsRegistered = await tableHasData("products", tenantId);

  // 4. 予約スロット設定: doctor_weekly_rulesテーブルにデータがあるか
  const scheduleConfigured = await tableHasData("doctor_weekly_rules", tenantId);

  // 5. スタッフ追加: tenant_membersテーブルに2人以上いるか
  const staffAdded = await tableHasData("tenant_members", tenantId, 2);

  // 6. リッチメニュー設定: rich_menusテーブルにデータがあるか
  const richMenuConfigured = await tableHasData("rich_menus", tenantId);

  // 7. 診察設定: 診察モードが設定されているか
  const consultationMode = await getSettingOrEnv(
    "consultation",
    "mode",
    "CONSULTATION_MODE",
    tenantId ?? undefined,
  );
  const consultationConfigured = !!consultationMode;

  const steps = {
    general: generalConfigured,
    line: lineConfigured,
    payment: paymentConfigured,
    products: productsRegistered,
    schedule: scheduleConfigured,
    consultation: consultationConfigured,
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
