// ナレッジベースのQ&Aブロックを全てembeddingに移行し、ナレッジベースから削除するスクリプト
// 実行: node scripts/cleanup-kb.js

const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: 1536,
  });
  return response.data[0].embedding;
}

async function main() {
  // 1. ナレッジベース取得
  const { data: settings } = await supabase
    .from("ai_reply_settings")
    .select("id, knowledge_base")
    .eq("tenant_id", TENANT_ID)
    .single();

  if (!settings?.knowledge_base) {
    console.log("ナレッジベースが空です");
    return;
  }

  // 2. Q&Aブロック抽出
  const regex = /### スタッフ(修正例|手動返信例)（自動追加）\nQ: (.+)\nA: ([\s\S]+?)(?=\n\n### スタッフ|$)/g;
  const entries = [];
  let match;
  while ((match = regex.exec(settings.knowledge_base)) !== null) {
    entries.push({
      source: match[1] === "修正例" ? "staff_edit" : "manual_reply",
      question: match[2].trim(),
      answer: match[3].trim(),
    });
  }
  console.log(`ナレッジベースから${entries.length}件のQ&Aを検出`);

  // 3. 既存のembeddingテーブルのquestionを取得（重複チェック用）
  const { data: existing } = await supabase
    .from("ai_reply_examples")
    .select("question")
    .eq("tenant_id", TENANT_ID);

  const existingQuestions = new Set((existing || []).map((e) => e.question));
  const newEntries = entries.filter((e) => !existingQuestions.has(e.question));
  console.log(`新規: ${newEntries.length}件（既存: ${existingQuestions.size}件）`);

  // 4. 新規分をembedding付きでINSERT
  let inserted = 0;
  for (const entry of newEntries) {
    try {
      const embedding = await generateEmbedding(entry.question);
      const { error } = await supabase.from("ai_reply_examples").insert({
        tenant_id: TENANT_ID,
        question: entry.question,
        answer: entry.answer,
        source: entry.source,
        embedding: JSON.stringify(embedding),
      });
      if (error) {
        console.error(`  INSERT失敗: ${entry.question.substring(0, 40)}...`, error.message);
      } else {
        inserted++;
      }
    } catch (err) {
      console.error(`  embedding失敗: ${entry.question.substring(0, 40)}...`, err.message);
    }
  }
  console.log(`${inserted}件を新規INSERT`);

  // 5. ナレッジベースからQ&Aブロックを全削除
  const cleanedKB = settings.knowledge_base
    .replace(/\n*### スタッフ(修正例|手動返信例)（自動追加）\nQ: [\s\S]*$/g, "")
    .trim();

  console.log(`\n削除前: ${settings.knowledge_base.length}文字`);
  console.log(`削除後: ${cleanedKB.length}文字`);

  // 残存チェック
  const remaining = cleanedKB.match(/### スタッフ(修正例|手動返信例)（自動追加）/g);
  if (remaining) {
    console.log(`警告: まだ${remaining.length}件残っています。手動確認が必要です。`);
  }

  const { error: updateError } = await supabase
    .from("ai_reply_settings")
    .update({ knowledge_base: cleanedKB, updated_at: new Date().toISOString() })
    .eq("id", settings.id);

  if (updateError) {
    console.error("ナレッジベース更新失敗:", updateError.message);
  } else {
    console.log("ナレッジベースからQ&Aブロックを削除完了");
  }
}

main().catch(console.error);
