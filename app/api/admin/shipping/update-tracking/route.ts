import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { updateTrackingCsvSchema } from "@/lib/validations/shipping";
import { invalidateDashboardCache } from "@/lib/redis";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    const parsed = await parseBody(req, updateTrackingCsvSchema);
    if ("error" in parsed) return parsed.error;
    const { csvContent } = parsed.data;

    // CSVをパース（タブ区切り）
    const lines = csvContent.split("\n").filter((line: string) => line.trim());
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSVが空です" }, { status: 400 });
    }

    // ヘッダー行を解析（タブ区切り）
    const headers = lines[0].split("\t").map((h: string) => h.trim());
    const paymentIdColIndex = headers.indexOf("お客様管理番号");
    const trackingNumberColIndex = headers.indexOf("伝票番号");

    if (paymentIdColIndex === -1 || trackingNumberColIndex === -1) {
      return NextResponse.json(
        { error: "必須カラムが見つかりません（お客様管理番号、伝票番号）" },
        { status: 400 }
      );
    }

    console.log(`[UpdateTracking] Found columns: paymentId=${paymentIdColIndex}, tracking=${trackingNumberColIndex}`);

    const successUpdates: string[] = [];
    const errors: string[] = [];
    const patientIds: string[] = [];
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // CSVの全行をフラットな更新リストに変換
    const updateItems: { paymentId: string; trackingNumber: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const columns = line.split("\t");
      const rawPaymentId = columns[paymentIdColIndex]?.trim();
      const trackingNumber = columns[trackingNumberColIndex]?.trim();

      if (!rawPaymentId || !trackingNumber) {
        console.log(`[UpdateTracking] Row ${i + 1}: Missing data, skipping`);
        continue;
      }

      const paymentIdList = rawPaymentId.split(",").map((id: string) => id.trim()).filter(Boolean);
      for (const paymentId of paymentIdList) {
        updateItems.push({ paymentId, trackingNumber });
      }
    }

    // 10件ずつ並列バッチで更新
    const BATCH_SIZE = 10;
    for (let i = 0; i < updateItems.length; i += BATCH_SIZE) {
      const batch = updateItems.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async ({ paymentId, trackingNumber }) => {
          try {
            const { data, error } = await withTenant(
              supabase
                .from("orders")
                .update({
                  tracking_number: trackingNumber,
                  shipping_status: "shipped",
                  shipping_date: today,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", paymentId)
                .eq("shipping_status", "pending")
                .select("id, patient_id"),
              tenantId
            );

            if (error) {
              console.error(`[UpdateTracking] Error updating ${paymentId}:`, error);
              errors.push(`${paymentId}: ${error.message}`);
              return;
            }

            if (!data || data.length === 0) {
              const { data: existing } = await withTenant(
                supabase.from("orders").select("id, shipping_status").eq("id", paymentId),
                tenantId
              );
              if (existing && existing.length > 0 && existing[0].shipping_status === "shipped") {
                console.log(`[UpdateTracking] ⏭ ${paymentId} は既に発送済み（スキップ）`);
                successUpdates.push(paymentId);
                return;
              }
              console.warn(`[UpdateTracking] No order found for ${paymentId}`);
              errors.push(`${paymentId}: 注文が見つかりません`);
              return;
            }

            successUpdates.push(paymentId);
            if (data[0]?.patient_id) {
              patientIds.push(data[0].patient_id);
            }
            console.log(`[UpdateTracking] ✅ Updated ${paymentId} with tracking ${trackingNumber}`);
          } catch (err) {
            console.error(`[UpdateTracking] Exception for ${paymentId}:`, err);
            errors.push(`${paymentId}: ${err instanceof Error ? err.message : "Unknown error"}`);
          }
        })
      );
    }

    console.log(`[UpdateTracking] Complete: ${successUpdates.length} success, ${errors.length} failed`);

    // キャッシュ無効化
    if (patientIds.length > 0) {
      const uniquePatientIds = Array.from(new Set(patientIds));
      console.log(`[UpdateTracking] Invalidating cache for ${uniquePatientIds.length} patients`);
      await Promise.allSettled(
        uniquePatientIds.map((pid) =>
          invalidateDashboardCache(pid).catch((err) => {
            console.error(`[UpdateTracking] Cache invalidation failed for ${pid}:`, err);
          })
        )
      );
    }

    return NextResponse.json({
      success: successUpdates.length,
      failed: errors.length,
      errors: errors,
    });
  } catch (error) {
    console.error("[UpdateTracking] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
