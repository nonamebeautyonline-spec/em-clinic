const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=["']?([^"'\n]*)["']?$/);
  if (match) {
    process.env[match[1]] = match[2].trim();
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // 患者159の予約ID 3331の詳細を確認
  console.log("=== 予約ID 3331 の詳細 ===");
  const { data: res } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", 3331)
    .single();

  if (res) {
    const createdJST = new Date(new Date(res.created_at).getTime() + 9*60*60*1000);
    const updatedJST = new Date(new Date(res.updated_at).getTime() + 9*60*60*1000);
    console.log("作成日時:", createdJST.toISOString().slice(0,19), "JST");
    console.log("更新日時:", updatedJST.toISOString().slice(0,19), "JST");
    console.log("状態:", res.status);
    console.log("");
    console.log("【解釈】");
    console.log("この予約は 2/4 01:13 に作成され、2/5 12:54 にキャンセルされました。");
    console.log("2/5 12:45頃に「新しい予約」が作成された記録はDBにありません。");
  }

  // 12:40-13:00に作成された予約（全患者）
  console.log("\n=== 2/5 12:40-13:00 JSTに作成された予約（全患者） ===");
  const { data: created } = await supabase
    .from("reservations")
    .select("id, patient_id, patient_name, reserved_date, reserved_time, status, created_at")
    .gte("created_at", "2026-02-05T03:40:00+00:00")
    .lte("created_at", "2026-02-05T04:00:00+00:00")
    .order("created_at", { ascending: true });

  if (created && created.length > 0) {
    created.forEach(r => {
      const createdJST = new Date(new Date(r.created_at).getTime() + 9*60*60*1000);
      console.log(`[${createdJST.toISOString().slice(11,19)}] ${r.patient_name} (${r.patient_id})`);
      console.log(`  → ${r.reserved_date} ${r.reserved_time} - ${r.status}`);
    });
  } else {
    console.log("(この時間帯に新規作成された予約なし)");
  }

  // 重要：もし12:54に何かの操作で「旧予約がキャンセル」されたなら
  // 新予約を取ろうとしても、枠が大木さんで埋まっていた可能性
  console.log("\n=== 考えられるシナリオ ===");
  console.log("1. 2/4 01:13: 患者159が2/5 13:00予約を作成");
  console.log("2. 2/5 12:54: 予約がキャンセルされた");
  console.log("3. 2/5 12:45頃: 患者が新規予約を試みた可能性");
  console.log("   → しかしDBには新規予約の記録なし");
  console.log("");
  console.log("可能性A: フロントエンドでエラーが発生し予約が保存されなかった");
  console.log("可能性B: 予約完了前に画面を閉じた");
  console.log("可能性C: 13:00枠が既に大木さんで埋まっていて予約できなかった");
}

main();
