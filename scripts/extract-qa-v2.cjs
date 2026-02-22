/**
 * スタッフ手動返信（event_type=null, individual）と
 * その直前の患者メッセージをペアにして抽出 v2
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// テンプレ通知パターン（除外）
const TEMPLATE_PATTERNS = [
  /【発送完了】/,
  /【予約確定】/,
  /【予約変更】/,
  /【予約キャンセル】/,
  /【明日のご予約】/,
  /【価格表】/,
  /追跡番号:/,
  /この度はのなめビューティーに登録/,
  /再処方申請が承認されました/,
  /マイページより再処方の申請が可能/,
  /マイページにて追跡番号照会/,
  /診療のご予約がございます/,
  /こちらのサイトのエラーで大変恐れ入りますが/,
  /マイページの問診ボタンの表示が改善されました/,
  /LINEメッセージより直接お問い合わせ/,
  /メッセージより直接お問い合わせ/,
  /個人情報の入力をお願いいたします/,
  /【個人情報の再入力のお願い】/,
  /【電話番号の再登録のお願い】/,
  /【問診入力のお願い】/,
];

async function main() {
  console.log("=== スタッフ手動返信Q&A抽出 v2 ===\n");

  // スタッフ手動返信を取得（event_type=null + message/individual）
  const { data: staffReplies, error } = await supabase
    .from("message_log")
    .select("id, patient_id, content, sent_at, event_type, message_type")
    .eq("direction", "outgoing")
    .eq("message_type", "individual")
    .not("content", "is", null)
    .order("sent_at", { ascending: false })
    .limit(1000);

  if (error) { console.error(error); return; }
  console.log(`全individual outgoing: ${staffReplies.length}件`);

  // テンプレ通知を除外
  const manual = staffReplies.filter(msg =>
    !TEMPLATE_PATTERNS.some(p => p.test(msg.content))
  );
  console.log(`テンプレ除外後: ${manual.length}件\n`);

  // 各返信の直前の患者メッセージを取得
  const qaPairs = [];
  for (const reply of manual) {
    const { data: prevIncoming } = await supabase
      .from("message_log")
      .select("content, sent_at")
      .eq("patient_id", reply.patient_id)
      .eq("direction", "incoming")
      .lt("sent_at", reply.sent_at)
      .not("content", "is", null)
      .order("sent_at", { ascending: false })
      .limit(3);

    if (prevIncoming && prevIncoming.length > 0) {
      const diffHours = (new Date(reply.sent_at) - new Date(prevIncoming[0].sent_at)) / (1000 * 60 * 60);
      if (diffHours <= 24) {
        const question = prevIncoming
          .reverse()
          .map(m => m.content.trim())
          .filter(c => c.length > 0 && !/^https?:\/\//.test(c))
          .join("\n");
        if (question.length >= 3) {
          qaPairs.push({
            question,
            answer: reply.content.trim(),
          });
        }
      }
    }
  }

  console.log(`Q&Aペア数: ${qaPairs.length}\n`);

  // 重複除去（回答の先頭30文字が同じならスキップ）
  const seen = new Set();
  const unique = [];
  for (const qa of qaPairs) {
    const aKey = qa.answer.substring(0, 30);
    if (seen.has(aKey)) continue;
    seen.add(aKey);
    unique.push(qa);
  }

  console.log(`重複除去後: ${unique.length}件\n`);

  console.log("=== Q&Aペア一覧 ===\n");
  for (let i = 0; i < unique.length; i++) {
    const qa = unique[i];
    console.log(`--- ${i + 1} ---`);
    console.log(`Q: ${qa.question.substring(0, 250)}`);
    console.log(`A: ${qa.answer.substring(0, 350)}`);
    console.log("");
  }
}

main().catch(console.error);
