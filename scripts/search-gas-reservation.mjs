import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local manually
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

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

async function searchGASReservation() {
  const targetPatientId = "20260200126";
  const targetReserveId = "resv-1770084040110";
  const today = new Date().toISOString().split('T')[0];

  console.log(`\n${"=".repeat(70)}`);
  console.log(`GAS予約シートで検索:`);
  console.log(`患者ID: ${targetPatientId}`);
  console.log(`予約ID: ${targetReserveId}`);
  console.log(`日付: ${today}`);
  console.log("=".repeat(70));

  try {
    console.log("\n[1/1] GAS getAllReservations APIを呼び出し中...");

    const response = await fetch(GAS_RESERVATIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "getAllReservations",
        date: today,
        token: ADMIN_TOKEN,
      }),
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status}`);
      const text = await response.text();
      console.error("Response:", text);
      return;
    }

    const data = await response.json();

    if (!data.ok) {
      console.error(`❌ API Error:`, data.error || "Unknown");
      console.log("Response:", JSON.stringify(data, null, 2));
      return;
    }

    console.log(`✅ GAS予約データ取得: ${data.reservations?.length || 0}件`);

    // 対象患者の予約を検索
    const matchingByPatientId = data.reservations.filter(r =>
      r.patientId === targetPatientId || r.patient_id === targetPatientId
    );

    const matchingByReserveId = data.reservations.filter(r =>
      r.reserveId === targetReserveId || r.reserve_id === targetReserveId
    );

    console.log(`\n${"=".repeat(70)}`);
    console.log("検索結果");
    console.log("=".repeat(70));

    console.log(`\n【患者ID ${targetPatientId} で検索】: ${matchingByPatientId.length}件`);
    if (matchingByPatientId.length > 0) {
      matchingByPatientId.forEach(r => {
        console.log(`\n予約ID: ${r.reserveId || r.reserve_id}`);
        console.log(`  患者名: ${r.name || r.patient_name || "(なし)"}`);
        console.log(`  日時: ${r.date || r.reserved_date} ${r.time || r.reserved_time}`);
        console.log(`  Status: ${r.status || "(なし)"}`);
        console.log(`  タイムスタンプ: ${r.timestamp || "(なし)"}`);
      });
    } else {
      console.log("❌ 見つかりませんでした");
    }

    console.log(`\n【予約ID ${targetReserveId} で検索】: ${matchingByReserveId.length}件`);
    if (matchingByReserveId.length > 0) {
      matchingByReserveId.forEach(r => {
        console.log(`\n患者ID: ${r.patientId || r.patient_id}`);
        console.log(`  患者名: ${r.name || r.patient_name || "(なし)"}`);
        console.log(`  日時: ${r.date || r.reserved_date} ${r.time || r.reserved_time}`);
        console.log(`  Status: ${r.status || "(なし)"}`);
        console.log(`  タイムスタンプ: ${r.timestamp || "(なし)"}`);
      });
    } else {
      console.log("❌ 見つかりませんでした");
    }

    // 今日の12:15の予約を全て表示
    console.log(`\n【今日 12:15 の全予約】`);
    const at1215 = data.reservations.filter(r => {
      const time = r.time || r.reserved_time || "";
      return time.includes("12:15");
    });

    console.log(`12:15の予約: ${at1215.length}件`);
    at1215.forEach(r => {
      console.log(`\n予約ID: ${r.reserveId || r.reserve_id}`);
      console.log(`  患者ID: ${r.patientId || r.patient_id}`);
      console.log(`  患者名: ${r.name || r.patient_name || "(なし)"}`);
      console.log(`  Status: ${r.status || "(なし)"}`);
    });

    // キャンセルされた予約の中に含まれているか確認
    console.log(`\n【キャンセルされた予約】`);
    const canceled = data.reservations.filter(r => {
      const status = r.status || "";
      return status === "キャンセル" || status === "canceled";
    });

    console.log(`キャンセル予約: ${canceled.length}件`);

    const canceledTarget = canceled.filter(r =>
      r.patientId === targetPatientId ||
      r.patient_id === targetPatientId ||
      r.reserveId === targetReserveId ||
      r.reserve_id === targetReserveId
    );

    if (canceledTarget.length > 0) {
      console.log(`\n✅ 対象患者の予約がキャンセル済みで見つかりました:`);
      canceledTarget.forEach(r => {
        console.log(`\n予約ID: ${r.reserveId || r.reserve_id}`);
        console.log(`  患者ID: ${r.patientId || r.patient_id}`);
        console.log(`  患者名: ${r.name || r.patient_name || "(なし)"}`);
        console.log(`  日時: ${r.date || r.reserved_date} ${r.time || r.reserved_time}`);
        console.log(`  Status: ${r.status}`);
      });
    } else {
      console.log("対象患者はキャンセル済み予約にも見つかりませんでした");
    }

  } catch (err) {
    console.error(`❌ エラー:`, err.message);
    console.error(err.stack);
  }
}

searchGASReservation().catch(console.error);
