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

async function main() {
  const baseUrl = "https://em-clinic.vercel.app";
  const adminToken = envVars.ADMIN_TOKEN;

  // 全件取得
  console.log("=== 管理画面API（全件取得）===");
  const res = await fetch(`${baseUrl}/api/admin/reorders?include_all=true`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  const data = await res.json();

  if (data.error) {
    console.error("Error:", data.error);
    return;
  }

  console.log(`取得件数: ${data.reorders?.length || 0}件`);

  console.log("\n=== 最新10件 ===");
  for (const r of (data.reorders || []).slice(0, 10)) {
    console.log(`id:${r.id} patient:${r.patient_id} status:${r.status} ts:${r.timestamp}`);
  }

  // pending件数
  const pending = (data.reorders || []).filter(r => r.status === "pending");
  console.log(`\npending件数: ${pending.length}件`);

  // confirmed件数
  const confirmed = (data.reorders || []).filter(r => r.status === "confirmed");
  console.log(`confirmed件数: ${confirmed.length}件`);
}

main();
