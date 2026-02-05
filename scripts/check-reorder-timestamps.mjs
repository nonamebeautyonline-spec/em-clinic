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
  // 最新15件でtimestampとcreated_atの状態を確認
  const { data } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, status, timestamp, created_at")
    .order("id", { ascending: false })
    .limit(15);

  console.log("=== 最新15件のtimestamp/created_at状態 ===");
  for (const r of data || []) {
    const ts = r.timestamp ? r.timestamp.slice(0, 19) : "NULL";
    const ca = r.created_at ? r.created_at.slice(0, 19) : "NULL";
    console.log(`id:${r.id} gas_row:${r.gas_row_number} status:${r.status} timestamp:${ts} created_at:${ca}`);
  }

  // timestampがNULLの件数
  const { data: nullTs, count } = await supabase
    .from("reorders")
    .select("id", { count: "exact" })
    .is("timestamp", null);

  console.log(`\ntimestampがNULLのレコード: ${nullTs?.length || 0}件`);

  // timestampでソートした場合の順序（API動作確認）
  console.log("\n=== timestamp順（APIと同じソート） ===");
  const { data: byTs } = await supabase
    .from("reorders")
    .select("id, gas_row_number, status, timestamp")
    .order("timestamp", { ascending: false })
    .limit(10);

  for (const r of byTs || []) {
    const ts = r.timestamp ? r.timestamp.slice(0, 19) : "NULL";
    console.log(`id:${r.id} gas_row:${r.gas_row_number} status:${r.status} timestamp:${ts}`);
  }
}

main();
