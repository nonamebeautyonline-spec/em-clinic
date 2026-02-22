const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data } = await supabase
    .from("keyword_auto_replies")
    .select("id, name, keyword, match_type, is_enabled, reply_type, reply_text, priority")
    .order("priority", { ascending: false });

  console.log("=== キーワード自動応答ルール ===\n");
  for (const r of (data || [])) {
    const enabled = r.is_enabled ? "✅" : "❌";
    console.log(`${enabled} [${r.match_type}] "${r.keyword}" → ${r.reply_text?.substring(0, 80) || "(Flex)"}`);
    console.log(`   name=${r.name}, priority=${r.priority}`);

    // "10mgある？" がマッチするかテスト
    let matched = false;
    if (r.is_enabled) {
      switch (r.match_type) {
        case "exact": matched = "10mgある？".trim() === r.keyword; break;
        case "partial": matched = "10mgある？".includes(r.keyword); break;
        case "regex": try { matched = new RegExp(r.keyword).test("10mgある？"); } catch {} break;
      }
      if (matched) console.log(`   ⚠️ "10mgある？" にマッチ！`);
    }
    console.log("");
  }
}
main().catch(console.error);
