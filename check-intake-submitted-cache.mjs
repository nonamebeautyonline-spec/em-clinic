// check-intake-submitted-cache.mjs
// 問診送信済み（intakeIdあり）かつ未判定（status=空）の患者を確認

const GAS_INTAKE_URL = process.env.GAS_INTAKE_URL;

console.log("=== 問診送信済み・未判定の患者キャッシュ確認 ===\n");

try {
  // GASから問診シート全件取得
  const response = await fetch(GAS_INTAKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "getDashboard",
      patient_id: "dummy", // ダミー（全件取得用のハック）
      full: 1,
      debug_all_intake: true, // 全件取得フラグ（実装されていれば）
    }),
  });

  if (!response.ok) {
    console.log("❌ GAS呼び出し失敗:", response.status);
    console.log("\n別の方法でチェックします...\n");

    // Plan B: intake list APIを使う
    const listResponse = await fetch(GAS_INTAKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "getIntakeList",
        limit: 1000, // 最新1000件
      }),
    });

    if (!listResponse.ok) {
      console.log("❌ getIntakeList失敗:", listResponse.status);
      process.exit(1);
    }

    const listData = await listResponse.json();
    console.log("取得した問診件数:", listData.list?.length || 0);

    if (!listData.list || listData.list.length === 0) {
      console.log("⚠️  問診データがありません");
      process.exit(0);
    }

    // 問診送信済み（intakeIdあり）かつ未判定（status=空またはnull）
    const problematic = listData.list.filter(row => {
      const hasIntakeId = row.intakeId && String(row.intakeId).trim() !== "";
      const noStatus = !row.status || String(row.status).trim() === "";
      return hasIntakeId && noStatus;
    });

    console.log(`\n問診送信済み・未判定: ${problematic.length}件\n`);

    if (problematic.length === 0) {
      console.log("✅ 問題なし！");
      process.exit(0);
    }

    // patient_idでユニークにする
    const uniquePatients = {};
    problematic.forEach(row => {
      const pid = String(row.patient_id || row.patientId || "").trim();
      if (pid) {
        uniquePatients[pid] = {
          patient_id: pid,
          patient_name: row.patient_name || row.name || "",
          intakeId: row.intakeId,
          submittedAt: row.submittedAt || row.submitted_at || "",
        };
      }
    });

    const patientIds = Object.keys(uniquePatients);
    console.log(`ユニーク患者数: ${patientIds.length}件\n`);

    patientIds.forEach((pid, idx) => {
      const p = uniquePatients[pid];
      console.log(`${idx + 1}. ${p.patient_name} (${pid})`);
      console.log(`   IntakeID: ${p.intakeId}`);
      console.log(`   送信日時: ${p.submittedAt}`);
      console.log("");
    });

    // problematic-intake-patient-ids.json に保存
    const fs = await import("fs");
    fs.writeFileSync(
      "problematic-intake-patient-ids.json",
      JSON.stringify(patientIds, null, 2)
    );

    console.log("\n✓ problematic-intake-patient-ids.json に保存しました");
    console.log("\n次のコマンドでキャッシュをクリアしてください:");
    console.log("node --env-file=.env.local clear-intake-caches.mjs");

  }
} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
