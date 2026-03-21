// 購入画面設定管理API（管理者用）
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getPurchaseConfig, setPurchaseConfig } from "@/lib/purchase/config";
import { getAllProducts } from "@/lib/products";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { purchaseSettingsSchema } from "@/lib/validations/admin-operations";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const tid = tenantId ?? undefined;

  // 設定・商品・カテゴリを並列取得
  const [config, products, categoriesResult] = await Promise.all([
    getPurchaseConfig(tid),
    getAllProducts(tid),
    strictWithTenant(
      supabaseAdmin
        .from("product_categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      tenantId,
    ),
  ]);

  return NextResponse.json({
    config,
    products,
    categories: categoriesResult.data ?? [],
  });
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
