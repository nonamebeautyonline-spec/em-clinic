// fix-missing-names.js
// Supabaseで個人情報フィールドが欠けている患者データをシートから補完

function fixMissingNames() {
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

  try {
    // Supabaseから患者データを全件取得（ページネーション対応）
    const pageSize = 1000;
    let allData = [];
    let offset = 0;
    let hasMore = true;

    Logger.log("Supabaseからデータ取得中...");

    while (hasMore) {
      const queryUrl = supabaseUrl + "/rest/v1/intake?select=patient_id,patient_name,answerer_id,line_id,answers&order=created_at.desc&limit=" + pageSize + "&offset=" + offset;

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

      const pageData = JSON.parse(res.getContentText());
      allData = allData.concat(pageData);

      Logger.log("  " + (offset + pageData.length) + "件取得済み");

      if (pageData.length < pageSize) {
        hasMore = false;
      } else {
        offset += pageSize;
      }
    }

    const data = allData;

    // 欠損フィールドがあるデータだけをフィルタ
    const dataWithMissing = data.filter(function(row) {
      const answers = row.answers || {};
      return !row.patient_name ||
             !row.answerer_id ||
             (!answers.氏名 && !answers.name) ||
             (!answers.カナ && !answers.name_kana) ||
             (!answers.性別 && !answers.sex) ||
             (!answers.生年月日 && !answers.birth) ||
             (!answers.電話番号 && !answers.tel);
    });

    Logger.log("全患者データ: " + data.length + "件");
    Logger.log("欠損あり: " + dataWithMissing.length + "件\n");

    if (dataWithMissing.length === 0) {
      Logger.log("✅ 欠損データはありません");
      return;
    }

    const lastRow = sheet.getLastRow();
    const values = sheet.getRange(2, 1, lastRow - 1, 27).getValues();

    // 列インデックス
    const COL_NAME = 3;           // D
    const COL_SEX = 4;            // E
    const COL_BIRTH = 5;          // F
    const COL_LINE_ID = 6;        // G
    const COL_NAME_KANA = 22;     // W
    const COL_TEL = 23;           // X
    const COL_ANSWERER_ID = 24;   // Y
    const COL_PATIENT_ID = 25;    // Z

    let updated = 0;
    let notFound = 0;

    dataWithMissing.forEach(function(row) {
      const pid = row.patient_id;
      Logger.log("Patient ID: " + pid);

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

          if (!name) {
            Logger.log("  ⚠️  シートにも名前なし（スキップ）");
            notFound++;
            break;
          }

          Logger.log("  シートから取得: " + name);
          Logger.log("    カナ: " + (nameKana || "(なし)"));
          Logger.log("    answerer_id: " + (answererId || "(なし)"));

          // answersを更新（既存値を優先、シートで補完）
          const answers = row.answers || {};
          if (name) {
            answers.氏名 = name;
            answers.name = name;
          }
          if (sex) {
            answers.性別 = sex;
            answers.sex = sex;
          }
          if (birth) {
            answers.生年月日 = birth;
            answers.birth = birth;
          }
          if (nameKana) {
            answers.カナ = nameKana;
            answers.name_kana = nameKana;
          }
          if (tel) {
            answers.電話番号 = tel;
            answers.tel = tel;
          }

          // Supabaseを更新
          const updateUrl = supabaseUrl + "/rest/v1/intake?patient_id=eq." + pid;

          const updatePayload = { answers: answers };
          if (!row.patient_name && name) updatePayload.patient_name = name;
          if (!row.answerer_id && answererId) updatePayload.answerer_id = answererId;
          if (!row.line_id && lineId) updatePayload.line_id = lineId;

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
        Logger.log("  ❌ シートに見つかりません");
        notFound++;
      }
    });

    Logger.log("\n=== 完了 ===");
    Logger.log("更新成功: " + updated + "件");
    Logger.log("見つからない: " + notFound + "件");

  } catch (e) {
    Logger.log("❌ エラー: " + e);
  }
}
