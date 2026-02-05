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
  // 患者20260100647の全reordersを確認
  const { data: reorders, error } = await supabase
    .from("reorders")
    .select("*")
    .eq("patient_id", "20260100647")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`=== 患者 20260100647 のreorders: ${reorders.length}件 ===\n`);

  for (const r of reorders) {
    console.log(`id:${r.id} status:${r.status} created:${r.created_at?.slice(0,19)} product:${r.product_code}`);
  }

  // reorder 457がpaidになっていたらconfirmedに戻す
  const r457 = reorders.find(r => r.id === 457);
  if (!r457) {
    console.log("\n⚠️ Reorder 457 はこの患者のものではありません");
    return;
  }

  console.log(`\n--- Reorder 457 の現在のstatus: ${r457.status} ---`);

  if (r457.status === "paid") {
    const { error: updateErr } = await supabase
      .from("reorders")
      .update({ status: "confirmed" })
      .eq("id", 457);

    if (updateErr) {
      console.error("Update error:", updateErr);
      return;
    }
    console.log("✅ Reorder 457 を confirmed に戻しました");
  } else if (r457.status === "confirmed") {
    console.log("✅ すでにconfirmedです - 変更不要");
  } else {
    console.log(`⚠️ 想定外のstatus: ${r457.status}`);
  }
}

main();
