// scripts/verify-all-tables.mjs
// 全テーブルのデータ数を確認

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

async function verifyAllTables() {
  console.log("=== 全テーブルデータ確認 ===\n");

  // 1. answerers テーブル
  const { count: answererCount } = await supabase
    .from("answerers")
    .select("*", { count: "exact", head: true });

  console.log(`1. answerers テーブル: ${answererCount} 件`);

  // サンプルデータ
  const { data: answererSample } = await supabase
    .from("answerers")
    .select("patient_id, name, sex, birthday, tel")
    .limit(1)
    .single();

  if (answererSample) {
    console.log(`   サンプル: ${answererSample.patient_id} - ${answererSample.name} (${answererSample.sex}, ${answererSample.birthday}, ${answererSample.tel})\n`);
  }

  // 2. intake テーブル
  const { count: intakeCount } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true });

  console.log(`2. intake テーブル: ${intakeCount} 件`);

  // 予約情報あり
  const { count: intakeWithReservation } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true })
    .not("reserve_id", "is", null);

  console.log(`   予約情報あり: ${intakeWithReservation} 件\n`);

  // 3. reservations テーブル
  const { count: reservationCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true });

  console.log(`3. reservations テーブル: ${reservationCount} 件`);

  // サンプルデータ
  const { data: reservationSample } = await supabase
    .from("reservations")
    .select("reserve_id, patient_id, patient_name, reserved_date, status")
    .limit(1)
    .single();

  if (reservationSample) {
    console.log(`   サンプル: ${reservationSample.reserve_id} - ${reservationSample.patient_name} (${reservationSample.reserved_date}, ${reservationSample.status})\n`);
  }

  // 4. データ整合性チェック
  console.log("=== データ整合性チェック ===\n");

  // intakeの予約数 vs reservationsの数
  console.log(`intake予約数: ${intakeWithReservation}`);
  console.log(`reservations数: ${reservationCount}`);

  if (reservationCount >= intakeWithReservation) {
    console.log("✅ reservationsテーブルはintakeの予約情報を全てカバーしています\n");
  } else {
    console.log(`⚠️ 差分あり: ${intakeWithReservation - reservationCount} 件\n`);
  }

  // answerers vs intake の patient_id ユニーク数（全件取得）
  let allIntakePatients = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data } = await supabase
      .from("intake")
      .select("patient_id")
      .range(offset, offset + batchSize - 1);

    if (!data || data.length === 0) break;

    allIntakePatients = allIntakePatients.concat(data);
    if (data.length < batchSize) break;

    offset += batchSize;
  }

  const uniquePatientIds = new Set(allIntakePatients.map(i => i.patient_id));
  console.log(`intakeのユニークpatient_id: ${uniquePatientIds.size}`);
  console.log(`answerers数: ${answererCount}`);

  if (answererCount >= uniquePatientIds.size) {
    console.log("✅ answerersテーブルは全患者をカバーしています\n");
  } else {
    console.log(`⚠️ 差分あり: ${uniquePatientIds.size - answererCount} 件の患者がanswerersに未登録\n`);
  }

  console.log("=== 確認完了 ===");
}

verifyAllTables();
