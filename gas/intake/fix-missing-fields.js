// fix-missing-fields.js
// Supabaseで個人情報フィールドが欠けている患者データをシートから補完

function fixMissingFields() {
  const SPREADSHEET_ID = "1j932bAhjOAN1fF55gU07F4VRMWi9yTphoejCGJHFwuo";
  const SHEET_NAME_INTAKE = "問診";

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME_INTAKE);

  if (!sheet) {
    Logger.log("❌ 問診シートが見つかりません");
    return;
  }

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("❌ Supabase環境変数が設定されていません");
    return;
  }

  Logger.log("=== 個人情報フィールド欠損データの補完 ===\n");

  // Supabaseから全患者を取得（最近のデータのみ、例えば直近1000件）
  const queryUrl = supabaseUrl + "/rest/v1/intake?select=patient_id,patient_name,answerer_id,line_id,answers&order=created_at.desc&limit=1000";

  try {
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
      Logger.log("❌ Supabase クエリ失敗: " + code);
      return;
    }

    const data = JSON.parse(res.getContentText());
    Logger.log("Supabase患者データ: " + data.length + "件\n");

    const lastRow = sheet.getLastRow();
    const values = sheet.getRange(2, 1, lastRow - 1, 27).getValues();

    // 列インデックス（0-based for values array）
    const COL_NAME = 3;           // D
    const COL_SEX = 4;            // E
    const COL_BIRTH = 5;          // F
    const COL_LINE_ID = 6;        // G
    const COL_NAME_KANA = 22;     // W
    const COL_TEL = 23;           // X
    const COL_ANSWERER_ID = 24;   // Y
    const COL_PATIENT_ID = 25;    // Z

    let updated = 0;
    let skipped = 0;

    data.forEach(function(row) {
      const pid = row.patient_id;
      const answers = row.answers || {};

      // 欠損フィールドをチェック
      const needsUpdate =
        !row.patient_name ||
        !row.answerer_id ||
        !answers.氏名 && !answers.name ||
        !answers.カナ && !answers.name_kana ||
        !answers.性別 && !answers.sex ||
        !answers.生年月日 && !answers.birth ||
        !answers.電話番号 && !answers.tel;

      if (!needsUpdate) {
        return; // このデータは正常なのでスキップ
      }

      Logger.log("Patient ID: " + pid);
      Logger.log("  欠損フィールドあり、シートから補完を試みます");

      // シートから該当行を検索
      let found = false;
      for (let i = 0; i < values.length; i++) {
        const sheetPid = String(values[i][COL_PATIENT_ID] || "").trim();
        if (sheetPid === pid) {
          found = true;

          const name = String(values[i][COL_NAME] || "").trim();
          const sex = String(values[i][COL_SEX] || "").trim();
          const birth = String(values[i][COL_BIRTH] || "").trim();
          const lineId = String(values[i][COL_LINE_ID] || "").trim();
          const nameKana = String(values[i][COL_NAME_KANA] || "").trim();
          const tel = String(values[i][COL_TEL] || "").trim();
          const answererId = String(values[i][COL_ANSWERER_ID] || "").trim();

          Logger.log("  シートから取得:");
          Logger.log("    氏名: " + (name || "(なし)"));
          Logger.log("    カナ: " + (nameKana || "(なし)"));
          Logger.log("    answerer_id: " + (answererId || "(なし)"));

          // answersを更新（既存の値を優先、シートの値で補完）
          const updatedAnswers = Object.assign({}, answers);

          if (name) {
            updatedAnswers.氏名 = name;
            updatedAnswers.name = name;
          }
          if (sex) {
            updatedAnswers.性別 = sex;
            updatedAnswers.sex = sex;
          }
          if (birth) {
            updatedAnswers.生年月日 = birth;
            updatedAnswers.birth = birth;
          }
          if (nameKana) {
            updatedAnswers.カナ = nameKana;
            updatedAnswers.name_kana = nameKana;
          }
          if (tel) {
            updatedAnswers.電話番号 = tel;
            updatedAnswers.tel = tel;
          }

          // Supabaseを更新
          const updateUrl = supabaseUrl + "/rest/v1/intake?patient_id=eq." + pid;
          const updatePayload = {
            answers: updatedAnswers
          };

          // patient_name, answerer_id, line_id が欠けていれば更新
          if (!row.patient_name && name) {
            updatePayload.patient_name = name;
          }
          if (!row.answerer_id && answererId) {
            updatePayload.answerer_id = answererId;
          }
          if (!row.line_id && lineId) {
            updatePayload.line_id = lineId;
          }

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
            Logger.log("  ✓ 更新成功");
            updated++;
          } else {
            Logger.log("  ❌ 更新失敗: " + updateCode);
          }

          break;
        }
      }

      if (!found) {
        Logger.log("  ⚠️  シートに見つかりません");
        skipped++;
      }
    });

    Logger.log("\n=== 完了 ===");
    Logger.log("更新成功: " + updated + "件");
    Logger.log("スキップ: " + skipped + "件");

  } catch (e) {
    Logger.log("❌ エラー: " + e);
  }
}
