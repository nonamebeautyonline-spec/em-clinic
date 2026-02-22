// patientsテーブルに存在しないLINE_*ユーザーのレコードを作成
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const LINE_TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

const ORPHANS = [
  { pid: "LINE_e7b2606a", uid: "U7c9c58af8bc392c8a6662a08e7b2606a" },
  { pid: "LINE_e1c4a259", uid: "Udf8037220cff5e6b1361ac94e1c4a259" },
  { pid: "LINE_817ca8d9", uid: "U8e6980153264819e014ad67e817ca8d9" },
  { pid: "LINE_d48f3e5b", uid: "U3283a2bdde50eb723470f60cd48f3e5b" },
  { pid: "LINE_96d20882", uid: "Ub05c5d34669a699654f81b2f96d20882" },
  { pid: "LINE_085a1e82", uid: "U48f457eb209886fb49e15fd6085a1e82" },
];

async function getLineProfile(uid) {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${uid}`, {
      headers: { Authorization: `Bearer ${LINE_TOKEN}` },
    });
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

(async () => {
  console.log("=== orphan LINE_* patients 修復 ===\n");

  for (const { pid, uid } of ORPHANS) {
    const profile = await getLineProfile(uid);
    const displayName = profile?.displayName || null;
    const pictureUrl = profile?.pictureUrl || null;

    const { error } = await sb.from("patients").insert({
      patient_id: pid,
      name: displayName || pid,
      line_id: uid,
      line_display_name: displayName,
      line_picture_url: pictureUrl,
    });

    if (error) {
      console.log(`  ✗ ${pid}: ${error.message}`);
    } else {
      console.log(`  ✓ ${pid}: ${displayName || "(プロフィール取得不可)"} / ${pictureUrl ? "写真あり" : "写真なし"}`);
    }
  }

  console.log("\n=== 完了 ===");
})();
