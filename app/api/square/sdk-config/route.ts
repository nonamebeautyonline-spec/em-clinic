// app/api/square/sdk-config/route.ts — フロント用 Square SDK 設定取得
import { NextRequest, NextResponse } from "next/server";
import { getSettingsBulk } from "@/lib/settings";
import { resolveTenantId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  const tid = tenantId ?? undefined;

  // 1クエリで全設定を取得（5回→1回）
  const settings = await getSettingsBulk(["payment", "square"], tid);

  const checkoutMode = settings.get("payment:checkout_mode") || "hosted";
  if (checkoutMode !== "inline") {
    return NextResponse.json({ enabled: false });
  }

  const provider = settings.get("payment:provider") || "square";
  if (provider !== "square") {
    return NextResponse.json({ enabled: false });
  }

  const applicationId = settings.get("square:application_id") || process.env.SQUARE_APPLICATION_ID;
  const locationId = settings.get("square:location_id") || process.env.SQUARE_LOCATION_ID;
  const env = settings.get("square:env") || process.env.SQUARE_ENV || "production";

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
