#!/usr/bin/env node
// 決済案内FLEXを特定患者に送信するワンショットスクリプト
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// .env.local読み込み
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=["']?(.+?)["']?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(
  /https:\/\/([^.]+)\.supabase\.co/,
  "$1"
);

const PATIENT_ID = process.argv[2] || "20251200128";

(async () => {
  // DB接続
  const client = new Client({
    host: "aws-1-ap-northeast-1.pooler.supabase.com",
    port: 5432,
    database: "postgres",
    user: `postgres.${projectRef}`,
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const { rows } = await client.query(
    "SELECT patient_id, line_id, name FROM patients WHERE patient_id = $1",
    [PATIENT_ID]
  );
  await client.end();

  if (rows.length === 0) {
    console.error(`患者 ${PATIENT_ID} が見つかりません`);
    process.exit(1);
  }

  const patient = rows[0];
  console.log(`患者: ${patient.name}, LINE UID: ${patient.line_id}`);

  if (!patient.line_id) {
    console.error("LINE UIDが未設定です");
    process.exit(1);
  }

  // FLEX メッセージ構築（ボタンなし）
  const flexMessage = {
    type: "flex",
    altText: "【決済のご案内】診療後はマイページより決済が可能となっております。ご確認いただけますと幸いです。",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "決済のご案内", weight: "bold", size: "lg", color: "#ffffff" },
        ],
        backgroundColor: "#ec4899",
        paddingAll: "16px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "診療後はマイページより決済が可能となっております。ご確認いただけますと幸いです。",
            size: "sm",
            color: "#666666",
            wrap: true,
          },
        ],
        paddingAll: "16px",
      },
    },
  };

  // LINE Push API呼び出し
  const LINE_TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;
  if (!LINE_TOKEN) {
    console.error("LINE_CHANNEL_ACCESS_TOKEN が設定されていません");
    process.exit(1);
  }

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      to: patient.line_id,
      messages: [flexMessage],
    }),
  });

  if (res.ok) {
    console.log(`送信成功: patient_id=${PATIENT_ID}`);
  } else {
    const text = await res.text();
    console.error(`送信失敗: ${res.status} ${text}`);
  }
})().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
