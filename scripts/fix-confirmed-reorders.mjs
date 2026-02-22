/**
 * confirmed のまま残っている reorder を検出し、
 * 同一 patient_id で orders テーブルに決済済みレコードがあれば paid に更新する
 *
 * Usage: node scripts/fix-confirmed-reorders.mjs [--dry-run]
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const dryRun = process.argv.includes("--dry-run");

async function main() {
  // 1) confirmed のまま残っている reorder を全件取得
  const { data: confirmed, error: err1 } = await supabase
    .from("reorders")
    .select("id, patient_id, product_code, gas_row_number, created_at")
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });

  if (err1) {
    console.error("reorders取得エラー:", err1);
    return;
  }

  console.log(`confirmed reorder: ${confirmed.length}件`);
  if (confirmed.length === 0) {
    console.log("対象なし");
    return;
  }

  // 2) 対象 patient_id で orders にCOMPLETEDレコードがあるか確認
  let fixCount = 0;
  for (const r of confirmed) {
    // 同じ patient_id + product_code で決済済みの order を探す
    const { data: paidOrders } = await supabase
      .from("orders")
      .select("id, product_code, paid_at, payment_status")
      .eq("patient_id", r.patient_id)
      .eq("payment_status", "COMPLETED")
      .order("paid_at", { ascending: false });

    // product_code が一致する決済済み order があるか
    const matchingOrder = (paidOrders || []).find((o) => {
      // reorder の created_at 以降に決済された order を探す
      if (!o.paid_at) return false;
      const orderPaid = new Date(o.paid_at).getTime();
      const reorderCreated = new Date(r.created_at).getTime();
      // reorder作成後に決済されたものだけ（1日前まで許容）
      return orderPaid >= reorderCreated - 86400000;
    });

    if (matchingOrder) {
      console.log(
        `[FIX] reorder id=${r.id} gas_row=${r.gas_row_number} patient=${r.patient_id} ` +
        `product=${r.product_code} → 対応order: ${matchingOrder.id} paid_at=${matchingOrder.paid_at}`
      );

      if (!dryRun) {
        const { error: upErr } = await supabase
          .from("reorders")
          .update({ status: "paid", paid_at: matchingOrder.paid_at || new Date().toISOString() })
          .eq("id", r.id);

        if (upErr) {
          console.error(`  ❌ 更新失敗: id=${r.id}`, upErr);
        } else {
          console.log(`  ✅ 更新完了: id=${r.id}`);
          fixCount++;
        }
      } else {
        console.log(`  (dry-run: 更新スキップ)`);
        fixCount++;
      }
    } else {
      console.log(
        `[SKIP] reorder id=${r.id} patient=${r.patient_id} product=${r.product_code} → 対応する決済済みorderなし`
      );
    }
  }

  console.log(`\n完了: ${fixCount}/${confirmed.length}件 ${dryRun ? "(dry-run)" : "更新済み"}`);
}

main().catch(console.error);
