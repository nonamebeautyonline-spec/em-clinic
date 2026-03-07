// app/api/legal/config/route.ts — 利用規約・PP公開取得（予約ページ用）
import { NextRequest, NextResponse } from "next/server";
import { resolveTenantId } from "@/lib/tenant";
import { getLegalConfig } from "@/lib/legal/config";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  const config = await getLegalConfig(tenantId ?? undefined);
  return NextResponse.json(config, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
