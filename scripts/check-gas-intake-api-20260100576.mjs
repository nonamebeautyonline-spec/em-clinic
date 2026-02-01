// scripts/check-gas-intake-api-20260100576.mjs
// GAS問診APIから20260100576を取得できるか確認

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
const patientId = "20260100576";

async function checkGasIntakeApi() {
  console.log("=== GAS問診APIから20260100576を取得 ===\n");
  console.log(`API URL: ${gasIntakeUrl}\n`);

  try {
    console.log("1. GAS問診データ取得中...");
    const gasResponse = await fetch(gasIntakeUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    console.log(`   Status: ${gasResponse.status} ${gasResponse.statusText}`);

    if (!gasResponse.ok) {
      console.error(`   ❌ GAS API Error: ${gasResponse.status}`);
      const errorText = await gasResponse.text();
      console.error(`   Response: ${errorText.substring(0, 500)}`);
      return;
    }

    const gasData = await gasResponse.json();
    let gasRows = gasData.ok && Array.isArray(gasData.rows) ? gasData.rows : gasData;

    if (!Array.isArray(gasRows)) {
      console.error(`   ❌ レスポンスが配列ではありません:`, typeof gasRows);
      console.error(`   Response:`, JSON.stringify(gasData).substring(0, 500));
      return;
    }

    console.log(`   ✅ 取得成功: ${gasRows.length} 件\n`);

    // 該当patient_idを検索
    const gasRecord = gasRows.find(r => String(r.patient_id || "").trim() === patientId);

    console.log(`【patient_id: ${patientId} の問診データ】`);

    if (gasRecord) {
      console.log(`  ✅ 見つかりました\n`);
      console.log(`  patient_id: ${gasRecord.patient_id}`);
      console.log(`  patient_name: ${gasRecord.name || gasRecord.patient_name || 'なし'}`);
      console.log(`  reserve_id: ${gasRecord.reserved || gasRecord.reserve_id || gasRecord.reserveId || 'なし'}`);
      console.log(`  reserved_date: ${gasRecord.reserved_date || gasRecord.予約日 || 'なし'}`);
      console.log(`  reserved_time: ${gasRecord.reserved_time || gasRecord.予約時間 || 'なし'}`);
      console.log(`  status: ${gasRecord.status || '空欄'}`);
      console.log(`  tel: ${gasRecord.tel || 'なし'}`);
      console.log(`  sex: ${gasRecord.sex || 'なし'}`);
      console.log(`  birth: ${gasRecord.birth || 'なし'}`);

      // reserve_idが正しいか確認
      const reserveId = gasRecord.reserved || gasRecord.reserve_id || gasRecord.reserveId;
      if (reserveId === 'resv-1769678855708') {
        console.log(`\n  ✅ reserve_idは正しい: resv-1769678855708`);
      } else {
        console.log(`\n  ⚠️ reserve_idが違う: ${reserveId} (期待値: resv-1769678855708)`);
      }

      // カルテ表示に必要な情報が揃っているか
      console.log(`\n【カルテ表示に必要な情報チェック】`);
      const issues = [];
      if (!gasRecord.name && !gasRecord.patient_name) issues.push("❌ 名前がない");
      if (!reserveId) issues.push("❌ reserve_idがない");
      if (!gasRecord.reserved_date && !gasRecord.予約日) issues.push("❌ 予約日がない");

      if (issues.length > 0) {
        issues.forEach(issue => console.log(`  ${issue}`));
      } else {
        console.log(`  ✅ すべて揃っている`);
        console.log(`\n【結論】`);
        console.log(`  GAS APIで正しくデータを取得できるため、カルテに表示されるはず。`);
        console.log(`  表示されない場合は、カルテのフィルタ条件を確認してください。`);
        console.log(`  - 予約日フィルタ（1/30のみ表示など）`);
        console.log(`  - ステータスフィルタ（pending/canceledなど）`);
      }
    } else {
      console.log(`  ❌ 見つかりません\n`);
      console.log(`【デバッグ情報】`);
      console.log(`  試しに最初の5件のpatient_idを表示:`);
      gasRows.slice(0, 5).forEach((r, idx) => {
        console.log(`    ${idx + 1}. ${r.patient_id}`);
      });
    }

  } catch (error) {
    console.error(`\n❌ エラー発生:`, error.message);
    console.error(error.stack);
  }
}

checkGasIntakeApi();
