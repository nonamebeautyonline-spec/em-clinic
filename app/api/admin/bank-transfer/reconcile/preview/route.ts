// app/api/admin/bank-transfer/reconcile/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { getSetting } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * 銀行CSV照合プレビューAPI
 * CSVから振込情報を読み込み、ordersテーブルと照合候補を返す（DB更新なし）
 */
export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const csvFormat = (formData.get("csvFormat") as string) || "gmo";

    if (!file) {
      return badRequest("CSVファイルが指定されていません");
    }

    // CSVを読み込み（Shift_JISエンコーディング対応）
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder("shift_jis");
    const csvText = decoder.decode(arrayBuffer);
    const lines = csvText.split("\n").filter((line) => line.trim());

    if (lines.length === 0) {
      return badRequest("CSVファイルが空です");
    }

    // CSVをパース（カンマ区切り、ダブルクォート対応）
    const parsedRows = lines.map((line) => parseCSVLine(line));

    // フォーマットに応じて振込データを抽出
    const transfers = parseTransfers(parsedRows, csvFormat);

    if (transfers.length === 0) {
      return NextResponse.json({ error: "CSVに入金データが見つかりませんでした", details: "入金額が0より大きい行がありません" }, { status: 400 });
    }

    console.log(`[Preview] Parsed ${transfers.length} transfers from CSV`);

    const tenantId = resolveTenantIdOrThrow(req);

    // Supabase接続
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ===== 照合済み振込をCSVから除外（再アップロード時の誤マッチ防止） =====
    const { data: reconciledRows } = await strictWithTenant(
      supabase
        .from("bank_statements")
        .select("transaction_date, description, deposit")
        .eq("reconciled", true),
      tenantId
    );
    const reconciledKeys = new Set(
      (reconciledRows || []).map((r: Record<string, unknown>) =>
        `${String(r.transaction_date)}|${String(r.description)}|${Number(r.deposit)}`
      )
    );
    const originalCount = transfers.length;
    const filteredTransfers = transfers.filter((t) => {
      const dateNormalized = t.date.replace(/\//g, "-");
      const key = `${dateNormalized}|${t.description}|${t.amount}`;
      return !reconciledKeys.has(key);
    });
    if (originalCount !== filteredTransfers.length) {
      console.log(`[Preview] 照合済み振込を除外: ${originalCount} → ${filteredTransfers.length}件（${originalCount - filteredTransfers.length}件除外）`);
    }
    // 以降はフィルタ済みの振込データを使用
    const activeTransfers = filteredTransfers;

    // pending_confirmationの注文を取得
    const { data: pendingOrdersWithNames, error: fetchNamesError } = await strictWithTenant(
      supabase
        .from("orders")
        .select("id, patient_id, product_code, product_name, amount, account_name, shipping_name, created_at")
        .eq("status", "pending_confirmation")
        .eq("payment_method", "bank_transfer"),
      tenantId
    );

    if (fetchNamesError) {
      console.error("[Preview] Fetch names error:", fetchNamesError);
      return NextResponse.json({ ok: false, error: "データ取得エラー", details: fetchNamesError.message }, { status: 500 });
    }

    if (!pendingOrdersWithNames || pendingOrdersWithNames.length === 0) {
      return NextResponse.json({
        matched: [],
        unmatched: activeTransfers.map((t) => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          reason: "照合待ちの注文がありません",
        })),
        summary: {
          total: activeTransfers.length,
          matched: 0,
          unmatched: activeTransfers.length,
          updated: 0,
        },
      });
    }

    console.log(`[Preview] Found ${pendingOrdersWithNames.length} pending orders`);

    // テナント設定から照合モードを取得
    const reconcileMode = await getSetting("payment", "reconcile_mode", tenantId ?? undefined) || "order_based";
    console.log(`[Preview] Reconcile mode: ${reconcileMode}`);

    // 照合処理（プレビューのみ、DB更新なし）
    const matched: { transfer: Transfer; order: typeof pendingOrdersWithNames[number] }[] = [];
    const amountMismatchList: { transfer: Transfer; order: typeof pendingOrdersWithNames[number]; difference: number }[] = [];
    const unmatched: { date: string; description: string; amount: number; reason: string }[] = [];
    const usedOrderIds = new Set<string>();

    console.log(`[Preview] Starting reconciliation...`);
    console.log(`[Preview] Transfers to match: ${activeTransfers.length} (${transfers.length - activeTransfers.length}件は照合済みのため除外)`);
    console.log(`[Preview] Pending orders: ${pendingOrdersWithNames.length}`);

    for (const transfer of activeTransfers) {
      let matchedOrder = null;
      let amountMismatchOrder = null;

      console.log(`\n[Preview] ===== 振込照合中: ¥${transfer.amount} =====`);

      // 金額と振込名義人で照合
      for (const order of pendingOrdersWithNames) {
        if (usedOrderIds.has(order.id)) continue;

        const accountName = order.account_name || "";
        if (!accountName) continue;

        const descNormalized = normalizeKana(transfer.description);
        const accountNormalized = normalizeKana(accountName);

        const normalizedMatch = descNormalized.includes(accountNormalized);
        const rawMatch = transfer.description.includes(accountName);
        const nameMatch = normalizedMatch || rawMatch;

        if (!nameMatch) continue;

        if (order.amount === transfer.amount) {
          // 金額一致 + 名義人一致 → 完全マッチ
          matchedOrder = order;
          console.log(`[Preview] 照合一致: order=${order.id}, amount=¥${order.amount}`);
          break;
        } else if (!amountMismatchOrder) {
          // 名義人一致・金額不一致 → 金額違い候補（最初の1件を記録）
          amountMismatchOrder = order;
          console.log(`[Preview] 名義一致・金額不一致: order=${order.id} (注文¥${order.amount} vs 振込¥${transfer.amount})`);
        }
      }

      if (matchedOrder) {
        matched.push({
          transfer,
          order: matchedOrder,
        });
        usedOrderIds.add(matchedOrder.id);
      } else if (amountMismatchOrder) {
        amountMismatchList.push({
          transfer,
          order: amountMismatchOrder,
          difference: transfer.amount - amountMismatchOrder.amount,
        });
      } else {
        console.log(`[Preview] ⚠️ No match found for this transfer`);
        unmatched.push({
          date: transfer.date,
          description: transfer.description,
          amount: transfer.amount,
          reason: reconcileMode === "statement_based"
            ? "対応する注文が見つかりません（不明な入金）"
            : "該当する注文が見つかりませんでした（金額または名義人が一致しません）",
        });
      }
    }

    // ===== 分割振込の検出（自動照合はしない） =====
    // 同一注文に対する複数の入金（2回振込等）を検出し、合算金額を提示
    const splitMatchedGroups: { transfers: Transfer[]; order: typeof pendingOrdersWithNames[number]; totalAmount: number }[] = [];
    if (amountMismatchList.length >= 2) {
      const mismatchByOrder = new Map<string, typeof amountMismatchList>();
      for (const item of amountMismatchList) {
        const orderId = item.order.id;
        if (!mismatchByOrder.has(orderId)) {
          mismatchByOrder.set(orderId, []);
        }
        mismatchByOrder.get(orderId)!.push(item);
      }

      const remainingMismatch: typeof amountMismatchList = [];

      for (const [, items] of mismatchByOrder) {
        if (items.length >= 2) {
          const totalAmount = items.reduce((sum, item) => sum + item.transfer.amount, 0);
          if (totalAmount === items[0].order.amount) {
            // 合算で金額一致 → splitMatchedとして検出（照合はしない）
            splitMatchedGroups.push({
              transfers: items.map((item) => item.transfer),
              order: items[0].order,
              totalAmount,
            });
            console.log(`[Preview] 🔍 Split payment detected: ${items.length} transfers totaling ¥${totalAmount} for order (¥${items[0].order.amount})`);
            continue;
          }
        }
        remainingMismatch.push(...items);
      }

      if (splitMatchedGroups.length > 0) {
        // 分割検出分をamountMismatchから除外
        amountMismatchList.length = 0;
        amountMismatchList.push(...remainingMismatch);
      }
    }

    console.log(`[Preview] Matched: ${matched.length}, AmountMismatch: ${amountMismatchList.length}, Unmatched: ${unmatched.length}`);

    // ★ デバッグ情報（サンプル最初の5件）
    const debugInfo = {
      totalTransfers: activeTransfers.length,
      skippedReconciled: transfers.length - activeTransfers.length,
      totalPendingOrders: pendingOrdersWithNames.length,
      csvTransfers: activeTransfers.slice(0, 5).map((t) => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        descNormalized: normalizeKana(t.description),
      })),
      pendingOrders: pendingOrdersWithNames.slice(0, 5).map((o) => ({
        id: o.id,
        patient_id: o.patient_id,
        amount: o.amount,
        account_name: o.account_name || "",
        accountNormalized: normalizeKana(o.account_name || ""),
      })),
    };

    // ===== CSV全明細行をbank_statementsに保存 =====
    const allTransactions = parseAllTransactions(parsedRows, csvFormat);
    if (allTransactions.length > 0) {
      // マッチした振込→注文の対応マップ（matched_order_id設定用）
      const matchedMap = new Map<string, string>();
      for (const m of matched) {
        matchedMap.set(`${m.transfer.date}|${m.transfer.description}`, m.order.id);
      }

      const csvFilename = file.name || "unknown.csv";
      const tid = tenantId || "00000000-0000-0000-0000-000000000001";

      // 既存行を取得して重複チェック用キーセットを作成
      const { data: existingRows } = await strictWithTenant(
        supabase
          .from("bank_statements")
          .select("transaction_date, description, deposit, withdrawal"),
        tenantId
      );
      const existingKeys = new Set(
        (existingRows || []).map((r: Record<string, unknown>) =>
          `${r.transaction_date}|${r.description}|${r.deposit}|${r.withdrawal}`
        )
      );

      // 新規行のみフィルタ
      const newRows = allTransactions
        .map((t) => {
          const dateNormalized = t.date.replace(/\//g, "-");
          const key = `${dateNormalized}|${t.description}|${t.deposit}|${t.withdrawal}`;
          if (existingKeys.has(key)) return null; // 既存行はスキップ

          const monthStr = dateNormalized.substring(0, 7);
          const matchKey = `${t.date}|${t.description}`;
          const matchedOrderId = matchedMap.get(matchKey) || null;
          return {
            tenant_id: tid,
            transaction_date: dateNormalized,
            description: t.description,
            deposit: t.deposit,
            withdrawal: t.withdrawal,
            balance: t.balance,
            month: monthStr,
            reconciled: false,
            matched_order_id: matchedOrderId,
            csv_filename: csvFilename,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      // 新規行のみINSERT（1000行ずつバッチ）
      if (newRows.length > 0) {
        for (let i = 0; i < newRows.length; i += 1000) {
          const batch = newRows.slice(i, i + 1000);
          const { error: insertError } = await supabase.from("bank_statements").insert(batch);
          if (insertError) {
            console.error("[Preview] bank_statements insert error:", insertError);
          }
        }
      }

      // ★ 既存行でマッチしたものにmatched_order_idを設定（reconciled=falseのまま）
      for (const m of matched) {
        const transferDate = m.transfer.date.replace(/\//g, "-");
        await strictWithTenant(
          supabase
            .from("bank_statements")
            .update({ matched_order_id: m.order.id })
            .eq("transaction_date", transferDate)
            .eq("description", m.transfer.description)
            .eq("deposit", m.transfer.amount)
            .is("matched_order_id", null),
          tenantId
        );
      }

      console.log(`[Preview] Saved ${newRows.length} new transactions (${allTransactions.length - newRows.length} duplicates skipped)`);
    }

    logAudit(req, "bank_transfer_reconcile.preview", "order", "preview");
    return NextResponse.json({
      mode: reconcileMode,
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
      amountMismatch: amountMismatchList.map((m) => ({
        transfer: m.transfer,
        order: {
          id: m.order.id,
          patient_id: m.order.patient_id,
          product_code: m.order.product_code,
          product_name: m.order.product_name,
          amount: m.order.amount,
        },
        difference: m.difference,
      })),
      splitMatched: splitMatchedGroups.map((g) => ({
        transfers: g.transfers,
        order: {
          patient_id: g.order.patient_id,
          product_code: g.order.product_code,
          amount: g.order.amount,
        },
        totalAmount: g.totalAmount,
      })),
      unmatched: unmatched.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")),
      summary: {
        total: activeTransfers.length,
        skippedReconciled: transfers.length - activeTransfers.length,
        matched: matched.length,
        splitMatched: splitMatchedGroups.length,
        amountMismatch: amountMismatchList.length,
        unmatched: unmatched.length,
        updated: 0, // プレビューなので0
      },
      debug: debugInfo, // ★ デバッグ情報を追加
    });
  } catch (e) {
    console.error("[Preview] Error:", e);
    return serverError((e instanceof Error ? e.message : null) || "サーバーエラー");
  }
}

/** CSV1行をパース（カンマ区切り、ダブルクォート対応） */
function parseCSVLine(line: string): string[] {
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
}

interface Transfer {
  date: string;
  description: string;
  amount: number;
}

/** 入出金すべての明細行 */
interface BankTransaction {
  date: string;        // YYYY/MM/DD or YYYY-MM-DD
  description: string;
  deposit: number;     // 入金額
  withdrawal: number;  // 出金額
  balance: number | null;
}

/** フォーマットに応じてCSV行から振込データを抽出 */
function parseTransfers(parsedRows: string[][], format: string): Transfer[] {
  switch (format) {
    case "paypay":
      return parsePayPayCSV(parsedRows);
    case "gmo":
    default:
      return parseGmoCSV(parsedRows);
  }
}

/** 住信SBIネット銀行フォーマット: [日付, 摘要, 出金, 入金, ...] */
function parseGmoCSV(parsedRows: string[][]): Transfer[] {
  const dataRows = parsedRows.slice(1); // ヘッダースキップ
  return dataRows
    .map((cols) => {
      let date = "";
      let description = "";
      let amount = 0;

      if (cols.length >= 4) {
        date = cols[0] || "";
        description = cols[1] || "";

        const depositStr = cols[3]?.replace(/[,円]/g, "") || "0";
        const deposit = parseInt(depositStr, 10) || 0;

        if (deposit > 0) {
          amount = deposit;
        }
      }
      return { date, description, amount };
    })
    .filter((t) => t.amount > 0);
}

/** PayPay銀行フォーマット: 1行目=口座識別子, 2行目=ヘッダー, 3行目以降=データ */
function parsePayPayCSV(parsedRows: string[][]): Transfer[] {
  // ヘッダー行を検出（「摘要」を含む行）
  let headerIdx = -1;
  for (let i = 0; i < Math.min(5, parsedRows.length); i++) {
    if (parsedRows[i].some((c) => c.includes("摘要"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const headers = parsedRows[headerIdx];

  // ヘッダーからカラム位置を検出
  let descIdx = -1;
  let depositIdx = -1;
  let yearIdx = -1;
  let monthIdx = -1;
  let dayIdx = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].trim();
    if (h === "摘要") descIdx = i;
    if (h.includes("お預り")) depositIdx = i;
    if (h.includes("操作日") && h.includes("年")) yearIdx = i;
    if (h.includes("操作日") && h.includes("月")) monthIdx = i;
    if (h.includes("操作日") && h.includes("日")) dayIdx = i;
  }

  const dataRows = parsedRows.slice(headerIdx + 1);

  return dataRows
    .map((cols) => {
      const year = yearIdx >= 0 ? cols[yearIdx] || "" : "";
      const month = monthIdx >= 0 ? (cols[monthIdx] || "").padStart(2, "0") : "";
      const day = dayIdx >= 0 ? (cols[dayIdx] || "").padStart(2, "0") : "";
      const date = year ? `${year}/${month}/${day}` : "";

      const description = descIdx >= 0 ? cols[descIdx] || "" : "";

      const depositStr = depositIdx >= 0 ? (cols[depositIdx] || "0").replace(/[,円]/g, "") : "0";
      const deposit = parseInt(depositStr, 10) || 0;

      return { date, description, amount: deposit };
    })
    .filter((t) => t.amount > 0);
}

/** フォーマットに応じてCSV全行（入金+出金）をパース */
function parseAllTransactions(parsedRows: string[][], format: string): BankTransaction[] {
  switch (format) {
    case "paypay":
      return parseAllPayPay(parsedRows);
    case "gmo":
    default:
      return parseAllGmo(parsedRows);
  }
}

/** 住信SBI全行パース: [日付, 摘要, 出金, 入金, 残高, ...] */
function parseAllGmo(parsedRows: string[][]): BankTransaction[] {
  const dataRows = parsedRows.slice(1);
  return dataRows
    .map((cols) => {
      if (cols.length < 4) return null;
      const date = cols[0] || "";
      const description = cols[1] || "";
      const withdrawalStr = cols[2]?.replace(/[,円]/g, "") || "0";
      const depositStr = cols[3]?.replace(/[,円]/g, "") || "0";
      const balanceStr = cols[4]?.replace(/[,円]/g, "") || "";
      const withdrawal = parseInt(withdrawalStr, 10) || 0;
      const deposit = parseInt(depositStr, 10) || 0;
      const balance = balanceStr ? (parseInt(balanceStr, 10) || null) : null;
      if (!date || (deposit === 0 && withdrawal === 0)) return null;
      return { date, description, deposit, withdrawal, balance };
    })
    .filter((t): t is BankTransaction => t !== null);
}

/** PayPay銀行全行パース: ヘッダー検出 → 年月日・摘要・引出・預入・残高 */
function parseAllPayPay(parsedRows: string[][]): BankTransaction[] {
  let headerIdx = -1;
  for (let i = 0; i < Math.min(5, parsedRows.length); i++) {
    if (parsedRows[i].some((c) => c.includes("摘要"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const headers = parsedRows[headerIdx];
  let descIdx = -1;
  let depositIdx = -1;
  let withdrawalIdx = -1;
  let balanceIdx = -1;
  let yearIdx = -1;
  let monthIdx = -1;
  let dayIdx = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].trim();
    if (h === "摘要") descIdx = i;
    if (h.includes("お預り") || h.includes("預入")) depositIdx = i;
    if (h.includes("お引出") || h.includes("引出")) withdrawalIdx = i;
    if (h.includes("残高")) balanceIdx = i;
    if (h.includes("操作日") && h.includes("年")) yearIdx = i;
    if (h.includes("操作日") && h.includes("月")) monthIdx = i;
    if (h.includes("操作日") && h.includes("日")) dayIdx = i;
  }

  const dataRows = parsedRows.slice(headerIdx + 1);
  return dataRows
    .map((cols) => {
      const year = yearIdx >= 0 ? cols[yearIdx] || "" : "";
      const month = monthIdx >= 0 ? (cols[monthIdx] || "").padStart(2, "0") : "";
      const day = dayIdx >= 0 ? (cols[dayIdx] || "").padStart(2, "0") : "";
      const date = year ? `${year}/${month}/${day}` : "";
      const description = descIdx >= 0 ? cols[descIdx] || "" : "";
      const depositStr = depositIdx >= 0 ? (cols[depositIdx] || "0").replace(/[,円]/g, "") : "0";
      const withdrawalStr = withdrawalIdx >= 0 ? (cols[withdrawalIdx] || "0").replace(/[,円]/g, "") : "0";
      const balanceStr = balanceIdx >= 0 ? (cols[balanceIdx] || "").replace(/[,円]/g, "") : "";
      const deposit = parseInt(depositStr, 10) || 0;
      const withdrawal = parseInt(withdrawalStr, 10) || 0;
      const balance = balanceStr ? (parseInt(balanceStr, 10) || null) : null;
      if (!date || (deposit === 0 && withdrawal === 0)) return null;
      return { date, description, deposit, withdrawal, balance };
    })
    .filter((t): t is BankTransaction => t !== null);
}

/**
 * カタカナを正規化（小文字→大文字、半角→全角、スペース削除など）
 */
function normalizeKana(str: string): string {
  if (!str) return "";

  let normalized = str;

  // 半角カタカナを全角に変換
  const halfToFull: Record<string, string> = {
    "ｱ": "ア", "ｲ": "イ", "ｳ": "ウ", "ｴ": "エ", "ｵ": "オ",
    "ｶ": "カ", "ｷ": "キ", "ｸ": "ク", "ｹ": "ケ", "ｺ": "コ",
    "ｻ": "サ", "ｼ": "シ", "ｽ": "ス", "ｾ": "セ", "ｿ": "ソ",
    "ﾀ": "タ", "ﾁ": "チ", "ﾂ": "ツ", "ﾃ": "テ", "ﾄ": "ト",
    "ﾅ": "ナ", "ﾆ": "ニ", "ﾇ": "ヌ", "ﾈ": "ネ", "ﾉ": "ノ",
    "ﾊ": "ハ", "ﾋ": "ヒ", "ﾌ": "フ", "ﾍ": "ヘ", "ﾎ": "ホ",
    "ﾏ": "マ", "ﾐ": "ミ", "ﾑ": "ム", "ﾒ": "メ", "ﾓ": "モ",
    "ﾔ": "ヤ", "ﾕ": "ユ", "ﾖ": "ヨ",
    "ﾗ": "ラ", "ﾘ": "リ", "ﾙ": "ル", "ﾚ": "レ", "ﾛ": "ロ",
    "ﾜ": "ワ", "ｦ": "ヲ", "ﾝ": "ン",
    "ｧ": "ア", "ｨ": "イ", "ｩ": "ウ", "ｪ": "エ", "ｫ": "オ", // 半角小文字→全角大文字
    "ｬ": "ヤ", "ｭ": "ユ", "ｮ": "ヨ", "ｯ": "ツ",
    "ﾞ": "", "ﾟ": "", // 濁点・半濁点は削除
    "ｰ": "ー", // 長音
  };

  // 濁音・半濁音の合成（半角）
  const dakutenMap: Record<string, string> = {
    "ｶﾞ": "ガ", "ｷﾞ": "ギ", "ｸﾞ": "グ", "ｹﾞ": "ゲ", "ｺﾞ": "ゴ",
    "ｻﾞ": "ザ", "ｼﾞ": "ジ", "ｽﾞ": "ズ", "ｾﾞ": "ゼ", "ｿﾞ": "ゾ",
    "ﾀﾞ": "ダ", "ﾁﾞ": "ヂ", "ﾂﾞ": "ヅ", "ﾃﾞ": "デ", "ﾄﾞ": "ド",
    "ﾊﾞ": "バ", "ﾋﾞ": "ビ", "ﾌﾞ": "ブ", "ﾍﾞ": "ベ", "ﾎﾞ": "ボ",
    "ﾊﾟ": "パ", "ﾋﾟ": "ピ", "ﾌﾟ": "プ", "ﾍﾟ": "ペ", "ﾎﾟ": "ポ",
    "ｳﾞ": "ヴ",
  };

  // 濁音・半濁音を先に変換
  for (const [half, full] of Object.entries(dakutenMap)) {
    normalized = normalized.replace(new RegExp(half, "g"), full);
  }

  // 半角→全角変換
  for (const [half, full] of Object.entries(halfToFull)) {
    normalized = normalized.replace(new RegExp(half, "g"), full);
  }

  // 全角小文字カタカナを大文字に変換
  const smallToLarge: Record<string, string> = {
    "ァ": "ア", "ィ": "イ", "ゥ": "ウ", "ェ": "エ", "ォ": "オ",
    "ャ": "ヤ", "ュ": "ユ", "ョ": "ヨ",
    "ッ": "ツ",
    "ヮ": "ワ",
    "ヵ": "カ", "ヶ": "ケ",
  };

  for (const [small, large] of Object.entries(smallToLarge)) {
    normalized = normalized.replace(new RegExp(small, "g"), large);
  }

  // ひらがな→カタカナ変換（ぁ-ん → ァ-ン）
  normalized = normalized.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );

  // スペース、記号を削除
  normalized = normalized.replace(/[\s\-\(\)（）・．.、，,。]/g, "");

  // 英字は大文字に
  normalized = normalized.toUpperCase();

  return normalized;
}
