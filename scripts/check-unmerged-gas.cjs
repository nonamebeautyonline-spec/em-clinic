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

// RFC 4180準拠CSVパーサー（改行・クォート対応）
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

const csv = fs.readFileSync("/tmp/monshin.csv", "utf-8");
const parsed = parseCSV(csv);
const header = parsed[0];
const rows = parsed.slice(1).map(cols => {
  const obj = {};
  header.forEach((h, idx) => { obj[h] = cols[idx] || ""; });
  return obj;
});

// GASをPIDと名前でインデックス
const gasByPid = {};
const gasByName = {};
for (const r of rows) {
  const pid = (r.patient_id || "").trim();
  const nameNorm = (r.name || "").replace(/\s+/g, "").trim();
  const tel = normTel(r.tel);
  const lineId = (r.line_id || "").trim() || null;
  const masterI = normTel(r.master_I_tel);
  const entry = { pid, name: (r.name || "").trim(), tel, masterI, lineId };
  if (pid) gasByPid[pid] = entry;
  if (nameNorm && !gasByName[nameNorm]) gasByName[nameNorm] = entry;
}

const pairs = [
  ["20251200348", "20260201121", "青木綾音"],
  ["20251200020", "20251200138", "青木友香"],
  ["20251200266", "20251200917", "佐藤由香"],
  ["20260200081", "20251200985", "佐藤"],
  ["20251200016", "20260200875", "渡辺江美"],
];

(async () => {
  console.log(["旧PID","旧氏名","旧電話(DB)","旧電話(GAS)","旧LINE(GAS)","旧orders","新PID","新氏名","新電話(DB)","新LINE UID","新orders","氏名一致","電話一致(GAS含)"].join("\t"));

  for (const [oldPid, newPid, name] of pairs) {
    const { data: oldP } = await supabase.from("patients").select("patient_id, name, tel, line_id").eq("patient_id", oldPid).maybeSingle();
    const { data: newP } = await supabase.from("patients").select("patient_id, name, tel, line_id").eq("patient_id", newPid).maybeSingle();
    if (!oldP || !newP) continue;

    const { count: oldOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("patient_id", oldPid);
    const { count: newOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("patient_id", newPid);

    const gasRec = gasByPid[oldPid] || gasByName[name] || null;

    const oldTelDB = oldP.tel || "(なし)";
    const oldTelGAS = gasRec ? (gasRec.tel || gasRec.masterI || "(なし)") : "(GASなし)";
    const oldLineGAS = gasRec ? (gasRec.lineId || "null") : "(GASなし)";

    // 電話一致: GASまたはDB旧の電話 vs DB新の電話
    const telOld = normTel(oldP.tel) || (gasRec ? (gasRec.tel || gasRec.masterI) : "") || "";
    const telNew = normTel(newP.tel) || "";
    const telMatch = telOld && telNew && telOld === telNew ? "○" : "×";

    const nameOldN = (oldP.name || "").replace(/\s+/g, "");
    const nameNewN = (newP.name || "").replace(/\s+/g, "");
    const nameMatch = nameOldN && nameNewN && nameOldN === nameNewN ? "○" : "×";

    console.log([
      oldPid,
      oldP.name || "(なし)",
      oldTelDB,
      oldTelGAS,
      oldLineGAS,
      oldOrders || 0,
      newPid,
      newP.name || "(なし)",
      normTel(newP.tel) || "(なし)",
      newP.line_id || "null",
      newOrders || 0,
      nameMatch,
      telMatch,
    ].join("\t"));
  }
})();
