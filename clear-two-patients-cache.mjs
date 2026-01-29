// clear-two-patients-cache.mjs
// 2人の患者のキャッシュをクリア

const VERCEL_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "secret";

const patients = [
  { id: "20251200404", name: "金本美伶", reorderId: 322 },
  { id: "20251200841", name: "劉本ちあき", reorderId: 324 },
];

console.log("=== 2人の患者のキャッシュをクリア ===\n");

for (const patient of patients) {
  console.log(`Patient ${patient.id} (${patient.name}) - Reorder ID ${patient.reorderId}`);
  console.log("キャッシュ削除中...");

  try {
    const response = await fetch(`${VERCEL_URL}/api/admin/invalidate-cache`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ patient_id: patient.id }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✓ キャッシュ削除成功:", data);
    } else {
      console.log(`❌ キャッシュ削除失敗 (${response.status}):`, data);
    }
  } catch (err) {
    console.log("❌ エラー:", err.message);
  }

  console.log("");
}

console.log("=== 完了 ===");
console.log("\nマイページを再読み込みすると、決済ボタンが表示されるはずです。");
console.log("確認する場合は、以下のURLにアクセスしてください:");
patients.forEach(p => {
  console.log(`  ${p.name}: ${VERCEL_URL}/mypage?patient_id=${p.id}`);
});
