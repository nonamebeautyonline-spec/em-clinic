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

async function fixAllPhones() {
  console.log("=== 電話番号全件修正 ===\n");

  let totalFixed = { double0: 0, no0: 0 };
  let page = 0;
  const limit = 1000;

  while (true) {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, phone")
      .not("phone", "is", null)
      .range(page * limit, (page + 1) * limit - 1);

    if (error) {
      console.log("Error:", error.message);
      break;
    }

    if (!orders || orders.length === 0) break;

    console.log("ページ " + (page + 1) + ": " + orders.length + "件処理中...");

    for (const o of orders) {
      const phone = o.phone;
      let newPhone = null;

      if (phone.startsWith("0080") || phone.startsWith("0090") || phone.startsWith("0070")) {
        newPhone = phone.slice(1);
        totalFixed.double0++;
      } else if (phone.startsWith("80") || phone.startsWith("90") || phone.startsWith("70")) {
        newPhone = "0" + phone;
        totalFixed.no0++;
      }

      if (newPhone) {
        await supabase.from("orders").update({ phone: newPhone }).eq("id", o.id);
      }
    }

    page++;
    if (orders.length < limit) break;
  }

  console.log("\n二重0修正: " + totalFixed.double0 + " 件");
  console.log("0なし修正: " + totalFixed.no0 + " 件");

  // 最終確認
  let stats = { correct: 0, double0: 0, no0: 0, total: 0 };
  page = 0;
  while (true) {
    const { data: check } = await supabase
      .from("orders")
      .select("phone")
      .not("phone", "is", null)
      .range(page * limit, (page + 1) * limit - 1);

    if (!check || check.length === 0) break;

    for (const o of check) {
      stats.total++;
      const p = o.phone;
      if (p.startsWith("0080") || p.startsWith("0090") || p.startsWith("0070")) {
        stats.double0++;
      } else if (p.startsWith("80") || p.startsWith("90") || p.startsWith("70")) {
        stats.no0++;
      } else if (p.startsWith("080") || p.startsWith("090") || p.startsWith("070")) {
        stats.correct++;
      }
    }

    page++;
    if (check.length < limit) break;
  }

  console.log("\n=== 修正後 ===");
  console.log("総件数: " + stats.total);
  console.log("正常: " + stats.correct);
  console.log("二重0: " + stats.double0);
  console.log("0なし: " + stats.no0);
}

fixAllPhones();
