// count-api-response.mjs
// /api/intake/listのレスポンスから1/28の予約を数える

const apiResponse = {
  ok: true,
  rows: [
    // ユーザーから送られたレスポンスのデータをここに貼り付ける
    // ...省略のため、実際のAPIを呼び出して確認します
  ],
};

// 実際にAPIを呼び出す
const res = await fetch("http://localhost:3000/api/intake/list?from=2026-01-28&to=2026-01-28", {
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
console.log(`=== API Response Analysis ===\n`);
console.log(`Total rows returned: ${rows.length}`);

// 1/28の予約を抽出
const rows_0128 = rows.filter((r) => r.reserved_date === "2026-01-28");
console.log(`Rows with reserved_date = 2026-01-28: ${rows_0128.length}`);

// reserve_idをリスト化
console.log(`\nReserve IDs for 1/28:`);
rows_0128.forEach((r, i) => {
  console.log(`${i + 1}. ${r.reserve_id} (${r.patient_name}) ${r.reserved_time}`);
});
