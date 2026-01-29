// call-invalidate-api.mjs
// Vercelのキャッシュ無効化APIを呼び出す

const APP_BASE_URL = "https://em-clinic-5num.vercel.app";
const PATIENT_ID = process.argv[2] || "20251200128";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error("❌ Missing ADMIN_TOKEN");
  process.exit(1);
}

console.log(`=== Calling invalidate-cache API ===`);
console.log(`Patient ID: ${PATIENT_ID}`);
console.log(`Admin Token: ${ADMIN_TOKEN.slice(0, 10)}...`);

try {
  const response = await fetch(`${APP_BASE_URL}/api/admin/invalidate-cache`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify({ patient_id: PATIENT_ID }),
  });

  const data = await response.json();
  console.log(`\n✓ Status: ${response.status}`);
  console.log(`✓ Response:`, data);

  if (response.ok) {
    console.log(`\n✓ Cache invalidation successful for patient ${PATIENT_ID}`);
  } else {
    console.log(`\n✗ Cache invalidation failed`);
  }
} catch (error) {
  console.error(`\n❌ Request failed:`, error.message);
}
