// 既存ナレッジベースのQ&Aブロックを ai_reply_examples テーブルに移行するスクリプト
// 実行: node scripts/migrate-kb-to-examples.js

const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const BATCH_SIZE = 20; // OpenAI APIのレート制限を考慮

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: 1536,
  });
  return response.data[0].embedding;
}

async function main() {
  // 1. ナレッジベースからQ&Aブロックを抽出
  const { data: settings } = await supabase
    .from("ai_reply_settings")
    .select("id, knowledge_base")
    .eq("tenant_id", TENANT_ID)
    .single();

  if (!settings?.knowledge_base) {
    console.log("ナレッジベースが空です");
    return;
  }

  const regex = /### スタッフ(修正例|手動返信例)（自動追加）\nQ: (.+)\nA: (.+)/g;
  const entries = [];
  let match;
  while ((match = regex.exec(settings.knowledge_base)) !== null) {
    entries.push({
      source: match[1] === "修正例" ? "staff_edit" : "manual_reply",
      question: match[2].trim(),
      answer: match[3].trim(),
    });
  }

  console.log(`${entries.length}件のQ&Aを検出`);

  if (entries.length === 0) return;

  // 2. バッチでembedding生成 + INSERT
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    console.log(`バッチ ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length}件処理中...`);

    const rows = [];
    for (const entry of batch) {
      try {
        const embedding = await generateEmbedding(entry.question);
        rows.push({
          tenant_id: TENANT_ID,
          question: entry.question,
          answer: entry.answer,
          source: entry.source,
          embedding: JSON.stringify(embedding),
        });
      } catch (err) {
        console.error(`  embedding生成失敗: ${entry.question.substring(0, 30)}...`, err.message);
        // embeddingなしでも保存
        rows.push({
          tenant_id: TENANT_ID,
          question: entry.question,
          answer: entry.answer,
          source: entry.source,
          embedding: null,
        });
        failed++;
      }
    }

    const { error } = await supabase.from("ai_reply_examples").insert(rows);
    if (error) {
      console.error("  INSERT失敗:", error.message);
      failed += rows.length;
    } else {
      inserted += rows.length;
      console.log(`  ${rows.length}件INSERT完了`);
    }

    // レート制限対策
    if (i + BATCH_SIZE < entries.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\n完了: ${inserted}件移行, ${failed}件失敗`);

  // 3. ナレッジベースからQ&Aブロックを削除
  const cleanedKB = settings.knowledge_base
    .replace(/\n\n### スタッフ(修正例|手動返信例)（自動追加）\nQ: .+\nA: .+/g, "")
    .trim();

  const { error: updateError } = await supabase
    .from("ai_reply_settings")
    .update({ knowledge_base: cleanedKB, updated_at: new Date().toISOString() })
    .eq("id", settings.id);

  if (updateError) {
    console.error("ナレッジベース更新失敗:", updateError.message);
  } else {
    console.log("ナレッジベースからQ&Aブロックを削除しました");
  }
}

main().catch(console.error);
