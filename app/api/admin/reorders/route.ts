import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

export async function GET(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // クエリパラメータ: include_all=true で全件取得、デフォルトはpendingのみ
    const searchParams = req.nextUrl.searchParams;
    const includeAll = searchParams.get("include_all") === "true";

    // Supabase DBから取得
    let query = supabaseAdmin
      .from("reorders")
      .select("*")
      .order("timestamp", { ascending: false });

    if (!includeAll) {
      query = query.eq("status", "pending");
    }

    const { data: reordersData, error: reordersError } = await query;

    if (reordersError) {
      console.error("Reorders fetch error:", reordersError);
      return NextResponse.json(
        { error: "DB error: " + reordersError.message },
        { status: 500 }
      );
    }

    // 患者名とLステップIDを取得するために、patient_idのリストを作成
    const patientIds = [...new Set((reordersData || []).map((r) => r.patient_id))];

    // intakeテーブルから患者名とanswerer_id（Lステップ用）を取得
    let patientInfoMap: Record<string, { name: string; lstep_uid: string }> = {};
    if (patientIds.length > 0) {
      const { data: intakeData, error: intakeError } = await supabaseAdmin
        .from("intake")
        .select("patient_id, patient_name, answerer_id")
        .in("patient_id", patientIds);

      if (!intakeError && intakeData) {
        patientInfoMap = Object.fromEntries(
          intakeData.map((p) => [p.patient_id, {
            name: p.patient_name || "-",
            lstep_uid: p.answerer_id || ""
          }])
        );
      }
    }

    // レスポンス形式に整形（フロントエンドの期待するフォーマット）
    const reorders = (reordersData || []).map((r) => {
      // ステータスの逆マッピング（DB → GAS互換表示）
      let displayStatus = r.status;
      if (displayStatus === "approved") displayStatus = "confirmed";
      if (displayStatus === "cancelled") displayStatus = "canceled";

      const patientInfo = patientInfoMap[r.patient_id] || { name: "-", lstep_uid: "" };
      return {
        id: String(r.gas_row_number), // フロントエンドはidをgas_row_numberとして使用
        timestamp: formatTimestamp(r.timestamp),
        patient_id: r.patient_id,
        patient_name: patientInfo.name,
        product_code: r.product_code,
        status: displayStatus,
        note: r.note || "",
        line_uid: r.line_uid || "",
        lstep_uid: patientInfo.lstep_uid,
      };
    });

    return NextResponse.json({ reorders });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// タイムスタンプをJST形式に変換
function formatTimestamp(ts: string | null): string {
  if (!ts) return "-";
  try {
    const d = new Date(ts);
    // JSTに変換 (UTC + 9時間)
    const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const year = jst.getUTCFullYear();
    const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
    const day = String(jst.getUTCDate()).padStart(2, "0");
    const hours = String(jst.getUTCHours()).padStart(2, "0");
    const minutes = String(jst.getUTCMinutes()).padStart(2, "0");
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  } catch {
    return ts;
  }
}
