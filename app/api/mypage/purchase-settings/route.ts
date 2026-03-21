// 購入画面設定（患者向け公開API、認証不要）
import { NextRequest, NextResponse } from "next/server";
import { getPurchaseConfig } from "@/lib/purchase/config";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantIdOrThrow(req);
  const config = await getPurchaseConfig(tenantId ?? undefined);
  return NextResponse.json(
    { config },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
