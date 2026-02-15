import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

export const dynamic = "force-dynamic";

// LINE APIからリッチメニュー画像をプロキシ
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const LINE_ACCESS_TOKEN = await getSettingOrEnv("line", "channel_access_token", "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN", tenantId ?? undefined) || "";

  const menuId = new URL(req.url).searchParams.get("menu_id");
  if (!menuId || !LINE_ACCESS_TOKEN) {
    return new NextResponse(null, { status: 404 });
  }

  const res = await fetch(`https://api-data.line.me/v2/bot/richmenu/${menuId}/content`, {
    headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return new NextResponse(null, { status: 404 });
  }

  const contentType = res.headers.get("content-type") || "image/png";
  const body = await res.arrayBuffer();

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
