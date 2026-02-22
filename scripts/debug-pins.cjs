// ピン留めIDとフレンドリスト照合
require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 1) admin_users の pinned_patients を取得
  const { data: admins, error: aErr } = await sb.from("admin_users").select("name, pinned_patients");
  if (aErr) { console.error("admin_users取得エラー:", aErr.message); return; }

  const allPins = new Set();
  for (const a of (admins || [])) {
    console.log(`管理者: ${a.name} → ピン: ${JSON.stringify(a.pinned_patients)}`);
    for (const pid of (a.pinned_patients || [])) allPins.add(pid);
  }

  const pinnedIds = [...allPins];
  console.log(`\n統合ピンID (${pinnedIds.length}件):`, pinnedIds);

  // 2) intake テーブルで各ピンIDの存在確認
  const { data: intakes } = await sb.from("intake")
    .select("patient_id, patient_name, line_id, reserve_id")
    .in("patient_id", pinnedIds)
    .order("id", { ascending: false });

  // patient_id ごとにユニーク化（最新を残す）
  const intakeMap = new Map();
  for (const row of (intakes || [])) {
    if (!intakeMap.has(row.patient_id)) {
      intakeMap.set(row.patient_id, row);
    }
  }

  console.log(`\nピンID vs intake マッチング:`);
  const missing = [];
  for (const pid of pinnedIds) {
    const found = intakeMap.get(pid);
    if (found) {
      console.log(`  ✅ ${pid} → ${found.patient_name} (line_id: ${found.line_id ? "あり" : "なし"})`);
    } else {
      console.log(`  ❌ ${pid} → intake にレコードなし`);
      missing.push(pid);
    }
  }

  console.log(`\nマッチ: ${pinnedIds.length - missing.length}件, 不一致: ${missing.length}件`);

  // 3) 不一致のIDを answerers テーブルで確認
  if (missing.length > 0) {
    console.log(`\n不一致IDを answerers テーブルで確認:`);
    const { data: answerers } = await sb.from("answerers")
      .select("patient_id, name, line_id")
      .in("patient_id", missing);
    for (const pid of missing) {
      const a = (answerers || []).find(x => x.patient_id === pid);
      if (a) {
        console.log(`  📋 ${pid} → answerers: ${a.name} (line_id: ${a.line_id ? "あり" : "なし"})`);
      } else {
        console.log(`  ❓ ${pid} → answerers にもなし`);
      }
    }
  }

  // 4) friends-list APIと同じロジックでフィルタリングを再現
  // filteredFriends は searchTerm が空のとき allFriends と同じ
  // allFriends は intake テーブルからの patient_id ユニークリスト
  console.log(`\nintake に存在するピン数: ${pinnedIds.length - missing.length} / ${pinnedIds.length}`);
  console.log(`→ これがトーク画面で表示されるピン留め数になるはず`);
})();
