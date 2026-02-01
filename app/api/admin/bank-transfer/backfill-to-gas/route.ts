import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 管理者トークン認証
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const gasUrl = process.env.GAS_BANK_TRANSFER_URL;
    if (!gasUrl) {
      return NextResponse.json({ error: "GAS_BANK_TRANSFER_URL not configured" }, { status: 500 });
    }

    // 全ての銀行振込注文データをDBから取得（テストデータを除外）
    const { data: dbData, error } = await supabase
      .from("bank_transfer_orders")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[backfill-to-gas] DB Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // テストデータを除外
    const realData = dbData.filter((row) => {
      const pid = String(row.patient_id || "");
      return !pid.startsWith("TEST");
    });

    console.log(`[backfill-to-gas] Total: ${dbData.length}, Real: ${realData.length}`);

    if (realData.length === 0) {
      return NextResponse.json({
        success: true,
        successCount: 0,
        failCount: 0,
        message: "バックフィルするデータがありません",
      });
    }

    let successCount = 0;
    let failCount = 0;
    const failed: string[] = [];

    // GASに順次送信
    for (const row of realData) {
      const payload = {
        type: "bank_transfer_order",
        order_id: String(row.id || ""),
        patient_id: row.patient_id,
        product_code: row.product_code,
        mode: row.mode || "first",
        reorder_id: row.reorder_id || null,
        account_name: row.account_name,
        shipping_name: row.shipping_name || "",
        phone_number: row.phone_number,
        email: row.email,
        postal_code: row.postal_code,
        address: row.address,
        submitted_at: row.submitted_at,
      };

      try {
        const response = await fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();

        if (response.ok) {
          try {
            const json = JSON.parse(responseText);
            if (json.ok) {
              successCount++;
            } else {
              failCount++;
              failed.push(row.patient_id);
            }
          } catch (e) {
            successCount++;
          }
        } else {
          failCount++;
          failed.push(row.patient_id);
        }

        // GAS API制限対策
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        failCount++;
        failed.push(row.patient_id);
        console.error(`[backfill-to-gas] Error for ${row.patient_id}:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      failCount,
      failed,
      message: `成功: ${successCount}件, 失敗: ${failCount}件`,
    });
  } catch (error) {
    console.error("[backfill-to-gas] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
