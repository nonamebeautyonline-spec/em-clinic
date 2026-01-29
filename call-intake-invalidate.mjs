// call-intake-invalidate.mjs
// intake GASのinvalidate_cacheを直接呼び出し

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
const PATIENT_ID = process.argv[2] || "20251200128";

if (!GAS_MYPAGE_URL) {
  console.error("❌ Missing GAS_MYPAGE_URL");
  process.exit(1);
}

console.log(`=== Calling intake GAS invalidate_cache ===`);
console.log(`Patient ID: ${PATIENT_ID}`);
console.log(`GAS URL: ${GAS_MYPAGE_URL}`);

try {
  const response = await fetch(GAS_MYPAGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "invalidate_cache",
      patient_id: PATIENT_ID,
    }),
  });

  const data = await response.json();

  console.log(`\n✓ Status: ${response.status}`);
  console.log(`✓ Response:`, data);

  if (data.ok) {
    console.log(`\n✓ Cache invalidation successful`);
  } else {
    console.log(`\n✗ Cache invalidation failed`);
  }
} catch (error) {
  console.error(`\n❌ Request failed:`, error.message);
}
