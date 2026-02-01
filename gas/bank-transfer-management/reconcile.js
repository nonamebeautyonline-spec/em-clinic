// ==========================================
// 自動照合機能: 住所情報 × 入金CSV → 照合済み
// ==========================================
function reconcileBankTransfers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheet = ss.getActiveSheet();
  var sheetName = activeSheet.getName();

  // シート名から年月を取得（YYYY-MM 住所情報 or YYYY-MM 入金CSV）
  var yearMonth = "";
  if (sheetName.endsWith(" 住所情報")) {
    yearMonth = sheetName.replace(" 住所情報", "");
  } else if (sheetName.endsWith(" 入金CSV")) {
    yearMonth = sheetName.replace(" 入金CSV", "");
  } else {
    SpreadsheetApp.getUi().alert("住所情報シートまたは入金CSVシートを開いて実行してください");
    return;
  }

  var addressSheetName = yearMonth + " 住所情報";
  var csvSheetName = yearMonth + " 入金CSV";
  var verifiedSheetName = yearMonth + " 照合済み";

  var addressSheet = ss.getSheetByName(addressSheetName);
  var csvSheet = ss.getSheetByName(csvSheetName);
  var verifiedSheet = ss.getSheetByName(verifiedSheetName);

  if (!addressSheet) {
    SpreadsheetApp.getUi().alert("住所情報シート「" + addressSheetName + "」が見つかりません");
    return;
  }

  if (!csvSheet) {
    SpreadsheetApp.getUi().alert("入金CSVシート「" + csvSheetName + "」が見つかりません");
    return;
  }

  if (!verifiedSheet) {
    SpreadsheetApp.getUi().alert("照合済みシート「" + verifiedSheetName + "」が見つかりません");
    return;
  }

  // 住所情報データを取得
  var addressLastRow = addressSheet.getLastRow();
  if (addressLastRow <= 1) {
    SpreadsheetApp.getUi().alert("住所情報シートにデータがありません");
    return;
  }

  // 入金CSVデータを取得
  var csvLastRow = csvSheet.getLastRow();
  if (csvLastRow <= 1) {
    SpreadsheetApp.getUi().alert("入金CSVシートにデータがありません");
    return;
  }

  var addressData = addressSheet.getRange(2, 1, addressLastRow - 1, 13).getValues();
  var csvData = csvSheet.getRange(2, 1, csvLastRow - 1, 6).getValues();

  Logger.log("[reconcileBankTransfers] 住所情報: " + addressData.length + " 件");
  Logger.log("[reconcileBankTransfers] 入金CSV: " + csvData.length + " 件");

  var matchedCount = 0;

  // 住所情報の各行について入金CSVと照合
  for (var i = 0; i < addressData.length; i++) {
    var addressRow = addressData[i];

    // 住所情報の列
    var receivedAt = addressRow[0];      // A: 受信日時
    var orderId = addressRow[1];         // B: 注文ID
    var patientId = addressRow[2];       // C: 患者ID
    var productCode = addressRow[3];     // D: 商品コード
    var mode = addressRow[4];            // E: モード
    var reorderId = addressRow[5];       // F: 再購入ID
    var accountName = addressRow[6];     // G: 口座名義
    var phoneNumber = addressRow[7];     // H: 電話番号
    var email = addressRow[8];           // I: メールアドレス
    var postalCode = addressRow[9];      // J: 郵便番号
    var address = addressRow[10];        // K: 住所
    var status = addressRow[11];         // L: ステータス
    var submittedAt = addressRow[12];    // M: 送信日時

    // 口座名義で入金CSVを検索
    var normalizedAccountName = normalizeAccountName_(accountName);

    for (var j = 0; j < csvData.length; j++) {
      var csvRow = csvData[j];

      var transactionDate = csvRow[0];   // A: 日付
      var content = csvRow[1];           // B: 内容
      var withdrawAmount = csvRow[2];    // C: 出金金額(円)
      var depositAmount = csvRow[3];     // D: 入金金額(円)
      var balance = csvRow[4];           // E: 残高(円)
      var note = csvRow[5];              // F: メモ

      // 内容から振込人名を抽出（「振込★」の後の名前）
      var csvAccountName = extractAccountNameFromContent_(content);
      var normalizedCsvAccountName = normalizeAccountName_(csvAccountName);

      // 入金額を金額として使用
      var amount = depositAmount;

      // 口座名義が一致した場合
      if (normalizedAccountName && normalizedCsvAccountName &&
          normalizedAccountName === normalizedCsvAccountName) {

        Logger.log("[reconcileBankTransfers] 照合成功: " + patientId + " - " + accountName);

        // 商品情報を取得
        var productInfo = PRODUCT_INFO[productCode] || { name: "マンジャロ", price: 0 };
        var paymentId = "bt_" + orderId;

        // 注文日時 (ISO形式)
        var orderDatetime = submittedAt;
        if (typeof orderDatetime === "string" && !orderDatetime.includes("T")) {
          // YYYY-MM-DD HH:mm:ss → ISO形式に変換
          orderDatetime = orderDatetime.replace(" ", "T") + "+09:00";
        }

        // 照合済みシートに転記
        var verifiedRow = [
          orderDatetime,       // A: 注文日時
          accountName,         // B: 配送先名前
          postalCode,          // C: 郵便番号
          address,             // D: 住所
          email,               // E: メールアドレス
          phoneNumber,         // F: 電話番号
          productInfo.name,    // G: 商品名
          amount || productInfo.price, // H: 金額 (入金額を優先)
          "",                  // I: 請求先名前 (空欄)
          paymentId,           // J: 決済ID
          productCode,         // K: 商品コード
          patientId,           // L: 患者ID
          orderId,             // M: 注文ID
          "confirmed",         // N: 決済ステータス
          "",                  // O: (空欄 - Square webhookはrefund_status)
          "",                  // P: (空欄)
          "",                  // Q: (空欄)
          "",                  // R: (空欄)
          transactionDate,     // S: 取引日
          csvAccountName,      // T: 振込口座名義（抽出した名前）
        ];

        var lastRow = verifiedSheet.getLastRow();
        verifiedSheet.getRange(lastRow + 1, 1, 1, verifiedRow.length).setValues([verifiedRow]);

        matchedCount++;
        break; // 一致したらループ終了
      }
    }
  }

  Logger.log("[reconcileBankTransfers] 照合完了: " + matchedCount + " 件");

  SpreadsheetApp.getUi().alert(
    "照合完了\n\n" +
    matchedCount + " 件のデータを照合済みシートに追加しました。"
  );
}

// 銀行CSVの「内容」列から振込人名を抽出
function extractAccountNameFromContent_(content) {
  if (!content) return "";

  var str = String(content).trim();

  // 「振込★」の後の名前を抽出
  if (str.indexOf("振込★") >= 0) {
    var parts = str.split("振込★");
    if (parts.length > 1) {
      return parts[1].trim();
    }
  }

  // 「振込＊」の場合もあるかもしれない
  if (str.indexOf("振込＊") >= 0) {
    var parts = str.split("振込＊");
    if (parts.length > 1) {
      return parts[1].trim();
    }
  }

  // 「振込」の後の名前を抽出（記号なしの場合）
  if (str.indexOf("振込") >= 0) {
    var parts = str.split("振込");
    if (parts.length > 1) {
      return parts[1].trim();
    }
  }

  return "";
}

// 口座名義の正規化（全角→半角、空白削除、カタカナ統一）
function normalizeAccountName_(name) {
  if (!name) return "";

  var normalized = String(name).trim();

  // 全角英数字を半角に変換
  normalized = normalized.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });

  // ひらがなをカタカナに変換
  normalized = normalized.replace(/[\u3041-\u3096]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) + 0x60);
  });

  // 小書きカタカナを通常のカタカナに変換（銀行システムでは小書き文字が使えない場合がある）
  normalized = normalized
    .replace(/ァ/g, "ア")
    .replace(/ィ/g, "イ")
    .replace(/ゥ/g, "ウ")
    .replace(/ェ/g, "エ")
    .replace(/ォ/g, "オ")
    .replace(/ヵ/g, "カ")
    .replace(/ヶ/g, "ケ")
    .replace(/ッ/g, "ツ")
    .replace(/ャ/g, "ヤ")
    .replace(/ュ/g, "ユ")
    .replace(/ョ/g, "ヨ")
    .replace(/ヮ/g, "ワ");

  // 空白文字を全て削除
  normalized = normalized.replace(/\s+/g, "");

  // 大文字に統一
  normalized = normalized.toUpperCase();

  return normalized;
}
