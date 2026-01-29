// scripts/sync-intake-from-answerers.mjs
// answerers テーブルからintakeテーブルの個人情報を補完

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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function syncIntakeFromAnswerers() {
  console.log("=== intakeテーブルをanswerersから補完 ===\n");

  // 1. 全intakeレコードを取得
  console.log("1. intakeテーブルから全レコードを取得中...");
  let allIntakes = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data } = await supabase
      .from("intake")
      .select("patient_id, patient_name, answerer_id, line_id, answers")
      .range(offset, offset + batchSize - 1);

    if (!data || data.length === 0) break;
    allIntakes = allIntakes.concat(data);
    console.log(`   取得済み: ${allIntakes.length} 件`);
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  console.log(`\n   総intake件数: ${allIntakes.length}\n`);

  // 2. 情報が不完全なintakeレコードを特定
  const incompleteIntakes = allIntakes.filter(i => {
    const noNameKana = !i.answers?.name_kana && !i.answers?.カナ;
    const noSex = !i.answers?.sex;
    const noBirth = !i.answers?.birth;
    const noTel = !i.answers?.tel;
    return noNameKana || noSex || noBirth || noTel;
  });

  console.log(`2. 情報が不完全なintake: ${incompleteIntakes.length} 件\n`);

  if (incompleteIntakes.length === 0) {
    console.log("✅ 全てのintakeレコードが完全です");
    return;
  }

  // 3. answerers から情報を取得して更新
  console.log("3. answerersから情報を取得して更新中...\n");

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const intake of incompleteIntakes) {
    // answerers から取得
    const { data: answerer } = await supabase
      .from("answerers")
      .select("*")
      .eq("patient_id", intake.patient_id)
      .maybeSingle();

    if (!answerer) {
      skipCount++;
      continue;
    }

    // answersを更新
    const updatedAnswers = {
      ...(intake.answers || {}),
      name: answerer.name || intake.answers?.name || null,
      name_kana: answerer.name_kana || intake.answers?.name_kana || null,
      カナ: answerer.name_kana || intake.answers?.カナ || null,
      sex: answerer.sex || intake.answers?.sex || null,
      性別: answerer.sex || intake.answers?.性別 || null,
      birth: answerer.birthday || intake.answers?.birth || null,
      生年月日: answerer.birthday || intake.answers?.生年月日 || null,
      tel: answerer.tel || intake.answers?.tel || null,
      電話番号: answerer.tel || intake.answers?.電話番号 || null,
    };

    // 更新
    const { error } = await supabase
      .from("intake")
      .update({
        patient_name: answerer.name || intake.patient_name,
        answerer_id: answerer.answerer_id || intake.answerer_id,
        line_id: answerer.line_id || intake.line_id,
        answers: updatedAnswers,
      })
      .eq("patient_id", intake.patient_id);

    if (error) {
      failCount++;
      if (failCount <= 5) {
        console.log(`  ❌ patient_id=${intake.patient_id}:`, error.message);
      }
    } else {
      successCount++;
      if (successCount % 100 === 0) {
        console.log(`  進捗: ${successCount}/${incompleteIntakes.length}`);
      }
    }
  }

  console.log(`\n=== 完了 ===`);
  console.log(`更新成功: ${successCount} 件`);
  console.log(`スキップ（answererなし）: ${skipCount} 件`);
  if (failCount > 0) {
    console.log(`更新失敗: ${failCount} 件`);
  }
}

syncIntakeFromAnswerers();
