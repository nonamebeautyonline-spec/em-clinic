const fs = require("fs");
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normTel(t) {
  if (!t) return "";
  t = t.trim();
  if (/^[789]0\d{8}$/.test(t)) return "0" + t;
  return t;
}

// RFC 4180準拠CSVパーサー
function parseCSV(text) {
  const rows = [];
  let i = 0;
  while (i < text.length) {
    const row = [];
    while (i < text.length) {
      let val = "";
      if (text[i] === '"') {
        i++;
        while (i < text.length) {
          if (text[i] === '"' && text[i + 1] === '"') { val += '"'; i += 2; }
          else if (text[i] === '"') { i++; break; }
          else { val += text[i]; i++; }
        }
      } else {
        while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          val += text[i]; i++;
        }
      }
      row.push(val);
      if (i < text.length && text[i] === ',') { i++; continue; }
      if (i < text.length && text[i] === '\r') i++;
      if (i < text.length && text[i] === '\n') i++;
      break;
    }
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

(async () => {
  // GAS読み込み
  const csv = fs.readFileSync("/tmp/monshin.csv", "utf-8");
  const parsed = parseCSV(csv);
  const header = parsed[0];
  const rows = parsed.slice(1).map(cols => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = cols[idx] || ""; });
    return obj;
  });

  // GASでPIDがあり電話番号もある人をマップ
  const gasTelByPid = {};
  for (const r of rows) {
    const pid = (r.patient_id || "").trim();
    const tel = normTel(r.tel);
    if (pid && tel) {
      gasTelByPid[pid] = { tel, name: (r.name || "").trim() };
    }
  }

  console.log("GASでPID+電話がある患者数:", Object.keys(gasTelByPid).length);

  // DB側の患者を取得（GASに存在するPIDのみ）
  const gasPids = Object.keys(gasTelByPid);
  let dbPatients = {};

  // 1000件ずつ取得
  for (let i = 0; i < gasPids.length; i += 500) {
    const batch = gasPids.slice(i, i + 500);
    const { data } = await supabase
      .from("patients")
      .select("patient_id, tel, name, line_id")
      .in("patient_id", batch);
    if (data) {
      for (const p of data) {
        dbPatients[p.patient_id] = p;
      }
    }
  }

  // GASに電話番号あり → DBに電話番号なし のケースを抽出
  let gapCount = 0;
  const gaps = [];
  for (const [pid, gas] of Object.entries(gasTelByPid)) {
    const db = dbPatients[pid];
    if (!db) continue; // DBに患者自体がない（統合済みで削除等）
    if (!db.tel) {
      gapCount++;
      gaps.push({
        pid,
        gasName: gas.name,
        gasTel: gas.tel,
        dbName: db.name || "(なし)",
        dbTel: "(なし)",
        dbLine: db.line_id ? "あり" : "null",
      });
    }
  }

  console.log("DBに患者あり:", Object.keys(dbPatients).length);
  console.log("GASに電話あり→DBに電話なし:", gapCount, "人");
  console.log("");

  if (gaps.length > 0) {
    console.log("PID\tGAS氏名\tGAS電話\tDB氏名\tDB電話\tDB LINE");
    for (const g of gaps) {
      console.log([g.pid, g.gasName, g.gasTel, g.dbName, g.dbTel, g.dbLine].join("\t"));
    }
  }
})();
