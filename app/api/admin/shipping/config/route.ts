// app/api/admin/shipping/config/route.ts — 配送設定管理
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { getShippingConfig, setShippingConfig } from "@/lib/shipping/config";
import { parseBody } from "@/lib/validations/helpers";
import { shippingConfigPutSchema } from "@/lib/validations/admin-operations";

// 設定取得
export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const config = await getShippingConfig(tenantId ?? undefined);
  return NextResponse.json({ config });
}

// 設定保存
export async function PUT(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, shippingConfigPutSchema);
  if ("error" in parsed) return parsed.error;
  const { config } = parsed.data;

  const saved = await setShippingConfig(config, tenantId ?? undefined);
  if (!saved) return serverError("保存に失敗しました");
  return NextResponse.json({ ok: true });
}
