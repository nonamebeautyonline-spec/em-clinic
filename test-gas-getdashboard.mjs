const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
const patientId = "20251200729";

console.log("=== Testing GAS getDashboard (light=1) ===\n");

const url = GAS_MYPAGE_URL + "?type=getDashboard&patient_id=" + encodeURIComponent(patientId) + "&light=1";

const response = await fetch(url);
const data = await response.json();

console.log("Reorders from GAS getDashboard:");
if (data.reorders) {
  data.reorders.forEach(r => {
    console.log("- ID:", r.id, "Status:", r.status || r.statusRaw, "Product:", r.product_code || r.productCode);
  });
} else {
  console.log("No reorders found");
}

console.log("\nFull response:");
console.log(JSON.stringify(data, null, 2));
