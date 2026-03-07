// app/api/admin/legal/config/route.ts — 利用規約・PP設定管理
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { getLegalConfig, setLegalConfig } from "@/lib/legal/config";

// 設定取得
export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantId(req);
  const config = await getLegalConfig(tenantId ?? undefined);
  return NextResponse.json({ config });
}

// 設定保存
export async function PUT(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantId(req);

  let body: { config: { termsText?: string; privacyText?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.config) {
    return NextResponse.json({ error: "config is required" }, { status: 400 });
  }

  const saved = await setLegalConfig(body.config, tenantId ?? undefined);
  if (!saved) return serverError("保存に失敗しました");
  return NextResponse.json({ ok: true });
}
