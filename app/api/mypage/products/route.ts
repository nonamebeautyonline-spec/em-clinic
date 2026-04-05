// app/api/mypage/products/route.ts — 患者向け商品一覧API
// ?fieldId=xxx で分野別商品のみ返す（マルチ分野モード時）
import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/products";
import { resolveTenantId } from "@/lib/tenant";
import { isMultiFieldEnabled } from "@/lib/medical-fields";
import { getActiveCampaigns, applyCampaignPrice } from "@/lib/pricing";

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

  // キャンペーン情報を取得
  const campaigns = tenantId ? await getActiveCampaigns(tenantId) : [];

  // 患者向けに必要なフィールドのみ返す（キャンペーン割引適用後の価格含む）
  const items = filtered.map((p) => {
    const { effectivePrice, campaign } = applyCampaignPrice(
      { id: p.id, price: p.price, discount_price: p.discount_price ?? null, discount_until: p.discount_until ?? null, category: p.category },
      campaigns,
    );
    return {
      code: p.code,
      title: p.title,
      drug_name: p.drug_name,
      dosage: p.dosage,
      duration_months: p.duration_months,
      quantity: p.quantity,
      price: p.price,
      discount_price: p.discount_price,
      discount_until: p.discount_until,
      field_id: p.field_id,
      category: p.category,
      cool_type: p.cool_type,
      shipping_delay_days: p.shipping_delay_days,
      campaign_price: campaign ? effectivePrice : null,
      campaign_name: campaign?.name || null,
      campaign_remaining: campaign?.max_uses != null ? Math.max(0, campaign.max_uses - ((campaign as { used_count?: number }).used_count || 0)) : null,
    };
  });

  return NextResponse.json({ products: items });
}
