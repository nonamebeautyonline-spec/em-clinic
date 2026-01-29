// check-karte-reservations.mjs
// カルテAPIから1/28の予約データを取得

const GAS_KARTE_URL = process.env.GAS_KARTE_URL;
const KARTE_API_KEY = process.env.KARTE_API_KEY;

if (!GAS_KARTE_URL || !KARTE_API_KEY) {
  console.error("❌ Missing GAS_KARTE_URL or KARTE_API_KEY");
  process.exit(1);
}

console.log("=== Fetching 1/28 reservations from Karte ===\n");

try {
  const response = await fetch(GAS_KARTE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: KARTE_API_KEY,
      date: "2026/01/28",
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    console.error("❌ GAS error:", data);
    process.exit(1);
  }

  const reservations = data.reservations || [];
  console.log(`✓ Found ${reservations.length} reservations in karte\n`);

  // 氏名なしの予約を探す
  const noName = reservations.filter(
    (r) => !r.patient_name || r.patient_name.trim() === ""
  );
  const noPatientId = reservations.filter((r) => !r.patient_id);

  console.log("=== Issues ===");
  console.log(`- No patient_name: ${noName.length}`);
  console.log(`- No patient_id: ${noPatientId.length}\n`);

  if (noName.length > 0) {
    console.log("Reservations without patient_name:");
    noName.slice(0, 10).forEach((r) => {
      console.log(
        `  - ${r.reserve_id} (patient_id: ${r.patient_id || "NONE"}, time: ${
          r.reserved_time
        })`
      );
    });
    if (noName.length > 10) {
      console.log(`  ... and ${noName.length - 10} more`);
    }
    console.log();
  }

  // 指定されたreserveIDを確認
  const targetIds = ["resv-1769514222850", "resv-1769536598111"];
  console.log("=== Checking specific reserve_ids ===");
  targetIds.forEach((id) => {
    const found = reservations.find((r) => r.reserve_id === id);
    if (found) {
      console.log(`✓ ${id}:`);
      console.log(`  - patient_id: ${found.patient_id || "NONE"}`);
      console.log(`  - patient_name: ${found.patient_name || "NONE"}`);
      console.log(`  - time: ${found.reserved_time}`);
      console.log(`  - phone: ${found.phone || "NONE"}`);
    } else {
      console.log(`✗ ${id}: NOT FOUND in sheet`);
    }
  });
} catch (err) {
  console.error("❌ Error:", err.message);
}
