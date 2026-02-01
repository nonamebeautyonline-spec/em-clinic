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

    // DBからテストデータを削除
    const { error: dbError, count } = await supabase
      .from("bank_transfer_orders")
      .delete()
      .like("patient_id", "TEST%");

    if (dbError) {
      console.error("[delete-test-data] DB Error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // GASシートからもテストデータを削除
    const gasUrl = process.env.GAS_BANK_TRANSFER_URL;
    if (gasUrl) {
      try {
        const gasRes = await fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "delete_test_data" }),
        });

        const gasData = await gasRes.json();
        console.log("[delete-test-data] GAS Response:", gasData);
      } catch (gasError) {
        console.error("[delete-test-data] GAS Error:", gasError);
        // GASエラーは無視して続行
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount: count || 0,
      message: `${count || 0}件のテストデータを削除しました`,
    });
  } catch (error) {
    console.error("[delete-test-data] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
