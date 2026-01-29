// invalidate-cache-20251200729.mjs
// Patient ID 20251200729 のキャッシュを削除

const VERCEL_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "secret";
const patientId = "20251200729";

console.log(`=== Patient ID: ${patientId} のキャッシュ削除 ===\n`);

try {
  const response = await fetch(`${VERCEL_URL}/api/admin/invalidate-cache`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify({
      patient_id: patientId,
    }),
  });

  if (!response.ok) {
    console.error("❌ Cache invalidation failed:", response.status);
    const text = await response.text();
    console.error("Response:", text);
    process.exit(1);
  }

  const data = await response.json();
  console.log("✓ キャッシュ削除成功");
  console.log(JSON.stringify(data, null, 2));

  console.log("\nマイページを再読み込みすると、最新の再処方申請が表示されるはずです。");
  console.log("再処方申請 ID 321（MJL_7.5mg_1m, status=pending）");

} catch (err) {
  console.error("❌ Error:", err.message);
  process.exit(1);
}
