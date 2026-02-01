/**
 * 患者統合診断スクリプト
 *
 * 使い方:
 * 1. GASエディタでこのファイルを開く
 * 2. diagnoseMergePatients() を実行
 * 3. ログを確認（表示 > ログ）
 */

// SPREADSHEET_ID は code.js で定義されています

function diagnoseMergePatients() {
  const SPREADSHEET_ID = "1j932bAhjOAN1fF55gU07F4VRMWi9yTphoejCGJHFwuo";
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const masterSheet = ss.getSheetByName("問診マスター");
  const intakeSheet = ss.getSheetByName("問診");

  const oldPatientId = "20251200193";
  const newPatientId = "20260101648";

  Logger.log("=".repeat(60));
  Logger.log("患者統合診断: " + oldPatientId + " と " + newPatientId);
  Logger.log("=".repeat(60));

  // 問診マスターのヘッダーを確認
  Logger.log("\n【問診マスターのヘッダー】");
  const masterHeaders = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
  masterHeaders.forEach((header, index) => {
    Logger.log(`  列${index + 1} (${getColumnLetter(index + 1)}): ${header}`);
  });

  // 問診シートのヘッダーを確認
  Logger.log("\n【問診シートのヘッダー】");
  const intakeHeaders = intakeSheet.getRange(1, 1, 1, intakeSheet.getLastColumn()).getValues()[0];
  intakeHeaders.forEach((header, index) => {
    Logger.log(`  列${index + 1} (${getColumnLetter(index + 1)}): ${header}`);
  });

  // 旧患者 (20251200193) を問診マスターで検索
  Logger.log("\n" + "=".repeat(60));
  Logger.log("【旧患者: " + oldPatientId + " - 問診マスター検索】");
  Logger.log("=".repeat(60));
  searchPatientInMaster(masterSheet, oldPatientId, masterHeaders);

  // 旧患者 (20251200193) を問診シートで検索
  Logger.log("\n【旧患者: " + oldPatientId + " - 問診シート検索】");
  searchPatientInIntake(intakeSheet, oldPatientId, intakeHeaders);

  // 新患者 (20260101648) を問診マスターで検索
  Logger.log("\n" + "=".repeat(60));
  Logger.log("【新患者: " + newPatientId + " - 問診マスター検索】");
  Logger.log("=".repeat(60));
  searchPatientInMaster(masterSheet, newPatientId, masterHeaders);

  // 新患者 (20260101648) を問診シートで検索
  Logger.log("\n【新患者: " + newPatientId + " - 問診シート検索】");
  searchPatientInIntake(intakeSheet, newPatientId, intakeHeaders);

  Logger.log("\n" + "=".repeat(60));
  Logger.log("診断完了");
  Logger.log("=".repeat(60));
}

function searchPatientInMaster(sheet, patientId, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("  ⚠️ データなし（ヘッダーのみ）");
    return;
  }

  // patient_id または Patient_ID 列を探す
  let pidColIndex = -1;
  let lineUserIdColIndex = -1;
  let nameColIndex = -1;
  let telColIndex = -1;

  headers.forEach((header, index) => {
    const h = String(header).toLowerCase().trim();
    if (h === "patient_id" || h === "patient_id") {
      pidColIndex = index;
    }
    if (h === "line_user_id" || h === "line_id") {
      lineUserIdColIndex = index;
    }
    if (h === "name" || h === "氏名") {
      nameColIndex = index;
    }
    if (h === "tel" || h === "電話番号") {
      telColIndex = index;
    }
  });

  if (pidColIndex === -1) {
    Logger.log("  ❌ patient_id 列が見つかりません");
    Logger.log("  ヘッダー: " + headers.join(", "));
    return;
  }

  Logger.log(`  patient_id列: ${getColumnLetter(pidColIndex + 1)} (index ${pidColIndex})`);
  Logger.log(`  line_user_id列: ${lineUserIdColIndex >= 0 ? getColumnLetter(lineUserIdColIndex + 1) : "なし"}`);
  Logger.log(`  name列: ${nameColIndex >= 0 ? getColumnLetter(nameColIndex + 1) : "なし"}`);
  Logger.log(`  tel列: ${telColIndex >= 0 ? getColumnLetter(telColIndex + 1) : "なし"}`);

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  let found = false;

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const pid = String(row[pidColIndex] || "").trim();

    if (pid === patientId) {
      found = true;
      Logger.log(`\n  ✅ 見つかりました（行 ${i + 2}）:`);
      Logger.log(`    patient_id: ${pid}`);

      if (nameColIndex >= 0) {
        Logger.log(`    氏名: ${row[nameColIndex] || "(空欄)"}`);
      }

      if (telColIndex >= 0) {
        Logger.log(`    電話番号: ${row[telColIndex] || "(空欄)"}`);
      }

      if (lineUserIdColIndex >= 0) {
        const lineUid = String(row[lineUserIdColIndex] || "").trim();
        Logger.log(`    line_user_id: ${lineUid || "(空欄)"}`);

        if (!lineUid) {
          Logger.log(`    ⚠️ LINE User IDが空です（${getColumnLetter(lineUserIdColIndex + 1)}列）`);
        }
      }

      // その他の列も表示
      Logger.log("\n    全データ:");
      headers.forEach((header, index) => {
        if (index !== pidColIndex && index !== nameColIndex && index !== telColIndex && index !== lineUserIdColIndex) {
          const value = row[index];
          if (value !== "" && value !== null && value !== undefined) {
            Logger.log(`      ${getColumnLetter(index + 1)} (${header}): ${value}`);
          }
        }
      });
    }
  }

  if (!found) {
    Logger.log(`  ❌ 患者ID ${patientId} は見つかりませんでした`);
    Logger.log(`  総行数: ${values.length} 行（ヘッダー除く）`);
  }
}

function searchPatientInIntake(sheet, patientId, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("  ⚠️ データなし（ヘッダーのみ）");
    return;
  }

  // patient_id 列を探す (Z列 = 26)
  let pidColIndex = -1;
  let lineIdColIndex = -1;
  let nameColIndex = -1;
  let reserveIdColIndex = -1;

  headers.forEach((header, index) => {
    const h = String(header).toLowerCase().trim();
    if (h === "patient_id") {
      pidColIndex = index;
    }
    if (h === "line_id" || h === "line_user_id") {
      lineIdColIndex = index;
    }
    if (h === "name" || h === "氏名") {
      nameColIndex = index;
    }
    if (h === "reserveid" || h === "reserve_id") {
      reserveIdColIndex = index;
    }
  });

  if (pidColIndex === -1) {
    Logger.log("  ❌ patient_id 列が見つかりません");
    return;
  }

  Logger.log(`  patient_id列: ${getColumnLetter(pidColIndex + 1)}`);
  Logger.log(`  line_id列: ${lineIdColIndex >= 0 ? getColumnLetter(lineIdColIndex + 1) : "なし"}`);

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  let count = 0;

  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    const pid = String(row[pidColIndex] || "").trim();

    if (pid === patientId) {
      count++;
      if (count === 1) {
        Logger.log(`\n  ✅ 見つかりました（最新行: ${i + 2}）:`);
        Logger.log(`    patient_id: ${pid}`);

        if (nameColIndex >= 0) {
          Logger.log(`    氏名: ${row[nameColIndex] || "(空欄)"}`);
        }

        if (reserveIdColIndex >= 0) {
          Logger.log(`    reserveId: ${row[reserveIdColIndex] || "(空欄)"}`);
        }

        if (lineIdColIndex >= 0) {
          const lineId = String(row[lineIdColIndex] || "").trim();
          Logger.log(`    line_id: ${lineId || "(空欄)"}`);
        }
      }
    }
  }

  if (count === 0) {
    Logger.log(`  ❌ 患者ID ${patientId} は見つかりませんでした`);
  } else {
    Logger.log(`\n  📊 合計 ${count} 件の問診記録が見つかりました`);
  }
}

function getColumnLetter(columnNumber) {
  let letter = "";
  while (columnNumber > 0) {
    const remainder = (columnNumber - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    columnNumber = Math.floor((columnNumber - 1) / 26);
  }
  return letter;
}
