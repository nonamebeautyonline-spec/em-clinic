import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { updateTrackingConfirmSchema } from "@/lib/validations/shipping";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TrackingEntry {
  payment_id: string;
  patient_name: string;
  tracking_number: string;
  matched: boolean;
}

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    const parsed = await parseBody(req, updateTrackingConfirmSchema);
    if ("error" in parsed) return parsed.error;
    const { entries } = parsed.data;

    const successUpdates: string[] = [];
    const errors: string[] = [];
    const patientIds: string[] = [];
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // 各payment_idに対して追跡番号を付与
    for (const entry of entries) {
      const { payment_id, tracking_number } = entry;

      if (!payment_id || !tracking_number) {
        errors.push(`${payment_id || "unknown"}: Payment IDまたは追跡番号が空です`);
        continue;
      }

      try {
        // ガード: shipping_status="pending" の場合のみ更新（二重発送防止）
        const { data, error } = await withTenant(
          supabase.from("orders").update({
            tracking_number: tracking_number,
            shipping_status: "shipped",
            shipping_date: today,
            updated_at: new Date().toISOString(),
          }).eq("id", payment_id).eq("shipping_status", "pending").select("id, patient_id, shipping_list_created_at"),
          tenantId
        );

        if (error) {
          console.error(`[UpdateTrackingConfirm] Error updating ${payment_id}:`, error);
          errors.push(`${payment_id}: ${error.message}`);
          continue;
        }

        if (!data || data.length === 0) {
          // 更新0件: 注文が存在しないか、既に発送済み
          const { data: existing } = await withTenant(
            supabase.from("orders").select("id, shipping_status").eq("id", payment_id),
            tenantId
          );
          if (existing && existing.length > 0 && existing[0].shipping_status === "shipped") {
            // 既に発送済み → 冪等（成功扱い、スキップ）
            console.log(`[UpdateTrackingConfirm] ⏭ ${payment_id} は既に発送済み（スキップ）`);
            successUpdates.push(payment_id);
            continue;
          }
          console.warn(`[UpdateTrackingConfirm] No order found for ${payment_id}`);
          errors.push(`${payment_id}: 注文が見つかりません`);
          continue;
        }

        successUpdates.push(payment_id);

        // patient_idを収集（キャッシュ無効化用）
        if (data[0]?.patient_id) {
          patientIds.push(data[0].patient_id);
        }

        console.log(`[UpdateTrackingConfirm] ✅ Updated ${payment_id} with tracking ${tracking_number}`);

        // ★ 合箱対応: 同一出荷バッチ（shipping_list_created_at）の兄弟注文も自動更新
        if (data[0]?.patient_id && data[0]?.shipping_list_created_at) {
          const { data: siblings } = await withTenant(
            supabase.from("orders").update({
              tracking_number,
              shipping_status: "shipped",
              shipping_date: today,
              updated_at: new Date().toISOString(),
            })
              .eq("patient_id", data[0].patient_id)
              .eq("shipping_list_created_at", data[0].shipping_list_created_at)
              .eq("shipping_status", "pending")
              .select("id"),
            tenantId
          );

          if (siblings && siblings.length > 0) {
            for (const s of siblings) {
              successUpdates.push(s.id);
              console.log(`[UpdateTrackingConfirm] ✅ 合箱兄弟注文も自動更新: ${s.id} with tracking ${tracking_number}`);
            }
          }
        }
      } catch (err) {
        console.error(`[UpdateTrackingConfirm] Exception for ${payment_id}:`, err);
        errors.push(`${payment_id}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    console.log(`[UpdateTrackingConfirm] Complete: ${successUpdates.length} success, ${errors.length} failed`);

    // ★ キャッシュ無効化
    if (patientIds.length > 0) {
      const uniquePatientIds = Array.from(new Set(patientIds));
      console.log(`[UpdateTrackingConfirm] Invalidating cache for ${uniquePatientIds.length} patients`);

      const invalidateUrl = `${req.nextUrl.origin}/api/admin/invalidate-cache`;
      const invalidatePromises = uniquePatientIds.map((patientId) =>
        fetch(invalidateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ADMIN_TOKEN}`,
          },
          body: JSON.stringify({ patient_id: patientId }),
        }).catch((err) => {
          console.error(`[UpdateTrackingConfirm] Cache invalidation failed for ${patientId}:`, err);
        })
      );

      await Promise.allSettled(invalidatePromises);
    }

    return NextResponse.json({
      success: true,
      updated: successUpdates.length,
      failed: errors.length,
      message: `${successUpdates.length}件の追跡番号を更新しました`,
      details: [
        ...successUpdates.map((id) => ({
          payment_id: id,
          success: true,
        })),
        ...errors.map((err) => {
          const [payment_id, ...errorMsgParts] = err.split(": ");
          return {
            payment_id: payment_id || "unknown",
            success: false,
            error: errorMsgParts.join(": "),
          };
        }),
      ],
    });
  } catch (error) {
    console.error("[UpdateTrackingConfirm] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
