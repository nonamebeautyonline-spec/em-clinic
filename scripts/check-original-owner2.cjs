// verify_codes を電話番号で検索 + LINE プロフィール取得 + 3者比較
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envContent = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf-8");
const env = {};
envContent.split("\n").forEach((l) => {
  const t = l.trim();
  if (!t || t.startsWith("#")) return;
  const i = t.indexOf("=");
  if (i === -1) return;
  let v = t.substring(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.substring(0, i).trim()] = v;
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const TOKEN = env.LINE_CHANNEL_ACCESS_TOKEN;

async function getLineProfile(uid) {
  const res = await fetch(`https://api.line.me/v2/bot/profile/${uid}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) return { error: `${res.status}` };
  return res.json();
}

async function main() {
  // 1) verify_codes 構造確認
  console.log("=== verify_codes テーブル ===");
  const { data: vcSample, error: vcErr } = await sb.from("verify_codes").select("*").limit(1);
  if (vcErr) {
    console.log("  エラー:", vcErr.message);
  } else if (vcSample && vcSample.length > 0) {
    console.log("  カラム:", Object.keys(vcSample[0]).join(", "));
    // PIDで検索
    const { data: v1 } = await sb.from("verify_codes").select("*").eq("patient_id", "20260200701");
    const { data: v2 } = await sb.from("verify_codes").select("*").eq("patient_id", "20260200905");
    console.log("  PID 20260200701:", v1 && v1.length > 0 ? JSON.stringify(v1) : "なし");
    console.log("  PID 20260200905:", v2 && v2.length > 0 ? JSON.stringify(v2) : "なし");
    // 電話番号で検索
    const phoneCol = Object.keys(vcSample[0]).find(c => c.includes("phone") || c.includes("tel"));
    if (phoneCol) {
      const { data: vp1 } = await sb.from("verify_codes").select("*").eq(phoneCol, "09094385169");
      const { data: vp2 } = await sb.from("verify_codes").select("*").eq(phoneCol, "08088405581");
      console.log(`  ${phoneCol}=09094385169:`, vp1 && vp1.length > 0 ? JSON.stringify(vp1) : "なし");
      console.log(`  ${phoneCol}=08088405581:`, vp2 && vp2.length > 0 ? JSON.stringify(vp2) : "なし");
    }
  } else {
    console.log("  テーブルは空");
  }

  // 2) LINE プロフィール
  console.log("\n=== LINE プロフィール ===");
  const [p1, p2] = await Promise.all([
    getLineProfile("U901eed1faa9fb4b86da8f0bf796890ac"),
    getLineProfile("U03dabc044e7b04d2a695b3c33b119cfd"),
  ]);
  console.log("  りさこ: " + (p1.displayName || p1.error));
  console.log("  ほのか: " + (p2.displayName || p2.error));

  // 3) 比較表
  console.log("\n=== 3者比較表 ===");
  const { data: a1 } = await sb.from("answerers").select("*").eq("patient_id", "20260200701").maybeSingle();
  const { data: a2 } = await sb.from("answerers").select("*").eq("patient_id", "20260200905").maybeSingle();
  const { data: intake } = await sb.from("intake").select("answers").eq("id", 33458).maybeSingle();
  const ia = intake?.answers || {};

  const pad = (s, n) => String(s || "—").padEnd(n);
  console.log(`${pad("項目",14)}| ${pad("りさこ(answerers)",22)}| ${pad("ほのか(answerers)",22)}| 植本(intake回答)`);
  console.log("-".repeat(85));
  console.log(`${pad("LINE表示名",14)}| ${pad(p1.displayName,22)}| ${pad(p2.displayName,22)}| —`);
  console.log(`${pad("DB氏名",14)}| ${pad(a1?.name,22)}| ${pad(a2?.name,22)}| ${ia["氏名"]||"—"}`);
  console.log(`${pad("DBカナ",14)}| ${pad(a1?.name_kana,22)}| ${pad(a2?.name_kana,22)}| ${ia["カナ"]||"—"}`);
  console.log(`${pad("DB電話",14)}| ${pad(a1?.tel,22)}| ${pad(a2?.tel,22)}| ${ia["電話番号"]||"—"}`);
  console.log(`${pad("LINE発言電話",14)}| ${pad("09094385169",22)}| ${pad("—",22)}| —`);
  console.log(`${pad("DB生年月日",14)}| ${pad(a1?.birthday,22)}| ${pad(a2?.birthday,22)}| ${ia["生年月日"]||"—"}`);
  console.log(`${pad("DB PID",14)}| ${pad("20260200701",22)}| ${pad("20260200905",22)}| (intake内)`);
  console.log(`${pad("LINE UID",14)}| ${pad("...796890ac",22)}| ${pad("...3b119cfd",22)}| なし`);
}

main().catch(console.error);
