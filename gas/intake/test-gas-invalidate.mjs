const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
const MYPAGE_INVALIDATE_SECRET = process.env.MYPAGE_INVALIDATE_SECRET || "";
const patientId = "20251200729";

console.log("=== Testing GAS invalidate_cache ===\n");

const response = await fetch(GAS_MYPAGE_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "invalidate_cache",
    patient_id: patientId,
    secret: MYPAGE_INVALIDATE_SECRET,
  }),
});

const data = await response.json();

console.log("Response:", data);
console.log("\n✓ GAS cache cleared");

// Wait 1 second then test getDashboard
console.log("\nTesting getDashboard after cache clear...");

await new Promise(resolve => setTimeout(resolve, 1000));

const dashUrl = GAS_MYPAGE_URL + "?type=getDashboard&patient_id=" + patientId + "&light=1";
const dashResponse = await fetch(dashUrl);
const dashData = await dashResponse.json();

console.log("\nReorders from getDashboard:");
if (dashData.reorders) {
  dashData.reorders.forEach(r => {
    console.log("- ID:", r.id, "Status:", r.status, "Product:", r.productCode);
  });
}
