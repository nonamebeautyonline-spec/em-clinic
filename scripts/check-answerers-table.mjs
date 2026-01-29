// scripts/check-answerers-table.mjs
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const result = await supabase.from("answerers").select("*").limit(1);

if (result.error) {
  console.log("❌ answerers table does NOT exist");
  console.log("Error:", result.error.message);
  console.log("\n→ Need to create answerers table in Supabase");
} else {
  console.log("✅ answerers table exists");
  console.log("Sample record:");
  console.log(JSON.stringify(result.data[0], null, 2));
}
