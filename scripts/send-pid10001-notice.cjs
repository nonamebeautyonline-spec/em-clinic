// PID 10001 影響患者6人にメンテナンス通知を送信
require("dotenv").config({ path: ".env.local" });

const LINE_TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

const TARGETS = [
  { name: "安田 乃愛", lineId: "U0bb53bea6753172d91cbe2ff5c19bbc0" },
  { name: "玉田 楓花", lineId: "U5b3cbf251d95fb0257afc7a49898e158" },
  { name: "加藤 日菜子", lineId: "U8da206f7c3a66d458861fb5f526fd2f9" },
  { name: "渡邉 裕大", lineId: "Udd9d4b4980cd8d591c06cb0087f954c1" },
  { name: "不明(原田春陽?)", lineId: "U00ff3d841638e263e12695f9a4b466ed" },
  { name: "三谷彩加", lineId: "Ub281195a00397e12a74c18e8f430f2b1" },
];

const MESSAGE = `本日夕方よりサイトメンテナンスを行なっており、メンテナンス中に問診の入力や予約が正常に取れなかった可能性がございます。
現在復旧しておりますので、マイページより予約の取得・確認をお願いいたします。
ご迷惑をおかけして誠に申し訳ございません。
何かありましたらお気軽にご相談ください。`;

async function pushMessage(lineId, name) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      to: lineId,
      messages: [{ type: "text", text: MESSAGE }],
    }),
  });

  if (res.ok) {
    console.log(`  ✓ ${name} (${lineId.slice(0, 12)}...) 送信成功`);
  } else {
    const err = await res.json().catch(() => ({}));
    console.log(`  ✗ ${name} (${lineId.slice(0, 12)}...) 送信失敗:`, err.message || res.status);
  }
}

(async () => {
  console.log("=== PID 10001 影響患者へ通知送信 ===\n");
  console.log("メッセージ内容:");
  console.log(MESSAGE);
  console.log("\n--- 送信開始 ---");

  for (const t of TARGETS) {
    await pushMessage(t.lineId, t.name);
  }

  console.log("\n=== 送信完了 ===");
})();
