// check-intake-details.mjs
// intakeレコードの詳細（answers含む）を確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const reserveId = "resv-1769514222850"; // 片方　絹予さん

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`=== Checking intake details for ${reserveId} ===\n`);

try {
  const { data, error } = await supabase
    .from("intake")
    .select("*")
    .eq("reserve_id", reserveId)
    .single();

  if (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  console.log("Reserve ID:", data.reserve_id);
  console.log("Patient ID:", data.patient_id);
  console.log("Patient Name:", data.patient_name);
  console.log("Reserved Date:", data.reserved_date);
  console.log("Reserved Time:", data.reserved_time);
  console.log("\n=== Answers (Personal Info) ===");
  const answers = data.answers || {};
  console.log("Name (氏名):", answers.name || answers["氏名"] || "NONE");
  console.log("Kana (カナ):", answers.name_kana || "NONE");
  console.log("Sex (性別):", answers.sex || "NONE");
  console.log("Birth (生年月日):", answers.birth || "NONE");
  console.log("Tel (電話番号):", answers.tel || "NONE");

  console.log("\n=== Questionnaire Answers ===");
  const questionKeys = Object.keys(answers).filter(
    (k) => !["name", "氏名", "name_kana", "sex", "birth", "tel"].includes(k)
  );
  if (questionKeys.length === 0) {
    console.log("No questionnaire data");
  } else {
    questionKeys.slice(0, 5).forEach((k) => {
      console.log(`${k}: ${answers[k]}`);
    });
    if (questionKeys.length > 5) {
      console.log(`... and ${questionKeys.length - 5} more questions`);
    }
  }
} catch (err) {
  console.error("❌ Error:", err.message);
}
