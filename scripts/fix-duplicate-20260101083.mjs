// 患者 20260101083 のキャッシュを削除してマイページ表示を修正

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "your_admin_token_here";
const BASE_URL = "https://em-clinic.vercel.app"; // 本番環境

async function fixDuplicate() {
  const patientId = "20260101083";

  console.log(`Invalidating cache for patient ${patientId}...`);

  const res = await fetch(`${BASE_URL}/api/admin/invalidate-cache`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify({ patient_id: patientId }),
  });

  if (!res.ok) {
    console.error(`Failed to invalidate cache: ${res.status}`);
    const text = await res.text();
    console.error(text);
    return;
  }

  const data = await res.json();
  console.log("✅ Cache invalidated:", data);
  console.log("\n患者のマイページを再読み込みすると、修正されたデータが表示されます。");
}

fixDuplicate();
