// check-api-response-0128.mjs
// /api/intake/list のレスポンスで call_status が含まれているか確認

const targetDate = "2026-01-28";

console.log(`=== Checking API response for ${targetDate} ===\n`);

try {
  const res = await fetch(`http://localhost:3000/api/intake/list?from=${targetDate}&to=${targetDate}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("❌ API error:", res.status);
    process.exit(1);
  }

  const data = await res.json();

  if (!data.ok) {
    console.error("❌ Response error:", data);
    process.exit(1);
  }

  const rows = data.rows || [];
  console.log(`Total rows: ${rows.length}\n`);

  // call_statusがあるレコード
  const withCallStatus = rows.filter(r => r.call_status && r.call_status !== "");
  console.log(`Records with call_status: ${withCallStatus.length}\n`);

  if (withCallStatus.length > 0) {
    console.log("=== Records with call_status ===");
    withCallStatus.forEach((r, i) => {
      const name = r.name || r.patient_name || r["氏名"] || "(no name)";
      const status = r.status || "(pending)";
      const time = r.reserved_time || r["予約時間"] || "";

      console.log(`${i + 1}. ${name} (${time})`);
      console.log(`   reserve_id: ${r.reserve_id || r.reserveId}`);
      console.log(`   status: ${status}`);
      console.log(`   call_status: ${r.call_status}`);
      console.log();
    });
  } else {
    console.log("⚠ No records with call_status in API response");

    // サンプルレコードのキーを表示
    if (rows.length > 0) {
      console.log("\n=== Sample record keys ===");
      const keys = Object.keys(rows[0]);
      const callKeys = keys.filter(k => k.toLowerCase().includes("call"));
      console.log("call_* keys:", callKeys.length > 0 ? callKeys.join(", ") : "none");
    }
  }

} catch (err) {
  console.error("❌ Error:", err.message);
}
