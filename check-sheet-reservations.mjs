// check-sheet-reservations.mjs
// GAS経由で予約シートのデータを確認

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL;

if (!GAS_RESERVATIONS_URL) {
  console.error("❌ Missing GAS_RESERVATIONS_URL");
  process.exit(1);
}

console.log("=== Fetching reservations from GAS ===\n");

try {
  const response = await fetch(GAS_RESERVATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: "2026/01/28" }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    console.error("❌ GAS error:", data);
    process.exit(1);
  }

  const reservations = data.reservations || [];
  console.log(`✓ Found ${reservations.length} reservations in sheet\n`);

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
  console.error("❌ Error:", err);
}
