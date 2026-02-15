import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

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

    const { data: reordersData, error: reordersError } = await withTenant(query, tenantId);

    if (reordersError) {
      console.error("Reorders fetch error:", reordersError);
      return NextResponse.json(
        { error: "DB error: " + reordersError.message },
        { status: 500 }
      );
    }

    // 患者名を取得するために、patient_idのリストを作成
    const patientIds = [...new Set((reordersData || []).map((r) => r.patient_id))];

    // patientsテーブルから患者名を取得
    let patientInfoMap: Record<string, { name: string; lstep_uid: string }> = {};
    if (patientIds.length > 0) {
      const { data: pData } = await withTenant(
        supabaseAdmin
          .from("patients")
          .select("patient_id, name")
          .in("patient_id", patientIds),
        tenantId
      );

      // intakeからanswerer_id（Lステップ用）を取得
      const { data: intakeData } = await withTenant(
        supabaseAdmin
          .from("intake")
          .select("patient_id, answerer_id")
          .in("patient_id", patientIds)
          .not("answerer_id", "is", null),
        tenantId
      );

      const nameMap = new Map<string, string>();
      for (const p of pData || []) {
        nameMap.set(p.patient_id, p.name || "-");
      }

      const lstepMap = new Map<string, string>();
      for (const i of intakeData || []) {
        if (!lstepMap.has(i.patient_id)) {
          lstepMap.set(i.patient_id, i.answerer_id || "");
        }
      }

      for (const pid of patientIds) {
        patientInfoMap[pid] = {
          name: nameMap.get(pid) || "-",
          lstep_uid: lstepMap.get(pid) || "",
        };
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
        id: String(r.reorder_number), // フロントエンドはidをreorder_numberとして使用
        timestamp: formatTimestamp(r.timestamp),
        patient_id: r.patient_id,
        patient_name: patientInfo.name,
        product_code: r.product_code,
        status: displayStatus,
        note: r.note || "",
        line_uid: r.line_uid || "",
        lstep_uid: patientInfo.lstep_uid,
        line_notify_result: r.line_notify_result || null,
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
