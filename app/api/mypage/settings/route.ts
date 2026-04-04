// マイページ設定（公開API、認証不要）
import { NextRequest, NextResponse } from "next/server";
import { getMypageConfig } from "@/lib/mypage/config";
import { getSetting } from "@/lib/settings";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { getShippingConfig } from "@/lib/shipping/config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantIdOrThrow(req);
  const tid = tenantId ?? undefined;
  const [config, reorderRequiresReservation, shippingConfig] = await Promise.all([
    getMypageConfig(tid),
    getSetting("consultation", "reorder_requires_reservation", tid),
    getShippingConfig(tid),
  ]);
  return NextResponse.json(
    {
      config,
      consultation: { reorderRequiresReservation: reorderRequiresReservation === "true" },
      shippingOptions: shippingConfig.options,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
