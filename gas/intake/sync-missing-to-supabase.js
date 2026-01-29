// sync-missing-to-supabase.js
// Supabaseに存在しないpatient_idだけを抽出してINSERT

function syncMissingToSupabase() {
  Logger.log("=== Supabaseに存在しないデータのみ同期 ===\n");

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("❌ Supabase環境変数が設定されていません");
    return;
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME_INTAKE);

  if (!sheet) {
    Logger.log("❌ 問診シートが見つかりません");
    return;
  }

  // ステップ1: Supabaseから全patient_idを取得（ページネーション）
  Logger.log("ステップ1: Supabaseから全patient_idを取得中...");

  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;
  const supabasePids = {};

  while (hasMore) {
    const queryUrl = supabaseUrl + "/rest/v1/intake?select=patient_id&limit=" + pageSize + "&offset=" + offset;

    const res = UrlFetchApp.fetch(queryUrl, {
      method: "get",
      headers: {
        "apikey": supabaseKey,
        "Authorization": "Bearer " + supabaseKey
      },
      muteHttpExceptions: true
    });

    const code = res.getResponseCode();
    if (code !== 200) {
      Logger.log("❌ Supabaseクエリ失敗: " + code);
      return;
    }

    const pageData = JSON.parse(res.getContentText());
    pageData.forEach(function(row) {
      supabasePids[row.patient_id] = true;
    });

    Logger.log("  " + (offset + pageData.length) + "件取得済み");

    if (pageData.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  Logger.log("Supabase既存件数: " + Object.keys(supabasePids).length + "件\n");

  // ステップ2: シートから全データを取得
  Logger.log("ステップ2: シートから全データを取得中...");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("シートにデータがありません");
    return;
  }

  const allData = sheet.getRange(2, 1, lastRow - 1, 34).getValues();
  Logger.log("シート件数: " + allData.length + "件\n");

  // ステップ3: Supabaseに存在しないデータを抽出
  Logger.log("ステップ3: 差分を抽出中...");

  const missingRows = [];

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const pid = normPid_(row[25]); // Z列

    if (!pid) continue;

    if (!supabasePids[pid]) {
      missingRows.push({ index: i, pid: pid, row: row });
    }
  }

  Logger.log("Supabaseに存在しない件数: " + missingRows.length + "件\n");

  if (missingRows.length === 0) {
    Logger.log("✅ 全データ同期済みです");
    return;
  }

  // ステップ4: 欠けているデータをSupabaseにINSERT
  Logger.log("ステップ4: Supabaseに追加中...\n");

  let inserted = 0;
  let errors = 0;

  missingRows.forEach(function(item) {
    const row = item.row;
    const pid = item.pid;

    Logger.log((inserted + errors + 1) + "/" + missingRows.length + ": " + pid);

    // データを構築（sync-all-to-supabase.gsと同じロジック）
    const reserveId = (row[1] || "").toString().trim();
    const name = (row[3] || "").toString().trim();
    const sex = (row[4] || "").toString().trim();
    const birth = row[5];

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

    const lineId = (row[6] || "").toString().trim();
    const status = (row[19] || "").toString().trim();
    const note = (row[20] || "").toString().trim();
    const prescriptionMenu = (row[21] || "").toString().trim();
    const nameKana = (row[22] || "").toString().trim();
    const tel = (row[23] || "").toString().trim();
    const answererId = (row[24] || "").toString().trim();

    // answersオブジェクト構築
    const answers = {};

    // 個人情報
    if (name) {
      answers.name = name;
      answers["氏名"] = name;
    }
    if (sex) {
      answers.sex = sex;
      answers["性別"] = sex;
    }
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
    if (nameKana) {
      answers.name_kana = nameKana;
      answers["カナ"] = nameKana;
    }
    if (tel) {
      answers.tel = tel;
      answers["電話番号"] = tel;
    }
    if (answererId) answers.answerer_id = answererId;
    if (lineId) answers.line_id = lineId;

    // 問診内容（J-S列）
    for (let j = 0; j < ANSWER_KEYS.length; j++) {
      const key = ANSWER_KEYS[j];
      const val = row[9 + j];
      answers[key] = val || "";
    }

    // INSERT用データ
    const insertData = {
      patient_id: pid,
      answers: answers
    };

    if (reserveId) insertData.reserve_id = reserveId;
    if (name) insertData.patient_name = name;
    if (answererId) insertData.answerer_id = answererId;
    if (lineId) insertData.line_id = lineId;
    if (reservedDate) insertData.reserved_date = reservedDate;
    if (reservedTime) insertData.reserved_time = reservedTime;
    if (status) insertData.status = status;
    if (note) insertData.note = note;
    if (prescriptionMenu) insertData.prescription_menu = prescriptionMenu;

    const endpoint = supabaseUrl + "/rest/v1/intake";

    try {
      const res = UrlFetchApp.fetch(endpoint, {
        method: "post",
        contentType: "application/json",
        headers: {
          "apikey": supabaseKey,
          "Authorization": "Bearer " + supabaseKey,
          "Prefer": "return=minimal"
        },
        payload: JSON.stringify(insertData),
        muteHttpExceptions: true,
        timeout: 10
      });

      const code = res.getResponseCode();
      if (code >= 200 && code < 300) {
        inserted++;
        Logger.log("  ✓ 追加成功");
      } else {
        errors++;
        Logger.log("  ❌ 追加失敗: code=" + code);
      }
    } catch (e) {
      errors++;
      Logger.log("  ❌ エラー: " + e);
    }

    Utilities.sleep(100); // Rate limiting
  });

  Logger.log("\n=== 完了 ===");
  Logger.log("追加成功: " + inserted + "件");
  Logger.log("エラー: " + errors + "件");
}
