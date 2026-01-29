/**
 * 再処方申請 API
 *
 * Script Properties:
 *  - REORDER_SHEET_ID   : スプレッドシートID
 *  - REORDER_SHEET_NAME : シート名（例: "シート1"）
 *
 * Request (JSON, POST):
 *   { "action": "apply", "patient_id": "20251200006", "product_code": "MJL_5mg_3m" }
 *   { "action": "list",  "patient_id": "20251200006" }
 *   { "action": "cancel","patient_id": "20251200006" }
 */

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return jsonResponse({ ok: false, error: "no body" }, 400);
  }

  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ ok: false, error: "bad json" }, 400);
  }

  Logger.log("reorder doPost body: " + JSON.stringify(body));

  var action = body.action || "apply";

  try {
    if (action === "apply") {
      return handleApply_(body);

    } else if (action === "list") {
      return handleList_(body);

    } else if (action === "cancel") {
      return handleCancel_(body);

    } else if (action === "listAll") {
      return handleListAll_(body);

    } else if (action === "approve") {
      return handleApprove_(body);

    } else if (action === "reject") {
      return handleReject_(body);

    } else if (action === "paid") {
      return handlePaid_(body);

    } else if (action === "debug") {
      return handleDebug_(body);

    } else {
      return jsonResponse({ ok: false, error: "unknown action" }, 400);
    }

  } catch (err) {
    Logger.log("reorder doPost error: " + err);
    return jsonResponse({ ok: false, error: String(err) }, 500);
  }
}


function getReorderSheet_() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty("REORDER_SHEET_ID");
  var sheetName = props.getProperty("REORDER_SHEET_NAME") || "シート1";

  if (!sheetId) throw new Error("REORDER_SHEET_ID not set");

  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["timestamp", "patient_id", "product_code", "status", "note"]);
  }
  return sheet;
}

// 再処方申請を登録（同じ patient_id の pending は常に1件にする）
function handleApply_(body) {
  var patientId = String(body.patient_id || "").trim();
  var productCode = String(body.product_code || "").trim();

  if (!patientId || !productCode) {
    return jsonResponse(
      { ok: false, error: "patient_id and product_code required" },
      400
    );
  }

  var sheet = getReorderSheet_();
  var values = sheet.getDataRange().getValues();

  // 既存の pending をいったん "canceled" にする
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rowPid = String(row[1] || "");
    var status = String(row[3] || "");
    if (rowPid === patientId && status === "pending") {
      sheet.getRange(i + 1, 4).setValue("canceled"); // D列 status
    }
  }

  // ===== 追加: 問診ブックから LINE UID / LステップUID を引く =====
  // 問診: G=line_id / Y=answerer_id / Z=patient_id（※列決め打ちはせずヘッダーで拾う）
  var pid = normPid_(patientId);

  var lineUid = "";
  var lstepUid = "";
  try {
    var idMap = loadLineAndLstepMapFromIntake_(); // ←下に定義した関数を追加して使う
    if (idMap && idMap[pid]) {
      lineUid  = String(idMap[pid].line_id || "").trim();
      lstepUid = String(idMap[pid].answerer_id || "").trim();
    }
  } catch (e) {
    Logger.log("[handleApply] loadLineAndLstepMapFromIntake_ error: " + e);
  }

  // ===== 修正: 新しい pending を追加（A〜Gを想定）=====
  // 既存シートが A〜E しかない場合でも、getReorderSheet_() を拡張済み前提（ヘッダーにline_uid/lstep_uidを追加）
  sheet.appendRow([
    new Date(),      // A timestamp
    patientId,       // B patient_id
    productCode,     // C product_code
    "pending",       // D status
    body.note || "", // E note
    lineUid,         // F line_uid
    ""               // G lstep_uid（式で入れる）
  ]);

  var rowNum = sheet.getLastRow(); // appendRow直後
  Logger.log("[handleApply] appended row=" + rowNum + " pid=" + patientId + " code=" + productCode);

  // ===== 追加: G列を LステップURLのハイパーリンクにする（表示=ID）=====
  // https://manager.linestep.net/line/visual?member=【LステップID】
  if (lstepUid) {
    var url = "https://manager.linestep.net/line/visual?member=" + encodeURIComponent(lstepUid);
    var safeText = lstepUid.replace(/"/g, '""');
    var formula = '=HYPERLINK("' + url + '","' + safeText + '")';
    sheet.getRange(rowNum, 7).setFormula(formula); // G列
  } else {
    sheet.getRange(rowNum, 7).setValue(""); // G列空
  }

  // ✅ LINE通知（処方歴＋承認/却下ボタン）
  try {
    logLinePush_("APPLY_ENTER", "pid=" + patientId + " code=" + productCode);

    // pid はすでに上で normPid_ 済み
    // ここはあなたが先ほど「問診」シートから氏名を引くようにした流れを踏襲
    // 既存の loadPatientNameMap_ が「問診」参照になっている前提
    var nameMap = loadPatientNameMap_();
    var name = nameMap[pid] || "";

    var historyMap = loadHistoryMap_(5);
    var historyLines = buildHistoryLines_(historyMap[pid] || [], 5);

    // reorderIdは「行番号」で扱っているため、appendRow直後の lastRow を採用
    var reorderId = String(rowNum);

    var flex = buildReorderFlex_({
      reorderId: reorderId,
      pid: pid,
      name: name,
      productCode: productCode,
      note: body.note || "",
      historyLines: historyLines,
    });

    var result = linePushFlexToOps_("再処方申請: " + pid, flex);

    // appendRow直後の行（申請行）に結果を残す（E列 note に追記）
    var noteOld = String(sheet.getRange(rowNum, 5).getValue() || "");
    var stamp = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
    var mark = result && result.ok ? "LINE_OK" : ("LINE_FAIL:" + (result.code || "?"));
    sheet.getRange(rowNum, 5).setValue(
      (noteOld ? noteOld + "\n" : "") + stamp + " " + mark
    );

  } catch (e) {
    Logger.log("LINE notify error: " + e);
    // ★ エラー時もnote列に記録
    try {
      var stamp = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
      sheet.getRange(rowNum, 5).setValue(stamp + " LINE_ERROR:" + String(e).substring(0, 100));
    } catch (e2) {
      Logger.log("Failed to write error to note: " + e2);
    }
  }

  // ★ キャッシュ無効化（新規申請時も古いデータをクリア）
  if (patientId) {
    invalidateVercelCache_(patientId);
  }

  return jsonResponse({ ok: true });
}


// 再処方申請を一覧取得（patient_id ごと）
// 再処方申請を一覧取得（患者用）
function handleList_(body) {
  var patientId = String(body.patient_id || "").trim();
  if (!patientId) {
    return jsonResponse({ ok: false, error: "patient_id required" }, 400);
  }

  Logger.log("LIST patient_id=" + patientId); // ★ ここは関数の先頭

  var sheet = getReorderSheet_();
  var values = sheet.getDataRange().getValues();
  var list = [];

  // 想定ヘッダー:
  // A:timestamp, B:patient_id, C:product_code, D:status, E:note
  for (var i = 1; i < values.length; i++) {
    var row = values[i];

    var rowPidRaw = row[1];                              // 生の値
    var rowPid = normPid_(rowPidRaw);                    // ★ normPid_を使って正規化（.0削除など）

    // ★ 各行の pid をログ出し
    Logger.log(
      "ROW " +
        (i + 1) +
        " rawPid=" +
        rowPidRaw +
        "  pid=" +
        rowPid
    );

    if (rowPid !== patientId) continue;

    var ts = row[0];                    // A列 timestamp
    var tsStr = ts instanceof Date
      ? Utilities.formatDate(ts, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss")
      : String(ts);

    var code   = String(row[2] || "");  // C列 product_code
    var status = String(row[3] || "");  // D列 status
    var note   = row[4] || "";          // E列 note

    // ★ canceled, rejected, paid は患者には見せない
    if (status === "canceled" || status === "rejected" || status === "paid") {
      continue;
    }

    list.push({
      id: String(i + 1),       // 行番号（ヘッダー行があるので +1）
      timestamp: tsStr,
      product_code: code,
      status: status,
      note: note,
    });
  }

  Logger.log("LIST result count=" + list.length); // ★ 何件返したか

  return jsonResponse({ ok: true, reorders: list });
}


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
      history: historyMap[pid] || [],
    });
  }

  return jsonResponse({ ok: true, reorders: list });
}


// Doctor: 承認（status を confirmed に）
function handleApprove_(body) {
  var id = Number(body.id); // 行番号 (1始まり)
  if (!id || isNaN(id)) {
    return jsonResponse({ ok: false, error: "id required" }, 400);
  }

  var sheet = getReorderSheet_();
  var lastRow = sheet.getLastRow();
  if (id < 2 || id > lastRow) {
    return jsonResponse({ ok: false, error: "invalid id" }, 400);
  }

  // ★ patient_id を取得（B列）
  var patientId = normPid_(sheet.getRange(id, 2).getValue());

  // D列(status) を confirmed に
  sheet.getRange(id, 4).setValue("confirmed");

  // ★ Vercel キャッシュ無効化
  if (patientId) {
    invalidateVercelCache_(patientId);
  }

  return jsonResponse({ ok: true });
}

// Doctor: 却下（status を canceled に）
function handleReject_(body) {
  var id = Number(body.id); // 行番号 (1始まり)
  if (!id || isNaN(id)) {
    return jsonResponse({ ok: false, error: "id required" }, 400);
  }

  var sheet = getReorderSheet_();
  var lastRow = sheet.getLastRow();
  if (id < 2 || id > lastRow) {
    return jsonResponse({ ok: false, error: "invalid id" }, 400);
  }

  // ★ patient_id を取得（B列）
  var patientId = normPid_(sheet.getRange(id, 2).getValue());

  sheet.getRange(id, 4).setValue("canceled");

  // ★ Vercel キャッシュ無効化
  if (patientId) {
    invalidateVercelCache_(patientId);
  }

  return jsonResponse({ ok: true });
}

// 「問診」シートから patient_id → name を作る
function loadPatientNameMap_() {
  var props = PropertiesService.getScriptProperties();
  // 既存のプロパティ名を流用（PATIENT_のままでOK）
  var sheetId = props.getProperty("PATIENT_SHEET_ID");
  var sheetName = props.getProperty("PATIENT_SHEET_NAME") || "問診";

  if (!sheetId) return {};

  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return {};

  var values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return {};

  var header = values[0].map(function (x) { return String(x || "").trim(); });

  // あなたのヘッダ：name と patient_id
  var pidCol = header.indexOf("patient_id");
  var nameCol = header.indexOf("name"); // D列相当

  if (pidCol < 0 || nameCol < 0) return {};

  var map = {};
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var pid = normPid_(row[pidCol]);
    var name = String(row[nameCol] || "").trim();
    if (!pid) continue;
    // name が空でも map は上書きしない（空で上書き事故防止）
    if (name) map[pid] = name;
  }
  return map;
}


// Webhookシートから patient_id ごとの処方歴（最新N件）を作る
function loadHistoryMap_(maxPerPatient) {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty("WEBHOOK_SHEET_ID");
  var sheetName = props.getProperty("WEBHOOK_SHEET_NAME") || "Square Webhook";

  if (!sheetId) return {};

  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return {};

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};

  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var map = {};

  // 想定ヘッダー:
  // A:order_datetime, ..., G:items, H:amount, J:payment_id, K:product_code, L:patient_id
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var orderDatetime = row[0];      // A
    var items = String(row[6] || "");// G: items
    var pid = normPid_(row[11]);     // L: patient_id
    if (!pid) continue;

    // 日付だけに整形
    var dateStr = "";
    if (orderDatetime instanceof Date) {
      dateStr = Utilities.formatDate(orderDatetime, "Asia/Tokyo", "yyyy/MM/dd");
    } else if (orderDatetime) {
      // "yyyy/MM/dd HH:mm:ss" 想定
      dateStr = String(orderDatetime).split(" ")[0];
    }

    var label = items || ""; // items に "マンジャロ 5mg 3ヶ月 x 1" が入っている想定

    if (!map[pid]) {
      map[pid] = [];
    }
    map[pid].push({
      date: dateStr,
      label: label,
    });
  }

  // 各患者ごとに新しい順にソートして maxPerPatient 件までに切る
  Object.keys(map).forEach(function (pid) {
    var list = map[pid];
    list.sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });
    map[pid] = list.slice(0, maxPerPatient || 5);
  });

  return map;
}

function jsonResponse(obj, statusCode) {
  var out = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);

  // GAS WebApp は statusCode 変更できないので実質無視でOK
  return out;
}

// 患者: 再処方申請のキャンセル
function handleCancel_(body) {
  var patientId = String(body.patient_id || "").trim();
  var productCode = String(body.product_code || "").trim(); // なくても動くようにするなら任意

  if (!patientId) {
    return jsonResponse({ ok: false, error: "patient_id required" }, 400);
  }

  var sheet = getReorderSheet_();
  var values = sheet.getDataRange().getValues();

  var canceledCount = 0;

  // 想定ヘッダー:
  // A:timestamp, B:patient_id, C:product_code, D:status, E:note
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rowPid = String(row[1] || "").trim();
    var rowCode = String(row[2] || "").trim();
    var status = String(row[3] || "").trim();

    // patient_id 一致 & pending のものをキャンセル
    if (rowPid === patientId && status === "pending") {
      // product_code も指定されていたらそれもチェック
      if (productCode && rowCode !== productCode) continue;

      sheet.getRange(i + 1, 4).setValue("canceled"); // D列 status
      canceledCount++;
    }
  }

  Logger.log("CANCEL patient_id=" + patientId + " count=" + canceledCount);

  return jsonResponse({ ok: true, canceled: canceledCount });
}

// Doctor: 再処方決済完了（status を paid に）
function handlePaid_(body) {
  var id = Number(body.id || body.reorder_id || body.reorderId);
  if (!id || isNaN(id)) return jsonResponse({ ok:false, error:"id required" }, 400);

  var sheet = getReorderSheet_();
  var lastRow = sheet.getLastRow();
  if (id < 2 || id > lastRow) return jsonResponse({ ok:false, error:"invalid id" }, 400);

  // ★ patient_id を取得（B列）
  var patientId = normPid_(sheet.getRange(id, 2).getValue());

  sheet.getRange(id, 4).setValue("paid"); // status

  var pay = String(body.payment_id || body.paymentId || "").trim();
  if (pay) {
    var cur = String(sheet.getRange(id, 5).getValue() || "");
    var tag = "paid:" + pay;
    if (!cur.includes(tag)) sheet.getRange(id, 5).setValue(cur ? (cur + "\n" + tag) : tag);
  }

  // ★ Vercel キャッシュ無効化
  if (patientId) {
    invalidateVercelCache_(patientId);
  }

  return jsonResponse({ ok:true });
}

// Debug: 患者の全再処方データを返す（キャッシュなし）
function handleDebug_(body) {
  var patientId = String(body.patient_id || "").trim();
  if (!patientId) {
    return jsonResponse({ ok: false, error: "patient_id required" }, 400);
  }

  Logger.log("DEBUG patient_id=" + patientId);

  // キャッシュクリア
  var cache = CacheService.getScriptCache();
  cache.remove("reorders_" + patientId);

  var sheet = getReorderSheet_();
  var values = sheet.getDataRange().getValues();

  var list = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rowPidRaw = row[1];
    var rowPid = normPid_(rowPidRaw);

    if (rowPid !== patientId) continue;

    var ts = row[0];
    var tsStr = ts instanceof Date
      ? Utilities.formatDate(ts, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss")
      : String(ts);

    var code = String(row[2] || "");
    var status = String(row[3] || "");
    var note = row[4] || "";

    list.push({
      row: i + 1,
      timestamp: tsStr,
      product_code: code,
      status: status,
      note: note,
    });
  }

  return jsonResponse({ ok: true, patient_id: patientId, count: list.length, reorders: list });
}


function normPid_(v) {
  if (v === null || v === undefined) return "";
  var s = String(v).trim();
  if (s.endsWith(".0")) s = s.slice(0, -2);
  s = s.replace(/\s+/g, "");
  return s;
}

// ★ Vercel キャッシュ無効化API呼び出し + GAS Script Cache クリア + Intake GAS キャッシュクリア
function invalidateVercelCache_(patientId) {
  if (!patientId) return;

  // ★ 1. このGAS (reorder-line-bot) の Script Cache をクリア
  try {
    var cache = CacheService.getScriptCache();
    cache.remove("reorders_" + patientId);
    Logger.log("[invalidateCache] Cleared reorder-line-bot GAS cache for reorders_" + patientId);
  } catch (e) {
    Logger.log("[invalidateCache] Error clearing reorder-line-bot GAS cache: " + e);
  }

  var props = PropertiesService.getScriptProperties();
  var vercelUrl = props.getProperty("VERCEL_URL");
  var adminToken = props.getProperty("ADMIN_TOKEN");
  var intakeGasUrl = props.getProperty("INTAKE_GAS_URL");

  if (!vercelUrl || !adminToken) {
    Logger.log("[invalidateCache] Missing VERCEL_URL or ADMIN_TOKEN");
    return;
  }

  // ★ 2. Vercel Redis キャッシュをクリア
  var url = vercelUrl + "/api/admin/invalidate-cache";

  try {
    var res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + adminToken },
      payload: JSON.stringify({ patient_id: patientId }),
      muteHttpExceptions: true,
    });

    var code = res.getResponseCode();
    var body = res.getContentText();

    Logger.log("[invalidateCache] Vercel: pid=" + patientId + " code=" + code + " body=" + body);

    if (code >= 200 && code < 300) {
      Logger.log("[invalidateCache] Vercel cache cleared for patient_id=" + patientId);
    } else {
      Logger.log("[invalidateCache] Vercel cache clear failed: patient_id=" + patientId + " code=" + code);
    }
  } catch (e) {
    Logger.log("[invalidateCache] Vercel error for patient_id=" + patientId + ": " + e);
  }

  // ★ 3. Intake GAS のキャッシュもクリア（reorders_${pid} キャッシュ）
  if (intakeGasUrl) {
    try {
      var intakeRes = UrlFetchApp.fetch(intakeGasUrl, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({
          type: "invalidate_cache",
          patient_id: patientId
        }),
        muteHttpExceptions: true,
      });

      var intakeCode = intakeRes.getResponseCode();
      var intakeBody = intakeRes.getContentText();

      Logger.log("[invalidateCache] Intake GAS: pid=" + patientId + " code=" + intakeCode + " body=" + intakeBody);

      if (intakeCode >= 200 && intakeCode < 300) {
        Logger.log("[invalidateCache] Intake GAS cache cleared for patient_id=" + patientId);
      } else {
        Logger.log("[invalidateCache] Intake GAS cache clear failed: patient_id=" + patientId + " code=" + intakeCode);
      }
    } catch (e) {
      Logger.log("[invalidateCache] Intake GAS error for patient_id=" + patientId + ": " + e);
    }
  } else {
    Logger.log("[invalidateCache] INTAKE_GAS_URL not configured, skipping intake cache clear");
  }
}

function linePushFlexToOps_(altText, flexContents) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("LINE_CHANNEL_ACCESS_TOKEN");
  var to = props.getProperty("LINE_TO_ID");

  if (!token || !to) {
    Logger.log("[linePush] missing token/to token=" + !!token + " to=" + to);
    return { ok: false, code: 0, body: "missing token/to" };
  }

  var url = "https://api.line.me/v2/bot/message/push";
  var payload = {
    to: to,
    messages: [{ type: "flex", altText: altText, contents: flexContents }],
  };

  var last = { ok: false, code: 0, body: "" };

  for (var attempt = 1; attempt <= 3; attempt++) {
    var res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    var code = res.getResponseCode();
    var body = res.getContentText();

    Logger.log("[linePush] attempt=" + attempt + " code=" + code + " body=" + body);
logLinePush_(code, body);
    if (code >= 200 && code < 300) return { ok: true, code: code, body: body };

    // 一時障害だけリトライ
if (code === 429 || code >= 500) {
  Utilities.sleep(1500 * attempt); // 1.5s, 3.0s, 4.5s
  last = { ok: false, code: code, body: body };
  continue;
}
    return { ok: false, code: code, body: body };
  }

  return last;
}


function buildHistoryLines_(historyArr, maxLines) {
  var arr = Array.isArray(historyArr) ? historyArr : [];
  var n = maxLines || 5;
  if (arr.length === 0) return ["（処方歴なし）"];
  return arr.slice(0, n).map(function (h) {
    return (h.date || "") + " " + (h.label || "");
  });
}

function buildReorderFlex_(data) {
  // data: { reorderId, pid, name, productCode, note, historyLines }
  return {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        { type: "text", text: "再処方申請", weight: "bold", size: "lg" },
        { type: "text", text: "申請ID: " + data.reorderId, size: "sm", color: "#555555" },
        { type: "text", text: "PID: " + data.pid, size: "sm", color: "#555555" },
        { type: "text", text: "氏名: " + (data.name || "（不明）"), size: "sm", color: "#555555" },
        { type: "text", text: "申請: " + data.productCode, size: "md", wrap: true, weight: "bold" },
        ...(data.note
          ? [{ type: "text", text: "メモ: " + data.note, size: "sm", wrap: true, color: "#555555" }]
          : []),
        { type: "separator", margin: "md" },
        { type: "text", text: "直近の処方歴", size: "sm", weight: "bold", margin: "md" },
        {
          type: "box",
          layout: "vertical",
          spacing: "xs",
          contents: (data.historyLines || []).map(function (line) {
            return { type: "text", text: line, size: "xs", wrap: true, color: "#555555" };
          }),
        },
      ],
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          action: {
            type: "postback",
            label: "承認",
            data: "reorder_action=approve&reorder_id=" + encodeURIComponent(data.reorderId),
          },
        },
        {
          type: "button",
          style: "secondary",
          action: {
            type: "postback",
            label: "却下",
            data: "reorder_action=reject&reorder_id=" + encodeURIComponent(data.reorderId),
          },
        },
      ],
    },
  };
}
function testLinePushText() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("LINE_CHANNEL_ACCESS_TOKEN");
  var to = props.getProperty("LINE_TO_ID");

  Logger.log("[test] hasToken=" + !!token + " to=" + to);

  if (!token || !to) {
    throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_TO_ID");
  }

  var url = "https://api.line.me/v2/bot/message/push";
  var payload = {
    to: to,
    messages: [{ type: "text", text: "【テスト】再処方通知Bot push 疎通OK" }],
  };

  var res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  Logger.log("[test] status=" + res.getResponseCode());
  Logger.log("[test] body=" + res.getContentText());

  return { status: res.getResponseCode(), body: res.getContentText() };
}

function logLinePush_(codeOrLabel, body) {
  var ss = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty("REORDER_SHEET_ID")
  );
  var sh = ss.getSheetByName("LINE送信ログ") || ss.insertSheet("LINE送信ログ");
  if (sh.getLastRow() === 0) sh.appendRow(["at", "code_or_label", "body"]);
  sh.appendRow([new Date(), String(codeOrLabel || ""), String(body || "").slice(0, 200)]);
}
function getReorderSheet_() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty("REORDER_SHEET_ID");
  var sheetName = props.getProperty("REORDER_SHEET_NAME") || "シート1";

  if (!sheetId) throw new Error("REORDER_SHEET_ID not set");

  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  // 期待するヘッダー（A〜G）
  var expected = ["timestamp", "patient_id", "product_code", "status", "note", "line_uid", "lstep_uid"];

  // ヘッダー整備
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(expected);
  } else {
    var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(function(x){ return String(x||"").trim(); });

    // A1がtimestampでない/ヘッダーが短い等のケースを救済
    var needFix = header.length < expected.length || header[0] !== "timestamp";
    if (needFix) {
      // 1行目を expected で上書き（既存列が5列しかない場合も拡張）
      sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
    } else {
      // 末尾列が足りない場合だけ追加
      for (var i = header.length; i < expected.length; i++) {
        sheet.getRange(1, i + 1).setValue(expected[i]);
      }
    }
  }
  return sheet;
}
function loadLineAndLstepMapFromIntake_() {
  // 問診ブック
  var INTAKE_SS_ID = "1j932bAhjOAN1fF55gU07F4VRMWi9yTphoejCGJHFwuo";
  var INTAKE_SHEET_NAME = "問診";

  var ss = SpreadsheetApp.openById(INTAKE_SS_ID);
  var sheet = ss.getSheetByName(INTAKE_SHEET_NAME);
  if (!sheet) return {};

  var values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return {};

  var header = values[0].map(function(x){ return String(x||"").trim(); });

  var pidCol = header.indexOf("patient_id");     // あなたの説明だとY列
  var lineCol = header.indexOf("line_id");       // G列
  var ansCol = header.indexOf("answerer_id");    // LステップIDとして使う想定

  if (pidCol < 0) return {};

  var map = {};
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var pid = normPid_(row[pidCol]);
    if (!pid) continue;

    var lineId = lineCol >= 0 ? String(row[lineCol] || "").trim() : "";
    var answererId = ansCol >= 0 ? String(row[ansCol] || "").trim() : "";

    // 後勝ち（最新の行で上書き）にしたいならこれでOK
    map[pid] = { line_id: lineId, answerer_id: answererId };
  }
  return map;
}
function backfillReorderLineAndLstep() {
  var sheet = getReorderSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, updated: 0 };

  var map = loadLineAndLstepMapFromIntake_();

  // 再処方シート側（B列がpatient_id）
  var range = sheet.getRange(2, 1, lastRow - 1, 7);
  var values = range.getValues();

  var updated = 0;

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var pid = normPid_(row[1]); // B: patient_id
    if (!pid) continue;

    var lineUid = map[pid] ? (map[pid].line_id || "") : "";
    var lstepUid = map[pid] ? (map[pid].answerer_id || "") : "";

    // F列が空なら入れる（既にあるなら尊重）
    if (!row[5] && lineUid) {
      values[i][5] = lineUid;
      updated++;
    }

    // G列：値ではなく式（表示ID + リンク）
    // 既に式/値がある場合は尊重する運用なら「空のみ」を対象に
    if (!row[6] && lstepUid) {
      var url = 'https://manager.linestep.net/line/visual?member=' + encodeURIComponent(lstepUid);
      values[i][6] = '=HYPERLINK("' + url + '","' + lstepUid.replace(/"/g, '""') + '")';
      updated++;
    }
  }

  range.setValues(values);
  return { ok: true, updated: updated };
}

function testPaidUpdate() {
  // 実在する confirmed 行の番号を入れる
  var body = { action: "paid", id: 106, payment_id: "Ud3b9239f681c04d0fe97ab72b60781c9" };
  var res = doPost({ postData: { contents: JSON.stringify(body) }});
  Logger.log(res.getContent());
}

// ★ スプレッドシートのD列（status）が手動で編集された時に実行
function onEdit(e) {
  Logger.log("[onEdit] START");

  if (!e) {
    Logger.log("[onEdit] No event object");
    return;
  }

  var range = e.range;
  var sheet = range.getSheet();
  var sheetName = sheet.getName();
  var col = range.getColumn();
  var row = range.getRow();

  Logger.log("[onEdit] Sheet: " + sheetName + ", Row: " + row + ", Col: " + col);

  // シート名が一致するか確認
  var props = PropertiesService.getScriptProperties();
  var targetSheetName = props.getProperty("REORDER_SHEET_NAME") || "シート1";

  Logger.log("[onEdit] Target sheet: " + targetSheetName);

  if (sheetName !== targetSheetName) {
    Logger.log("[onEdit] Sheet name mismatch, exiting");
    return;
  }

  // D列（status）が編集されたか確認
  if (col !== 4) {
    Logger.log("[onEdit] Not column D, exiting");
    return;
  }

  if (row < 2) {
    Logger.log("[onEdit] Header row, exiting");
    return;
  }

  var newValue = range.getValue();
  Logger.log("[onEdit] New value: " + newValue);

  // confirmed, canceled, paidのいずれかに変更された場合
  if (newValue === "confirmed" || newValue === "canceled" || newValue === "paid") {
    var patientId = normPid_(sheet.getRange(row, 2).getValue());
    Logger.log("[onEdit] Patient ID: " + patientId);

    if (patientId) {
      Logger.log("[onEdit] Status changed to " + newValue + " for patient " + patientId);
      invalidateVercelCache_(patientId);
    } else {
      Logger.log("[onEdit] No patient ID found");
    }
  } else {
    Logger.log("[onEdit] Status value not in target list (confirmed/canceled/paid)");
  }
}

// ★ テスト用：直接キャッシュ無効化を試す
function testInvalidateCache() {
  // ★ 実際の患者IDに変更してください
  var testPatientId = "20251200128";

  Logger.log("=== Testing invalidateVercelCache ===");
  Logger.log("Patient ID: " + testPatientId);

  invalidateVercelCache_(testPatientId);

  Logger.log("=== Test complete - check logs above ===");
}

// ★ デバッグ用：患者の全再処方データをシートから直接読み取り
function debugLoadReorders20251200128() {
  var patientId = "20251200128";

  Logger.log("=== Debug: Loading reorders for " + patientId + " ===");

  // 1. キャッシュクリア
  var cache = CacheService.getScriptCache();
  cache.remove("reorders_" + patientId);
  Logger.log("✓ Cache cleared");

  // 2. シートから直接読み取り
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty("REORDER_SHEET_ID");
  var sheetName = props.getProperty("REORDER_SHEET_NAME") || "シート1";

  Logger.log("Sheet ID: " + sheetId);
  Logger.log("Sheet Name: " + sheetName);

  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName(sheetName);

  var values = sheet.getDataRange().getValues();

  Logger.log("Total rows: " + values.length);
  Logger.log("");
  Logger.log("=== All rows for patient " + patientId + " ===");

  var count = 0;
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rowPidRaw = row[1]; // B列 patient_id
    var rowPid = normPid_(rowPidRaw);

    if (rowPid === patientId) {
      count++;
      var ts = row[0];  // A列 timestamp
      var code = row[2]; // C列 product_code
      var status = row[3]; // D列 status
      var note = row[4] || ""; // E列 note

      var tsStr = ts instanceof Date
        ? Utilities.formatDate(ts, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss")
        : String(ts);

      Logger.log("Row " + (i+1) + ": status=" + status + ", code=" + code + ", ts=" + tsStr);
    }
  }

  Logger.log("");
  Logger.log("Total matching rows: " + count);
  Logger.log("=== End debug ===");
}

// ★ デバッグ用：問診シートからLINE UIDマップを読み込みテスト
function testLoadLineAndLstepMap() {
  Logger.log("=== Testing loadLineAndLstepMapFromIntake_ ===");

  try {
    var map = loadLineAndLstepMapFromIntake_();

    Logger.log("Map loaded successfully");
    Logger.log("Total patients in map: " + Object.keys(map).length);

    // サンプルを5件表示
    var count = 0;
    for (var pid in map) {
      if (count >= 5) break;
      var data = map[pid];
      Logger.log("PID: " + pid + " -> line_id: " + (data.line_id || "(なし)") + ", answerer_id: " + (data.answerer_id || "(なし)"));
      count++;
    }

    // 特定のpatient_idをテスト
    var testPid = "20251200389"; // 333行目のpatient_id
    if (map[testPid]) {
      Logger.log("");
      Logger.log("Test PID " + testPid + ":");
      Logger.log("  line_id: " + (map[testPid].line_id || "(なし)"));
      Logger.log("  answerer_id: " + (map[testPid].answerer_id || "(なし)"));
    } else {
      Logger.log("");
      Logger.log("❌ Test PID " + testPid + " not found in map");
    }

  } catch (e) {
    Logger.log("❌ Error: " + e);
    Logger.log("Stack: " + e.stack);
  }

  Logger.log("=== Test complete ===");
}

// ★ 一括バックフィル実行
function runBackfillReorderLineAndLstep() {
  Logger.log("=== Running backfillReorderLineAndLstep ===");

  try {
    var result = backfillReorderLineAndLstep();
    Logger.log("Result: " + JSON.stringify(result));
    Logger.log("✅ Backfill completed successfully");
    Logger.log("Updated rows: " + result.updated);
  } catch (e) {
    Logger.log("❌ Error during backfill: " + e);
    Logger.log("Stack: " + e.stack);
  }

  Logger.log("=== Backfill complete ===");
}
