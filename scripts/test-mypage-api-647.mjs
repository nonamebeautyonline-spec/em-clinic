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
  const pid = "20260100647";

  // mypage API のロジックをシミュレート
  const { data, error } = await supabase
    .from("reorders")
    .select("id, status, created_at, product_code, gas_row_number")
    .eq("patient_id", pid)
    .in("status", ["pending", "confirmed", "paid"])
    .order("created_at", { ascending: false });

  console.log("Raw DB result:");
  console.log(JSON.stringify(data, null, 2));

  // マッピング（mypage APIと同じロジック）
  const mapped = (data || []).map((r) => ({
    id: String(r.id),
    gas_row_number: r.gas_row_number ? Number(r.gas_row_number) : null,
    status: String(r.status || ""),
    createdAt: r.created_at || "",
    productCode: r.product_code || "",
  }));

  console.log("\nMapped result (what API returns):");
  console.log(JSON.stringify(mapped, null, 2));

  // displayReorder ロジック
  const pendingReorders = mapped.filter((r) => r.status === "pending");
  const confirmedReorders = mapped.filter((r) => r.status === "confirmed");

  const latestPending = pendingReorders[0] || null;
  const latestConfirmed = confirmedReorders[0] || null;

  console.log("\nlatestPending:", latestPending);
  console.log("latestConfirmed:", latestConfirmed);

  // 優先順位: confirmed > pending
  const displayReorder = latestConfirmed ?? latestPending;
  console.log("\ndisplayReorder:", displayReorder);

  if (displayReorder) {
    console.log("\ngas_row_number for checkout:", displayReorder.gas_row_number);
  }
}

main();
