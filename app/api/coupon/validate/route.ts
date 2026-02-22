// app/api/coupon/validate/route.ts — クーポン検証（患者側）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { couponValidateSchema } from "@/lib/validations/coupon";

export async function POST(req: NextRequest) {
  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, couponValidateSchema);
  if ("error" in parsed) return parsed.error;
  const { code, patient_id } = parsed.data;

  // クーポン検索
  const { data: coupon } = await withTenant(
    supabaseAdmin.from("coupons")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .eq("is_active", true)
      .single(),
    tenantId
  );

  if (!coupon) {
    return NextResponse.json({ valid: false, error: "無効なクーポンコードです" });
  }

  // 有効期限チェック
  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return NextResponse.json({ valid: false, error: "このクーポンはまだ有効期間前です" });
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return NextResponse.json({ valid: false, error: "このクーポンは有効期限切れです" });
  }

  // 全体利用上限チェック
  if (coupon.max_uses) {
    const { count } = await withTenant(
      supabaseAdmin.from("coupon_issues")
        .select("*", { count: "exact", head: true })
        .eq("coupon_id", coupon.id)
        .eq("status", "used"),
      tenantId
    );
    if ((count || 0) >= coupon.max_uses) {
      return NextResponse.json({ valid: false, error: "このクーポンは利用上限に達しています" });
    }
  }

  // 患者別利用上限チェック
  if (patient_id && coupon.max_uses_per_patient) {
    const { count } = await withTenant(
      supabaseAdmin.from("coupon_issues")
        .select("*", { count: "exact", head: true })
        .eq("coupon_id", coupon.id)
        .eq("patient_id", patient_id)
        .eq("status", "used"),
      tenantId
    );
    if ((count || 0) >= coupon.max_uses_per_patient) {
      return NextResponse.json({ valid: false, error: "このクーポンは既にご利用済みです" });
    }
  }

  return NextResponse.json({
    valid: true,
    coupon: {
      id: coupon.id,
      name: coupon.name,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_purchase: coupon.min_purchase,
    },
  });
}
