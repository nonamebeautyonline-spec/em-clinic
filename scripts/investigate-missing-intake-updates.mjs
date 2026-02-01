import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== Intakeテーブル更新失敗の原因調査 ===\n");

const problemPatients = [
  { id: "20260101576", latest_reserve: "resv-1769700832432", date: "2026-01-30", time: "16:30:00" },
  { id: "20260100211", latest_reserve: "resv-1769732917014", date: "2026-01-30", time: "16:45:00" },
];

for (const patient of problemPatients) {
  console.log(`\n【patient_id: ${patient.id}】`);

  // 予約作成履歴を時系列で確認
  const { data: reservations } = await supabase
    .from("reservations")
    .select("reserve_id, reserved_date, reserved_time, status, created_at")
    .eq("patient_id", patient.id)
    .eq("reserved_date", patient.date)
    .order("created_at", { ascending: true });

  console.log(`今日の予約作成履歴（時系列順）:`);
  reservations.forEach((r, i) => {
    const statusLabel = r.status === "canceled" ? "キャンセル" : "アクティブ";
    const time = r.created_at.slice(11, 19);
    console.log(`  ${i+1}. ${time} - ${r.reserved_time} ${statusLabel} (${r.reserve_id})`);
  });

  // キャンセル→再予約のパターンを確認
  const canceled = reservations.filter(r => r.status === "canceled");
  const active = reservations.filter(r => r.status !== "canceled");

  console.log(`\n  パターン:`);
  console.log(`    - キャンセル: ${canceled.length}回`);
  console.log(`    - 現在アクティブ: ${active.length}件`);

  if (canceled.length > 0) {
    console.log(`\n  予想される原因:`);
    console.log(`    1. 予約を${canceled.length}回キャンセル`);
    console.log(`    2. キャンセル時にintakeの予約情報がクリア (reserve_id=null)`);
    console.log(`    3. 再予約時にintakeテーブルの更新が失敗`);
    console.log(`       → 理由: patient_idでUPDATEしたが、該当レコードがない、または`);
    console.log(`               条件が合わず0件更新になった可能性`);
  }
}

console.log("\n\n【根本原因の推測】");
console.log("予約作成時のintakeテーブル更新処理:");
console.log("  - コード: .eq('patient_id', pid)");
console.log("  - 問題: patient_idのみで更新するため、該当レコードが複数ある場合や");
console.log("          特定の条件下で更新が失敗する可能性がある");
console.log("\n対策案:");
console.log("  - 予約作成時、intakeレコードの存在確認を強化");
console.log("  - 更新結果(affected rows)を確認し、0件の場合はエラーログを出力");
console.log("  - リトライ処理の強化");

console.log("\n=== 調査完了 ===");
