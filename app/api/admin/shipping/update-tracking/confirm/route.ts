import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TrackingUpdate {
  paymentId: string;
  trackingNumber: string;
  order: {
    patient_id: string;
    patient_name: string;
    product_code: string;
    lstep_id: string;
  } | null;
}

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { updates } = body as { updates: TrackingUpdate[] };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: "Updates data is required" }, { status: 400 });
    }

    const successUpdates: string[] = [];
    const errors: string[] = [];
    const lstepIds: string[] = [];
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // 各payment_idに対して追跡番号を付与
    for (const update of updates) {
      const { paymentId, trackingNumber, order } = update;

      if (!order) {
        errors.push(`${paymentId}: 注文が見つかりません（スキップ）`);
        continue;
      }

      try {
        const { data, error } = await supabase
          .from("orders")
          .update({
            tracking_number: trackingNumber,
            shipping_status: "shipped",
            shipping_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentId)
          .select("id");

        if (error) {
          console.error(`[UpdateTrackingConfirm] Error updating ${paymentId}:`, error);
          errors.push(`${paymentId}: ${error.message}`);
          continue;
        }

        if (!data || data.length === 0) {
          console.warn(`[UpdateTrackingConfirm] No order found for ${paymentId}`);
          errors.push(`${paymentId}: 注文が見つかりません`);
          continue;
        }

        successUpdates.push(paymentId);

        // LステップIDを収集（空でない場合のみ）
        if (order.lstep_id && order.lstep_id.trim()) {
          lstepIds.push(order.lstep_id.trim());
        }

        console.log(`[UpdateTrackingConfirm] ✅ Updated ${paymentId} with tracking ${trackingNumber}`);
      } catch (err) {
        console.error(`[UpdateTrackingConfirm] Exception for ${paymentId}:`, err);
        errors.push(`${paymentId}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    // LステップIDの重複を除去
    const uniqueLstepIds = Array.from(new Set(lstepIds));

    console.log(`[UpdateTrackingConfirm] Complete: ${successUpdates.length} success, ${errors.length} failed`);
    console.log(`[UpdateTrackingConfirm] LステップID: ${uniqueLstepIds.length}件`);

    return NextResponse.json({
      success: successUpdates.length,
      failed: errors.length,
      errors: errors,
      lstepIds: uniqueLstepIds,
    });
  } catch (error) {
    console.error("[UpdateTrackingConfirm] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
