// GASスプレッドシートの構造を修正
// 1. ヘッダーに「モード」と「再購入ID」の列を追加
// 2. 既存データを新しい列構造に移行
// 3. ステータスを "confirmed" に更新

import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const gasUrl = envVars.GAS_BANK_TRANSFER_URL;

if (!gasUrl) {
  console.error("❌ GAS_BANK_TRANSFER_URL が設定されていません");
  process.exit(1);
}

console.log("=== GASスプレッドシート構造修正 ===\n");
console.log("📋 実行内容:");
console.log("  1. スプレッドシートを直接更新することはできません");
console.log("  2. 代わりに、GAS側で修正用の関数を実行する必要があります\n");

console.log("🔧 手動での修正手順:\n");
console.log("【方法1: 列を挿入してデータを移動】");
console.log("  1. スプレッドシート「2026-01 住所情報」を開く");
console.log("  2. E列（口座名義）の左に列を2つ挿入");
console.log("     - E列を右クリック → 「2列を左に挿入」");
console.log("  3. 新しいE列のヘッダー(1行目)に「モード」と入力");
console.log("  4. 新しいF列のヘッダー(1行目)に「再購入ID」と入力");
console.log("  5. 既存データの行（2行目以降）:");
console.log("     - E列（モード）に「first」または「current」または「reorder」を入力");
console.log("     - F列（再購入ID）: reorderの場合のみIDを入力、それ以外は空欄");
console.log("  6. L列（ステータス）を確認して、全て「confirmed」に変更\n");

console.log("【方法2: GAS関数で自動修正（推奨）】");
console.log("以下のコードをGASエディタに追加して実行:\n");

const gasFixFunction = `
// GASエディタに追加する関数
function fixSheetStructure() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("2026-01 住所情報");

  if (!sheet) {
    Logger.log("❌ シートが見つかりません");
    return;
  }

  // 現在のデータを取得（ヘッダー除く）
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log("データがありません");
    return;
  }

  var data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();

  Logger.log("📊 " + (lastRow - 1) + " 件のデータを処理中...");

  // E列とF列を挿入
  sheet.insertColumnsBefore(5, 2);

  // 新しいヘッダーを設定
  var newHeaders = [
    "受信日時",
    "注文ID",
    "患者ID",
    "商品コード",
    "モード",        // 新規追加
    "再購入ID",      // 新規追加
    "口座名義",
    "電話番号",
    "メールアドレス",
    "郵便番号",
    "住所",
    "ステータス",
    "送信日時"
  ];

  sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
  sheet.getRange(1, 1, 1, newHeaders.length).setFontWeight("bold").setBackground("#f3f3f3");

  // 既存データを新しい構造に移行
  for (var i = 0; i < data.length; i++) {
    var oldRow = data[i];

    // 旧構造:
    // A: 受信日時, B: 注文ID, C: 患者ID, D: 商品コード,
    // E: 口座名義, F: 電話番号, G: メールアドレス, H: 郵便番号,
    // I: 住所, J: ステータス, K: 送信日時

    var newRow = [
      oldRow[0],  // A: 受信日時
      oldRow[1],  // B: 注文ID
      oldRow[2],  // C: 患者ID
      oldRow[3],  // D: 商品コード
      "current",  // E: モード (デフォルト値)
      "",         // F: 再購入ID (空欄)
      oldRow[4],  // G: 口座名義
      oldRow[5],  // H: 電話番号
      oldRow[6],  // I: メールアドレス
      oldRow[7],  // J: 郵便番号
      oldRow[8],  // K: 住所
      "confirmed", // L: ステータス (強制的にconfirmed)
      oldRow[10]  // M: 送信日時
    ];

    sheet.getRange(i + 2, 1, 1, newRow.length).setValues([newRow]);
  }

  Logger.log("✅ 完了: " + (lastRow - 1) + " 件のデータを移行しました");
  Logger.log("📝 手動で確認が必要:");
  Logger.log("  - 再購入の行があれば、F列（再購入ID）を手動で入力してください");
}
`;

console.log(gasFixFunction);

console.log("\n🚀 実行手順:");
console.log("  1. GASエディタを開く（銀行振込管理スプレッドシート → 拡張機能 → Apps Script）");
console.log("  2. 上記のコードをコピーして、code.js の最後に貼り付け");
console.log("  3. 保存");
console.log("  4. 関数選択ドロップダウンから「fixSheetStructure」を選択");
console.log("  5. 実行ボタン（▶）をクリック");
console.log("  6. 権限を承認");
console.log("  7. 実行ログを確認\n");

console.log("=== 修正準備完了 ===");
