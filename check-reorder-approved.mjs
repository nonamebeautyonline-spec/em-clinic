// check-reorder-approved.mjs
// Patient ID 20251200729 の承認済み再処方申請を確認

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;
const patientId = "20251200729";

console.log(`=== Patient ID: ${patientId} の承認済み再処方申請確認 ===\n`);

try {
  // 1. 患者用リスト取得（GASから）
  const listResponse = await fetch(GAS_REORDER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "list",
      patient_id: patientId,
    }),
  });

  const listData = await listResponse.json();

  console.log("【GAS: action=list の結果】");
  if (listData.ok && listData.reorders) {
    console.log(`再処方申請: ${listData.reorders.length} 件\n`);
    listData.reorders.forEach((r, i) => {
      console.log(`${i + 1}. ID: ${r.id}`);
      console.log(`   ステータス: ${r.status}`);
      console.log(`   商品: ${r.product_code}`);
      console.log(`   作成日時: ${r.timestamp}`);
      console.log();
    });

    // approved の申請を探す
    const approved = listData.reorders.filter(r => r.status === "approved");
    console.log(`【approved の申請】: ${approved.length} 件`);
    if (approved.length > 0) {
      approved.forEach(r => {
        console.log(`  ✓ ID ${r.id}: ${r.product_code} (${r.timestamp})`);
      });
    } else {
      console.log("  ❌ approved の申請がありません");
      console.log("\n  可能性:");
      console.log("  1. ドクターがまだ承認していない（status: pending のまま）");
      console.log("  2. status が approved ではなく他の値になっている");
      console.log("  3. GASコードで approved が除外されている");
    }
  } else {
    console.log("エラー:", listData.error || "不明");
  }

  // 2. 全件確認（全statusを含む）
  console.log("\n=== 全件確認（action=listAll）===");
  const allResponse = await fetch(GAS_REORDER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "listAll",
      include_all: true,
    }),
  });

  const allData = await allResponse.json();
  if (allData.ok && allData.reorders) {
    const patientReorders = allData.reorders.filter(r =>
      String(r.patient_id).trim() === patientId
    );

    console.log(`全件: ${patientReorders.length} 件\n`);
    patientReorders.forEach((r, i) => {
      console.log(`${i + 1}. ID ${r.id}: ${r.status} (${r.product_code})`);
      console.log(`   作成: ${r.timestamp}`);
      if (r.status === "approved") {
        console.log("   👉 この申請が決済ボタンとして表示されるべき");
      }
      console.log();
    });
  }

  // 3. マイページAPIの結果を確認（キャッシュなし）
  console.log("=== マイページAPI確認（/api/mypage/reorders）===");
  const VERCEL_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const mypageResponse = await fetch(`${VERCEL_URL}/api/mypage/reorders`, {
    method: "GET",
    headers: {
      "Cookie": `patient_id=${patientId}`,
    },
    cache: "no-store",
  });

  if (mypageResponse.ok) {
    const mypageData = await mypageResponse.json();
    console.log("マイページAPIレスポンス:");
    console.log(JSON.stringify(mypageData, null, 2));
  } else {
    console.log("❌ マイページAPI失敗:", mypageResponse.status);
  }

} catch (err) {
  console.error("❌ Error:", err.message);
  process.exit(1);
}
