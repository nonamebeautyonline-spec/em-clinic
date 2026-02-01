// reserve_idのタイムスタンプをデコード

const reserveIds = [
  "resv-1769694880727",  // 20260101580
  "resv-1769696741642",  // 20260101559
  "resv-1769694404215",  // 20251200228
];

console.log("=== reserve_id タイムスタンプ解析 ===\n");

reserveIds.forEach(id => {
  const timestamp = parseInt(id.replace("resv-", ""));
  const date = new Date(timestamp);
  
  console.log(id);
  console.log("  UTC:", date.toISOString());
  console.log("  JST:", date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }));
  console.log();
});
