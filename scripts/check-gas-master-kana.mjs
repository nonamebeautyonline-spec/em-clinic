// scripts/check-gas-master-kana.mjs
// GAS問診マスターシートのカナを確認

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

const gasMasterUrl = envVars.GAS_MASTER_URL;
const adminToken = envVars.ADMIN_TOKEN;

const targetPatients = ["20260100576", "20260101597"];

async function check() {
  console.log("=== GAS問診マスターシートのカナ確認 ===\n");

  if (!gasMasterUrl || !adminToken) {
    console.log("❌ GAS_MASTER_URL または ADMIN_TOKEN が設定されていません");
    console.log("   GAS_MASTER_URL:", gasMasterUrl ? "設定済み" : "未設定");
    console.log("   ADMIN_TOKEN:", adminToken ? "設定済み" : "未設定");
    return;
  }

  try {
    const response = await fetch(gasMasterUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "getMasterList",
        token: adminToken
      })
    });

    if (!response.ok) {
      console.log(`❌ GAS API Error: ${response.status}`);
      const text = await response.text();
      console.log(`Response: ${text.substring(0, 500)}`);
      return;
    }

    const data = await response.json();

    if (!data.ok || !Array.isArray(data.masters)) {
      console.log("❌ GAS APIレスポンスが不正です:", data);
      return;
    }

    console.log(`GASマスター総件数: ${data.masters.length} 件\n`);

    for (const patientId of targetPatients) {
      console.log(`【patient_id: ${patientId}】`);

      const master = data.masters.find(m => String(m.patient_id || "").trim() === patientId);

      if (master) {
        console.log(`  ✅ マスターシートに存在`);
        console.log(`  name: ${master.name || "なし"}`);
        console.log(`  name_kana: ${master.name_kana || master.nameKana || master.カナ || "なし"}`);
        console.log(`  sex: ${master.sex || "なし"}`);
        console.log(`  birth: ${master.birth || master.birthday || "なし"}`);
        console.log(`  tel: ${master.tel || "なし"}`);
        console.log(`  answerer_id: ${master.answerer_id || master.answererId || "なし"}`);
      } else {
        console.log(`  ❌ マスターシートに見つかりません`);
      }
      console.log();
    }
  } catch (e) {
    console.error("❌ エラー発生:", e.message);
  }
}

check();
