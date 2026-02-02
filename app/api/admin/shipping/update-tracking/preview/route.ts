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
    let { csvContent } = body;

    if (!csvContent) {
      return NextResponse.json({ error: "CSV content is required" }, { status: 400 });
    }

    // ★ BOM除去（UTF-8 BOM: 0xFEFF）
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
      console.log("[UpdateTrackingPreview] Removed UTF-8 BOM");
    }

    // CSVをパース（カンマ区切り or タブ区切り自動判定）
    const lines = csvContent.split("\n").filter((line: string) => line.trim());
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSVが空です" }, { status: 400 });
    }

    // ★ ヘッダー行を解析（カンマ区切りかタブ区切りか自動判定）
    const firstLine = lines[0];
    const delimiter = firstLine.includes("\t") ? "\t" : ",";
    console.log(`[UpdateTrackingPreview] Detected delimiter: ${delimiter === "\t" ? "TAB" : "COMMA"}`);

    // ダブルクォートを除去してからパース
    const headers = firstLine.split(delimiter).map((h: string) =>
      h.trim().replace(/^"|"$/g, "").replace(/\s+/g, "")
    );

    // ★ デバッグ: ヘッダーを出力
    console.log("[UpdateTrackingPreview] Headers:", JSON.stringify(headers));
    console.log("[UpdateTrackingPreview] Header count:", headers.length);

    const paymentIdColIndex = headers.indexOf("お客様管理番号");
    const trackingNumberColIndex = headers.indexOf("伝票番号");

    if (paymentIdColIndex === -1 || trackingNumberColIndex === -1) {
      console.error("[UpdateTrackingPreview] Column search failed");
      console.error("[UpdateTrackingPreview] Looking for: お客様管理番号, 伝票番号");
      console.error("[UpdateTrackingPreview] Available headers:", headers);
      return NextResponse.json(
        {
          error: "必須カラムが見つかりません（お客様管理番号、伝票番号）",
          debug: {
            headers: headers,
            paymentIdIndex: paymentIdColIndex,
            trackingIndex: trackingNumberColIndex
          }
        },
        { status: 400 }
      );
    }

    console.log(`[UpdateTrackingPreview] Found columns: paymentId=${paymentIdColIndex}, tracking=${trackingNumberColIndex}`);

    const updates: TrackingUpdate[] = [];
    const errors: string[] = [];
    const paymentIds: string[] = [];

    // データ行を処理（ヘッダーをスキップ）
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const columns = line.split(delimiter).map((c: string) => c.trim().replace(/^"|"$/g, ""));
      const rawPaymentId = columns[paymentIdColIndex]?.trim();
      const trackingNumber = columns[trackingNumberColIndex]?.trim();

      if (!rawPaymentId || !trackingNumber) {
        console.log(`[UpdateTrackingPreview] Row ${i + 1}: Missing data, skipping`);
        continue;
      }

      // payment_idにカンマが含まれる場合は分割（合箱対応）
      const paymentIdList = rawPaymentId.split(",").map((id: string) => id.trim()).filter(Boolean);

      for (const paymentId of paymentIdList) {
        paymentIds.push(paymentId);
      }
    }

    // 全payment_idに対応する注文情報を一括取得
    if (paymentIds.length > 0) {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, patient_id")
        .in("id", paymentIds);

      if (ordersError) {
        console.error(`[UpdateTrackingPreview] Orders fetch error:`, ordersError);
        return NextResponse.json(
          { error: "注文データ取得エラー", details: ordersError.message },
          { status: 500 }
        );
      }

      // patient_idリストを取得
      const patientIds = orders ? Array.from(new Set(orders.map((o: any) => o.patient_id))) : [];

      // intakeテーブルから患者情報とLステップIDを取得
      let patientInfoMap: Record<string, { patient_name: string; lstep_id: string }> = {};
      if (patientIds.length > 0) {
        const { data: patients } = await supabase
          .from("intake")
          .select("patient_id, patient_name, answerer_id")
          .in("patient_id", patientIds);

        if (patients) {
          for (const p of patients) {
            patientInfoMap[p.patient_id] = {
              patient_name: p.patient_name || "",
              lstep_id: p.answerer_id || "",
            };
          }
        }
      }

      // 注文のマップを作成
      const orderMap = new Map();
      if (orders) {
        for (const order of orders) {
          orderMap.set(order.id, order);
        }
      }

      // 再度CSVをパースして更新情報を作成
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const columns = line.split(delimiter).map((c: string) => c.trim().replace(/^"|"$/g, ""));
        const rawPaymentId = columns[paymentIdColIndex]?.trim();
        const trackingNumber = columns[trackingNumberColIndex]?.trim();

        if (!rawPaymentId || !trackingNumber) continue;

        const paymentIdList = rawPaymentId.split(",").map((id: string) => id.trim()).filter(Boolean);

        for (const paymentId of paymentIdList) {
          const order = orderMap.get(paymentId);

          if (!order) {
            errors.push(`${paymentId}: 注文が見つかりません`);
            updates.push({
              paymentId,
              trackingNumber,
              order: null,
            });
            continue;
          }

          const patientInfo = patientInfoMap[order.patient_id] || {};

          updates.push({
            paymentId,
            trackingNumber,
            order: {
              patient_id: order.patient_id,
              patient_name: patientInfo.patient_name || "",
              product_code: "", // 必要であれば追加
              lstep_id: patientInfo.lstep_id || "",
            },
          });
        }
      }
    }

    // クライアントが期待する形式に変換
    const entries = updates.map((u) => ({
      payment_id: u.paymentId,
      patient_name: u.order?.patient_name || "",
      tracking_number: u.trackingNumber,
      matched: u.order !== null,
    }));

    return NextResponse.json({
      entries,
      errors,
      summary: {
        total: updates.length,
        found: updates.filter((u) => u.order !== null).length,
        notFound: updates.filter((u) => u.order === null).length,
      },
    });
  } catch (error) {
    console.error("[UpdateTrackingPreview] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
