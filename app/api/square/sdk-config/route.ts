// app/api/square/sdk-config/route.ts — フロント用 Square SDK 設定取得
import { NextRequest, NextResponse } from "next/server";
import { getSettingOrEnv, getSetting } from "@/lib/settings";
import { resolveTenantId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  const tid = tenantId ?? undefined;

  // checkout_mode が inline でなければ無効
  const checkoutMode = (await getSetting("payment", "checkout_mode", tid)) || "hosted";
  if (checkoutMode !== "inline") {
    return NextResponse.json({ enabled: false });
  }

  // プロバイダーが Square でなければ無効
  const provider = (await getSetting("payment", "provider", tid)) || "square";
  if (provider !== "square") {
    return NextResponse.json({ enabled: false });
  }

  const applicationId = await getSettingOrEnv("square", "application_id", "SQUARE_APPLICATION_ID", tid);
  const locationId = await getSettingOrEnv("square", "location_id", "SQUARE_LOCATION_ID", tid);
  const env = (await getSettingOrEnv("square", "env", "SQUARE_ENV", tid)) || "production";

  if (!applicationId || !locationId) {
    return NextResponse.json({ enabled: false });
  }

  return NextResponse.json({
    enabled: true,
    applicationId,
    locationId,
    environment: env,
  });
}
