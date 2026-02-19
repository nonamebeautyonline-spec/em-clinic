// app/api/admin/line/column-settings/route.ts — 右カラム表示設定
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSetting, setSetting } from "@/lib/settings";
import { resolveTenantId } from "@/lib/tenant";

// 表示設定取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const raw = await getSetting("line", "right_column_sections", tenantId ?? undefined);
  let sections: Record<string, boolean> = {};
  if (raw) {
    try { sections = JSON.parse(raw); } catch { /* デフォルト空 */ }
  }
  return NextResponse.json({ sections });
}

// 表示設定保存
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { sections } = await req.json();
  if (typeof sections !== "object" || sections === null) {
    return NextResponse.json({ error: "sections は必須です" }, { status: 400 });
  }

  const ok = await setSetting("line", "right_column_sections", JSON.stringify(sections), tenantId ?? undefined);
  if (!ok) return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
