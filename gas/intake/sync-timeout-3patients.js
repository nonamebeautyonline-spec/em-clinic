// sync-timeout-3patients.js
// タイムアウトした3人のデータをシートから取得してSupabaseに同期

function syncTimeout3Patients() {
  const targetPids = ["20260101552", "20260101554", "20260101555", "20260101557"];

  Logger.log("=== タイムアウトした3人のデータを補完 ===\n");

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

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("シートにデータがありません");
    return;
  }

  // 全行読み込み（A〜AH: 34列）
  const allData = sheet.getRange(2, 1, lastRow - 1, 34).getValues();

  const COL_RESERVE_ID = 1;  // B
  const COL_SUBMITTED_AT = 2; // C
  const COL_NAME = 3;        // D
  const COL_SEX = 4;         // E
  const COL_BIRTH = 5;       // F
  const COL_LINE_ID = 6;     // G
  const COL_RESERVED_DATE = 7; // H
  const COL_RESERVED_TIME = 8; // I
  const COL_ANSWERS_START = 9; // J〜S (10列)
  const COL_STATUS = 19;     // T
  const COL_NOTE = 20;       // U
  const COL_PRESCRIPTION = 21; // V
  const COL_NAME_KANA = 22;  // W
  const COL_TEL = 23;        // X
  const COL_ANSWERER_ID = 24; // Y
  const COL_PID = 25;        // Z
  const COL_INTAKE_ID = 26;  // AA
  const COL_VERIFIED_PHONE = 32; // AG
  const COL_VERIFIED_AT = 33;    // AH

  const ANSWER_KEYS = [
    "glp_history", "ng_check", "med_yesno", "allergy_yesno",
    "current_disease_yesno", "entry_route"
  ];

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const pid = String(row[COL_PID] || "").trim();

    if (!targetPids.includes(pid)) continue;

    Logger.log("\n処理中: " + pid);

    const name = String(row[COL_NAME] || "").trim();
    const sex = String(row[COL_SEX] || "").trim();
    const birth = String(row[COL_BIRTH] || "").trim();
    const nameKana = String(row[COL_NAME_KANA] || "").trim();
    const tel = String(row[COL_TEL] || "").trim();
    const lineId = String(row[COL_LINE_ID] || "").trim();
    const answererId = String(row[COL_ANSWERER_ID] || "").trim();
    const reserveId = String(row[COL_RESERVE_ID] || "").trim();
    const submittedAt = row[COL_SUBMITTED_AT];

    // answers
    const answers = {};
    for (let j = 0; j < ANSWER_KEYS.length; j++) {
      const key = ANSWER_KEYS[j];
      const val = String(row[COL_ANSWERS_START + j] || "").trim();
      answers[key] = val;
    }

    // 個人情報もanswersに追加
    answers["氏名"] = name;
    answers["name"] = name;
    answers["性別"] = sex;
    answers["sex"] = sex;
    answers["生年月日"] = birth;
    answers["birth"] = birth;
    answers["カナ"] = nameKana;
    answers["name_kana"] = nameKana;
    answers["電話番号"] = tel;
    answers["tel"] = tel;

    Logger.log("  氏名: " + (name || "(なし)"));
    Logger.log("  性別: " + (sex || "(なし)"));
    Logger.log("  生年月日: " + (birth || "(なし)"));

    // Supabaseに存在確認
    const checkUrl = supabaseUrl + "/rest/v1/intake?select=patient_id&patient_id=eq." + encodeURIComponent(pid);
    const checkRes = UrlFetchApp.fetch(checkUrl, {
      method: "get",
      headers: {
        "apikey": supabaseKey,
        "Authorization": "Bearer " + supabaseKey
      },
      muteHttpExceptions: true
    });

    const exists = JSON.parse(checkRes.getContentText()).length > 0;

    if (exists) {
      // 更新（PATCH）
      Logger.log("  → 既存レコードを更新");

      const updateUrl = supabaseUrl + "/rest/v1/intake?patient_id=eq." + encodeURIComponent(pid);
      const updatePayload = {
        patient_name: name || null,
        answers: answers
      };

      const updateRes = UrlFetchApp.fetch(updateUrl, {
        method: "patch",
        contentType: "application/json",
        headers: {
          "apikey": supabaseKey,
          "Authorization": "Bearer " + supabaseKey,
          "Prefer": "return=minimal"
        },
        payload: JSON.stringify(updatePayload),
        muteHttpExceptions: true
      });

      const updateCode = updateRes.getResponseCode();
      if (updateCode >= 200 && updateCode < 300) {
        Logger.log("  ✅ 更新成功");
      } else {
        Logger.log("  ❌ 更新失敗: " + updateCode);
      }
    } else {
      // 新規作成（POST）
      Logger.log("  → 新規レコードを作成");

      const insertUrl = supabaseUrl + "/rest/v1/intake";
      const insertPayload = {
        reserve_id: reserveId || null,
        patient_id: pid,
        answerer_id: answererId || null,
        line_id: lineId || null,
        patient_name: name || null,
        answers: answers
      };

      const insertRes = UrlFetchApp.fetch(insertUrl, {
        method: "post",
        contentType: "application/json",
        headers: {
          "apikey": supabaseKey,
          "Authorization": "Bearer " + supabaseKey,
          "Prefer": "return=minimal"
        },
        payload: JSON.stringify(insertPayload),
        muteHttpExceptions: true
      });

      const insertCode = insertRes.getResponseCode();
      if (insertCode >= 200 && insertCode < 300) {
        Logger.log("  ✅ 作成成功");
      } else {
        Logger.log("  ❌ 作成失敗: " + insertCode);
        Logger.log("  レスポンス: " + insertRes.getContentText());
      }
    }
  }

  Logger.log("\n=== 完了 ===");
}
