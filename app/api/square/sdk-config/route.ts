// app/api/square/sdk-config/route.ts — フロント用 Square SDK 設定取得
import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";
import { resolveTenantId } from "@/lib/tenant";
import { getActiveSquareAccount } from "@/lib/square-account-server";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  const tid = tenantId ?? undefined;

  const checkoutMode = await getSetting("payment", "checkout_mode", tid) || "hosted";
  if (checkoutMode !== "inline") {
    return NextResponse.json({ enabled: false });
  }

  const provider = await getSetting("payment", "provider", tid) || "square";
  if (provider !== "square") {
    return NextResponse.json({ enabled: false });
  }

  // アクティブなSquareアカウントから設定を取得（新accounts形式→旧個別キー→env vars のフォールバック）
  const config = await getActiveSquareAccount(tid);

  if (!config?.applicationId || !config?.locationId) {
    return NextResponse.json({ enabled: false });
  }

  return NextResponse.json({
    enabled: true,
    applicationId: config.applicationId,
    locationId: config.locationId,
    environment: config.env || "production",
    threeDsEnabled: config.threeDsEnabled ?? false,
  });
}
