// app/api/admin/bank-transfer/reconcile/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * 銀行CSV照合プレビューAPI
 * CSVから振込情報を読み込み、ordersテーブルと照合候補を返す（DB更新なし）
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
    const transfers = dataRows
      .map((cols) => {
        let date = "";
        let description = "";
        let amount = 0;

        if (cols.length >= 4) {
          date = cols[0] || "";
          description = cols[1] || "";

          const withdrawalStr = cols[2]?.replace(/[,円]/g, "") || "0";
          const depositStr = cols[3]?.replace(/[,円]/g, "") || "0";

          const withdrawal = parseInt(withdrawalStr, 10) || 0;
          const deposit = parseInt(depositStr, 10) || 0;

          if (deposit > 0) {
            amount = deposit;
          }
        }

        return { date, description, amount };
      })
      .filter((t) => t.amount > 0);

    if (transfers.length === 0) {
      return NextResponse.json(
        { error: "CSVに入金データが見つかりませんでした", details: "入金額が0より大きい行がありません" },
        { status: 400 }
      );
    }

    console.log(`[Preview] Parsed ${transfers.length} transfers from CSV`);

    // Supabase接続
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // pending_confirmationの注文を取得
    const { data: pendingOrdersWithNames, error: fetchNamesError } = await supabase
      .from("orders")
      .select("id, patient_id, product_code, amount, account_name, shipping_name")
      .eq("status", "pending_confirmation")
      .eq("payment_method", "bank_transfer");

    if (fetchNamesError) {
      console.error("[Preview] Fetch names error:", fetchNamesError);
      return NextResponse.json(
        { error: "データ取得エラー", details: fetchNamesError.message },
        { status: 500 }
      );
    }

    if (!pendingOrdersWithNames || pendingOrdersWithNames.length === 0) {
      return NextResponse.json({
        matched: [],
        unmatched: transfers.map((t) => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          reason: "照合待ちの注文がありません",
        })),
        summary: {
          total: transfers.length,
          matched: 0,
          unmatched: transfers.length,
          updated: 0,
        },
      });
    }

    console.log(`[Preview] Found ${pendingOrdersWithNames.length} pending orders`);

    // 照合処理（プレビューのみ、DB更新なし）
    const matched: any[] = [];
    const unmatched: any[] = [];
    const usedOrderIds = new Set<string>();

    console.log(`[Preview] Starting reconciliation...`);
    console.log(`[Preview] Transfers to match: ${transfers.length}`);
    console.log(`[Preview] Pending orders: ${pendingOrdersWithNames.length}`);

    for (const transfer of transfers) {
      let matchedOrder = null;

      console.log(`\n[Preview] ===== Transfer: ${transfer.description} (¥${transfer.amount}) =====`);

      // 金額と振込名義人で照合
      for (const order of pendingOrdersWithNames) {
        if (usedOrderIds.has(order.id)) continue;

        if (order.amount === transfer.amount) {
          const accountName = order.account_name || "";

          if (!accountName) {
            console.log(`[Preview] Order ${order.id}: amount match (¥${order.amount}), but no account_name - SKIP`);
            continue;
          }

          const descNormalized = normalizeKana(transfer.description);
          const accountNormalized = normalizeKana(accountName);

          console.log(`[Preview] Order ${order.id} (${order.patient_id}):`);
          console.log(`  amount: ¥${order.amount} (MATCH)`);
          console.log(`  account_name: "${accountName}"`);
          console.log(`  accountNormalized: "${accountNormalized}"`);
          console.log(`  transfer.description: "${transfer.description}"`);
          console.log(`  descNormalized: "${descNormalized}"`);

          const normalizedMatch = descNormalized.includes(accountNormalized);
          const rawMatch = transfer.description.includes(accountName);

          console.log(`  normalizedMatch: ${normalizedMatch}`);
          console.log(`  rawMatch: ${rawMatch}`);

          if (normalizedMatch || rawMatch) {
            matchedOrder = order;
            console.log(`  ✅ MATCHED!`);
            break;
          } else {
            console.log(`  ❌ No name match`);
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
        console.log(`[Preview] ⚠️ No match found for this transfer`);
        unmatched.push({
          date: transfer.date,
          description: transfer.description,
          amount: transfer.amount,
          reason: "該当する注文が見つかりませんでした（金額または名義人が一致しません）",
        });
      }
    }

    console.log(`[Preview] Matched: ${matched.length}, Unmatched: ${unmatched.length}`);

    return NextResponse.json({
      matched: matched.map((m) => ({
        transfer: m.transfer,
        order: {
          patient_id: m.order.patient_id,
          product_code: m.order.product_code,
          amount: m.order.amount,
        },
        newPaymentId: null, // プレビューなので未採番
        updateSuccess: false, // プレビューなので未更新
      })),
      unmatched,
      summary: {
        total: transfers.length,
        matched: matched.length,
        unmatched: unmatched.length,
        updated: 0, // プレビューなので0
      },
    });
  } catch (e: any) {
    console.error("[Preview] Error:", e);
    return NextResponse.json(
      { error: e?.message || "サーバーエラー" },
      { status: 500 }
    );
  }
}

/**
 * カタカナを正規化（全角→半角、濁点分離など）
 * - スペース、ハイフン、括弧を削除
 * - 全角カタカナ→ひらがな変換
 * - 小文字（ァィゥェォ等）も正規化
 */
function normalizeKana(str: string): string {
  if (!str) return "";

  // 1. スペース、記号、括弧を削除
  let normalized = str.replace(/[\s\-\(\)（）、。・]/g, "");

  // 2. 全角カタカナ→ひらがな変換
  normalized = normalized.replace(/[\u30a1-\u30f6]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0x60)
  );

  // 3. 英字を大文字化（銀行のフリガナに英字が含まれる場合）
  normalized = normalized.toUpperCase();

  return normalized;
}
