// app/api/payment/sdk-config/route.ts — 汎用SDK設定（プロバイダー自動判定）
import { NextRequest, NextResponse } from "next/server";
import { getSetting, getSettingOrEnv } from "@/lib/settings";
import { resolveTenantId } from "@/lib/tenant";
import { getActiveSquareAccount } from "@/lib/square-account-server";
import { getBusinessRules } from "@/lib/business-rules";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  const tid = tenantId ?? undefined;

  const provider = await getSetting("payment", "provider", tid) || "square";
  const rules = await getBusinessRules(tid);

  // GMO プロバイダー
  if (provider === "gmo") {
    const checkoutMode = await getSetting("payment", "checkout_mode", tid) || "hosted";
    if (checkoutMode !== "inline") {
      return NextResponse.json({ enabled: false, provider: "gmo" });
    }

    const shopId = await getSettingOrEnv("gmo", "shop_id", "GMO_SHOP_ID", tid);
    const env = await getSettingOrEnv("gmo", "env", "GMO_ENV", tid) || "production";

    if (!shopId) {
      return NextResponse.json({ enabled: false, provider: "gmo" });
    }

    return NextResponse.json({
      enabled: true,
      provider: "gmo",
      shopId,
      environment: env,
      showCoupon: rules.showCoupon,
    });
  }

  // Square プロバイダー（既存ロジック）
  const checkoutMode = await getSetting("payment", "checkout_mode", tid) || "hosted";
  if (checkoutMode !== "inline") {
    return NextResponse.json({ enabled: false, provider: "square" });
  }

  const config = await getActiveSquareAccount(tid);
  if (!config?.applicationId || !config?.locationId) {
    return NextResponse.json({ enabled: false, provider: "square" });
  }

  return NextResponse.json({
    enabled: true,
    provider: "square",
    applicationId: config.applicationId,
    locationId: config.locationId,
    environment: config.env || "production",
    threeDsEnabled: config.threeDsEnabled ?? false,
    showCoupon: rules.showCoupon,
  });
}
