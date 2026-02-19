// マイページ設定（公開API、認証不要）
import { NextRequest, NextResponse } from "next/server";
import { getMypageConfig } from "@/lib/mypage/config";
import { resolveTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  const config = await getMypageConfig(tenantId ?? undefined);
  return NextResponse.json(
    { config },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
