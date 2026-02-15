import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

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

    const body = await req.json();
    const { entries } = body as { entries: TrackingEntry[] };

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: "Entries data is required" }, { status: 400 });
    }

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
        const { data, error } = await withTenant(
          supabase.from("orders").update({
            tracking_number: tracking_number,
            shipping_status: "shipped",
            shipping_date: today,
            updated_at: new Date().toISOString(),
          }).eq("id", payment_id).select("id, patient_id"),
          tenantId
        );

        if (error) {
          console.error(`[UpdateTrackingConfirm] Error updating ${payment_id}:`, error);
          errors.push(`${payment_id}: ${error.message}`);
          continue;
        }

        if (!data || data.length === 0) {
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
