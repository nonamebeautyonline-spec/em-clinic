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

const GAS_KARTE_URL = process.env.GAS_KARTE_URL;
const KARTE_API_KEY = process.env.KARTE_API_KEY;

async function syncMissingPatientData() {
  const patientIds = ["20260100327", "20260100725"];

  for (const patientId of patientIds) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`患者ID: ${patientId} - データ同期開始`);
    console.log("=".repeat(60));

    try {
      // 1. GASからデータ取得
      console.log("\n[1/3] GASからデータ取得中...");
      const response = await fetch(GAS_KARTE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "getPatientBundle",
          patientId: patientId,
          apiKey: KARTE_API_KEY,
        }),
      });

      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (!data.ok || !data.intakes || data.intakes.length === 0) {
        console.error(`❌ GASにデータがありません`);
        continue;
      }

      const latest = data.intakes[0];
      const record = latest.record;

      if (!record) {
        console.error(`❌ 問診レコードが空です`);
        continue;
      }

      console.log(`✅ GASデータ取得成功`);
      console.log(`   answerer_id: ${record.answerer_id}`);
      console.log(`   sex: ${record.sex}`);
      console.log(`   birth: ${record.birth}`);

      // 2. answersオブジェクトを構築
      console.log("\n[2/3] answersを構築中...");

      const answers = {
        氏名: record.name || "",
        name: record.name || "",
        性別: record.sex || "",
        sex: record.sex || "",
        生年月日: record.birth ? new Date(record.birth).toISOString().split('T')[0] : "",
        birth: record.birth ? new Date(record.birth).toISOString().split('T')[0] : "",
        カナ: record.name_kana || "",
        name_kana: record.name_kana || "",
        tel: record.tel || "",
        height: record.height || "",
        weight: record.weight || "",
        ng_check: record.ng_check || "",
        current_disease_yesno: record.current_disease_yesno || "",
        current_disease_detail: record.current_disease_detail || "",
        glp_history: record.glp_history || "",
        med_yesno: record.med_yesno || "",
        med_detail: record.med_detail || "",
        allergy_yesno: record.allergy_yesno || "",
        allergy_detail: record.allergy_detail || "",
        entry_route: record.entry_route || "",
        entry_other: record.entry_other || "",
        answerer_id: String(record.answerer_id || ""),
        line_id: record.line_id || ""
      };

      console.log(`✅ answers構築完了`);

      // 3. Supabaseに更新
      console.log("\n[3/3] Supabaseに更新中...");

      const updateData = {
        patient_name: record.name || null,
        answerer_id: String(record.answerer_id || ""),
        line_id: record.line_id || null,
        answers: answers,
        updated_at: new Date().toISOString(),
      };

      const { data: updated, error: updateError } = await supabase
        .from("intake")
        .update(updateData)
        .eq("patient_id", patientId)
        .select("patient_id, patient_name, answerer_id")
        .single();

      if (updateError) {
        console.error(`❌ Supabase更新エラー:`, updateError);
        continue;
      }

      console.log(`✅ Supabase更新成功`);
      console.log(`   患者名: ${updated.patient_name}`);
      console.log(`   answerer_id: ${updated.answerer_id}`);

    } catch (err) {
      console.error(`❌ エラー:`, err.message);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("✅ すべての患者データ同期完了");
  console.log("=".repeat(60));
}

syncMissingPatientData().catch(console.error);
