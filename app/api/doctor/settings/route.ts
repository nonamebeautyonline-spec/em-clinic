// app/api/doctor/settings/route.ts — Doctor用設定取得API（読み取り専用）
import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "@/lib/api-error";
import { verifyDoctorAuth } from "@/lib/admin-auth";
import { getSettingsBulk, type SettingCategory } from "@/lib/settings";
import { resolveTenantId } from "@/lib/tenant";

// Doctor画面で必要なカテゴリのみ許可
const ALLOWED_CATEGORIES: Set<SettingCategory> = new Set(["consultation"]);

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyDoctorAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as SettingCategory | null;

  if (!category || !ALLOWED_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "無効なカテゴリです" }, { status: 400 });
  }

  const bulk = await getSettingsBulk([category], tenantId ?? undefined);
  const flat: Record<string, string> = {};
  for (const [k, v] of bulk) {
    const key = k.split(":")[1]; // "consultation:line_call_url" → "line_call_url"
    flat[key] = v;
  }
  return NextResponse.json({ settings: flat });
}
