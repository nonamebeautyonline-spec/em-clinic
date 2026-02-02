import { NextRequest, NextResponse } from "next/server";
import { generateYamatoB2Csv } from "@/utils/yamato-b2-formatter";
import { createClient } from "@supabase/supabase-js";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CustomShippingItem {
  payment_id: string;
  name: string;
  postal: string;
  address: string;
  email: string;
  phone: string;
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
    const items: CustomShippingItem[] = body.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items required" }, { status: 400 });
    }

    console.log(`[ExportYamatoB2Custom] Exporting ${items.length} items`);

    // 出荷予定日（今日の日付 yyyy/MM/dd）
    const today = new Date();
    const shipDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(
      today.getDate()
    ).padStart(2, "0")}`;

    // CSV生成
    const csv = generateYamatoB2Csv(items, shipDate);

    // ★ CSV出力後、注文の shipping_list_created_at を更新
    const paymentIds = items.map((item) => item.payment_id);
    const now = new Date().toISOString();

    console.log(`[ExportYamatoB2Custom] Marking ${paymentIds.length} orders as list_created`);

    const { data: updatedOrders, error: updateError } = await supabase
      .from("orders")
      .update({
        shipping_list_created_at: now,
        updated_at: now,
      })
      .in("id", paymentIds)
      .select("patient_id");

    if (updateError) {
      console.error("[ExportYamatoB2Custom] Failed to update orders:", updateError);
      // エラーでもCSVは返す（重要な操作ではない）
    } else if (updatedOrders && updatedOrders.length > 0) {
      console.log(`[ExportYamatoB2Custom] Updated ${updatedOrders.length} orders`);

      // ★ キャッシュ無効化
      const patientIds = Array.from(new Set(updatedOrders.map((o: any) => o.patient_id)));
      console.log(`[ExportYamatoB2Custom] Invalidating cache for ${patientIds.length} patients`);

      const invalidateUrl = `${req.nextUrl.origin}/api/admin/invalidate-cache`;
      const invalidatePromises = patientIds.map((patientId) =>
        fetch(invalidateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ADMIN_TOKEN}`,
          },
          body: JSON.stringify({ patient_id: patientId }),
        }).catch((err) => {
          console.error(`[ExportYamatoB2Custom] Cache invalidation failed for ${patientId}:`, err);
        })
      );

      await Promise.allSettled(invalidatePromises);
    }

    // CSVをレスポンスとして返す
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=UTF-8",
        "Content-Disposition": `attachment; filename="yamato_b2_${today.toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("[ExportYamatoB2Custom] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
