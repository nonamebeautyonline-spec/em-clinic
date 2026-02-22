// 特定患者のリッチメニュー状態確認
require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

const PID = process.argv[2] || "20251200554";

(async () => {
  // intake確認
  const { data: intake } = await sb.from("intake")
    .select("id, patient_id, patient_name, line_id")
    .eq("patient_id", PID);
  console.log("intake:", JSON.stringify(intake));

  const lineId = intake && intake[0] ? intake[0].line_id : null;
  if (!lineId) {
    console.log("line_idなし");
    return;
  }

  // LINE APIで現在のリッチメニュー確認
  const res = await fetch("https://api.line.me/v2/bot/user/" + lineId + "/richmenu", {
    headers: { Authorization: "Bearer " + TOKEN },
  });
  console.log("\nLINE API status:", res.status);
  if (res.ok) {
    const data = await res.json();
    console.log("現在のメニュー:", JSON.stringify(data));

    // DBで対応するメニュー名を確認
    const { data: dbMenu } = await sb.from("rich_menus")
      .select("id, name, line_rich_menu_id")
      .eq("line_rich_menu_id", data.richMenuId)
      .maybeSingle();
    console.log("DB対応:", dbMenu ? dbMenu.name + " (id=" + dbMenu.id + ")" : "DBになし");
  } else {
    const text = await res.text();
    console.log("エラー:", text);
  }

  // rich_menusテーブルの全メニュー確認
  const { data: menus } = await sb.from("rich_menus")
    .select("id, name, line_rich_menu_id, is_active");
  console.log("\nrich_menus テーブル:");
  for (const m of (menus || [])) {
    console.log("  id=" + m.id + " " + m.name + " active=" + m.is_active + " lineId=" + (m.line_rich_menu_id || "なし"));
  }
})();
