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
  const { data: confirmed } = await supabase
    .from("reorders")
    .select("id, patient_id, product_code, created_at")
    .eq("status", "confirmed");

  console.log("reorder_id\tpatient_id\torder_id\treorder_created\torder_paid\t差分(分)\t金額");
  console.log("─".repeat(120));

  const results = [];

  for (const r of confirmed || []) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, paid_at, amount, product_code")
      .eq("patient_id", r.patient_id)
      .eq("product_code", r.product_code)
      .eq("payment_status", "COMPLETED");

    const reorderTime = new Date(r.created_at).getTime();
    const match = (orders || []).find((o) => new Date(o.paid_at).getTime() > reorderTime);

    if (match) {
      const timeDiff = Math.round((new Date(match.paid_at).getTime() - reorderTime) / 1000 / 60);
      results.push({
        reorderId: r.id,
        patientId: r.patient_id,
        orderId: match.id,
        reorderCreated: r.created_at.slice(0, 19),
        orderPaid: match.paid_at.slice(0, 19),
        diffMin: timeDiff,
        amount: match.amount
      });
    }
  }

  // 時間差でソート
  results.sort((a, b) => a.diffMin - b.diffMin);

  for (const r of results) {
    console.log(`${r.reorderId}\t${r.patientId}\t${r.orderId}\t${r.reorderCreated}\t${r.orderPaid}\t${r.diffMin}\t${r.amount}`);
  }

  console.log("\n計: " + results.length + "件");
}

main();
