// app/api/admin/settings/route.ts — テナント設定 API
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSetting, setSetting, getSettingsByCategory, type SettingCategory } from "@/lib/settings";
import { maskValue } from "@/lib/crypto";

// 管理可能な設定キーの定義
const SETTING_DEFINITIONS: Record<SettingCategory, { key: string; label: string; envFallback?: string }[]> = {
  square: [
    { key: "access_token", label: "Access Token", envFallback: "SQUARE_ACCESS_TOKEN" },
    { key: "location_id", label: "Location ID", envFallback: "SQUARE_LOCATION_ID" },
    { key: "webhook_signature_key", label: "Webhook Signature Key", envFallback: "SQUARE_WEBHOOK_SIGNATURE_KEY" },
    { key: "env", label: "環境 (sandbox / production)", envFallback: "SQUARE_ENV" },
  ],
  line: [
    { key: "channel_access_token", label: "Channel Access Token", envFallback: "LINE_CHANNEL_ACCESS_TOKEN" },
    { key: "channel_secret", label: "Channel Secret", envFallback: "LINE_CHANNEL_SECRET" },
  ],
  gas: [
    { key: "reorder_url", label: "GAS Reorder URL", envFallback: "GAS_REORDER_URL" },
    { key: "upsert_url", label: "GAS Upsert URL", envFallback: "GAS_UPSERT_URL" },
  ],
  general: [
    { key: "clinic_name", label: "クリニック名" },
    { key: "app_base_url", label: "App Base URL", envFallback: "APP_BASE_URL" },
  ],
  payment: [
    { key: "provider", label: "決済プロバイダー" },
  ],
};

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as SettingCategory | null;

  const result: Record<string, { key: string; label: string; maskedValue: string | null; source: "db" | "env" | "none" }[]> = {};

  const categories = category ? [category] : (Object.keys(SETTING_DEFINITIONS) as SettingCategory[]);

  for (const cat of categories) {
    const defs = SETTING_DEFINITIONS[cat] || [];
    const entries = [];

    for (const def of defs) {
      const dbValue = await getSetting(cat, def.key);
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

  const body = await req.json();
  const { category, key, value } = body as { category: SettingCategory; key: string; value: string };

  if (!category || !key || value === undefined) {
    return NextResponse.json({ error: "category, key, value は必須です" }, { status: 400 });
  }

  // 設定キーがホワイトリストに含まれるか確認
  const defs = SETTING_DEFINITIONS[category];
  if (!defs || !defs.find((d) => d.key === key)) {
    return NextResponse.json({ error: "不正な設定キーです" }, { status: 400 });
  }

  const success = await setSetting(category, key, value);
  if (!success) {
    return NextResponse.json({ error: "設定の保存に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true, maskedValue: maskValue(value) });
}
