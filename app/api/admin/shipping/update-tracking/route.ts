import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { updateTrackingCsvSchema } from "@/lib/validations/shipping";

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
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // データ行を処理（ヘッダーをスキップ）
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

      // payment_idにカンマが含まれる場合は分割（合箱対応）
      const paymentIds = rawPaymentId.split(",").map((id: string) => id.trim()).filter(Boolean);

      console.log(`[UpdateTracking] Row ${i + 1}: paymentIds=${paymentIds.join(",")}, tracking=${trackingNumber}`);

      // 各payment_idに対して追跡番号を付与
      for (const paymentId of paymentIds) {
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
              .select("id"),
            tenantId
          );

          if (error) {
            console.error(`[UpdateTracking] Error updating ${paymentId}:`, error);
            errors.push(`${paymentId}: ${error.message}`);
            continue;
          }

          if (!data || data.length === 0) {
            console.warn(`[UpdateTracking] No order found for ${paymentId}`);
            errors.push(`${paymentId}: 注文が見つかりません`);
            continue;
          }

          successUpdates.push(paymentId);
          console.log(`[UpdateTracking] ✅ Updated ${paymentId} with tracking ${trackingNumber}`);
        } catch (err) {
          console.error(`[UpdateTracking] Exception for ${paymentId}:`, err);
          errors.push(`${paymentId}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }
    }

    console.log(`[UpdateTracking] Complete: ${successUpdates.length} success, ${errors.length} failed`);

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
