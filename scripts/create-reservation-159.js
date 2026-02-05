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
  const patientId = "20260200159";
  const patientName = "ほんだりさ";
  console.log("患者:", patientName, `(${patientId})`);

  // 2. 既存のキャンセル済み予約の構造を確認
  const { data: existing } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", 3331)
    .single();

  console.log("\n既存予約の構造:", JSON.stringify(existing, null, 2));

  // 3. 新しい予約を作成（既存のキャンセル済み予約を復活させる）
  console.log("\n予約を復活させます...");

  const { data: updated, error } = await supabase
    .from("reservations")
    .update({
      status: "pending",
      reserved_time: "13:00:00"  // 13:00-13:15
    })
    .eq("id", 3331)
    .select()
    .single();

  if (error) {
    console.log("エラー:", error.message);
    return;
  }

  console.log("\n=== 予約復活完了 ===");
  console.log("ID:", updated.id);
  console.log("患者:", updated.patient_name, `(${updated.patient_id})`);
  console.log("日時:", updated.reserved_date, updated.reserved_time);
  console.log("状態:", updated.status);

  // 4. 確認
  const { data: verify } = await supabase
    .from("reservations")
    .select("*")
    .eq("reserved_date", "2026-02-05")
    .eq("reserved_time", "13:00:00")
    .neq("status", "canceled");

  console.log("\n=== 2/5 13:00枠の有効予約 ===");
  verify.forEach(r => {
    console.log(`- ${r.patient_name} (${r.patient_id}) - ${r.status}`);
  });
}

main();
