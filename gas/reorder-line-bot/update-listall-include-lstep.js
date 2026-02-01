/**
 * handleListAll_ 関数の更新版
 *
 * このコードを gas/reorder-line-bot/コード.js の handleListAll_ 関数（267-307行目）と置き換えてください
 *
 * 変更点:
 * - lstep_uid (G列, row[6]) をレスポンスに追加
 * - line_uid (F列, row[5]) をレスポンスに追加
 */

// 再処方申請を一覧取得（全体、Doctor用）
function handleListAll_(body) {
  var includeAll = body.include_all === true; // trueなら全件、それ以外はpendingだけ

  var sheet = getReorderSheet_();
  var values = sheet.getDataRange().getValues();
  var list = [];

  // 先に patient_name / history 用のマップを読み込む
  var nameMap = loadPatientNameMap_();
  var historyMap = loadHistoryMap_(5); // 患者ごと最新5件とか

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var status = String(row[3] || ""); // D: status

    if (!includeAll && status !== "pending") continue;

    var pid = normPid_(row[1]);          // B: patient_id
    var code = String(row[2] || "");       // C: product_code
    var ts = row[0];                       // A: timestamp
    var note = row[4] || "";               // E: note
    var lineUid = String(row[5] || "");    // F: line_uid ★追加
    var lstepUid = String(row[6] || "");   // G: lstep_uid ★追加

    var tsStr = ts instanceof Date
      ? Utilities.formatDate(ts, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss")
      : String(ts);

    list.push({
      id: String(i + 1),          // 行番号（1行目はヘッダーなので+1）
      timestamp: tsStr,
      patient_id: pid,
      patient_name: nameMap[pid] || "",
      product_code: code,
      status: status,
      note: note,
      line_uid: lineUid,          // ★追加
      lstep_uid: lstepUid,        // ★追加
      history: historyMap[pid] || [],
    });
  }

  return jsonResponse({ ok: true, reorders: list });
}
