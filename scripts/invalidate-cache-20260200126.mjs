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

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

async function invalidateCache() {
  const patientId = "20260200126";

  console.log("\n" + "=".repeat(70));
  console.log("キャッシュ無効化: " + patientId);
  console.log("=".repeat(70));

  try {
    console.log("\n[1/1] キャッシュ無効化API呼び出し中...");

    const response = await fetch("http://localhost:3000/api/admin/invalidate-cache", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + ADMIN_TOKEN,
      },
      body: JSON.stringify({
        patient_id: patientId,
      }),
    });

    if (!response.ok) {
      console.error("❌ HTTP Error: " + response.status);
      const text = await response.text();
      console.error("Response:", text);
      return;
    }

    const data = await response.json();

    console.log("\n✅ Response:");
    console.log(JSON.stringify(data, null, 2));

    console.log("\n" + "=".repeat(70));
    console.log("✅ キャッシュを無効化しました");
    console.log("=".repeat(70));

  } catch (err) {
    console.error("❌ エラー:", err.message);
  }
}

invalidateCache().catch(console.error);
