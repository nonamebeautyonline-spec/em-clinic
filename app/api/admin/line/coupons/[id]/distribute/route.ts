// app/api/admin/line/coupons/[id]/distribute/route.ts — クーポン配布
import { NextRequest, NextResponse } from "next/server";
import { notFound, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { resolveTargets } from "@/app/api/admin/line/broadcast/route";
import { parseBody } from "@/lib/validations/helpers";
import { distributeCouponSchema } from "@/lib/validations/line-management";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { id: couponId } = await params;
  const parsed = await parseBody(req, distributeCouponSchema);
  if ("error" in parsed) return parsed.error;
  const { filter_rules, message } = parsed.data;

  // クーポン取得
  const { data: coupon, error: couponErr } = await withTenant(
    supabaseAdmin.from("coupons").select("*").eq("id", parseInt(couponId)).single(),
    tenantId
  );

  if (couponErr || !coupon) {
    return notFound("クーポンが見つかりません");
  }

  // 対象者の解決
  const targets = await resolveTargets(filter_rules || {}, tenantId);
  const withLineId = targets.filter(t => t.line_id);

  if (withLineId.length === 0) {
    return NextResponse.json({ ok: true, distributed: 0, message: "対象者がいません" });
  }

  let distributed = 0;
  let sent = 0;

  for (const target of withLineId) {
    // 既に配布済みかチェック
    const { data: existing } = await withTenant(
      supabaseAdmin.from("coupon_issues")
        .select("id")
        .eq("coupon_id", coupon.id)
        .eq("patient_id", target.patient_id)
        .eq("status", "issued")
        .limit(1),
      tenantId
    );

    if (existing && existing.length > 0) continue;

    // coupon_issues に記録
    await supabaseAdmin.from("coupon_issues").insert({
      ...tenantPayload(tenantId),
      coupon_id: coupon.id,
      patient_id: target.patient_id,
      status: "issued",
    });
    distributed++;

    // LINE通知
    if (target.line_id) {
      const discountText = coupon.discount_type === "percent"
        ? `${coupon.discount_value}%OFF`
        : `¥${coupon.discount_value.toLocaleString()}OFF`;

      const defaultMsg = `クーポンをお届けします🎫\n\n【${coupon.name}】\n${discountText}\nコード: ${coupon.code}\n${coupon.valid_until ? `有効期限: ${new Date(coupon.valid_until).toLocaleDateString("ja-JP")}` : ""}`;

      try {
        const pushRes = await pushMessage(target.line_id, [{
          type: "text",
          text: message || defaultMsg,
        }], tenantId ?? undefined);

        if (pushRes?.ok) {
          sent++;
          await supabaseAdmin.from("message_log").insert({
            ...tenantPayload(tenantId),
            patient_id: target.patient_id,
            line_uid: target.line_id,
            direction: "outgoing",
            event_type: "message",
            message_type: "text",
            content: message || defaultMsg,
            status: "sent",
          });
        }
      } catch (err) {
        console.error(`[coupon/distribute] push error for ${target.patient_id}:`, err);
      }
    }
  }

  return NextResponse.json({ ok: true, distributed, sent, total: withLineId.length });
}
