/**
 * スタッフの手打ち返信（自動通知以外）を正確に抽出するスクリプト
 *
 * 自動通知テンプレートを除外して、
 * 実際にスタッフが手動で入力した返信のみを抽出
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 自動通知メッセージのパターン（除外対象）
const AUTO_PATTERNS = [
  /【発送完了】/,
  /【予約確定】/,
  /【予約変更】/,
  /【予約キャンセル】/,
  /再処方申請が承認されました/,
  /追跡番号:/,
  /診療のご予約がございます/,
  /リマインド/,
  /本日.*発送させていただきました/,
  /マイページにて追跡番号/,
];

async function main() {
  console.log("=== スタッフ手動返信の抽出 ===\n");

  // 1. 現在のナレッジベース設定を確認
  const { data: settings } = await supabase
    .from("ai_reply_settings")
    .select("*")
    .maybeSingle();

  console.log("--- 現在のai_reply_settings ---");
  console.log("is_enabled:", settings?.is_enabled);
  console.log("mode:", settings?.mode);
  console.log("knowledge_base:", settings?.knowledge_base ? `(${settings.knowledge_base.length}文字)` : "(未設定)");
  console.log("knowledge_base内容:", settings?.knowledge_base || "なし");
  console.log("custom_instructions:", settings?.custom_instructions || "(未設定)");
  console.log("");

  // 2. outgoing の event_type='message' のみ（auto_reply除外）で手動返信を取得
  const { data: outgoing, error } = await supabase
    .from("message_log")
    .select("id, patient_id, content, sent_at, event_type, message_type")
    .eq("direction", "outgoing")
    .eq("event_type", "message")
    .eq("message_type", "individual") // 個別返信のみ（broadcast除外）
    .not("content", "is", null)
    .order("sent_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("取得エラー:", error);
    return;
  }
  console.log(`個別outgoing(event_type=message)数: ${outgoing.length}`);

  // 自動通知パターンを除外
  const staffReplies = outgoing.filter(msg => {
    return !AUTO_PATTERNS.some(p => p.test(msg.content));
  });
  console.log(`自動通知除外後: ${staffReplies.length}件\n`);

  // 3. 各スタッフ返信の直前のincomingメッセージを取得してペア化
  const qaPairs = [];
  for (const reply of staffReplies.slice(0, 100)) { // 最新100件
    // この返信の直前のincoming
    const { data: prevIncoming } = await supabase
      .from("message_log")
      .select("content, sent_at")
      .eq("patient_id", reply.patient_id)
      .eq("direction", "incoming")
      .eq("event_type", "message")
      .lt("sent_at", reply.sent_at)
      .not("content", "is", null)
      .order("sent_at", { ascending: false })
      .limit(3); // 直前3件（複数メッセージに分けて送る場合）

    if (prevIncoming && prevIncoming.length > 0) {
      // 直前のincomingが12時間以内か確認
      const diffHours = (new Date(reply.sent_at) - new Date(prevIncoming[0].sent_at)) / (1000 * 60 * 60);
      if (diffHours <= 24) {
        const question = prevIncoming
          .reverse()
          .map(m => m.content.trim())
          .join("\n");
        qaPairs.push({
          question,
          answer: reply.content.trim(),
          sentAt: reply.sent_at,
        });
      }
    }
  }

  console.log(`Q&Aペア数: ${qaPairs.length}\n`);

  // フィルタリング
  const filtered = qaPairs.filter(qa => {
    if (qa.question.length < 5) return false;
    if (qa.answer.length < 10) return false;
    // URL のみのメッセージを除外
    if (/^https?:\/\//.test(qa.question) && qa.question.split("\n").length <= 1) return false;
    return true;
  });

  console.log(`フィルタ後: ${filtered.length}件\n`);

  console.log("=== スタッフ手動返信Q&Aペア一覧 ===\n");
  for (let i = 0; i < Math.min(filtered.length, 50); i++) {
    const qa = filtered[i];
    console.log(`--- ${i + 1}. (${qa.sentAt}) ---`);
    console.log(`Q: ${qa.question.substring(0, 200)}`);
    console.log(`A: ${qa.answer.substring(0, 300)}`);
    console.log("");
  }
}

main().catch(console.error);
