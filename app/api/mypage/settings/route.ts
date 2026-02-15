// マイページ設定（公開API、認証不要）
import { NextResponse } from "next/server";
import { getMypageConfig } from "@/lib/mypage/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getMypageConfig();
  return NextResponse.json(
    { config },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
