// app/api/coupon/redeem/route.ts — クーポン利用記録（決済時内部呼び出し）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  const body = await req.json();
  const { coupon_id, patient_id, order_id } = body;

  if (!coupon_id || !patient_id) {
    return NextResponse.json({ ok: false, error: "coupon_id と patient_id は必須です" }, { status: 400 });
  }

  // 配布済み（issued）レコードがあれば used に更新
  const { data: issue } = await withTenant(
    supabaseAdmin.from("coupon_issues")
      .select("id")
      .eq("coupon_id", coupon_id)
      .eq("patient_id", patient_id)
      .eq("status", "issued")
      .limit(1)
      .maybeSingle(),
    tenantId
  );

  if (issue) {
    // 既存の配布レコードを更新
    await supabaseAdmin.from("coupon_issues").update({
      status: "used",
      used_at: new Date().toISOString(),
      order_id: order_id || null,
    }).eq("id", issue.id);
  } else {
    // 配布レコードがない場合は直接利用として記録
    await supabaseAdmin.from("coupon_issues").insert({
      ...tenantPayload(tenantId),
      coupon_id,
      patient_id,
      status: "used",
      used_at: new Date().toISOString(),
      order_id: order_id || null,
    });
  }

  return NextResponse.json({ ok: true });
}
