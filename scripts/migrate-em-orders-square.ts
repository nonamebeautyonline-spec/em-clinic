// scripts/migrate-em-orders-square.ts
// EMオンラインクリニック: Square Payments APIから決済データを取得してem_order_stagingに投入
//
// 使い方:
//   npx tsx scripts/migrate-em-orders-square.ts --tenant-id <UUID>                    # ドライラン
//   npx tsx scripts/migrate-em-orders-square.ts --tenant-id <UUID> --exec             # 本番実行
//   npx tsx scripts/migrate-em-orders-square.ts --tenant-id <UUID> --start 2023-01-01 # 開始日指定
//
// 環境変数（.env.local）:
//   SQUARE_ACCESS_TOKEN=EAAAxxxx
//
// 処理（GASの syncSquareFromRange_ と同じロジック）:
//   1. GET /v2/payments（ページネーション） → 全決済取得
//   2. GET /v2/customers/{id} → 顧客情報（名前・メール・電話）
//   3. GET /v2/orders/{id} → 商品名・配送先情報
//   4. em_order_staging に source='square' で投入

import { readFileSync } from "fs";
import { resolve } from "path";

// .env.local読み込み
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;
const SQUARE_TOKEN = envVars.SQUARE_ACCESS_TOKEN;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("環境変数不足: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!SQUARE_TOKEN) {
  console.error("環境変数不足: SQUARE_ACCESS_TOKEN を .env.local に追加してください");
  process.exit(1);
}

const SQUARE_BASE = "https://connect.squareup.com";

const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
const tenantId = getArg("tenant-id");
const locationId = getArg("location-id") || "L0E9CKXBSHRNV"; // EMオンライン診療クリニック
const isExec = args.includes("--exec");
const startDate = getArg("start") || "2023-01-01";
const endDate = getArg("end");

if (!tenantId) {
  console.error("使い方: npx tsx scripts/migrate-em-orders-square.ts --tenant-id <UUID> [--exec] [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--location-id <ID>]");
  process.exit(1);
}

// normalizeJPPhone
function normalizeJPPhone(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  let digits = s.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0080")) digits = "080" + digits.slice(4);
  else if (digits.startsWith("0090")) digits = "090" + digits.slice(4);
  else if (digits.startsWith("0070")) digits = "070" + digits.slice(4);
  else if (digits.startsWith("00")) digits = digits.slice(1);
  if (digits.startsWith("81") && digits.length >= 11) {
    digits = digits.slice(2);
    if (!digits.startsWith("0")) digits = "0" + digits;
  }
  if (!digits.startsWith("0") && /^[789]/.test(digits)) digits = "0" + digits;
  return digits;
}

// cleanEmName
function cleanEmName(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  let s = trimmed.replace(
    /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2B50}\u{2705}\u{274C}\u{2B55}\u{26AA}\u{26AB}\u{25CF}\u{25CB}\u{25A0}\u{25A1}\u{2764}\u{2716}\u{2714}\u{23F0}-\u{23FA}\u{2934}\u{2935}\u{25AA}\u{25AB}\u{25FE}\u{25FD}\u{25FC}\u{25FB}\u{2B1B}\u{2B1C}\u{3030}\u{303D}\u{FE0E}]+/u,
    "",
  ).trim();
  const prefixes = [
    "郵便局", "診断書", "要確認", "確認済", "確認済み",
    "発送済", "発送済み", "返品", "保留", "キャンセル",
    "再発送", "転送", "書留", "速達", "レターパック",
    "ゆうパック", "宅急便", "クリックポスト", "ネコポス",
  ];
  for (const prefix of prefixes) {
    if (s.startsWith(prefix)) {
      s = s.slice(prefix.length).trim();
      break;
    }
  }
  const parts = s.split(/[\s　]+/).filter(Boolean);
  if (parts.length >= 2 && prefixes.some((p) => parts[0].includes(p))) {
    s = parts.slice(1).join("");
  } else if (parts.length >= 2) {
    s = parts.join("");
  }
  return s || trimmed;
}

// Square API呼び出し（レート制限対応リトライ付き）
async function squareFetch(url: string): Promise<unknown> {
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${SQUARE_TOKEN}`,
        Accept: "application/json",
      },
    });

    if (res.status === 429) {
      const waitMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
      console.log(`  レート制限、${Math.round(waitMs / 1000)}秒待機...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Square API ${url}: ${res.status} ${text}`);
    }

    return res.json();
  }
  throw new Error(`Square API: ${maxRetries}回リトライ後も失敗`);
}

// 返金判定（GASの shouldSkipAsRefund_ と同じ）
function shouldSkipAsRefund(p: Record<string, unknown>): boolean {
  if (!p) return false;
  const paid = Number((p.amount_money as Record<string, unknown>)?.amount || 0);
  const refunded = Number((p.refunded_money as Record<string, unknown>)?.amount || 0);
  const status = String(p.status || "");
  if (refunded > 0 && refunded >= paid) return true;
  if (status === "CANCELED" || status === "FAILED") return true;
  return false;
}

type StagingRow = {
  source_phone: string;
  source_phone_normalized: string;
  source_name_raw: string;
  source_name: string;
  source_email: string;
  source_postal: string;
  source_address: string;
  product_name: string;
  amount: number;
  paid_at: string | null;
  csv_year: number | null;
  tenant_id: string;
  source: string;
  square_order_id: string;
};

async function main() {
  console.log("=== EMオンラインクリニック Square決済データ取得 ===");
  console.log(`モード: ${isExec ? "本番実行" : "ドライラン"}`);
  console.log(`テナントID: ${tenantId}`);
  console.log(`ロケーション: ${locationId}`);
  console.log(`期間: ${startDate} ～ ${endDate || "現在"}`);

  // 1. 期間を3ヶ月チャンクに分割（Square APIのページネーション上限回避）
  const chunks: Array<{ begin: string; end: string; label: string }> = [];
  {
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = endDate ? new Date(`${endDate}T23:59:59Z`) : new Date();
    let cursor = new Date(start);
    while (cursor < end) {
      const chunkEnd = new Date(cursor);
      chunkEnd.setMonth(chunkEnd.getMonth() + 3);
      if (chunkEnd > end) chunkEnd.setTime(end.getTime());
      const label = `${cursor.toISOString().slice(0, 7)} ～ ${chunkEnd.toISOString().slice(0, 7)}`;
      chunks.push({
        begin: cursor.toISOString(),
        end: chunkEnd.toISOString(),
        label,
      });
      cursor = new Date(chunkEnd);
    }
  }
  console.log(`\n${chunks.length}チャンクに分割して取得`);

  console.log("\n決済データ取得中（Payments API）...");
  const records: StagingRow[] = [];
  let skippedRefunds = 0;
  let skippedIncomplete = 0;
  let totalPayments = 0;

  // 顧客キャッシュ（同一customer_idを何度も取得しない）
  const customerCache = new Map<string, { name: string; email: string; phone: string }>();

  for (const chunk of chunks) {
    let url: string | null = `${SQUARE_BASE}/v2/payments?location_id=${locationId}&begin_time=${encodeURIComponent(chunk.begin)}&end_time=${encodeURIComponent(chunk.end)}&sort_order=ASC&limit=100`;
    let chunkCount = 0;

    while (url) {
      const resp = await squareFetch(url) as {
        payments?: Record<string, unknown>[];
        cursor?: string;
      };

      const payments = resp.payments || [];
      totalPayments += payments.length;
      chunkCount += payments.length;

      for (const P of payments) {
        const paymentId = String(P.id || "");
        if (!paymentId) continue;

        const status = String(P.status || "");
        if (status !== "COMPLETE" && status !== "COMPLETED") {
          skippedIncomplete++;
          continue;
        }
        if (shouldSkipAsRefund(P)) {
          skippedRefunds++;
          continue;
        }

        // 金額（JPYは最小単位=円）
        const amtMoney = P.amount_money as { amount?: number; currency?: string } | undefined;
        const amount = amtMoney?.amount || 0;
        if (amount === 0) continue;

        const createdAt = String(P.created_at || P.approved_at || P.updated_at || "");

        let shipName = "";
        let payerName = "";
        let email = "";
        let phone = "";
        let postal = "";
        let address = "";
        let items = "";

        // 顧客情報取得（キャッシュ付き）
        const customerId = String(P.customer_id || "");
        if (customerId) {
          if (customerCache.has(customerId)) {
            const cached = customerCache.get(customerId)!;
            payerName = cached.name;
            email = cached.email;
            phone = cached.phone;
          } else {
            try {
              const cRes = await squareFetch(`${SQUARE_BASE}/v2/customers/${customerId}`) as {
                customer?: Record<string, unknown>;
              };
              const c = cRes.customer;
              if (c) {
                const fam = String(c.family_name || "");
                const giv = String(c.given_name || "");
                payerName = (fam || giv) ? `${fam} ${giv}`.trim() : String(c.nickname || "");
                email = String(c.email_address || "").toLowerCase();
                phone = String(c.phone_number || "");
                customerCache.set(customerId, { name: payerName, email, phone });
              }
            } catch {
              // 削除済み顧客等はスキップ
            }
          }
        }

        // buyer_email_addressで補完
        if (!email && P.buyer_email_address) {
          email = String(P.buyer_email_address).toLowerCase();
        }

        // 注文情報取得（商品名・配送先）
        const orderId = String(P.order_id || "");
        if (orderId) {
          try {
            const oRes = await squareFetch(`${SQUARE_BASE}/v2/orders/${orderId}`) as {
              order?: Record<string, unknown>;
            };
            const o = oRes.order;
            if (o) {
              // 商品名
              const lineItems = o.line_items as Array<{ name?: string; quantity?: string }> | undefined;
              if (lineItems?.length) {
                items = lineItems
                  .map((li) => `${li.name || ""}${li.quantity ? ` x${li.quantity}` : ""}`.trim())
                  .filter(Boolean)
                  .join(" / ");
              }

              // 配送先（fulfillment）
              const fulfillments = o.fulfillments as Array<{
                shipment_details?: {
                  recipient?: {
                    display_name?: string;
                    phone_number?: string;
                    email_address?: string;
                    address?: {
                      postal_code?: string;
                      administrative_district_level_1?: string;
                      locality?: string;
                      address_line_1?: string;
                      address_line_2?: string;
                    };
                  };
                };
              }> | undefined;

              const rec = fulfillments?.[0]?.shipment_details?.recipient;
              if (rec) {
                const dn = (rec.display_name || "").trim();
                if (dn) shipName = dn;
                if (!phone && rec.phone_number) phone = rec.phone_number;
                if (!email && rec.email_address) email = String(rec.email_address).toLowerCase();

                const addr = rec.address;
                if (addr) {
                  postal = (addr.postal_code || "").replace(/[^\d]/g, "");
                  const addrParts = [
                    addr.administrative_district_level_1,
                    addr.locality,
                    addr.address_line_1,
                    addr.address_line_2,
                  ].filter(Boolean);
                  address = addrParts.join("").replace(/[\s\u3000]+/g, "");
                }
              }
            }
          } catch {
            // 注文取得失敗はスキップ
          }
        }

        const nameRaw = (shipName || payerName || "").trim();
        const year = createdAt ? new Date(createdAt).getFullYear() : null;

        records.push({
          source_phone: phone,
          source_phone_normalized: normalizeJPPhone(phone),
          source_name_raw: nameRaw,
          source_name: cleanEmName(nameRaw),
          source_email: (email || "").toLowerCase().trim(),
          source_postal: postal,
          source_address: address,
          product_name: items,
          amount,
          paid_at: createdAt || null,
          csv_year: year,
          tenant_id: tenantId!,
          source: "square",
          square_order_id: paymentId, // payment_idを突合キーとして使用
        });
      }

      // ページネーション（日時フィルタを維持 — cursorだけだと全期間返す）
      if (resp.cursor) {
        url = `${SQUARE_BASE}/v2/payments?location_id=${locationId}&begin_time=${encodeURIComponent(chunk.begin)}&end_time=${encodeURIComponent(chunk.end)}&sort_order=ASC&limit=100&cursor=${encodeURIComponent(resp.cursor)}`;
      } else {
        url = null;
      }
    }

    console.log(`  ${chunk.label}: ${chunkCount}件 (累計: ${totalPayments}件 → 有効: ${records.length}件)`);
  }

  console.log(`\n取得完了:`);
  console.log(`  総決済数: ${totalPayments}件`);
  console.log(`  有効レコード: ${records.length}件`);
  console.log(`  返金スキップ: ${skippedRefunds}件`);
  console.log(`  未完了スキップ: ${skippedIncomplete}件`);
  console.log(`  顧客キャッシュ: ${customerCache.size}件`);

  // 統計
  const noPhone = records.filter((r) => !r.source_phone_normalized);
  const noEmail = records.filter((r) => !r.source_email);
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
  const uniquePhones = new Set(records.filter((r) => r.source_phone_normalized).map((r) => r.source_phone_normalized));

  // 年ごとの件数
  const yearCounts = new Map<number, { count: number; amount: number }>();
  for (const r of records) {
    const y = r.csv_year || 0;
    const existing = yearCounts.get(y) || { count: 0, amount: 0 };
    existing.count++;
    existing.amount += r.amount;
    yearCounts.set(y, existing);
  }

  console.log(`\n--- 統計 ---`);
  console.log(`電話番号なし: ${noPhone.length}件`);
  console.log(`メールなし: ${noEmail.length}件`);
  console.log(`金額合計: ${totalAmount.toLocaleString()}円`);
  console.log(`ユニーク電話番号: ${uniquePhones.size}件`);

  console.log(`\n--- 年別内訳 ---`);
  for (const [year, data] of [...yearCounts.entries()].sort()) {
    console.log(`  ${year}年: ${data.count.toLocaleString()}件 / ${data.amount.toLocaleString()}円`);
  }

  // サンプル
  console.log(`\n--- サンプル（最初の5件） ---`);
  for (const r of records.slice(0, 5)) {
    console.log(`  ${r.paid_at} | ${r.source_name} | ${r.source_phone_normalized} | ${r.source_email} | ${r.product_name} | ${r.amount.toLocaleString()}円`);
  }

  if (!isExec) {
    console.log("\n[ドライラン] --exec フラグで本番実行してください");
    return;
  }

  // 5. em_order_stagingにバッチINSERT
  console.log("\nem_order_stagingテーブルにINSERT中...");
  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/em_order_staging`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`バッチ ${i} INSERT失敗: ${res.status} ${errorText}`);
    }

    inserted += batch.length;
    console.log(`  進捗: ${inserted}/${records.length}`);
  }

  console.log(`\n=== 完了 ===`);
  console.log(`投入成功: ${inserted}件`);
  console.log(`金額合計: ${totalAmount.toLocaleString()}円`);
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
