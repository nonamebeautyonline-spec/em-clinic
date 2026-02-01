// app/api/admin/bank-transfer/reconcile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * 銀行CSV一括照合API
 * CSVから振込情報を読み込み、ordersテーブルのstatus='pending_confirmation'と照合
 * マッチしたレコードをstatus='confirmed'に更新
 */
export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "CSVファイルが指定されていません" },
        { status: 400 }
      );
    }

    // CSVを読み込み
    const csvText = await file.text();
    const lines = csvText.split("\n").filter((line) => line.trim());

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "CSVファイルが空です" },
        { status: 400 }
      );
    }

    // CSVをパース（カンマ区切り、ダブルクォート対応）
    const parsedRows = lines.map((line) => {
      const cols: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          cols.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      cols.push(current.trim());
      return cols;
    });

    // ヘッダー行をスキップ（1行目）
    const dataRows = parsedRows.slice(1);

    // 銀行CSVフォーマットを検出（三菱UFJ、三井住友、ゆうちょなど）
    // 汎用的に処理：日付、摘要（名義人）、入金額を抽出
    const transfers = dataRows
      .map((cols) => {
        // 想定フォーマット: [日付, 摘要, 出金, 入金, 残高]
        // または: [日付, 摘要, 金額, 入出区分, 残高]

        let date = "";
        let description = "";
        let amount = 0;

        // 一般的なパターンで試行
        if (cols.length >= 4) {
          date = cols[0] || "";
          description = cols[1] || "";

          // 入金額を検出（出金/入金が別カラムの場合）
          const withdrawalStr = cols[2]?.replace(/[,円]/g, "") || "0";
          const depositStr = cols[3]?.replace(/[,円]/g, "") || "0";

          const withdrawal = parseInt(withdrawalStr, 10) || 0;
          const deposit = parseInt(depositStr, 10) || 0;

          // 入金がある場合のみ（出金は無視）
          if (deposit > 0) {
            amount = deposit;
          }
        }

        return { date, description, amount };
      })
      .filter((t) => t.amount > 0); // 入金のみ

    if (transfers.length === 0) {
      return NextResponse.json(
        { error: "CSVに入金データが見つかりませんでした", details: "入金額が0より大きい行がありません" },
        { status: 400 }
      );
    }

    console.log(`[Reconcile] Parsed ${transfers.length} transfers from CSV`);

    // Supabase接続
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // pending_confirmationの注文を取得
    const { data: pendingOrders, error: fetchError } = await supabase
      .from("orders")
      .select("id, patient_id, product_code, amount")
      .eq("status", "pending_confirmation")
      .eq("payment_method", "bank_transfer");

    if (fetchError) {
      console.error("[Reconcile] Fetch error:", fetchError);
      return NextResponse.json(
        { error: "データ取得エラー", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return NextResponse.json({
        matched: [],
        unmatched: transfers.map((t) => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          reason: "照合待ちの注文がありません",
        })),
        message: "照合待ちの銀行振込注文が0件です",
      });
    }

    console.log(`[Reconcile] Found ${pendingOrders.length} pending orders`);

    // ★ ordersから振込名義人（account_name）を取得
    const { data: pendingOrdersWithNames, error: fetchNamesError } = await supabase
      .from("orders")
      .select("id, patient_id, product_code, amount, account_name, shipping_name")
      .eq("status", "pending_confirmation")
      .eq("payment_method", "bank_transfer");

    if (fetchNamesError) {
      console.error("[Reconcile] Fetch names error:", fetchNamesError);
      return NextResponse.json(
        { error: "データ取得エラー", details: fetchNamesError.message },
        { status: 500 }
      );
    }

    // 照合処理
    const matched: any[] = [];
    const unmatched: any[] = [];
    const usedOrderIds = new Set<string>();

    for (const transfer of transfers) {
      let matchedOrder = null;

      // 金額と振込名義人で照合
      for (const order of pendingOrdersWithNames || []) {
        if (usedOrderIds.has(order.id)) continue; // 既にマッチ済み

        // 金額が一致
        if (order.amount === transfer.amount) {
          const accountName = order.account_name || "";

          if (!accountName) continue;

          // 振込名義人がCSVの摘要に含まれているかチェック（カタカナ）
          const descNormalized = normalizeKana(transfer.description);
          const accountNormalized = normalizeKana(accountName);

          if (
            descNormalized.includes(accountNormalized) ||
            transfer.description.includes(accountName)
          ) {
            matchedOrder = order;
            break;
          }
        }
      }

      if (matchedOrder) {
        matched.push({
          transfer,
          order: matchedOrder,
        });
        usedOrderIds.add(matchedOrder.id);
      } else {
        unmatched.push({
          date: transfer.date,
          description: transfer.description,
          amount: transfer.amount,
          reason: "該当する注文が見つかりませんでした（金額または名義人が一致しません）",
        });
      }
    }

    console.log(`[Reconcile] Matched: ${matched.length}, Unmatched: ${unmatched.length}`);

    // マッチした注文をstatus='confirmed'に更新
    const updateResults: Array<{
      orderId: string;
      success: boolean;
      newId?: string;
      error?: string;
    }> = [];
    for (const match of matched) {
      const orderId = match.order.id;

      // payment_idを採番（bt_XXX形式）
      // bt_pending_XXX を除外し、bt_1, bt_2, ... のみを対象
      const { data: allBtOrders } = await supabase
        .from("orders")
        .select("id")
        .like("id", "bt_%");

      // bt_数字 のみを抽出して最大値を取得
      let maxNum = 0;
      if (allBtOrders && allBtOrders.length > 0) {
        for (const order of allBtOrders) {
          const match = order.id.match(/^bt_(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) {
              maxNum = num;
            }
          }
        }
      }

      const nextBtId = `bt_${maxNum + 1}`;

      // 更新
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "confirmed",
          id: nextBtId, // 新しいpayment_idに変更
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) {
        console.error(`[Reconcile] Update error for order ${orderId}:`, updateError);
        updateResults.push({
          orderId,
          success: false,
          error: updateError.message,
        });
      } else {
        console.log(`[Reconcile] Updated ${orderId} → ${nextBtId} (confirmed)`);
        updateResults.push({
          orderId,
          newId: nextBtId,
          success: true,
        });

        // ★ キャッシュ無効化（決済確認後）
        try {
          const invalidateUrl = `${req.nextUrl.origin}/api/admin/invalidate-cache`;
          const adminToken = process.env.ADMIN_TOKEN;

          if (adminToken) {
            const invalidateResponse = await fetch(invalidateUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${adminToken}`,
              },
              body: JSON.stringify({ patient_id: match.order.patient_id }),
            });

            if (invalidateResponse.ok) {
              console.log(`[Reconcile] Cache invalidated for patient: ${match.order.patient_id}`);
            } else {
              console.error(`[Reconcile] Cache invalidation failed: ${await invalidateResponse.text()}`);
            }
          }
        } catch (e) {
          console.error(`[Reconcile] Cache invalidation error:`, e);
          // エラーでも処理は続行
        }
      }
    }

    return NextResponse.json({
      matched: matched.map((m, i) => ({
        transfer: m.transfer,
        order: {
          patient_id: m.order.patient_id,
          product_code: m.order.product_code,
          amount: m.order.amount,
        },
        newPaymentId: updateResults[i]?.newId || null,
        updateSuccess: updateResults[i]?.success || false,
      })),
      unmatched,
      summary: {
        total: transfers.length,
        matched: matched.length,
        unmatched: unmatched.length,
        updated: updateResults.filter((r) => r.success).length,
      },
    });
  } catch (e: any) {
    console.error("[Reconcile] Error:", e);
    return NextResponse.json(
      { error: e?.message || "サーバーエラー" },
      { status: 500 }
    );
  }
}

/**
 * カタカナを正規化（全角→半角、濁点分離など）
 */
function normalizeKana(str: string): string {
  if (!str) return "";

  // 全角カタカナを半角に変換
  let normalized = str
    .replace(/[\u30a1-\u30f6]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0x60)
    )
    .toUpperCase();

  // スペース、記号を削除
  normalized = normalized.replace(/[\s\-\(\)（）]/g, "");

  return normalized;
}
