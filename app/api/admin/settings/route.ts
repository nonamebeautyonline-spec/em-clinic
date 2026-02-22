// app/api/admin/settings/route.ts — テナント設定 API
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSetting, setSetting, getSettingsByCategory, type SettingCategory } from "@/lib/settings";
import { maskValue } from "@/lib/crypto";
import { resolveTenantId } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { settingsUpdateSchema } from "@/lib/validations/admin-operations";

// 管理可能な設定キーの定義
const SETTING_DEFINITIONS: Record<SettingCategory, { key: string; label: string; envFallback?: string }[]> = {
  square: [
    { key: "access_token", label: "Access Token", envFallback: "SQUARE_ACCESS_TOKEN" },
    { key: "location_id", label: "Location ID", envFallback: "SQUARE_LOCATION_ID" },
    { key: "webhook_signature_key", label: "Webhook Signature Key", envFallback: "SQUARE_WEBHOOK_SIGNATURE_KEY" },
    { key: "env", label: "環境 (sandbox / production)", envFallback: "SQUARE_ENV" },
  ],
  gmo: [
    { key: "shop_id", label: "ショップID", envFallback: "GMO_SHOP_ID" },
    { key: "shop_pass", label: "ショップパスワード", envFallback: "GMO_SHOP_PASS" },
    { key: "site_id", label: "サイトID", envFallback: "GMO_SITE_ID" },
    { key: "site_pass", label: "サイトパスワード", envFallback: "GMO_SITE_PASS" },
    { key: "env", label: "環境 (sandbox / production)", envFallback: "GMO_ENV" },
  ],
  line: [
    { key: "channel_id", label: "Channel ID (OAuth)", envFallback: "LINE_CHANNEL_ID" },
    { key: "channel_secret", label: "Channel Secret (OAuth)", envFallback: "LINE_CHANNEL_SECRET" },
    { key: "channel_access_token", label: "MAPI Channel Access Token", envFallback: "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN" },
    { key: "notify_channel_secret", label: "通知Bot Channel Secret", envFallback: "LINE_NOTIFY_CHANNEL_SECRET" },
    { key: "notify_channel_access_token", label: "通知Bot Channel Access Token", envFallback: "LINE_NOTIFY_CHANNEL_ACCESS_TOKEN" },
    { key: "admin_group_id", label: "管理グループID", envFallback: "LINE_ADMIN_GROUP_ID" },
    { key: "redirect_uri", label: "OAuth Redirect URI", envFallback: "LINE_REDIRECT_URI" },
  ],
  gas: [],
  general: [
    { key: "clinic_name", label: "クリニック名" },
    { key: "app_base_url", label: "App Base URL", envFallback: "APP_BASE_URL" },
  ],
  payment: [
    { key: "provider", label: "決済プロバイダー" },
  ],
  mypage: [
    { key: "config", label: "マイページ設定（JSON）" },
  ],
  flex: [
    { key: "config", label: "FLEX通知設定（JSON）" },
  ],
  sms: [
    { key: "account_sid", label: "Twilio Account SID", envFallback: "TWILIO_ACCOUNT_SID" },
    { key: "auth_token", label: "Twilio Auth Token", envFallback: "TWILIO_AUTH_TOKEN" },
    { key: "verify_sid", label: "Twilio Verify SID", envFallback: "TWILIO_VERIFY_SID" },
  ],
};

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as SettingCategory | null;

  const result: Record<string, { key: string; label: string; maskedValue: string | null; source: "db" | "env" | "none" }[]> = {};

  const categories = category ? [category] : (Object.keys(SETTING_DEFINITIONS) as SettingCategory[]);

  for (const cat of categories) {
    const defs = SETTING_DEFINITIONS[cat] || [];
    const entries = [];

    for (const def of defs) {
      const dbValue = await getSetting(cat, def.key, tenantId ?? undefined);
      if (dbValue) {
        entries.push({
          key: def.key,
          label: def.label,
          maskedValue: maskValue(dbValue),
          source: "db" as const,
        });
      } else if (def.envFallback && process.env[def.envFallback]) {
        entries.push({
          key: def.key,
          label: def.label,
          maskedValue: maskValue(process.env[def.envFallback]!),
          source: "env" as const,
        });
      } else {
        entries.push({
          key: def.key,
          label: def.label,
          maskedValue: null,
          source: "none" as const,
        });
      }
    }

    result[cat] = entries;
  }

  return NextResponse.json({ settings: result, definitions: SETTING_DEFINITIONS });
}

export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);
  const parsed = await parseBody(req, settingsUpdateSchema);
  if ("error" in parsed) return parsed.error;
  const { category, key, value } = parsed.data as { category: SettingCategory; key: string; value: string };

  // 設定キーがホワイトリストに含まれるか確認
  const defs = SETTING_DEFINITIONS[category];
  if (!defs || !defs.find((d) => d.key === key)) {
    return NextResponse.json({ error: "不正な設定キーです" }, { status: 400 });
  }

  const success = await setSetting(category, key, value, tenantId ?? undefined);
  if (!success) {
    return NextResponse.json({ error: "設定の保存に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true, maskedValue: maskValue(value) });
}
