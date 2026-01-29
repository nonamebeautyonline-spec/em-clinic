// check-two-patients.mjs
const VERCEL_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "secret";

const patientIds = ["20251200404", "20251200841"];

for (const patientId of patientIds) {
  console.log(`\n=== Patient ${patientId} ===\n`);

  // マイページAPIをチェック
  try {
    const response = await fetch(`${VERCEL_URL}/api/mypage?patient_id=${patientId}`);
    const data = await response.json();

    if (data.reorders && data.reorders.length > 0) {
      console.log("📋 マイページAPI (/api/mypage) - Reorders:");
      data.reorders.forEach((r, idx) => {
        console.log(`  ${idx + 1}. ID: ${r.id} | Status: ${r.status} | Product: ${r.product_code}`);
      });
    } else {
      console.log("⚠️  マイページAPIには再処方申請なし");
    }
  } catch (err) {
    console.log("❌ マイページAPI取得エラー:", err.message);
  }

  // GAS直接呼び出し（getDashboard full=1）
  const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
  if (GAS_MYPAGE_URL) {
    try {
      const gasResponse = await fetch(GAS_MYPAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "getDashboard",
          patient_id: patientId,
          full: 1,
        }),
      });

      const gasData = await gasResponse.json();

      if (gasData.reorders && gasData.reorders.length > 0) {
        console.log("\n📊 GAS直接呼び出し (getDashboard full=1) - Reorders:");
        gasData.reorders.forEach((r, idx) => {
          console.log(`  ${idx + 1}. ID: ${r.id} | Status: ${r.status} | Product: ${r.product_code}`);
        });
      } else {
        console.log("\n⚠️  GAS直接呼び出しには再処方申請なし");
      }
    } catch (err) {
      console.log("\n❌ GAS呼び出しエラー:", err.message);
    }
  }

  console.log("\n" + "=".repeat(60));
}
