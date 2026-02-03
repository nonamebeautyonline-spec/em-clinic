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

async function checkTable() {
  console.log("\n" + "=".repeat(70));
  console.log("shipping_shares テーブル確認");
  console.log("=".repeat(70));

  try {
    const { data, error } = await supabase
      .from("shipping_shares")
      .select("*")
      .limit(1);

    if (error) {
      console.error("\n❌ テーブルエラー:", error.message);
      console.error("詳細:", error);
      
      if (error.message.includes("does not exist")) {
        console.log("\n⚠️  shipping_shares テーブルが存在しません");
        console.log("マイグレーションを実行する必要があります");
      }
    } else {
      console.log("\n✅ テーブルは存在します");
      console.log("レコード数:", data.length);
    }

  } catch (err) {
    console.error("\n❌ エラー:", err.message);
  }
}

checkTable().catch(console.error);
