// scripts/find-in-gas-20260101597.mjs
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

const gasIntakeUrl = envVars.GAS_INTAKE_LIST_URL;

async function findInGAS() {
  const targetId = "20260101597";
  console.log(`=== GASから ${targetId} を検索 ===\n`);

  const response = await fetch(gasIntakeUrl, { method: "GET", redirect: "follow" });

  if (!response.ok) {
    console.log(`❌ API Error: ${response.status}`);
    return;
  }

  const data = await response.json();
  let rows;
  if (data.ok && Array.isArray(data.rows)) {
    rows = data.rows;
  } else if (Array.isArray(data)) {
    rows = data;
  }

  console.log(`総行数: ${rows.length}\n`);

  // 完全一致
  const exactMatch = rows.find(r => r.patient_id === targetId);

  if (exactMatch) {
    console.log("✅ 完全一致で見つかりました:");
    console.log(JSON.stringify(exactMatch, null, 2));
    return;
  }

  // 文字列化して一致
  const stringMatch = rows.find(r => String(r.patient_id) === targetId);

  if (stringMatch) {
    console.log("✅ 文字列化で見つかりました:");
    console.log(`  patient_id type: ${typeof stringMatch.patient_id}`);
    console.log(`  patient_id value: "${stringMatch.patient_id}"`);
    console.log(JSON.stringify(stringMatch, null, 2));
    return;
  }

  // トリム・正規化して一致
  const normalized = rows.find(r => {
    const pid = String(r.patient_id || "").trim().replace(/[\s\u200B-\u200D\uFEFF]/g, "");
    return pid === targetId;
  });

  if (normalized) {
    console.log("✅ 正規化で見つかりました:");
    console.log(`  patient_id type: ${typeof normalized.patient_id}`);
    console.log(`  patient_id value: "${normalized.patient_id}"`);
    console.log(JSON.stringify(normalized, null, 2));
    return;
  }

  // 部分一致
  const partialMatches = rows.filter(r => {
    const pid = String(r.patient_id || "");
    return pid.includes("101597") || pid.includes("ひまり") || (r.name && r.name.includes("岩波"));
  });

  console.log(`\n部分一致: ${partialMatches.length} 件`);
  partialMatches.forEach((r, idx) => {
    console.log(`\n[${idx + 1}]`);
    console.log(`  patient_id: "${r.patient_id}" (type: ${typeof r.patient_id})`);
    console.log(`  name: ${r.name}`);
    console.log(`  nameKana: ${r.nameKana || "なし"}`);
    console.log(`  sex: ${r.sex || "なし"}`);
    console.log(`  birth: ${r.birth || "なし"}`);
    console.log(`  tel: ${r.tel || "なし"}`);
  });

  if (partialMatches.length === 0) {
    console.log("❌ 見つかりませんでした");

    // 名前で検索
    const nameMatches = rows.filter(r => r.name && r.name.includes("岩波"));
    if (nameMatches.length > 0) {
      console.log("\n名前「岩波」を含むレコード:");
      nameMatches.forEach((r, idx) => {
        console.log(`  [${idx + 1}] patient_id: ${r.patient_id}, name: ${r.name}`);
      });
    }
  }
}

findInGAS();
