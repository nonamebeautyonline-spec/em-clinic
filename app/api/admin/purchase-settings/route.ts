// 購入画面設定管理API（管理者用）
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getPurchaseConfig, setPurchaseConfig } from "@/lib/purchase/config";
import { getAllProducts } from "@/lib/products";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { purchaseSettingsSchema } from "@/lib/validations/admin-operations";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const tid = tenantId ?? undefined;
  const [config, products] = await Promise.all([
    getPurchaseConfig(tid),
    getAllProducts(tid),
  ]);
  return NextResponse.json({ config, products });
}

export async function PUT(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, purchaseSettingsSchema);
  if ("error" in parsed) return parsed.error;
  const { config } = parsed.data;

  const saved = await setPurchaseConfig(config, tenantId ?? undefined);
  if (!saved) return serverError("保存に失敗しました");
  logAudit(req, "purchase_settings.update", "settings", "settings");
  return NextResponse.json({ ok: true });
}
