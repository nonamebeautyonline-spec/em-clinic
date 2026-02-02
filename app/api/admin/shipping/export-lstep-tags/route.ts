import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 今日の日付（YYYY-MM-DD）
    const today = new Date().toISOString().split("T")[0];

    console.log(`[ExportLstepTags] Fetching orders with shipping_date = ${today}`);

    // 本日発送（追跡番号付与）された注文を取得
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, patient_id")
      .eq("shipping_date", today)
      .not("tracking_number", "is", null);

    if (ordersError) {
      console.error("[ExportLstepTags] Orders fetch error:", ordersError);
      return NextResponse.json(
        { error: "注文データ取得エラー", details: ordersError.message },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      console.log("[ExportLstepTags] No shipped orders found for today");
      return NextResponse.json(
        { error: "本日発送済みの注文が見つかりません" },
        { status: 404 }
      );
    }

    console.log(`[ExportLstepTags] Found ${orders.length} shipped orders`);

    // patient_idのユニークリストを取得
    const patientIds = Array.from(new Set(orders.map((o: any) => o.patient_id)));

    // intakeテーブルからLステップID（answerer_id）を取得
    const { data: patients, error: patientsError } = await supabase
      .from("intake")
      .select("patient_id, patient_name, answerer_id")
      .in("patient_id", patientIds);

    if (patientsError) {
      console.error("[ExportLstepTags] Patients fetch error:", patientsError);
      return NextResponse.json(
        { error: "患者データ取得エラー", details: patientsError.message },
        { status: 500 }
      );
    }

    if (!patients || patients.length === 0) {
      console.log("[ExportLstepTags] No patient data found");
      return NextResponse.json(
        { error: "患者データが見つかりません" },
        { status: 404 }
      );
    }

    // LステップIDが存在する患者のみフィルタリング
    const validPatients = patients.filter((p: any) => p.answerer_id);

    if (validPatients.length === 0) {
      return NextResponse.json(
        { error: "LステップIDが登録されている患者が見つかりません" },
        { status: 404 }
      );
    }

    console.log(`[ExportLstepTags] Found ${validPatients.length} patients with Lstep ID`);

    // CSV生成（Lステップ形式）
    // タグID: 9217653 = 「発送したよ」
    const csvRows = [
      "登録ID,タグ_9217653", // ヘッダー行1: タグIDを含む
      "ID,発送したよ", // ヘッダー行2: タグ名
      ...validPatients.map((p: any) => `${p.answerer_id},1`), // データ行: 友だちID,1
    ];

    const csvContent = csvRows.join("\n");

    // Shift_JISにエンコード
    const encoder = new TextEncoder();
    const utf8Bytes = encoder.encode(csvContent);

    // ブラウザのダウンロードではShift_JISが必要な場合があるが、
    // TextEncoderはUTF-8のみサポートなので、UTF-8 BOMを追加
    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const csvBytes = new Uint8Array(BOM.length + utf8Bytes.length);
    csvBytes.set(BOM);
    csvBytes.set(utf8Bytes, BOM.length);

    console.log(`[ExportLstepTags] Generated CSV with ${validPatients.length} entries`);

    return new NextResponse(csvBytes, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=UTF-8",
        "Content-Disposition": `attachment; filename="lstep_tags_${today}.csv"`,
      },
    });
  } catch (error) {
    console.error("[ExportLstepTags] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
