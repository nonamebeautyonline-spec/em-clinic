// 本日発送分のLINE追跡通知を一斉送信するスクリプト
// 使い方: npx tsx -r ./scripts/_load-env.js scripts/notify-shipped-today.ts [--dry-run]
// ※ ローカル実行時はSETTINGS_ENCRYPTION_KEYが不要な直接API呼び出し方式
import { supabaseAdmin } from "@/lib/supabase";
import { tenantPayload } from "@/lib/tenant";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const LINE_TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || "";
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 10;

// 追跡番号フォーマット
function formatTrackingNumber(num: string): string {
  const digits = num.replace(/\D/g, "");
  if (digits.length === 12) return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
  return num;
}

// キャリア別追跡URL
function buildTrackingUrl(carrier: string, trackingNumber: string): string {
  const tn = encodeURIComponent(trackingNumber.replace(/\D/g, ""));
  if (carrier === "japanpost") return `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${tn}`;
  return `https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno=${tn}`;
}

function carrierLabel(carrier: string): string {
  return carrier === "japanpost" ? "日本郵便" : "ヤマト運輸 チルド便";
}

// Flexメッセージ構築（getSettingOrEnv不要版）
function buildShippingFlexLocal(trackingInfo: { number: string; carrier: string }[]) {
  const primary = trackingInfo[0];
  const formatted = formatTrackingNumber(primary.number);
  const label = carrierLabel(primary.carrier);
  const trackingUrl = buildTrackingUrl(primary.carrier, primary.number);
  const truckUrl = `${APP_BASE_URL}/images/truck-delivery.png`;
  const progressUrl = `${APP_BASE_URL}/images/progress-bar.png`;

  const trackingContents: Record<string, unknown>[] = [
    { type: "text", text: "追跡番号", size: "sm", color: "#555555", align: "center" },
    { type: "text", text: formatted, size: "xl", weight: "bold", margin: "sm", color: "#e0458b", align: "center" },
  ];
  for (let i = 1; i < trackingInfo.length; i++) {
    trackingContents.push({
      type: "text", text: formatTrackingNumber(trackingInfo[i].number),
      size: "lg", weight: "bold", margin: "sm", color: "#e0458b", align: "center",
    });
  }

  return {
    type: "flex" as const,
    altText: `【発送完了】追跡番号: ${formatted} ${label}にて発送しました`,
    contents: {
      type: "bubble",
      header: {
        type: "box", layout: "vertical",
        contents: [{ type: "text", text: "発送完了のお知らせ", weight: "bold", size: "lg", color: "#ffffff" }],
        backgroundColor: "#e0458b", paddingAll: "16px",
      },
      body: {
        type: "box", layout: "vertical", paddingAll: "16px",
        contents: [
          {
            type: "box", layout: "vertical", backgroundColor: "#fdf2f8", cornerRadius: "8px",
            paddingTop: "12px", paddingBottom: "12px", paddingStart: "0px", paddingEnd: "0px",
            contents: [
              {
                type: "box", layout: "horizontal", alignItems: "flex-end", paddingStart: "12px", paddingEnd: "12px",
                contents: [
                  { type: "text", text: "発送", size: "xs", color: "#555555", flex: 1, align: "start", gravity: "bottom" },
                  { type: "image", url: truckUrl, size: "full", aspectRatio: "3:2", aspectMode: "fit", flex: 1 },
                  { type: "text", text: "お届け予定", size: "xs", color: "#555555", flex: 1, align: "end", gravity: "bottom", wrap: true },
                ],
              },
              { type: "image", url: progressUrl, size: "full", aspectRatio: "20:2", aspectMode: "cover", margin: "xs" },
              { type: "text", text: `（${label}）`, size: "xs", color: "#555555", margin: "sm", align: "center" },
            ],
          },
          { type: "box", layout: "vertical", contents: trackingContents, margin: "lg" },
          { type: "separator", margin: "md" },
          { type: "text", text: "発送後1〜3日でお届け予定です。", size: "sm", color: "#555555", wrap: true, margin: "md" },
          { type: "text", text: "届かない場合はお気軽にご連絡ください。", size: "sm", color: "#555555", wrap: true, margin: "sm" },
          { type: "separator", margin: "md" },
          { type: "text", text: "届いたらすぐに冷蔵庫で保管してください。", size: "sm", color: "#555555", wrap: true, margin: "md" },
        ],
      },
      footer: {
        type: "box", layout: "vertical", paddingAll: "16px",
        contents: [
          { type: "button", style: "primary", color: "#e0458b", action: { type: "uri", label: "配送状況を確認", uri: trackingUrl } },
          { type: "text", text: "マイページからも確認が可能です", size: "xs", color: "#555555", align: "center", margin: "sm" },
        ],
      },
    },
  };
}

// 直接LINE Push API（getSettingOrEnv不要）
async function pushDirect(lineUid: string, messages: Record<string, unknown>[]) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` },
    body: JSON.stringify({ to: lineUid, messages }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[LINE Push] Error ${res.status}: ${body}`);
  }
  return { ok: res.ok };
}

async function main() {
  if (!LINE_TOKEN) { console.error("LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN が未設定"); process.exit(1); }
  if (!APP_BASE_URL) { console.error("APP_BASE_URL が未設定"); process.exit(1); }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  console.log(`対象日: ${today}  ${DRY_RUN ? "[DRY RUN]" : ""}`);

  const { data: orders, error } = await supabaseAdmin
    .from("orders").select("patient_id, tracking_number, carrier")
    .eq("shipping_date", today).not("tracking_number", "is", null).eq("tenant_id", TENANT_ID);

  if (error) throw new Error(`注文取得エラー: ${error.message}`);
  if (!orders || orders.length === 0) { console.log("本日の発送対象はありません"); return; }
  console.log(`注文件数: ${orders.length}`);

  const uniquePids = [...new Set(orders.map(o => o.patient_id))];
  console.log(`患者数: ${uniquePids.length}`);

  const { data: pData } = await supabaseAdmin
    .from("patients").select("patient_id, name, line_id").in("patient_id", uniquePids).eq("tenant_id", TENANT_ID);

  const { data: friendData } = await supabaseAdmin
    .from("friend_summaries").select("patient_id, last_event_type").in("patient_id", uniquePids).eq("tenant_id", TENANT_ID);

  const blockedSet = new Set((friendData || []).filter(f => f.last_event_type === "unfollow").map(f => f.patient_id));

  const patientMap = new Map<string, { name: string; line_id: string | null; is_blocked: boolean }>();
  for (const row of pData || []) {
    patientMap.set(row.patient_id, { name: row.name || "", line_id: row.line_id || null, is_blocked: blockedSet.has(row.patient_id) });
  }

  const targets = uniquePids.map(pid => {
    const p = patientMap.get(pid);
    const tracking = orders.filter(o => o.patient_id === pid)
      .map(o => ({ number: o.tracking_number as string, carrier: (o.carrier || "yamato") as string }));
    return { patient_id: pid, patient_name: p?.name || "", line_id: p?.line_id || null, is_blocked: p?.is_blocked || false, tracking };
  });

  let sent = 0, failed = 0, noUid = 0, blocked = 0;
  let markUpdated = 0, menuSwitched = 0;

  const { data: markDef } = await supabaseAdmin
    .from("mark_definitions").select("value").eq("label", "処方ずみ").eq("tenant_id", TENANT_ID).maybeSingle();
  const rxMarkValue = markDef?.value || null;

  const { data: rxMenu } = await supabaseAdmin
    .from("rich_menus").select("line_rich_menu_id").eq("name", "処方後")
    .not("line_rich_menu_id", "is", null).eq("tenant_id", TENANT_ID).maybeSingle();
  const rxMenuId = rxMenu?.line_rich_menu_id || null;

  const sendable = targets.filter(p => {
    if (!p.line_id) { noUid++; return false; }
    if (p.is_blocked) { blocked++; return false; }
    return true;
  });

  console.log(`送信対象: ${sendable.length}  LINE未連携: ${noUid}  ブロック: ${blocked}`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] 送信はスキップします");
    for (const p of sendable) console.log(`  ${p.patient_name} (${p.patient_id}) → 追跡: ${p.tracking.map(t => t.number).join(", ")}`);
    return;
  }

  for (let i = 0; i < sendable.length; i += BATCH_SIZE) {
    const batch = sendable.slice(i, i + BATCH_SIZE);
    console.log(`\nバッチ ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(sendable.length / BATCH_SIZE)} (${batch.length}件)`);

    const results = await Promise.allSettled(
      batch.map(async (p) => {
        let sendOk = false;
        try {
          const flex = buildShippingFlexLocal(p.tracking);
          const result = await pushDirect(p.line_id!, [flex]);
          sendOk = result.ok;

          // message_log記録
          await supabaseAdmin.from("message_log").insert({
            ...tenantPayload(TENANT_ID),
            patient_id: p.patient_id, line_uid: p.line_id,
            direction: "outgoing", event_type: "message",
            message_type: "shipping_notify",
            content: `[${flex.altText}]`, flex_json: flex.contents,
            status: sendOk ? "sent" : "failed",
          });
        } catch (e) {
          console.error(`  送信失敗: ${p.patient_name} - ${e}`);
        }

        // 対応マーク
        if (rxMarkValue) {
          try {
            const { data: current } = await supabaseAdmin
              .from("patient_marks").select("mark").eq("patient_id", p.patient_id).eq("tenant_id", TENANT_ID).maybeSingle();
            if (!current || current.mark !== rxMarkValue) {
              await supabaseAdmin.from("patient_marks").upsert({
                tenant_id: TENANT_ID, patient_id: p.patient_id, mark: rxMarkValue,
                note: null, updated_at: new Date().toISOString(), updated_by: "system:notify-shipped",
              }, { onConflict: "patient_id" });
              markUpdated++;
            }
          } catch (e) { console.error(`  マーク更新失敗: ${p.patient_name} - ${e}`); }
        }

        // リッチメニュー切替
        if (rxMenuId) {
          try {
            const checkRes = await fetch(`https://api.line.me/v2/bot/user/${p.line_id}/richmenu`, {
              headers: { Authorization: `Bearer ${LINE_TOKEN}` },
            });
            let needSwitch = true;
            if (checkRes.ok) {
              const cur = await checkRes.json();
              if (cur.richMenuId === rxMenuId) needSwitch = false;
            }
            if (needSwitch) {
              const linkRes = await fetch(`https://api.line.me/v2/bot/user/${p.line_id}/richmenu/${rxMenuId}`, {
                method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` },
              });
              if (linkRes.ok) menuSwitched++;
            }
          } catch (e) { console.error(`  リッチメニュー切替失敗: ${p.patient_name} - ${e}`); }
        }

        const status = sendOk ? "OK" : "NG";
        console.log(`  ${status} ${p.patient_name} (${p.patient_id})`);
        return sendOk;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) sent++;
      else failed++;
    }
  }

  console.log(`\n===== 完了 =====`);
  console.log(`送信成功: ${sent}  失敗: ${failed}  LINE未連携: ${noUid}  ブロック: ${blocked}`);
  console.log(`マーク更新: ${markUpdated}  リッチメニュー切替: ${menuSwitched}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
