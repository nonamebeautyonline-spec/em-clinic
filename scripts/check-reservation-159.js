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
  // 2/5 12:30-13:00 JST = 03:30-04:00 UTC
  const start = "2026-02-05T03:30:00+00:00";
  const end = "2026-02-05T04:00:00+00:00";

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, patient_id, patient_name, reserved_date, reserved_time, status, created_at")
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: true });

  console.log("=== 2/5 12:30-13:00 JST に作成された予約 ===");
  if (!reservations || reservations.length === 0) {
    console.log("(この時間帯の予約作成なし)");
  } else {
    reservations.forEach(r => {
      const jst = new Date(new Date(r.created_at).getTime() + 9*60*60*1000);
      console.log("[" + jst.toISOString().slice(11,16) + "] " + r.patient_name + " (" + r.patient_id + ") → " + r.reserved_date + " " + r.reserved_time + " - " + r.status);
    });
  }

  // 2/5 13:00枠の全予約（キャンセル含む）
  console.log("\n=== 2/5 13:00枠の全予約 ===");
  const { data: slot13 } = await supabase
    .from("reservations")
    .select("id, patient_id, patient_name, status, created_at, updated_at")
    .eq("reserved_date", "2026-02-05")
    .eq("reserved_time", "13:00:00");

  if (slot13) {
    slot13.forEach(r => {
      const createdJST = new Date(new Date(r.created_at).getTime() + 9*60*60*1000);
      const updatedJST = new Date(new Date(r.updated_at).getTime() + 9*60*60*1000);
      console.log(r.patient_name + " (" + r.patient_id + ")");
      console.log("  状態: " + r.status);
      console.log("  作成: " + createdJST.toISOString().slice(0,16).replace("T"," ") + " JST");
      console.log("  更新: " + updatedJST.toISOString().slice(0,16).replace("T"," ") + " JST");
    });
  }
}

main();
