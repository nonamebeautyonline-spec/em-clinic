// app/api/admin/setup-status/route.ts — テナント初期セットアップ完了状態API
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const authed = await verifyAdminAuth(req);
  if (!authed)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  // LINE Messaging API 設定確認
  const lineToken = await getSettingOrEnv(
    "line",
    "channel_access_token",
    "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN",
    tenantId ?? undefined,
  );

  const lineConfigured = !!lineToken;

  return NextResponse.json({
    ok: true,
    setupComplete: lineConfigured,
    steps: {
      line: lineConfigured,
    },
  });
}
