const GAS = process.env.GAS_MYPAGE_URL;
const SECRET = process.env.MYPAGE_INVALIDATE_SECRET || "";
const PID = "20251200729";

console.log("1. Invalidating cache...");
await fetch(GAS, {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({type: "invalidate_cache", patient_id: PID, secret: SECRET})
});

console.log("2. Waiting 2 seconds...");
await new Promise(r => setTimeout(r, 2000));

console.log("3. Checking getDashboard...");
const res = await fetch(GAS + "?type=getDashboard&patient_id=" + PID + "&light=1");
const data = await res.json();

console.log("\nReorders:");
data.reorders?.forEach(r => console.log(`- ID ${r.id}: ${r.status} (${r.productCode})`));
