// answersにあるがintakeにないpatient_idを自動検出して修復するスクリプト
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

const sb = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);
const token = envVars.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || envVars.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN;

// 全answersを取得（TESTとLINE_を除く）
const { data: allAnswerers } = await sb
  .from("answerers")
  .select("patient_id, name, name_kana, sex, birthday, line_id, tel")
  .not("patient_id", "like", "LINE_%")
  .not("patient_id", "like", "TEST_%")
  .order("patient_id", { ascending: false })
  .limit(500);

let repaired = 0;
for (const a of allAnswerers || []) {
  const { data: intake } = await sb
    .from("intake")
    .select("patient_id")
    .eq("patient_id", a.patient_id)
    .limit(1)
    .maybeSingle();

  if (intake) continue; // intakeあり → OK

  // LINEプロフィール取得
  let displayName = null, pictureUrl = null;
  if (a.line_id && token) {
    try {
      const r = await fetch("https://api.line.me/v2/bot/profile/" + a.line_id, {
        headers: { Authorization: "Bearer " + token },
      });
      if (r.ok) { const p = await r.json(); displayName = p.displayName; pictureUrl = p.pictureUrl; }
    } catch (e) { /* ignore */ }
  }

  const answers = {};
  if (a.name) { answers["氏名"] = a.name; answers.name = a.name; }
  if (a.name_kana) { answers["カナ"] = a.name_kana; answers.name_kana = a.name_kana; }
  if (a.sex) { answers["性別"] = a.sex; answers.sex = a.sex; }
  if (a.birthday) { answers["生年月日"] = a.birthday; answers.birth = a.birthday; }
  if (a.tel) { answers["電話番号"] = a.tel; answers.tel = a.tel; }

  const { error } = await sb.from("intake").insert({
    patient_id: a.patient_id,
    patient_name: a.name,
    line_id: a.line_id || null,
    line_display_name: displayName,
    line_picture_url: pictureUrl,
    answers,
  });

  if (error) {
    console.error("Failed:", a.patient_id, a.name, error.message);
  } else {
    console.log("Repaired:", a.patient_id, a.name, "LINE:", displayName || "(no profile)");
    repaired++;
  }
}

console.log(`\nDone. Repaired ${repaired} patients.`);
