import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearStaleReservations() {
  const updates = [
    { patient_id: "20260100966", reserve_id: "resv-1768561329875", name: "酒井浩子", reason: "canceled" },
    { patient_id: "20260200126", reserve_id: "resv-1770084040110", name: "尾花　萌", reason: "completed" },
  ];

  console.log("\nintakeテーブルの予約情報をクリア:");
  console.log("=".repeat(70));

  for (const u of updates) {
    const { data, error } = await supabase
      .from("intake")
      .update({
        reserve_id: null,
        reserved_date: null,
        reserved_time: null,
      })
      .eq("patient_id", u.patient_id)
      .eq("reserve_id", u.reserve_id)
      .select("patient_id, patient_name");

    if (error) {
      console.log("\n❌ " + u.name + " (" + u.patient_id + "): " + error.message);
    } else if (data.length === 0) {
      console.log("\n⚠️  " + u.name + " (" + u.patient_id + "): 更新対象なし");
    } else {
      console.log("\n✅ " + u.name + " (" + u.patient_id + "): クリア完了 (" + u.reason + ")");
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ 処理完了");
}

clearStaleReservations().catch(console.error);
