import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
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

    // 銀行振込注文一覧を取得（ordersテーブルからpayment_method='bank_transfer'を抽出）
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("payment_method", "bank_transfer")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[bank-transfer-orders] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[bank-transfer-orders] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
