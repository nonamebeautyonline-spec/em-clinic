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
  // 2/5 13:00の予約枠をタイムライン順に
  console.log("=== 2/5 13:00枠のタイムライン ===\n");

  const { data: slot13 } = await supabase
    .from("reservations")
    .select("*")
    .eq("reserved_date", "2026-02-05")
    .eq("reserved_time", "13:00:00")
    .order("created_at", { ascending: true });

  if (slot13) {
    slot13.forEach(r => {
      const createdJST = new Date(new Date(r.created_at).getTime() + 9*60*60*1000);
      const updatedJST = new Date(new Date(r.updated_at).getTime() + 9*60*60*1000);
      console.log(`患者: ${r.patient_name} (${r.patient_id})`);
      console.log(`  ID: ${r.id}`);
      console.log(`  状態: ${r.status}`);
      console.log(`  作成: ${createdJST.toISOString().slice(0,19).replace("T"," ")} JST`);
      console.log(`  更新: ${updatedJST.toISOString().slice(0,19).replace("T"," ")} JST`);
      console.log("");
    });
  }

  // 13:00枠のアクティブ予約数
  const activeCount = slot13 ? slot13.filter(r => r.status !== "canceled").length : 0;
  console.log(`アクティブ予約数: ${activeCount}`);

  // 12:50-13:00に更新された予約を確認
  console.log("\n=== 2/5 12:50-13:00 JSTに更新された全予約 ===");
  const { data: updated } = await supabase
    .from("reservations")
    .select("id, patient_id, patient_name, reserved_date, reserved_time, status, created_at, updated_at")
    .gte("updated_at", "2026-02-05T03:50:00+00:00")
    .lte("updated_at", "2026-02-05T04:00:00+00:00")
    .order("updated_at", { ascending: true });

  if (updated && updated.length > 0) {
    updated.forEach(r => {
      const updatedJST = new Date(new Date(r.updated_at).getTime() + 9*60*60*1000);
      console.log(`[${updatedJST.toISOString().slice(11,19)}] ${r.patient_name} (${r.patient_id})`);
      console.log(`  → ${r.reserved_date} ${r.reserved_time} - ${r.status}`);
    });
  } else {
    console.log("(この時間帯の更新なし)");
  }
}

main();
