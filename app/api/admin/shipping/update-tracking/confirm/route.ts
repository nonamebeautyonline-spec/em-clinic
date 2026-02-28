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

    // バリデーション済みエントリを抽出
    const validEntries = entries.filter((e: TrackingEntry) => {
      if (!e.payment_id || !e.tracking_number) {
        errors.push(`${e.payment_id || "unknown"}: Payment IDまたは追跡番号が空です`);
        return false;
      }
      return true;
    });

    // 10件ずつ並列バッチで追跡番号を付与
    const BATCH_SIZE = 10;
    for (let i = 0; i < validEntries.length; i += BATCH_SIZE) {
      const batch = validEntries.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (entry: TrackingEntry) => {
          const { payment_id, tracking_number } = entry;
          try {
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
              return;
            }

            if (!data || data.length === 0) {
              const { data: existing } = await withTenant(
                supabase.from("orders").select("id, shipping_status").eq("id", payment_id),
                tenantId
              );
              if (existing && existing.length > 0 && existing[0].shipping_status === "shipped") {
                console.log(`[UpdateTrackingConfirm] ⏭ ${payment_id} は既に発送済み（スキップ）`);
                successUpdates.push(payment_id);
                return;
              }
              console.warn(`[UpdateTrackingConfirm] No order found for ${payment_id}`);
              errors.push(`${payment_id}: 注文が見つかりません`);
              return;
            }

            successUpdates.push(payment_id);

            if (data[0]?.patient_id) {
              patientIds.push(data[0].patient_id);
            }

            console.log(`[UpdateTrackingConfirm] ✅ Updated ${payment_id} with tracking ${tracking_number}`);

            // ★ 合箱対応: 同一出荷バッチの兄弟注文も自動更新
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
        })
      );
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
