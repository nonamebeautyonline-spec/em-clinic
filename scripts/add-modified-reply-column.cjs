const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // modified_reply カラムを追加
  const { error } = await supabase.rpc("exec_sql", {
    sql: "ALTER TABLE ai_reply_drafts ADD COLUMN IF NOT EXISTS modified_reply TEXT;"
  });

  if (error) {
    // rpc が無い場合は直接クエリ
    console.log("rpc失敗、直接試行:", error.message);
    const { error: e2 } = await supabase
      .from("ai_reply_drafts")
      .select("modified_reply")
      .limit(1);
    if (e2 && e2.message.includes("modified_reply")) {
      console.log("カラムが存在しません。Supabaseダッシュボードで以下のSQLを実行してください:");
      console.log("ALTER TABLE ai_reply_drafts ADD COLUMN IF NOT EXISTS modified_reply TEXT;");
    } else {
      console.log("modified_reply カラムは既に存在します");
    }
  } else {
    console.log("modified_reply カラムを追加しました");
  }
}
main().catch(console.error);
