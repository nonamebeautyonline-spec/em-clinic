require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// [oldPid(削除), newPid(残す), 名前]
const pairs = [
  ["20260101457", "LINE_3474b608", "石澤"],
  ["20260200131", "LINE_61b66c91", "萬條夕希"],
  ["20260101617", "LINE_4046fae4", "後藤淑乃"],
  ["20260101471", "20260101470", "松川未来"],
  // 深沼亜実: A(臨床データあり)に統合、BのLINE UID+telをAに移す
  ["20260200986", "20260200038", "深沼亜実"],
];

const TABLES = ["intake", "orders", "reservations", "reorders", "message_log",
  "patient_tags", "patient_marks", "friend_field_values",
  "coupon_issues", "nps_responses", "form_responses",
  "step_enrollments", "bank_transfer_orders", "chat_reads"];

const UNIQUE_TABLES = ["patient_tags", "patient_marks", "chat_reads"];

// 各フィールドについて、最新の非null値を選ぶ
function mergeFields(oldP, newP) {
  const updates = {};
  const FIELDS = ["name", "name_kana", "sex", "birthday", "tel",
    "line_id", "line_display_name", "line_picture_url"];

  for (const f of FIELDS) {
    const oldVal = oldP[f];
    const newVal = newP[f];

    if (!newVal && oldVal) {
      // 新側がnull → 旧側の値を埋める
      updates[f] = oldVal;
    } else if (newVal && oldVal && newVal !== oldVal) {
      // 両方あり → 新しいレコード（created_at比較）の値を優先
      const oldDate = new Date(oldP.created_at);
      const newDate = new Date(newP.created_at);
      if (oldDate > newDate) {
        updates[f] = oldVal;
      }
      // newの方が新しければそのまま（更新不要）
    }
  }
  return updates;
}

(async () => {
  const dryRun = !process.argv.includes("--exec");
  console.log(dryRun ? "=== DRY RUN ===" : "=== 実行モード ===");

  for (const [oldPid, newPid, name] of pairs) {
    console.log("\n--- " + name + ": " + oldPid + "(削除) → " + newPid + "(残す) ---");

    const { data: oldP } = await supabase.from("patients").select("*").eq("patient_id", oldPid).maybeSingle();
    const { data: newP } = await supabase.from("patients").select("*").eq("patient_id", newPid).maybeSingle();

    if (!oldP || !newP) {
      console.log("  患者レコードなし、スキップ");
      continue;
    }

    // フィールドマージ計算
    const fieldUpdates = mergeFields(oldP, newP);
    if (Object.keys(fieldUpdates).length > 0) {
      console.log("  patients補完: " + JSON.stringify(fieldUpdates));
    } else {
      console.log("  patients補完: なし");
    }

    // データ移行
    for (const table of TABLES) {
      const { count } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("patient_id", oldPid);
      if (count > 0) {
        console.log("  " + table + ": " + count + "件移行");
        if (!dryRun) {
          const { error } = await supabase.from(table).update({ patient_id: newPid }).eq("patient_id", oldPid);
          if (error) {
            if (UNIQUE_TABLES.includes(table) && (error.message.includes("unique") || error.message.includes("duplicate"))) {
              console.log("    ユニーク制約 → 旧PID側を削除");
              await supabase.from(table).delete().eq("patient_id", oldPid);
            } else {
              console.log("    エラー: " + error.message);
            }
          }
        }
      }
    }

    if (!dryRun) {
      // patients フィールド補完
      if (Object.keys(fieldUpdates).length > 0) {
        await supabase.from("patients").update(fieldUpdates).eq("patient_id", newPid);
      }

      // answerers
      const { data: oldA } = await supabase.from("answerers").select("*").eq("patient_id", oldPid).maybeSingle();
      const { data: newA } = await supabase.from("answerers").select("*").eq("patient_id", newPid).maybeSingle();
      if (oldA && !newA) {
        await supabase.from("answerers").update({ patient_id: newPid }).eq("patient_id", oldPid);
        console.log("  answerers: 移行");
      } else if (oldA) {
        await supabase.from("answerers").delete().eq("patient_id", oldPid);
        console.log("  answerers: 旧側削除");
      }

      // 旧患者レコード削除
      await supabase.from("patients").delete().eq("patient_id", oldPid);
      console.log("  旧PID削除完了");
    }
  }

  if (!dryRun) {
    console.log("\n=== 統合後確認 ===");
    for (const [oldPid, newPid, name] of pairs) {
      const { data: p } = await supabase.from("patients").select("patient_id, name, name_kana, tel, line_id").eq("patient_id", newPid).maybeSingle();
      const { data: oldCheck } = await supabase.from("patients").select("patient_id").eq("patient_id", oldPid).maybeSingle();
      console.log(name + ": " + newPid +
        " name=" + (p?.name || "null") +
        " kana=" + (p?.name_kana || "null") +
        " tel=" + (p?.tel || "null") +
        " LINE=" + (p?.line_id ? "あり" : "null") +
        " 旧=" + (oldCheck ? "残存!" : "削除済み"));
    }
  }
})();
