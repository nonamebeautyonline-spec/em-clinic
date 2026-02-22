// PID 10001 通知のmessage_logを追記（トーク画面に表示させるため）
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TARGETS = [
  { name: "安田 乃愛", lineId: "U0bb53bea6753172d91cbe2ff5c19bbc0", pid: "20260201025" },
  { name: "玉田 楓花", lineId: "U5b3cbf251d95fb0257afc7a49898e158", pid: "20260201026" },
  { name: "加藤 日菜子", lineId: "U8da206f7c3a66d458861fb5f526fd2f9", pid: "20260201027" },
  { name: "渡邉 裕大", lineId: "Udd9d4b4980cd8d591c06cb0087f954c1", pid: "20260201028" },
  { name: "不明(原田春陽?)", lineId: "U00ff3d841638e263e12695f9a4b466ed", pid: "20260201029" },
  { name: "三谷彩加", lineId: "Ub281195a00397e12a74c18e8f430f2b1", pid: "20260201030" },
];

const MESSAGE = `本日夕方よりサイトメンテナンスを行なっており、メンテナンス中に問診の入力や予約が正常に取れなかった可能性がございます。
現在復旧しておりますので、マイページより予約の取得・確認をお願いいたします。
ご迷惑をおかけして誠に申し訳ございません。
何かありましたらお気軽にご相談ください。`;

(async () => {
  console.log("=== message_log にログ追記 ===\n");

  for (const t of TARGETS) {
    const { error } = await sb.from("message_log").insert({
      patient_id: t.pid,
      line_uid: t.lineId,
      direction: "outgoing",
      message_type: "text",
      status: "sent",
      content: MESSAGE,
      sent_at: new Date().toISOString(),
    });
    if (error) {
      console.log(`  ✗ ${t.name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${t.name} (PID ${t.pid}): ログ追記OK`);
    }
  }

  console.log("\n=== 完了 ===");
})();
