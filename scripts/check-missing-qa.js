// 未移行のQ&Aをドラフトから再抽出して確認するスクリプト
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

async function main() {
  // 既存のembeddingテーブルのquestion一覧
  const { data: existing } = await supabase
    .from("ai_reply_examples")
    .select("question")
    .eq("tenant_id", TENANT_ID);
  const existingQs = new Set((existing || []).map((e) => e.question));
  console.log("embedding登録済み:", existingQs.size);

  // message_logからスタッフ送信（outgoing）を取得し、
  // 直前の患者メッセージ（incoming）とペアにできるか確認
  const { data: staffEdits } = await supabase
    .from("ai_reply_drafts")
    .select("id, original_message, draft_reply, status")
    .eq("tenant_id", TENANT_ID)
    .in("status", ["approved", "expired", "modified"])
    .order("created_at", { ascending: false });

  let missing = 0;
  const missingEntries = [];
  for (const d of staffEdits || []) {
    if (d.original_message && !existingQs.has(d.original_message)) {
      missing++;
      missingEntries.push({
        id: d.id,
        status: d.status,
        q: d.original_message.substring(0, 60),
      });
    }
  }

  console.log("ドラフト総数:", (staffEdits || []).length);
  console.log("未登録:", missing);
  if (missingEntries.length > 0) {
    console.log("\n未登録の例（最大10件）:");
    missingEntries.slice(0, 10).forEach((e) => {
      console.log(`  [${e.status}] id=${e.id}: ${e.q}`);
    });
  }
}

main().catch(console.error);
