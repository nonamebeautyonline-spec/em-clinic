const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data } = await supabase
    .from("ai_reply_drafts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  for (const d of (data || [])) {
    console.log(`--- id=${d.id} ---`);
    console.log(`patient_id: ${d.patient_id}`);
    console.log(`status: ${d.status}`);
    console.log(`category: ${d.ai_category}`);
    console.log(`confidence: ${d.confidence}`);
    console.log(`original: ${d.original_message?.substring(0, 80)}`);
    console.log(`draft: ${d.draft_reply?.substring(0, 200)}`);
    console.log(`tokens: ${d.input_tokens}/${d.output_tokens}`);
    console.log(`created: ${d.created_at}`);
    console.log(`sent_at: ${d.sent_at}`);
    console.log("");
  }
}
main().catch(console.error);
