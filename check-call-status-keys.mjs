// check-call-status-keys.mjs
// /api/intake/list のレスポンスから call_status のキー名を確認

const targetDate = "2026-01-28";

console.log(`=== Checking call_status keys from API ===\n`);

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

  if (rows.length > 0) {
    // 最初の1件の全キーを表示
    console.log("=== Sample record keys ===");
    const sampleKeys = Object.keys(rows[0]);
    console.log(sampleKeys.join(", "));
    console.log();

    // call_status 関連のキーを探す
    const callStatusKeys = sampleKeys.filter(key =>
      key.toLowerCase().includes("call") || key.toLowerCase().includes("status")
    );

    console.log("=== Keys related to 'call' or 'status' ===");
    console.log(callStatusKeys.join(", "));
    console.log();

    // call_status が "no_answer" のレコードを探す
    const noAnswerRows = rows.filter(row => {
      const keys = Object.keys(row);
      return keys.some(key => {
        const val = String(row[key] || "").toLowerCase();
        return val === "no_answer";
      });
    });

    if (noAnswerRows.length > 0) {
      console.log(`\n=== Found ${noAnswerRows.length} records with "no_answer" ===`);
      noAnswerRows.forEach((row, i) => {
        console.log(`\nRecord ${i + 1}:`);
        const keys = Object.keys(row);
        keys.forEach(key => {
          const val = String(row[key] || "");
          if (val.toLowerCase().includes("no_answer") || val.toLowerCase().includes("call")) {
            console.log(`  ${key}: ${row[key]}`);
          }
        });
      });
    } else {
      console.log('\n⚠ No records with "no_answer" found');
    }
  }
} catch (err) {
  console.error("❌ Error:", err.message);
}
