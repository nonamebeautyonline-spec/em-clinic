// patch-missing-questionnaire-to-supabase.js
// Supabaseに問診データ(ng_check等)がない患者を検出し、GASシートから補完する
//
// 使い方: GASエディタでこのファイルを開いて patchMissingQuestionnaire を実行

/**
 * メイン関数: 問診データが欠けているDBレコードをGASシートから補完
 */
function patchMissingQuestionnaire() {
  Logger.log("=== 問診データ補完スクリプト開始 ===\n");

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("❌ Supabase環境変数が設定されていません");
    return;
  }

  // ステップ1: Supabaseから問診データが不完全なレコードを取得
  Logger.log("ステップ1: Supabaseから問診データが不完全なレコードを取得中...");

  const incompletePatients = getIncompletePatients_(supabaseUrl, supabaseKey);
  Logger.log("問診データ不完全: " + incompletePatients.length + "件\n");

  if (incompletePatients.length === 0) {
    Logger.log("✅ 全レコードに問診データがあります");
    return;
  }

  // ステップ2: GASシートから対象患者のデータを取得
  Logger.log("ステップ2: GASシートからデータを取得中...");

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

  const allData = sheet.getRange(2, 1, lastRow - 1, 34).getValues();
  Logger.log("シート件数: " + allData.length + "件\n");

  // シートデータをpatient_idでマップ化
  const sheetMap = {};
  allData.forEach(function(row) {
    const pid = normPid_(row[25]); // Z列 = patient_id
    if (pid) {
      sheetMap[pid] = row;
    }
  });

  // ステップ3: 補完処理
  Logger.log("ステップ3: 補完処理中...\n");

  let patched = 0;
  let notFoundInSheet = 0;
  let noQuestionnaireInSheet = 0;
  let errors = 0;

  incompletePatients.forEach(function(patient, idx) {
    const pid = patient.patient_id;
    const existingAnswers = patient.answers || {};

    Logger.log((idx + 1) + "/" + incompletePatients.length + ": " + pid);

    const sheetRow = sheetMap[pid];
    if (!sheetRow) {
      notFoundInSheet++;
      Logger.log("  → シートに存在しません");
      return;
    }

    // シートから問診データを抽出
    const sheetAnswers = extractAnswersFromRow_(sheetRow);

    // シートにも問診データがない場合
    if (!sheetAnswers.ng_check) {
      noQuestionnaireInSheet++;
      Logger.log("  → シートにも問診データなし");
      return;
    }

    // 既存answersとマージ
    const mergedAnswers = {};

    // まず既存データをコピー
    for (var key in existingAnswers) {
      mergedAnswers[key] = existingAnswers[key];
    }

    // シートのデータで上書き
    for (var key in sheetAnswers) {
      if (sheetAnswers[key] !== "" && sheetAnswers[key] !== null && sheetAnswers[key] !== undefined) {
        mergedAnswers[key] = sheetAnswers[key];
      }
    }

    // Supabaseを更新
    var success = updateSupabaseAnswers_(supabaseUrl, supabaseKey, pid, mergedAnswers);
    if (success) {
      patched++;
      Logger.log("  ✓ 補完成功");
    } else {
      errors++;
      Logger.log("  ❌ 更新失敗");
    }

    Utilities.sleep(100); // Rate limiting
  });

  Logger.log("\n=== 完了 ===");
  Logger.log("補完成功: " + patched + "件");
  Logger.log("シートになし: " + notFoundInSheet + "件");
  Logger.log("シートにも問診なし: " + noQuestionnaireInSheet + "件");
  Logger.log("エラー: " + errors + "件");
}

/**
 * Supabaseから問診データ(ng_check)がないレコードを取得
 */
function getIncompletePatients_(supabaseUrl, supabaseKey) {
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;
  const incomplete = [];

  while (hasMore) {
    // answersカラムも含めて取得
    const queryUrl = supabaseUrl + "/rest/v1/intake?select=patient_id,answers&limit=" + pageSize + "&offset=" + offset;

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
      break;
    }

    const pageData = JSON.parse(res.getContentText());

    // ng_checkがないレコードを抽出
    pageData.forEach(function(row) {
      if (!row.answers || !row.answers.ng_check) {
        incomplete.push(row);
      }
    });

    Logger.log("  " + (offset + pageData.length) + "件チェック済み (不完全: " + incomplete.length + "件)");

    if (pageData.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  return incomplete;
}

/**
 * シートの行から問診回答を抽出
 */
function extractAnswersFromRow_(row) {
  const answers = {};

  // 基本情報
  const name = (row[3] || "").toString().trim();     // D列
  const sex = (row[4] || "").toString().trim();      // E列
  const birth = row[5];                               // F列
  const lineId = (row[6] || "").toString().trim();   // G列
  const nameKana = (row[22] || "").toString().trim(); // W列
  const tel = (row[23] || "").toString().trim();      // X列
  const answererId = (row[24] || "").toString().trim(); // Y列

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
        answers.birth = String(birth);
        answers["生年月日"] = String(birth);
      }
    } catch (e) {}
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

  // 問診データ（J-S列 = 9-18 in 0-indexed）
  for (var j = 0; j < ANSWER_KEYS.length; j++) {
    var key = ANSWER_KEYS[j];
    var val = row[9 + j];
    if (val !== "" && val !== null && val !== undefined) {
      answers[key] = val.toString();
    }
  }

  return answers;
}

/**
 * Supabaseのintake.answersを更新
 */
function updateSupabaseAnswers_(supabaseUrl, supabaseKey, patientId, answers) {
  const endpoint = supabaseUrl + "/rest/v1/intake?patient_id=eq." + encodeURIComponent(patientId);

  try {
    const res = UrlFetchApp.fetch(endpoint, {
      method: "patch",
      contentType: "application/json",
      headers: {
        "apikey": supabaseKey,
        "Authorization": "Bearer " + supabaseKey,
        "Prefer": "return=minimal"
      },
      payload: JSON.stringify({ answers: answers }),
      muteHttpExceptions: true,
      timeout: 10
    });

    const code = res.getResponseCode();
    return (code >= 200 && code < 300);
  } catch (e) {
    Logger.log("  エラー: " + e);
    return false;
  }
}

/**
 * 補完前のプレビュー（実際には更新しない）
 */
function previewMissingQuestionnaire() {
  Logger.log("=== 問診データ補完プレビュー ===\n");

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("❌ Supabase環境変数が設定されていません");
    return;
  }

  // Supabaseから問診データが不完全なレコードを取得
  const incompletePatients = getIncompletePatients_(supabaseUrl, supabaseKey);
  Logger.log("問診データ不完全: " + incompletePatients.length + "件\n");

  if (incompletePatients.length === 0) {
    Logger.log("✅ 全レコードに問診データがあります");
    return;
  }

  // GASシートからデータを取得
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

  const allData = sheet.getRange(2, 1, lastRow - 1, 34).getValues();

  // シートデータをpatient_idでマップ化
  const sheetMap = {};
  allData.forEach(function(row) {
    const pid = normPid_(row[25]);
    if (pid) {
      sheetMap[pid] = row;
    }
  });

  // 集計
  let inSheet = 0;
  let notInSheet = 0;
  let hasQuestionnaire = 0;
  let noQuestionnaire = 0;

  incompletePatients.forEach(function(patient) {
    const pid = patient.patient_id;
    const sheetRow = sheetMap[pid];

    if (!sheetRow) {
      notInSheet++;
      return;
    }

    inSheet++;
    const sheetAnswers = extractAnswersFromRow_(sheetRow);

    if (sheetAnswers.ng_check) {
      hasQuestionnaire++;
    } else {
      noQuestionnaire++;
    }
  });

  Logger.log("=== プレビュー結果 ===");
  Logger.log("DB問診欠損: " + incompletePatients.length + "件");
  Logger.log("  シートに存在: " + inSheet + "件");
  Logger.log("    問診データあり: " + hasQuestionnaire + "件 ← これが補完対象");
  Logger.log("    問診データなし: " + noQuestionnaire + "件");
  Logger.log("  シートに不在: " + notInSheet + "件");
}
