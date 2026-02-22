// 2026-02-09 バグ影響患者への通知スクリプト
// message_logからrepair通知の送信有無をスクリーニングしてグループ分け
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
readFileSync(".env.local", "utf-8").split("\n").forEach(l => {
  const m = l.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const TOKEN = env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

// ============================================================
// 対象患者（全20名）
// ============================================================

// A候補: 問診未完了＋予約あり
const candidateA = [
  "20260200504", "20260200586", "20260200587", "20260200562", "20260200579",
];

// CD候補: 個人情報欠落
const candidateCD = [
  "LINE_c2d98969", "20260200314", "LINE_b63e2a67", "20260200570",
  "20260200572", "20260200580", "20260200346", "20260200568",
];

// E候補: TELのみ欠落＋予約あり
const candidateE = [
  "20260200640", "20260200453", "20260200631", "20260200639",
  "20260200641", "20260200638", "20260200642",
];

// ============================================================
// メッセージ定義
// ============================================================

const MSG_A = `【問診入力のお願い】

ご予約ありがとうございます。

恐れ入りますが、現時点で問診のご入力が確認できておりません。
診療日までに問診が未入力の場合、診療をお受けいただけない場合がございます。

お手数ですが、下記マイページより問診のご入力をお願いいたします。`;

const MSG_C = `【個人情報の再入力のお願い】

マイページのメンテナンスに伴い、一部の個人情報の再入力が必要となっております。

大変恐れ入りますが、下記より再度ご入力をお願いいたします。

https://app.noname-beauty.jp/repair

※こちらの入力のみで完了です。診察までの追加のお手続きはございません。`;

const MSG_D1 = `【個人情報の再入力のお願い】

先日は不具合のご連絡を差し上げ、ご不便をおかけいたしました。

確認いたしましたところ、一部の個人情報の再入力が必要となっております。
大変恐れ入りますが、下記より再度ご入力をお願いいたします。

https://app.noname-beauty.jp/repair

※こちらの入力のみで完了です。診察までの追加のお手続きはございません。`;

const MSG_D2 = `【個人情報の再入力のお願い】

先日お送りした個人情報の再入力がまだ完了しておりません。

お手数をおかけしますが、診察日までに下記より再入力をお願いいたします。

https://app.noname-beauty.jp/repair

※こちらの入力のみで完了です。`;

const MSG_E = `【電話番号の再登録のお願い】

システムの不具合により、電話番号の登録が正常に完了しておりませんでした。

お手数ですが、メニューの「マイページ」より電話番号の再登録をお願いいたします。

※アクセス後、自動的に電話番号の入力画面が表示されます。`;

// ============================================================
// スクリーニング: message_logからrepairURL送信有無を判定
// ============================================================
async function screenNotifications(pids) {
  const { data: logs } = await sb.from("message_log")
    .select("patient_id, content, direction")
    .in("patient_id", pids)
    .in("direction", ["outgoing", "outbound"]);

  const result = {};
  for (const pid of pids) {
    result[pid] = { anyNotif: false, repairUrl: false };
  }

  for (const l of (logs || [])) {
    const c = l.content || "";
    const pid = l.patient_id;
    if (!result[pid]) continue;

    const isNotif = c.includes("メンテナンス") || c.includes("不具合") || c.includes("repair") || c.includes("再入力");
    const isRepairUrl = c.includes("repair") || c.includes("再入力");

    if (isNotif) result[pid].anyNotif = true;
    if (isRepairUrl) result[pid].repairUrl = true;
  }

  return result;
}

// ============================================================
// LINE UID 取得
// ============================================================
async function getLineUid(pid) {
  const { data: intake } = await sb.from("intake")
    .select("line_id")
    .eq("patient_id", pid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (intake?.line_id) return intake.line_id;

  const { data: ans } = await sb.from("answerers")
    .select("line_id")
    .eq("patient_id", pid)
    .maybeSingle();
  return ans?.line_id || null;
}

// ============================================================
// 送信処理
// ============================================================
async function sendMessage(uid, message) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      to: uid,
      messages: [{ type: "text", text: message }],
    }),
  });
  return res.ok;
}

async function getName(pid) {
  const { data } = await sb.from("intake")
    .select("patient_name")
    .eq("patient_id", pid)
    .limit(1)
    .maybeSingle();
  return data?.patient_name || pid;
}

// ============================================================
// メイン処理
// ============================================================
const isDryRun = process.argv.includes("--dry-run");
const allPids = [...candidateA, ...candidateCD, ...candidateE];

// スクリーニング
const notifStatus = await screenNotifications(allPids);

// CD候補をC/D1/D2に分類
const groupC = [];  // 完全未通知 → repair案内（新規）
const groupD1 = []; // 通知済みだがrepairURL未送信 → repair案内
const groupD2 = []; // repairURL送信済みで未対応 → リマインド

for (const pid of candidateCD) {
  const s = notifStatus[pid];
  if (!s.anyNotif) {
    groupC.push(pid);
  } else if (s.anyNotif && !s.repairUrl) {
    groupD1.push(pid);
  } else {
    groupD2.push(pid);
  }
}

// 結果表示
console.log("=".repeat(70));
console.log(" スクリーニング結果");
console.log("=".repeat(70));

const groups = [
  { name: "A: 診察不可リマインド（問診未完了）", pids: candidateA, msg: MSG_A },
  { name: "C: repair案内（完全未通知）", pids: groupC, msg: MSG_C },
  { name: "D1: repair案内（通知済・repairURL未送信）", pids: groupD1, msg: MSG_D1 },
  { name: "D2: repairリマインド（repairURL送信済・未対応）", pids: groupD2, msg: MSG_D2 },
  { name: "E: TEL再登録案内", pids: candidateE, msg: MSG_E },
];

for (const g of groups) {
  console.log(`\n【${g.name}】${g.pids.length}名`);
  for (const pid of g.pids) {
    const name = await getName(pid);
    const uid = await getLineUid(pid);
    const s = notifStatus[pid] || {};
    console.log(
      `  ${pid.padEnd(16)} ${name.padEnd(10)} | LINE: ${uid ? "○" : "✗"} | 通知済: ${s.anyNotif ? "○" : "✗"} | repairURL済: ${s.repairUrl ? "○" : "✗"}`
    );
  }
  console.log(`  📩 ${g.msg.split("\n")[0]}`);
}

const total = groups.reduce((sum, g) => sum + g.pids.length, 0);
console.log(`\n${"=".repeat(70)}`);
console.log(`送信対象合計: ${total}名`);

if (isDryRun) {
  console.log("\n🔍 DRY RUN モード — 実行するには --dry-run を外してください");
} else {
  console.log("\n📤 送信開始...\n");

  let totalSent = 0, totalFailed = 0, totalSkipped = 0;

  for (const g of groups) {
    if (g.pids.length === 0) continue;
    console.log(`\n--- ${g.name} ---`);

    for (const pid of g.pids) {
      const uid = await getLineUid(pid);
      const name = await getName(pid);

      if (!uid) {
        console.log(`  SKIP ${pid} ${name} — LINE UID なし`);
        totalSkipped++;
        continue;
      }

      const ok = await sendMessage(uid, g.msg);
      if (ok) {
        console.log(`  OK   ${pid} ${name}`);
        totalSent++;

        await sb.from("message_log").insert({
          line_uid: uid,
          patient_id: pid,
          direction: "outgoing",
          message_type: "text",
          content: g.msg,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      } else {
        console.log(`  FAIL ${pid} ${name}`);
        totalFailed++;
      }
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log(`完了: 送信${totalSent} / スキップ${totalSkipped} / 失敗${totalFailed}`);
}
