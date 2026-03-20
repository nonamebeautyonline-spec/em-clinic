import { NextRequest, NextResponse } from "next/server";
import { notFound, serverError, unauthorized } from "@/lib/api-error";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { nonameMasterUpdateTrackingSchema } from "@/lib/validations/shipping";
import { logAudit } from "@/lib/audit";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(req);

    const parsed = await parseBody(req, nonameMasterUpdateTrackingSchema);
    if ("error" in parsed) return parsed.error;
    const { order_id, tracking_number, update_only, shipping_date: customShippingDate } = parsed.data;

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    // カスタム発送日が指定されていればそれを使用、なければ本日
    const effectiveShippingDate = customShippingDate || today;

    // update_only: trueの場合は追跡番号のみ更新（shipping_dateは変更しない）
    const updateData = update_only
      ? {
          tracking_number: tracking_number.trim(),
          updated_at: new Date().toISOString(),
        }
      : {
          tracking_number: tracking_number.trim(),
          shipping_status: "shipped",
          shipping_date: effectiveShippingDate,
          updated_at: new Date().toISOString(),
        };

    // 注文を更新
    const { data, error } = await strictWithTenant(
      supabase
        .from("orders")
        .update(updateData)
        .eq("id", order_id)
        .select("id, patient_id, tracking_number, shipping_date"),
      tenantId
    );

    if (error) {
      console.error("[UpdateTracking] Error:", error);
      return serverError(error.message);
    }

    if (!data || data.length === 0) {
      return notFound("Order not found");
    }

    console.log(`[UpdateTracking] ✅ Updated order ${order_id} with tracking ${tracking_number}`);

    // キャッシュ無効化
    if (data[0]?.patient_id) {
      const invalidateUrl = `${req.nextUrl.origin}/api/admin/invalidate-cache`;
      fetch(invalidateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        body: JSON.stringify({ patient_id: data[0].patient_id }),
      }).catch((err) => {
        console.error("[UpdateTracking] Cache invalidation failed:", err);
      });
    }

    logAudit(req, "tracking.update", "order", String(order_id));
    return NextResponse.json({
      success: true,
      order: data[0],
    });
  } catch (error) {
    console.error("[UpdateTracking] API error:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
