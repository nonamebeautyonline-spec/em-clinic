const fs = require("fs");
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalizeJPPhone(raw) {
  const s = (raw || "").trim();
  if (!s) return "";
  let digits = s.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0080")) digits = "080" + digits.slice(4);
  else if (digits.startsWith("0090")) digits = "090" + digits.slice(4);
  else if (digits.startsWith("0070")) digits = "070" + digits.slice(4);
  else if (digits.startsWith("00")) digits = digits.slice(1);
  if (digits.startsWith("81") && digits.length >= 11) {
    digits = digits.slice(2);
    if (!digits.startsWith("0")) digits = "0" + digits;
  }
  if (!digits.startsWith("0") && /^[789]/.test(digits)) digits = "0" + digits;
  return digits;
}

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
  const csv = fs.readFileSync("/tmp/monshin.csv", "utf-8");
  const parsed = parseCSV(csv);
  const header = parsed[0];
  const rows = parsed.slice(1).map(cols => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = cols[idx] || ""; });
    return obj;
  });

  // GASでPID+電話がある → DB telがnull の938人のリスト
  const gasTelByPid = {};
  for (const r of rows) {
    const pid = (r.patient_id || "").trim();
    const rawTel = (r.tel || "").trim() || (r.master_I_tel || "").trim();
    const tel = normalizeJPPhone(rawTel);
    if (pid && tel) gasTelByPid[pid] = { tel, name: (r.name || "").trim() };
  }

  const gasPids = Object.keys(gasTelByPid);

  // DBでtelがnullの旧PIDを取得
  const telNullPids = [];
  for (let i = 0; i < gasPids.length; i += 500) {
    const batch = gasPids.slice(i, i + 500);
    const { data } = await supabase
      .from("patients")
      .select("patient_id, name, tel")
      .in("patient_id", batch)
      .is("tel", null);
    if (data) telNullPids.push(...data.map(p => ({ pid: p.patient_id, dbName: p.name, gasTel: gasTelByPid[p.patient_id].tel, gasName: gasTelByPid[p.patient_id].name })));
  }

  console.log("バックフィル対象:", telNullPids.length, "人");

  // 正規化済み電話番号の一覧
  const tels = [...new Set(telNullPids.map(p => p.gasTel))];
  console.log("ユニーク電話番号:", tels.length, "件");

  // DBで同じ電話番号を既に持つ患者を検索
  let dupCount = 0;
  const dups = [];

  for (let i = 0; i < tels.length; i += 500) {
    const batch = tels.slice(i, i + 500);
    const { data } = await supabase
      .from("patients")
      .select("patient_id, name, tel, line_id")
      .in("tel", batch);

    if (data) {
      for (const dbP of data) {
        // この電話番号を持つバックフィル対象を見つける
        const matches = telNullPids.filter(p => p.gasTel === dbP.tel);
        for (const m of matches) {
          if (m.pid !== dbP.patient_id) {
            dupCount++;
            dups.push({
              oldPid: m.pid,
              oldName: m.dbName,
              gasTel: m.gasTel,
              newPid: dbP.patient_id,
              newName: dbP.name,
              newTel: dbP.tel,
              newLine: dbP.line_id ? "あり" : "null",
            });
          }
        }
      }
    }
  }

  console.log("\n同一電話番号で別PIDが存在:", dupCount, "件");

  if (dups.length > 0) {
    console.log("\n旧PID\t旧氏名\tGAS電話\t新PID\t新氏名\t新LINE");
    for (const d of dups) {
      console.log([d.oldPid, d.oldName, d.gasTel, d.newPid, d.newName, d.newLine].join("\t"));
    }
  }
})();
