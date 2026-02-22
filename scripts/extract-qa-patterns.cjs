/**
 * 過去のQ&Aパターンを message_log から抽出するスクリプト
 *
 * 処理:
 * 1. incoming (患者メッセージ) の直後に outgoing (スタッフ返信) があるペアを収集
 * 2. 類似パターンをグルーピング
 * 3. ナレッジベース用にフォーマットして出力
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("=== 過去Q&Aパターン抽出 ===\n");

  // 全患者のmessage_logからQ&Aペアを抽出
  // incoming → 直後の outgoing をペアとして取得
  const { data: incoming, error: inErr } = await supabase
    .from("message_log")
    .select("id, patient_id, content, sent_at, direction, event_type")
    .eq("direction", "incoming")
    .eq("event_type", "message")
    .not("content", "is", null)
    .order("sent_at", { ascending: true });

  if (inErr) {
    console.error("incoming取得エラー:", inErr);
    return;
  }
  console.log(`incoming メッセージ数: ${incoming.length}`);

  // outgoingメッセージも取得（スタッフ返信）
  const { data: outgoing, error: outErr } = await supabase
    .from("message_log")
    .select("id, patient_id, content, sent_at, direction, event_type")
    .eq("direction", "outgoing")
    .in("event_type", ["message", "auto_reply"])
    .not("content", "is", null)
    .order("sent_at", { ascending: true });

  if (outErr) {
    console.error("outgoing取得エラー:", outErr);
    return;
  }
  console.log(`outgoing メッセージ数: ${outgoing.length}`);

  // patient_id ごとに outgoing をインデックス化
  const outgoingByPatient = {};
  for (const msg of outgoing) {
    if (!outgoingByPatient[msg.patient_id]) {
      outgoingByPatient[msg.patient_id] = [];
    }
    outgoingByPatient[msg.patient_id].push(msg);
  }

  // Q&Aペア作成: incoming の直後の outgoing を紐づけ
  const qaPairs = [];
  for (const inc of incoming) {
    const patientOutgoing = outgoingByPatient[inc.patient_id] || [];
    // この incoming の直後の outgoing を探す
    const nextReply = patientOutgoing.find(
      (o) => new Date(o.sent_at) > new Date(inc.sent_at)
    );
    if (nextReply) {
      // 12時間以内の返信のみ
      const diffHours =
        (new Date(nextReply.sent_at) - new Date(inc.sent_at)) / (1000 * 60 * 60);
      if (diffHours <= 12) {
        qaPairs.push({
          question: inc.content.trim(),
          answer: nextReply.content.trim(),
          patientId: inc.patient_id,
          questionTime: inc.sent_at,
          answerTime: nextReply.sent_at,
        });
      }
    }
  }

  console.log(`Q&Aペア数: ${qaPairs.length}\n`);

  // フィルタリング: 短すぎる質問・挨拶系を除外
  const skipPatterns = [
    /^(はい|うん|ok|了解|ありがとう|お願い|わかりました|大丈夫|承知|おはよう|こんにちは|こんばんは)$/i,
    /^[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+$/u, // 絵文字のみ
    /^\d+$/, // 数字のみ
  ];

  const filteredPairs = qaPairs.filter((qa) => {
    if (qa.question.length < 5) return false;
    if (qa.answer.length < 10) return false;
    if (skipPatterns.some((p) => p.test(qa.question))) return false;
    return true;
  });

  console.log(`フィルタ後のQ&Aペア数: ${filteredPairs.length}\n`);

  // カテゴリ分類（キーワードベース）
  const categories = {
    "予約・変更・キャンセル": [],
    "料金・支払い": [],
    "薬・処方・副作用": [],
    "配送・発送": [],
    "再処方・追加注文": [],
    "問診・来院": [],
    "その他": [],
  };

  for (const qa of filteredPairs) {
    const q = qa.question;
    if (/予約|変更|キャンセル|日程|日時|時間/.test(q)) {
      categories["予約・変更・キャンセル"].push(qa);
    } else if (/料金|値段|金額|支払|決済|カード|振込|入金/.test(q)) {
      categories["料金・支払い"].push(qa);
    } else if (/薬|処方|副作用|効果|服用|飲み方|用量|mg|ミノ|フィナ|デュタ|プロペシア/.test(q)) {
      categories["薬・処方・副作用"].push(qa);
    } else if (/配送|発送|届|荷物|追跡|ポスト/.test(q)) {
      categories["配送・発送"].push(qa);
    } else if (/再処方|追加|再注文|継続|リピート/.test(q)) {
      categories["再処方・追加注文"].push(qa);
    } else if (/問診|来院|通院|カウンセリング|初診|受診/.test(q)) {
      categories["問診・来院"].push(qa);
    } else {
      categories["その他"].push(qa);
    }
  }

  // カテゴリ別にサンプル表示
  console.log("=== カテゴリ別Q&Aサンプル ===\n");
  for (const [cat, pairs] of Object.entries(categories)) {
    console.log(`\n### ${cat} (${pairs.length}件)`);
    // 各カテゴリから代表的なQ&Aを表示（最大10件）
    const samples = pairs.slice(0, 10);
    for (const qa of samples) {
      console.log(`  Q: ${qa.question.substring(0, 100)}`);
      console.log(`  A: ${qa.answer.substring(0, 150)}`);
      console.log("");
    }
  }

  // ナレッジベース用フォーマットで出力
  console.log("\n\n=== ナレッジベース用テキスト ===\n");
  let knowledgeText = "## 過去のよくある質問と回答例\n\n";

  for (const [cat, pairs] of Object.entries(categories)) {
    if (pairs.length === 0) continue;
    knowledgeText += `### ${cat}\n\n`;

    // 重複排除: 類似の質問はスキップ（先頭20文字が同じなら重複とみなす）
    const seen = new Set();
    let count = 0;
    for (const qa of pairs) {
      const key = qa.question.substring(0, 20);
      if (seen.has(key)) continue;
      seen.add(key);
      knowledgeText += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
      count++;
      if (count >= 5) break; // カテゴリあたり最大5件
    }
  }

  console.log(knowledgeText);

  // ファイルに保存
  const fs = require("fs");
  fs.writeFileSync("scripts/qa-knowledge-output.txt", knowledgeText, "utf-8");
  console.log("\n→ scripts/qa-knowledge-output.txt に保存しました");
}

main().catch(console.error);
