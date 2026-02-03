import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local manually
const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPatients() {
  const patientIds = ["20260100327", "20260100725"];

  for (const patientId of patientIds) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`患者ID: ${patientId}`);
    console.log("=".repeat(60));

    // intakeテーブルから取得
    const { data: intake, error: intakeError } = await supabase
      .from("intake")
      .select("*")
      .eq("patient_id", patientId)
      .single();

    if (intakeError) {
      console.error("❌ Intake error:", intakeError);
      if (intakeError.code === "PGRST116") {
        console.log("患者が見つかりません");
      }
      continue;
    }

    console.log("\n--- 基本情報 ---");
    console.log(`患者名: ${intake.patient_name || "(なし)"}`);
    console.log(`LステップID (answerer_id): ${intake.answerer_id || "❌ 不足"}`);
    console.log(`LINE User ID: ${intake.line_user_id || "(なし)"}`);
    console.log(`Status: ${intake.status || "(なし)"}`);
    console.log(`作成日時: ${intake.created_at}`);

    console.log("\n--- Answers (JSON) ---");
    if (intake.answers) {
      try {
        const answers = typeof intake.answers === "string"
          ? JSON.parse(intake.answers)
          : intake.answers;

        console.log(`性別 (sex): ${answers.sex || "❌ 不足"}`);
        console.log(`生年月日 (birth): ${answers.birth || "❌ 不足"}`);
        console.log(`電話番号 (tel): ${answers.tel || "(なし)"}`);
        console.log(`身長 (height): ${answers.height || "(なし)"}`);
        console.log(`体重 (weight): ${answers.weight || "(なし)"}`);

        // 全フィールドを表示
        console.log("\n--- Answers 全フィールド ---");
        console.log(JSON.stringify(answers, null, 2));
      } catch (err) {
        console.error("❌ Answers parse error:", err);
        console.log("Raw answers:", intake.answers);
      }
    } else {
      console.log("❌ Answers が存在しません");
    }

    console.log("\n--- 不足しているフィールド ---");
    const missing = [];
    if (!intake.answerer_id) missing.push("answerer_id (LステップID)");

    if (intake.answers) {
      const answers = typeof intake.answers === "string"
        ? JSON.parse(intake.answers)
        : intake.answers;
      if (!answers.sex) missing.push("sex (性別)");
      if (!answers.birth) missing.push("birth (生年月日)");
    } else {
      missing.push("answers 全体");
    }

    if (missing.length > 0) {
      console.log("❌ 不足:");
      missing.forEach(field => console.log(`   - ${field}`));
    } else {
      console.log("✅ すべてのフィールドが存在します");
    }
  }
}

checkPatients().catch(console.error);
