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

const GAS_INTAKE_LIST_URL = envVars.GAS_INTAKE_LIST_URL;

async function main() {
  console.log("=== GAS → DB Dr note/status/prescription 補完 ===\n");

  // Step 1: GASから全データ取得
  console.log("[1/4] GASから問診データ取得中...");
  const gasResponse = await fetch(GAS_INTAKE_LIST_URL, {
    method: "GET",
  });

  if (!gasResponse.ok) {
    console.error("GASエラー:", gasResponse.status);
    return;
  }

  const gasData = await gasResponse.json();
  if (!Array.isArray(gasData)) {
    console.error("GASレスポンスが配列ではありません");
    return;
  }

  console.log(`  GAS全件: ${gasData.length}件`);

  // GASでstatus/note/prescription_menuが設定されているものだけ抽出
  const gasWithDrData = gasData.filter(r => {
    const status = r.status || r.Status || "";
    const note = r.doctor_note || r.note || r.Note || "";
    const menu = r.prescription_menu || r.prescriptionMenu || "";
    return status || note || menu;
  });

  console.log(`  GASでDr情報あり: ${gasWithDrData.length}件`);

  // Step 2: DBから全intakeデータ取得（1000件ずつ）
  console.log("\n[2/4] DBからintakeデータ取得中...");
  let allDbIntakes = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("intake")
      .select("patient_id, reserve_id, status, note, prescription_menu")
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("DBエラー:", error);
      return;
    }

    if (!data || data.length === 0) break;

    allDbIntakes = allDbIntakes.concat(data);
    console.log(`  取得: ${allDbIntakes.length}件`);

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  console.log(`  DB全件: ${allDbIntakes.length}件`);

  // DBをreserve_idでインデックス化
  const dbByReserveId = new Map();
  const dbByPatientId = new Map();
  allDbIntakes.forEach(r => {
    if (r.reserve_id) dbByReserveId.set(r.reserve_id, r);
    if (r.patient_id) dbByPatientId.set(r.patient_id, r);
  });

  // Step 3: 差分を検出
  console.log("\n[3/4] 差分検出中...");
  const toUpdate = [];

  for (const gasRow of gasWithDrData) {
    const reserveId = gasRow.reserveId || gasRow.reserve_id || gasRow["予約ID"];
    const patientId = gasRow.patient_id || gasRow.patientId || gasRow["Patient_ID"];

    // DBレコードを探す（reserve_id優先、なければpatient_id）
    let dbRow = null;
    if (reserveId) {
      dbRow = dbByReserveId.get(reserveId);
    }
    if (!dbRow && patientId) {
      dbRow = dbByPatientId.get(patientId);
    }

    if (!dbRow) continue; // DBにレコードがない場合はスキップ

    const gasStatus = gasRow.status || gasRow.Status || "";
    const gasNote = gasRow.doctor_note || gasRow.note || gasRow.Note || "";
    const gasMenu = gasRow.prescription_menu || gasRow.prescriptionMenu || "";

    const dbStatus = dbRow.status || "";
    const dbNote = dbRow.note || "";
    const dbMenu = dbRow.prescription_menu || "";

    // GASにあってDBにないものを検出
    const updates = {};
    let needsUpdate = false;

    if (gasStatus && !dbStatus) {
      updates.status = gasStatus;
      needsUpdate = true;
    }
    if (gasNote && !dbNote) {
      updates.note = gasNote;
      needsUpdate = true;
    }
    if (gasMenu && !dbMenu) {
      updates.prescription_menu = gasMenu;
      needsUpdate = true;
    }

    if (needsUpdate) {
      toUpdate.push({
        patient_id: dbRow.patient_id,
        reserve_id: dbRow.reserve_id,
        gasStatus,
        gasNote: gasNote.slice(0, 50) + (gasNote.length > 50 ? "..." : ""),
        gasMenu,
        dbStatus,
        dbNote: dbNote.slice(0, 50) + (dbNote.length > 50 ? "..." : ""),
        dbMenu,
        updates,
      });
    }
  }

  console.log(`  補完が必要: ${toUpdate.length}件`);

  if (toUpdate.length === 0) {
    console.log("\n✅ 補完が必要なレコードはありません");
    return;
  }

  // Step 4: 補完実行
  console.log("\n[4/4] DB補完実行中...");
  console.log("============================================================");

  let successCount = 0;
  let errorCount = 0;

  for (const item of toUpdate) {
    console.log(`\n患者ID: ${item.patient_id}`);
    console.log(`  reserve_id: ${item.reserve_id}`);
    console.log(`  GAS status: ${item.gasStatus || "(なし)"}`);
    console.log(`  GAS note: ${item.gasNote || "(なし)"}`);
    console.log(`  GAS menu: ${item.gasMenu || "(なし)"}`);
    console.log(`  DB status: ${item.dbStatus || "(なし)"}`);
    console.log(`  DB note: ${item.dbNote || "(なし)"}`);
    console.log(`  DB menu: ${item.dbMenu || "(なし)"}`);
    console.log(`  → 更新: ${JSON.stringify(item.updates)}`);

    const { error } = await supabase
      .from("intake")
      .update(item.updates)
      .eq("patient_id", item.patient_id);

    if (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      errorCount++;
    } else {
      console.log(`  ✅ 更新成功`);
      successCount++;
    }
  }

  console.log("\n============================================================");
  console.log("集計:");
  console.log(`  補完対象: ${toUpdate.length}件`);
  console.log(`  成功: ${successCount}件`);
  console.log(`  失敗: ${errorCount}件`);
  console.log("============================================================");
}

main().catch(console.error);
