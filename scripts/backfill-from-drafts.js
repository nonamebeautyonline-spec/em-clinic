// approvedドラフトからembeddingに未登録のQ&Aを追加するスクリプト
// expired（手動返信）は正解が不明なためスキップ
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
  // 既存のquestion一覧
  const { data: existing } = await supabase
    .from("ai_reply_examples")
    .select("question")
    .eq("tenant_id", TENANT_ID);
  const existingQs = new Set((existing || []).map((e) => e.question));
  console.log("既存:", existingQs.size, "件");

  // approved ドラフト（AIが返信し、スタッフが承認したもの）
  const { data: approved } = await supabase
    .from("ai_reply_drafts")
    .select("id, original_message, draft_reply")
    .eq("tenant_id", TENANT_ID)
    .eq("status", "approved")
    .not("original_message", "is", null)
    .not("draft_reply", "is", null)
    .order("created_at", { ascending: false });

  const toInsert = (approved || []).filter(
    (d) => d.original_message && d.draft_reply && !existingQs.has(d.original_message)
  );
  console.log("approved未登録:", toInsert.length, "件");

  // modified ドラフト（スタッフが修正送信）→ modified_replyカラムがあればそちらを使う
  const { data: modified } = await supabase
    .from("ai_reply_drafts")
    .select("id, original_message, modified_reply")
    .eq("tenant_id", TENANT_ID)
    .eq("status", "modified")
    .not("original_message", "is", null)
    .not("modified_reply", "is", null)
    .order("created_at", { ascending: false });

  const modifiedToInsert = (modified || []).filter(
    (d) => d.original_message && d.modified_reply && !existingQs.has(d.original_message)
  );
  console.log("modified未登録:", modifiedToInsert.length, "件");

  const allToInsert = [
    ...toInsert.map((d) => ({
      question: d.original_message,
      answer: d.draft_reply,
      source: "staff_edit",
    })),
    ...modifiedToInsert.map((d) => ({
      question: d.original_message,
      answer: d.modified_reply,
      source: "staff_edit",
    })),
  ];

  if (allToInsert.length === 0) {
    console.log("追加するQ&Aはありません");
    return;
  }

  console.log(`\n合計 ${allToInsert.length} 件をINSERT開始...`);

  let inserted = 0;
  let failed = 0;
  for (let i = 0; i < allToInsert.length; i++) {
    const entry = allToInsert[i];
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
        console.error(`  [${i + 1}] INSERT失敗:`, error.message);
        failed++;
      } else {
        inserted++;
        if (inserted % 20 === 0) console.log(`  ${inserted}件完了...`);
      }
    } catch (err) {
      console.error(`  [${i + 1}] embedding失敗:`, err.message);
      failed++;
    }
  }

  console.log(`\n完了: ${inserted}件追加, ${failed}件失敗`);
}

main().catch(console.error);
