// app/api/mypage/products/route.ts — 患者向け商品一覧API
import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/products";
import { resolveTenantId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);

  const products = await getProducts(tenantId ?? undefined);

  // 患者向けに必要なフィールドのみ返す
  const items = products.map((p) => ({
    code: p.code,
    title: p.title,
    dosage: p.dosage,
    duration_months: p.duration_months,
    quantity: p.quantity,
    price: p.price,
    discount_price: p.discount_price,
    discount_until: p.discount_until,
  }));

  return NextResponse.json({ products: items });
}
