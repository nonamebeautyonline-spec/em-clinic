// check-reorders-response.mjs
// マイページAPIのレスポンスを詳しく確認

const APP_BASE_URL = "https://em-clinic-5num.vercel.app";
const TEST_PATIENT_ID = "20251200128";

const cookieHeader = `patient_id=${TEST_PATIENT_ID}`;

console.log(`=== Checking Mypage API Response ===`);
console.log(`Patient ID: ${TEST_PATIENT_ID}`);

try {
  const response = await fetch(`${APP_BASE_URL}/api/mypage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
  });

  if (response.ok) {
    const data = await response.json();

    console.log(`\n✓ Response received`);
    console.log(`\nReorders count: ${data.reorders?.length || 0}`);

    if (data.reorders && data.reorders.length > 0) {
      console.log(`\nReorders details:`);
      data.reorders.forEach((r, i) => {
        console.log(`  [${i}] status: ${r.status}, productCode: ${r.productCode}, createdAt: ${r.createdAt}`);
      });

      const pending = data.reorders.filter(r => r.status === "pending");
      const confirmed = data.reorders.filter(r => r.status === "confirmed");
      const canceled = data.reorders.filter(r => r.status === "canceled");
      const paid = data.reorders.filter(r => r.status === "paid");

      console.log(`\nStatus breakdown:`);
      console.log(`  - pending: ${pending.length}`);
      console.log(`  - confirmed: ${confirmed.length}`);
      console.log(`  - canceled: ${canceled.length}`);
      console.log(`  - paid: ${paid.length}`);
    } else {
      console.log(`\n✗ No reorders found!`);
    }
  } else {
    console.log(`\n✗ API error: ${response.status}`);
  }
} catch (error) {
  console.error(`\n❌ Request failed:`, error.message);
}
