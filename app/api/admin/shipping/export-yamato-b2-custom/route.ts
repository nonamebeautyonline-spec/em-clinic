import { NextRequest, NextResponse } from "next/server";
import { generateYamatoB2Csv } from "@/utils/yamato-b2-formatter";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

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
