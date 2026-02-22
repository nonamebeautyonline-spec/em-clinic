// answersは数値IDだがintakeがLINE_仮IDのままの患者を検出・修復
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

// 数値IDのanswererでline_idがあるもの
const { data: answerers } = await sb
  .from("answerers")
  .select("patient_id, name, line_id")
  .not("patient_id", "like", "LINE_%")
  .not("patient_id", "like", "TEST_%")
  .not("line_id", "is", null)
  .order("patient_id", { ascending: false })
  .limit(500);

let mismatches = 0;
for (const a of answerers || []) {
  // この数値IDでintakeがあるか
  const { data: numericIntake } = await sb
    .from("intake")
    .select("patient_id, line_id")
    .eq("patient_id", a.patient_id)
    .limit(1)
    .maybeSingle();

  if (numericIntake) continue; // 数値IDのintakeあり → OK

  // LINE_仮IDのintakeが残っているか
  const { data: lineIntake } = await sb
    .from("intake")
    .select("patient_id, patient_name, line_id")
    .eq("line_id", a.line_id)
    .like("patient_id", "LINE_%")
    .limit(1)
    .maybeSingle();

  if (lineIntake) {
    console.log(`MISMATCH: answerer=${a.patient_id} (${a.name}) → intake still has LINE_ ID: ${lineIntake.patient_id}`);

    // LINE プロフィール取得
    let displayName = null, pictureUrl = null;
    try {
      const r = await fetch("https://api.line.me/v2/bot/profile/" + a.line_id, {
        headers: { Authorization: "Bearer " + token },
      });
      if (r.ok) { const p = await r.json(); displayName = p.displayName; pictureUrl = p.pictureUrl; }
    } catch (e) {}

    // 数値IDで新しいintakeを作成
    const answers = {};
    const { data: fullAns } = await sb.from("answerers").select("*").eq("patient_id", a.patient_id).maybeSingle();
    if (fullAns) {
      if (fullAns.name) { answers["氏名"] = fullAns.name; answers.name = fullAns.name; }
      if (fullAns.name_kana) { answers["カナ"] = fullAns.name_kana; answers.name_kana = fullAns.name_kana; }
      if (fullAns.sex) { answers["性別"] = fullAns.sex; answers.sex = fullAns.sex; }
      if (fullAns.birthday) { answers["生年月日"] = fullAns.birthday; answers.birth = fullAns.birthday; }
      if (fullAns.tel) { answers["電話番号"] = fullAns.tel; answers.tel = fullAns.tel; }
    }

    const { error } = await sb.from("intake").insert({
      patient_id: a.patient_id,
      patient_name: a.name,
      line_id: a.line_id,
      line_display_name: displayName,
      line_picture_url: pictureUrl,
      answers,
    });

    if (error) {
      console.error("  → Failed to create numeric intake:", error.message);
    } else {
      console.log("  → Created numeric intake:", a.patient_id, a.name);
      // 旧LINE_仮レコード削除
      await sb.from("intake").delete().eq("patient_id", lineIntake.patient_id);
      console.log("  → Deleted old LINE_ intake:", lineIntake.patient_id);
      // message_logのpatient_idも更新
      await sb.from("message_log").update({ patient_id: a.patient_id }).eq("patient_id", lineIntake.patient_id);
      mismatches++;
    }
  } else {
    // LINE_仮IDもない → 完全にintakeなし（先の修復で対応済みのはず）
    console.log(`NO INTAKE AT ALL: answerer=${a.patient_id} (${a.name})`);
  }
}

console.log(`\nDone. Fixed ${mismatches} PID mismatches.`);
