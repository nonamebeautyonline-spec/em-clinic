import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
});

const SPREADSHEET_ID = "1j932bAhjOAN1fF55gU07F4VRMWi9yTphoejCGJHFwuo";
const SHEET_NAME = "予約";
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

async function addReservationDirectly() {
  console.log("\n" + "=".repeat(70));
  console.log("GAS予約シートに直接予約を追加");
  console.log("=".repeat(70));

  const reserveId = "resv-1770084040110";
  const patientId = "20260200126";
  const patientName = "尾花　萌";
  const date = "2026-02-03";
  const time = "12:15";
  const timestamp = new Date().toISOString();

  console.log(`\n予約情報:`);
  console.log(`  予約ID: ${reserveId}`);
  console.log(`  患者ID: ${patientId}`);
  console.log(`  患者名: ${patientName}`);
  console.log(`  日付: ${date}`);
  console.log(`  時刻: ${time}`);

  // Google Sheets API にアクセスするためのトークンを取得
  console.log("\n[1/2] Google認証トークン取得中...");

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.error("❌ GOOGLE_SERVICE_ACCOUNT_EMAIL または GOOGLE_PRIVATE_KEY が設定されていません");
    return;
  }

  // JWT を作成してアクセストークンを取得
  const { SignJWT } = await import("jose");
  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/spreadsheets",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(GOOGLE_SERVICE_ACCOUNT_EMAIL)
    .setSubject(GOOGLE_SERVICE_ACCOUNT_EMAIL)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(await import("crypto").then(crypto =>
      crypto.createPrivateKey(GOOGLE_PRIVATE_KEY)
    ));

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    console.error("❌ アクセストークン取得失敗:", tokenData);
    return;
  }

  console.log("  ✅ 認証成功");

  // Google Sheets API で行を追加
  console.log("\n[2/2] 予約シートに行を追加中...");

  const values = [
    [
      timestamp,      // A: タイムスタンプ
      reserveId,      // B: 予約ID
      patientId,      // C: Patient ID
      patientName,    // D: 氏名
      date,           // E: 日付
      time,           // F: 時刻
      "",             // G: ステータス（空白）
    ],
  ];

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:G:append?valueInputOption=USER_ENTERED`;

  const appendResponse = await fetch(appendUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });

  const appendData = await appendResponse.json();

  if (appendData.error) {
    console.error("❌ 追加失敗:", appendData.error);
    return;
  }

  console.log("  ✅ 予約を追加しました");
  console.log(`  更新範囲: ${appendData.updates?.updatedRange}`);
  console.log(`  追加行数: ${appendData.updates?.updatedRows}`);

  console.log("\n" + "=".repeat(70));
  console.log("完了: 予約シートに尾花萌さんの予約を追加しました");
  console.log("=".repeat(70));
}

addReservationDirectly().catch(console.error);
