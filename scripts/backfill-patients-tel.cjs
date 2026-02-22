const fs = require("fs");
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// normalizeJPPhone の CJS移植（lib/phone.ts と同一ロジック）
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
  const dryRun = !process.argv.includes("--exec");
  console.log(dryRun ? "=== DRY RUN ===" : "=== 実行モード ===");

  // GAS CSVを読み込み
  const csv = fs.readFileSync("/tmp/monshin.csv", "utf-8");
  const parsed = parseCSV(csv);
  const header = parsed[0];
  const rows = parsed.slice(1).map(cols => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = cols[idx] || ""; });
    return obj;
  });

  // GASでPID+電話番号がある患者をマップ（telまたはmaster_I_tel）
  const gasTelByPid = {};
  for (const r of rows) {
    const pid = (r.patient_id || "").trim();
    const rawTel = (r.tel || "").trim() || (r.master_I_tel || "").trim();
    const tel = normalizeJPPhone(rawTel);
    if (pid && tel) {
      gasTelByPid[pid] = { tel, rawTel, name: (r.name || "").trim() };
    }
  }

  console.log("GASでPID+電話がある患者数:", Object.keys(gasTelByPid).length);

  // DBでtelがnullの患者を取得（GASにPIDがある分のみ）
  const gasPids = Object.keys(gasTelByPid);
  const updates = [];

  for (let i = 0; i < gasPids.length; i += 500) {
    const batch = gasPids.slice(i, i + 500);
    const { data } = await supabase
      .from("patients")
      .select("patient_id, name, tel")
      .in("patient_id", batch)
      .is("tel", null);

    if (data) {
      for (const p of data) {
        const gas = gasTelByPid[p.patient_id];
        if (gas && gas.tel) {
          updates.push({
            pid: p.patient_id,
            dbName: p.name || "(なし)",
            gasName: gas.name,
            rawTel: gas.rawTel,
            normalizedTel: gas.tel,
          });
        }
      }
    }
  }

  console.log("更新対象（DBにtelなし＋GASにtelあり）:", updates.length, "人");

  // 正規化結果のサンプル表示
  console.log("\n--- サンプル（先頭20件） ---");
  console.log("PID\tDB氏名\tGAS氏名\tGAS電話(生)\t正規化後");
  updates.slice(0, 20).forEach(u => {
    console.log([u.pid, u.dbName, u.gasName, u.rawTel, u.normalizedTel].join("\t"));
  });
  if (updates.length > 20) console.log("... 他 " + (updates.length - 20) + "件");

  // 正規化結果の統計
  const starts0 = updates.filter(u => u.normalizedTel.startsWith("0")).length;
  const len11 = updates.filter(u => u.normalizedTel.length === 11).length;
  const len10 = updates.filter(u => u.normalizedTel.length === 10).length;
  console.log("\n--- 正規化統計 ---");
  console.log("0始まり:", starts0 + "/" + updates.length);
  console.log("11桁（携帯）:", len11);
  console.log("10桁（固定）:", len10);
  console.log("その他:", updates.length - len11 - len10);

  // 重複PIDがある6件を除外
  const excludePids = new Set([
    "20251200554", // 岩満春香
    "20260101457", // 石澤
    "20260200131", // 萬條夕希
    "20260101617", // 後藤淑乃
    "20260101471", // 松川未来
    "20260200038", // 深沼亜実
  ]);
  const filtered = updates.filter(u => !excludePids.has(u.pid));
  console.log("\n重複除外後:", filtered.length, "人（除外:", updates.length - filtered.length, "人）");

  // 実行
  if (!dryRun) {
    let success = 0;
    let fail = 0;
    for (const u of filtered) {
      const { error } = await supabase
        .from("patients")
        .update({ tel: u.normalizedTel })
        .eq("patient_id", u.pid)
        .is("tel", null); // telがnullの場合のみ更新（冪等性）

      if (error) {
        console.log("エラー:", u.pid, error.message);
        fail++;
      } else {
        success++;
      }
    }
    console.log("\n=== 結果 ===");
    console.log("成功:", success, "失敗:", fail);
  }
})();
