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

async function checkReservations() {
  const reserveIds = [
    "resv-1768561329875", // 酒井浩子
    "resv-1770084040110", // 尾花　萌
    "resv-1770000776221", // 宮崎琴音
  ];

  console.log("\n予約ステータス確認:");
  console.log("=".repeat(70));

  for (const rid of reserveIds) {
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("reserve_id", rid)
      .single();

    if (error) {
      console.log("\n" + rid + ": ❌ reservationsテーブルに存在しません");
      console.log("  Error: " + error.message);
    } else {
      console.log("\n" + rid + ":");
      console.log("  患者: " + data.patient_name + " (" + data.patient_id + ")");
      console.log("  日時: " + data.reserved_date + " " + data.reserved_time);
      console.log("  Status: " + data.status);
      console.log("  更新: " + data.updated_at);
    }
  }
}

checkReservations().catch(console.error);
