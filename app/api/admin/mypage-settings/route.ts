// マイページ設定管理API（管理者用）
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getMypageConfig, setMypageConfig } from "@/lib/mypage/config";

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getMypageConfig();
  return NextResponse.json({ config });
}

export async function PUT(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { config } = await req.json();
  if (!config || typeof config !== "object") {
    return NextResponse.json({ error: "configは必須です" }, { status: 400 });
  }

  const saved = await setMypageConfig(config);
  if (!saved) return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
