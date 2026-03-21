// app/api/mypage/products/route.ts — 患者向け商品一覧API
// ?fieldId=xxx で分野別商品のみ返す（マルチ分野モード時）
import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/products";
import { resolveTenantId } from "@/lib/tenant";
import { isMultiFieldEnabled } from "@/lib/medical-fields";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const fieldId = searchParams.get("fieldId");

  const products = await getProducts(tenantId ?? undefined);

  // マルチ分野モードかつfieldId指定時は分野フィルタ
  const multiField = tenantId ? await isMultiFieldEnabled(tenantId) : false;
  const filtered = (multiField && fieldId)
    ? products.filter((p) => p.field_id === fieldId)
    : products;

  // 患者向けに必要なフィールドのみ返す
  const items = filtered.map((p) => ({
    code: p.code,
    title: p.title,
    dosage: p.dosage,
    duration_months: p.duration_months,
    quantity: p.quantity,
    price: p.price,
    discount_price: p.discount_price,
    discount_until: p.discount_until,
    field_id: p.field_id,
  }));

  return NextResponse.json({ products: items });
}
