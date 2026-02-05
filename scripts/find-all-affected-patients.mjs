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
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // confirmed ステータスの reorders を全て取得
  const { data: confirmedReorders } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, status, product_code, created_at")
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });

  console.log("=== confirmed reorders の gas_row_number チェック ===\n");

  const affected = [];

  for (const r of confirmedReorders || []) {
    const hasGasRow = r.gas_row_number != null;
    if (!hasGasRow) {
      console.log(`❌ id:${r.id} patient:${r.patient_id} gas_row:NULL`);
      affected.push(r);
    }
  }

  if (affected.length === 0) {
    console.log("gas_row_number が NULL の confirmed reorder はありません。\n");
  }

  // 今日作成された confirmed をリストアップ（直近の問題対象）
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  console.log(`\n=== 今日 (${today}) 作成された confirmed reorders ===`);

  const todayConfirmed = (confirmedReorders || []).filter(r =>
    r.created_at && r.created_at.startsWith(today)
  );

  for (const r of todayConfirmed) {
    console.log(`id:${r.id} gas_row:${r.gas_row_number || "NULL"} patient:${r.patient_id} product:${r.product_code}`);
  }

  // 各患者のマイページで表示される reorder を確認
  console.log("\n=== 各患者のマイページ表示確認 ===");

  const uniquePatients = [...new Set(todayConfirmed.map(r => r.patient_id))];

  for (const pid of uniquePatients) {
    // mypage API と同じクエリ
    const { data: reorders } = await supabase
      .from("reorders")
      .select("id, status, created_at, product_code, gas_row_number")
      .eq("patient_id", pid)
      .in("status", ["pending", "confirmed", "paid"])
      .order("created_at", { ascending: false });

    const confirmedList = (reorders || []).filter(r => r.status === "confirmed");
    const latestConfirmed = confirmedList[0] || null;

    if (latestConfirmed) {
      const hasGasRow = latestConfirmed.gas_row_number != null;
      const mark = hasGasRow ? "✓" : "❌";
      console.log(`${mark} ${pid}: id=${latestConfirmed.id} gas_row=${latestConfirmed.gas_row_number || "NULL"} product=${latestConfirmed.product_code}`);
      if (!hasGasRow) {
        affected.push({ ...latestConfirmed, patient_id: pid });
      }
    }
  }

  if (affected.length > 0) {
    console.log("\n=== 要修正: gas_row_number が NULL の患者 ===");
    for (const r of affected) {
      console.log(`${r.patient_id}: id=${r.id}`);
    }
  }
}

main();
