// 問診シート全件をSupabaseに同期（バッチ処理対応）
function syncAllIntakeToSupabase(offset, batchSize) {
  offset = offset || 0;
  batchSize = batchSize || 100;

  Logger.log("=== syncAllIntakeToSupabase START ===");
  Logger.log("Offset: " + offset + ", Batch size: " + batchSize);

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("[SyncAll] ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return;
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const qSheet = ss.getSheetByName(SHEET_NAME_INTAKE);

  if (!qSheet) {
    Logger.log("[SyncAll] ERROR: Sheet not found: " + SHEET_NAME_INTAKE);
    return;
  }

  const lastRow = qSheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("[SyncAll] No data to sync");
    return;
  }

  const totalRows = lastRow - 1; // ヘッダー除く
  const startRow = 2 + offset; // 2行目から開始（1行目はヘッダー）
  const endRow = Math.min(startRow + batchSize - 1, lastRow);
  const actualBatchSize = endRow - startRow + 1;

  if (offset >= totalRows) {
    Logger.log("[SyncAll] Offset exceeds total rows. Nothing to process.");
    return;
  }

  Logger.log("[SyncAll] Total rows: " + totalRows);
  Logger.log("[SyncAll] Processing rows " + startRow + " to " + endRow + " (" + actualBatchSize + " rows)");

  // 全32列（A-AH）を読み取る
  const allData = qSheet.getRange(startRow, 1, actualBatchSize, 34).getValues();

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const pid = normPid_(row[25]); // Z列 (patient_id)

    if (!pid) {
      skipped++;
      continue;
    }

    const reserveId = (row[1] || "").toString().trim(); // B列
    const name = (row[3] || "").toString().trim(); // D列
    const sex = (row[4] || "").toString().trim(); // E列
    const birth = row[5]; // F列

    // H列 (reserved_date) - Date型の場合はYYYY-MM-DD形式に変換
    const reservedDateRaw = row[7];
    let reservedDate = "";
    if (reservedDateRaw) {
      if (reservedDateRaw instanceof Date) {
        const year = reservedDateRaw.getFullYear();
        const month = String(reservedDateRaw.getMonth() + 1).padStart(2, '0');
        const day = String(reservedDateRaw.getDate()).padStart(2, '0');
        reservedDate = year + "-" + month + "-" + day;
      } else {
        reservedDate = String(reservedDateRaw).trim();
      }
    }

    // I列 (reserved_time) - Date型の場合はHH:MM形式に変換
    const reservedTimeRaw = row[8];
    let reservedTime = "";
    if (reservedTimeRaw) {
      if (reservedTimeRaw instanceof Date) {
        const hours = String(reservedTimeRaw.getHours()).padStart(2, '0');
        const minutes = String(reservedTimeRaw.getMinutes()).padStart(2, '0');
        reservedTime = hours + ":" + minutes;
      } else {
        reservedTime = String(reservedTimeRaw).trim();
      }
    }

    const lineId = (row[6] || "").toString().trim(); // G列
    const status = (row[19] || "").toString().trim(); // T列
    const note = (row[20] || "").toString().trim(); // U列
    const prescriptionMenu = (row[21] || "").toString().trim(); // V列
    const nameKana = (row[22] || "").toString().trim(); // W列
    const tel = (row[23] || "").toString().trim(); // X列
    const answererId = (row[24] || "").toString().trim(); // Y列

    // answersオブジェクトを構築 - 全フィールドを含める
    const answers = {};

    // A列: timestamp
    const timestamp = row[0];
    if (timestamp) {
      try {
        if (timestamp instanceof Date) {
          answers.timestamp = timestamp.toISOString();
        } else {
          answers.timestamp = new Date(timestamp).toISOString();
        }
      } catch (e) {
        answers.timestamp = String(timestamp);
      }
    }

    // B列: reserveId
    if (reserveId) answers.reserveId = reserveId;
    if (reserveId) answers.reserved = reserveId; // フロントエンド互換

    // C列: submittedAt
    const submittedAt = row[2];
    if (submittedAt) {
      try {
        if (submittedAt instanceof Date) {
          answers.submittedAt = submittedAt.toISOString();
        } else {
          answers.submittedAt = new Date(submittedAt).toISOString();
        }
      } catch (e) {
        answers.submittedAt = String(submittedAt);
      }
    }

    // D-F列: 基本情報
    if (name) {
      answers.name = name;
      answers["氏名"] = name;
    }
    if (sex) {
      answers.sex = sex;
      answers["性別"] = sex;
    }

    // birthをISO文字列に変換
    if (birth) {
      try {
        if (birth instanceof Date) {
          answers.birth = birth.toISOString();
          answers["生年月日"] = birth.toISOString();
        } else {
          answers.birth = new Date(birth).toISOString();
          answers["生年月日"] = new Date(birth).toISOString();
        }
      } catch (e) {
        answers.birth = String(birth);
        answers["生年月日"] = String(birth);
      }
    }

    // G列: line_id
    if (lineId) answers.line_id = lineId;

    // H-I列: reserved_date, reserved_time
    if (reservedDate) {
      answers.reserved_date = reservedDate;
      answers["予約日"] = reservedDate;
    }
    if (reservedTime) {
      answers.reserved_time = reservedTime;
      answers["予約時間"] = reservedTime;
    }

    // J-S列: 問診内容
    for (let j = 0; j < ANSWER_KEYS.length; j++) {
      const key = ANSWER_KEYS[j];
      const val = row[9 + j];
      answers[key] = val || "";
    }

    // T列: status (statusはトップレベルにも保存するが、answersにも)
    if (status) answers.status = status;

    // U列: doctor_note
    const doctorNote = (row[20] || "").toString().trim();
    if (doctorNote) answers.doctor_note = doctorNote;

    // V列: prescription_menu
    if (prescriptionMenu) answers.prescription_menu = prescriptionMenu;

    // W-X列: name_kana, tel
    if (nameKana) {
      answers.name_kana = nameKana;
      answers["カナ"] = nameKana;
    }
    if (tel) {
      answers.tel = tel;
      answers["電話番号"] = tel;
    }

    // Y列: answerer_id
    if (answererId) answers.answerer_id = answererId;

    // Z列: patient_id
    if (pid) {
      answers.patient_id = pid;
      answers.Patient_ID = pid;
    }

    // AA列: intakeId
    const intakeId = (row[26] || "").toString().trim();
    if (intakeId) answers.intakeId = intakeId;

    // AC列: call_status (AB列は空白の可能性)
    const callStatus = (row[28] || "").toString().trim();
    if (callStatus) answers.call_status = callStatus;

    // AD列: call_status_updated_at
    const callStatusUpdatedAt = row[29];
    if (callStatusUpdatedAt) {
      try {
        if (callStatusUpdatedAt instanceof Date) {
          answers.call_status_updated_at = callStatusUpdatedAt.toISOString();
        } else {
          answers.call_status_updated_at = new Date(callStatusUpdatedAt).toISOString();
        }
      } catch (e) {
        answers.call_status_updated_at = String(callStatusUpdatedAt);
      }
    }

    // AG列: verified_phone
    const verifiedPhone = row[32];
    if (verifiedPhone) {
      answers.verified_phone = verifiedPhone;
    }

    // AH列: verified_at
    const verifiedAt = row[33];
    if (verifiedAt) {
      try {
        if (verifiedAt instanceof Date) {
          answers.verified_at = verifiedAt.toISOString();
        } else {
          answers.verified_at = new Date(verifiedAt).toISOString();
        }
      } catch (e) {
        answers.verified_at = String(verifiedAt);
      }
    }

    // 値がある場合のみフィールドをセット
    const updateData = {
      answers: answers
    };

    if (reserveId) updateData.reserve_id = reserveId;
    if (name) updateData.patient_name = name;
    if (answererId) updateData.answerer_id = answererId;
    if (lineId) updateData.line_id = lineId;
    if (reservedDate) updateData.reserved_date = reservedDate;
    if (reservedTime) updateData.reserved_time = reservedTime;
    if (status) updateData.status = status;
    if (note) updateData.note = note;
    if (prescriptionMenu) updateData.prescription_menu = prescriptionMenu;

    const endpoint = supabaseUrl + "/rest/v1/intake?patient_id=eq." + encodeURIComponent(pid);

    try {
      const res = UrlFetchApp.fetch(endpoint, {
        method: "patch",
        contentType: "application/json",
        headers: {
          "apikey": supabaseKey,
          "Authorization": "Bearer " + supabaseKey,
          "Prefer": "return=minimal"
        },
        payload: JSON.stringify(updateData),
        muteHttpExceptions: true,
        timeout: 10
      });

      const code = res.getResponseCode();
      if (code >= 200 && code < 300) {
        updated++;
        if ((updated % 10) === 0) {
          Logger.log("[SyncAll] Progress: " + updated + "/" + actualBatchSize);
        }
      } else {
        errors++;
        Logger.log("[SyncAll] ✗ patient_id=" + pid + " code=" + code);
      }
    } catch (e) {
      errors++;
      Logger.log("[SyncAll] ✗ patient_id=" + pid + " error=" + e);
    }

    Utilities.sleep(50); // Rate limiting
  }

  Logger.log("=== syncAllIntakeToSupabase COMPLETE ===");
  Logger.log("Processed rows: " + startRow + " to " + endRow);
  Logger.log("Updated: " + updated);
  Logger.log("Skipped (no patient_id): " + skipped);
  Logger.log("Errors: " + errors);

  const nextOffset = offset + batchSize;
  if (nextOffset < totalRows) {
    Logger.log("\n=== NEXT BATCH ===");
    Logger.log("To continue, run: syncAllIntakeToSupabase(" + nextOffset + ", " + batchSize + ")");
    Logger.log("Remaining rows: " + (totalRows - nextOffset));
  } else {
    Logger.log("\n=== ALL BATCHES COMPLETE ===");
    Logger.log("Total rows processed: " + totalRows);
  }
}

// 全件同期を一度に実行（小規模データセット用）
function syncAllIntakeToSupabaseOneShot() {
  syncAllIntakeToSupabase(0, 10000); // 一度に10000件
}

// 500件ずつバッチ処理（2515行を6回に分割）
function syncBatch1_0to500() {
  syncAllIntakeToSupabase(0, 500);
}

function syncBatch2_500to1000() {
  syncAllIntakeToSupabase(500, 500);
}

function syncBatch3_1000to1500() {
  syncAllIntakeToSupabase(1000, 500);
}

function syncBatch4_1500to2000() {
  syncAllIntakeToSupabase(1500, 500);
}

function syncBatch5_2000to2500() {
  syncAllIntakeToSupabase(2000, 500);
}

function syncBatch6_2500toEnd() {
  syncAllIntakeToSupabase(2500, 500);
}
