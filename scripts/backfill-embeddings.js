// embeddingが未生成の学習例にembeddingを後から埋めるスクリプト
// 実行: node scripts/backfill-embeddings.js

const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  // embedding未生成のレコードを取得
  const { data: rows, error } = await supabase
    .from("ai_reply_examples")
    .select("id, question")
    .is("embedding", null)
    .order("id");

  if (error) { console.error("取得エラー:", error); return; }
  if (!rows || rows.length === 0) { console.log("embeddingが必要なレコードはありません"); return; }

  console.log(`${rows.length}件のembeddingを生成します...`);

  let ok = 0, fail = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const res = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: row.question,
        dimensions: 1536,
      });
      const embedding = res.data[0].embedding;

      await supabase
        .from("ai_reply_examples")
        .update({ embedding: JSON.stringify(embedding) })
        .eq("id", row.id);

      ok++;
      if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${rows.length} 完了`);
    } catch (err) {
      console.error(`  ID=${row.id} 失敗:`, err.message);
      fail++;
    }
  }

  console.log(`\n完了: ${ok}件成功, ${fail}件失敗`);
}

main().catch(console.error);
