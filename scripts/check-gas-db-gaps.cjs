const fs = require("fs");
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
  const csv = fs.readFileSync("/tmp/monshin.csv", "utf-8");
  const parsed = parseCSV(csv);
  const header = parsed[0];
  const gasRows = parsed.slice(1).map(cols => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = cols[idx] || ""; });
    return obj;
  });

  // GASで予約ID(reserveId)がある＝問診済み のレコード
  const gasWithReserve = gasRows.filter(r => (r.reserveId || "").trim());
  const gasWithPid = gasRows.filter(r => (r.patient_id || "").trim());
  const gasWithStatus = gasRows.filter(r => (r.status || "").trim());

  console.log("=== GASシート統計 ===");
  console.log("全レコード:", gasRows.length);
  console.log("PIDあり:", gasWithPid.length);
  console.log("reserveIdあり:", gasWithReserve.length);
  console.log("statusあり:", gasWithStatus.length);
  console.log("");

  // === 1. intakeの欠落確認 ===
  // GASでPIDがある患者のintakeがDBにあるか
  const gasPids = [...new Set(gasWithPid.map(r => r.patient_id.trim()))];
  console.log("=== intake欠落チェック ===");
  console.log("GASでPIDがあるユニーク患者数:", gasPids.length);

  let intakeMissing = 0;
  const intakeMissingList = [];

  for (let i = 0; i < gasPids.length; i += 500) {
    const batch = gasPids.slice(i, i + 500);
    const { data: dbIntakes } = await supabase
      .from("intake")
      .select("patient_id")
      .in("patient_id", batch);

    const dbPidSet = new Set((dbIntakes || []).map(r => r.patient_id));
    for (const pid of batch) {
      if (!dbPidSet.has(pid)) {
        intakeMissing++;
        const gasRec = gasWithPid.find(r => r.patient_id.trim() === pid);
        intakeMissingList.push({
          pid,
          name: gasRec ? gasRec.name : "",
          status: gasRec ? gasRec.status : "",
          reserveId: gasRec ? gasRec.reserveId : "",
        });
      }
    }
  }

  console.log("DBにintakeなし:", intakeMissing, "人");
  if (intakeMissingList.length > 0) {
    console.log("\n--- intake欠落リスト（先頭20件） ---");
    console.log("PID\t氏名\tstatus\treserveId");
    intakeMissingList.slice(0, 20).forEach(r => {
      console.log([r.pid, r.name, r.status || "(なし)", r.reserveId || "(なし)"].join("\t"));
    });
    if (intakeMissingList.length > 20) console.log("... 他 " + (intakeMissingList.length - 20) + "件");
  }

  // === 2. 予約の欠落確認 ===
  // GASでreserveIdがある患者の予約がDBにあるか
  const gasReserveIds = [...new Set(gasWithReserve.map(r => r.reserveId.trim()))];
  console.log("\n=== 予約(reservations)欠落チェック ===");
  console.log("GASでreserveIdがあるユニーク予約数:", gasReserveIds.length);

  let resMissing = 0;
  const resMissingList = [];

  for (let i = 0; i < gasReserveIds.length; i += 500) {
    const batch = gasReserveIds.slice(i, i + 500);
    const { data: dbRes } = await supabase
      .from("reservations")
      .select("reserve_id")
      .in("reserve_id", batch);

    const dbResSet = new Set((dbRes || []).map(r => r.reserve_id));
    for (const rid of batch) {
      if (!dbResSet.has(rid)) {
        resMissing++;
        const gasRec = gasWithReserve.find(r => r.reserveId.trim() === rid);
        resMissingList.push({
          reserveId: rid,
          pid: gasRec ? gasRec.patient_id.trim() : "",
          name: gasRec ? gasRec.name : "",
          date: gasRec ? gasRec.reserved_date : "",
          status: gasRec ? gasRec.status : "",
        });
      }
    }
  }

  console.log("DBに予約なし:", resMissing, "件");
  if (resMissingList.length > 0) {
    // statusがOKの予約のみ絞り込み（診療済み）
    const okMissing = resMissingList.filter(r => r.status === "OK");
    console.log("  うちstatus=OK（診療済み）:", okMissing.length, "件");
    console.log("\n--- 予約欠落リスト（status=OK、先頭20件） ---");
    console.log("reserveId\tPID\t氏名\t予約日\tstatus");
    okMissing.slice(0, 20).forEach(r => {
      console.log([r.reserveId, r.pid || "(なし)", r.name, r.date, r.status].join("\t"));
    });
    if (okMissing.length > 20) console.log("... 他 " + (okMissing.length - 20) + "件");

    // statusなしや他のステータス
    const otherMissing = resMissingList.filter(r => r.status !== "OK");
    console.log("\nstatus≠OK:", otherMissing.length, "件");
  }

  // === 3. patients欠落確認 ===
  console.log("\n=== patients欠落チェック ===");
  let patientMissing = 0;

  for (let i = 0; i < gasPids.length; i += 500) {
    const batch = gasPids.slice(i, i + 500);
    const { data: dbPatients } = await supabase
      .from("patients")
      .select("patient_id")
      .in("patient_id", batch);

    const dbSet = new Set((dbPatients || []).map(r => r.patient_id));
    for (const pid of batch) {
      if (!dbSet.has(pid)) patientMissing++;
    }
  }

  console.log("GASにPIDあり→DBにpatientsなし:", patientMissing, "人（統合で削除済み含む）");
})();
