// 本日発送対象者に追加テキストメッセージを送信するスクリプト
// npx tsx -r ./scripts/_load-env.js scripts/send-extra-text.ts [--dry-run]
import { supabaseAdmin } from "@/lib/supabase";
import { tenantPayload } from "@/lib/tenant";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const LINE_TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || "";
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 10;

const MESSAGE_TEXT = `ヤマト運輸からの発送が開始されると日時指定が可能となります。
日時指定を希望される場合はボタンより変更をしてください。

お届け後は冷蔵保管をするようにお願いいたします。
冷凍保存を行うと薬液が凍結したり効果が下がってしまいますのでご注意ください。`;

async function pushText(lineUid: string, text: string) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` },
    body: JSON.stringify({ to: lineUid, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[LINE Push] Error ${res.status}: ${body}`);
  }
  return { ok: res.ok };
}

async function main() {
  if (!LINE_TOKEN) { console.error("LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN が未設定"); process.exit(1); }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  console.log(`対象日: ${today}  ${DRY_RUN ? "[DRY RUN]" : ""}`);

  const { data: orders, error } = await supabaseAdmin
    .from("orders").select("patient_id")
    .eq("shipping_date", today).not("tracking_number", "is", null).eq("tenant_id", TENANT_ID);

  if (error) throw new Error(`注文取得エラー: ${error.message}`);
  if (!orders || orders.length === 0) { console.log("対象なし"); return; }

  const uniquePids = [...new Set(orders.map(o => o.patient_id))];

  const { data: pData } = await supabaseAdmin
    .from("patients").select("patient_id, name, line_id").in("patient_id", uniquePids).eq("tenant_id", TENANT_ID);

  const { data: friendData } = await supabaseAdmin
    .from("friend_summaries").select("patient_id, last_event_type").in("patient_id", uniquePids).eq("tenant_id", TENANT_ID);
  const blockedSet = new Set((friendData || []).filter(f => f.last_event_type === "unfollow").map(f => f.patient_id));

  const targets = (pData || [])
    .filter(p => p.line_id && !blockedSet.has(p.patient_id))
    .map(p => ({ patient_id: p.patient_id, patient_name: p.name || "", line_id: p.line_id! }));

  console.log(`送信対象: ${targets.length}人`);

  if (DRY_RUN) {
    console.log("[DRY RUN] 送信スキップ");
    targets.forEach(p => console.log(`  ${p.patient_name} (${p.patient_id})`));
    return;
  }

  let sent = 0, failed = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    console.log(`\nバッチ ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(targets.length / BATCH_SIZE)}`);

    const results = await Promise.allSettled(
      batch.map(async (p) => {
        const result = await pushText(p.line_id, MESSAGE_TEXT);

        await supabaseAdmin.from("message_log").insert({
          ...tenantPayload(TENANT_ID),
          patient_id: p.patient_id, line_uid: p.line_id,
          direction: "outgoing", event_type: "message",
          message_type: "text", content: MESSAGE_TEXT,
          status: result.ok ? "sent" : "failed",
        });

        console.log(`  ${result.ok ? "OK" : "NG"} ${p.patient_name} (${p.patient_id})`);
        return result.ok;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) sent++;
      else failed++;
    }
  }

  console.log(`\n===== 完了 =====`);
  console.log(`送信成功: ${sent}  失敗: ${failed}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
