import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPatient() {
  const patientId = "20260200229";

  console.log("========================================");
  console.log("患者ID: " + patientId + " のデータ確認");
  console.log("========================================\n");

  const { data, error } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId)
    .single();

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("patient_id:", data.patient_id);
  console.log("patient_name:", data.patient_name);
  console.log("created_at:", data.created_at);
  console.log("updated_at:", data.updated_at);
  console.log("\n【answers内容】");

  if (data.answers && typeof data.answers === "object") {
    const keys = Object.keys(data.answers);
    console.log("キー数:", keys.length);
    keys.forEach(k => {
      const v = data.answers[k];
      const display = typeof v === "string" && v.length > 100 ? v.slice(0, 100) + "..." : v;
      console.log("  " + k + ":", display);
    });
  } else {
    console.log("answers is null or not object");
  }
}

// GASシートから取得した問診データがある場合、DBと比較
async function findMissingData() {
  console.log("\n========================================");
  console.log("GASシートにあってDBに無いデータを持つ患者を検索");
  console.log("========================================\n");

  // まず、answersが空か非常に少ないレコードを探す
  // 1000件制限に注意してページネーション
  let allData = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("intake")
      .select("patient_id, patient_name, answers, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error:", error);
      break;
    }

    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    offset += limit;

    if (data.length < limit) break;
  }

  console.log("取得件数:", allData.length);

  // 問診の重要キーが欠けているレコードを探す
  const importantKeys = [
    "current_disease_yesno",
    "med_yesno",
    "allergy_yesno",
    "ng_check",
    "entry_route"
  ];

  const missing = [];
  allData.forEach(row => {
    if (!row.answers || typeof row.answers !== "object") {
      missing.push({ ...row, reason: "answers is null/empty" });
      return;
    }

    const keys = Object.keys(row.answers);
    // ng_checkとentry_routeは必須、どちらかが欠けていれば問題
    if (!row.answers.ng_check || !row.answers.entry_route) {
      missing.push({ ...row, reason: "ng_check or entry_route missing", keys: keys.length });
    }
  });

  console.log("\n問診データが不完全なレコード:", missing.length, "件");

  if (missing.length > 0) {
    console.log("\n【不完全なレコード一覧】");
    missing.slice(0, 50).forEach((m, i) => {
      console.log(`${i+1}. ${m.patient_id} / ${m.patient_name || "-"} / ${m.created_at?.slice(0, 10)} / ${m.reason} / keys:${m.keys || 0}`);
    });
  }
}

await checkPatient();
await findMissingData();

// 日付分布を確認
async function checkDateDistribution() {
  console.log("\n========================================");
  console.log("問診データ不完全な患者の日付分布");
  console.log("========================================\n");

  let allData = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("intake")
      .select("patient_id, answers, created_at")
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) break;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    offset += limit;
    if (data.length < limit) break;
  }

  // 日別で問診完備/不完備を集計
  const dateStats = {};
  allData.forEach(row => {
    const date = row.created_at?.slice(0, 10) || "unknown";
    if (!dateStats[date]) {
      dateStats[date] = { complete: 0, incomplete: 0 };
    }

    const hasQuestionnaire = row.answers && row.answers.ng_check;
    if (hasQuestionnaire) {
      dateStats[date].complete++;
    } else {
      dateStats[date].incomplete++;
    }
  });

  // 最近30日分を表示
  const dates = Object.keys(dateStats).sort().slice(-30);
  dates.forEach(d => {
    const s = dateStats[d];
    const pct = ((s.incomplete / (s.complete + s.incomplete)) * 100).toFixed(0);
    if (s.incomplete > 0) {
      console.log(`${d}: 完備${s.complete}件 / 不完備${s.incomplete}件 (${pct}%不完備)`);
    }
  });

  // 不完備の患者ID一覧を出力（GASから補完用）
  const incompletePatients = allData
    .filter(row => !row.answers || !row.answers.ng_check)
    .map(row => row.patient_id);

  console.log("\n【不完備な患者IDリスト（" + incompletePatients.length + "件）】");
  console.log(incompletePatients.join("\n"));
}

await checkDateDistribution();
