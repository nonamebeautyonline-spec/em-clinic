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
  const { data } = await supabase
    .from("reorders")
    .select("id, gas_row_number")
    .order("id", { ascending: true });

  // id + 1 のパターンでないものを探す
  console.log("=== id + 1 パターンから外れているレコード ===");
  let irregularCount = 0;
  for (const r of data || []) {
    if (r.gas_row_number !== r.id + 1) {
      console.log(`id:${r.id} → gas_row:${r.gas_row_number} (期待値: ${r.id + 1})`);
      irregularCount++;
    }
  }
  if (irregularCount === 0) {
    console.log("なし - 全て id + 1 で一貫しています");
  }

  // IDの欠番を探す
  const ids = (data || []).map(r => r.id);
  const maxId = Math.max(...ids);
  const gaps = [];
  for (let i = 1; i <= maxId; i++) {
    if (!ids.includes(i)) gaps.push(i);
  }

  console.log("\n=== IDの欠番 ===");
  if (gaps.length > 0) {
    console.log(gaps.join(", "));
    console.log(`(計 ${gaps.length} 件の欠番)`);
  } else {
    console.log("なし");
  }
}

main();
