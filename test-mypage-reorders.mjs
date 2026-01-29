const VERCEL_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const patientId = "20251200729";

console.log("=== Testing /api/mypage for patient:", patientId, "===\n");

const response = await fetch(VERCEL_URL + "/api/mypage", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Cookie": "patient_id=" + patientId,
  },
  body: JSON.stringify({}),
});

const data = await response.json();

console.log("Reorders:");
if (data.reorders) {
  data.reorders.forEach(r => {
    console.log("- ID:", r.id, "Status:", r.status, "Product:", r.productCode);
  });
} else {
  console.log("No reorders found");
}
