// 本日発送患者への一斉LINE通知
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";

const SHIPPING_MESSAGE = `本日ヤマト運輸のチルド便で発送させていただきました。
マイページにて追跡番号照会が可能となっており、発送が開始されると日時指定が可能となります。
日時指定を希望される場合は追跡番号を入力してお試しください🌸

お届け後、マンジャロは冷蔵保管をするようにお願いいたします。
冷凍保存を行うと薬液が凍結したり効果が下がってしまいますのでご注意ください。`;

// 本日発送患者を取得（共通）
async function getTodayShippedPatients() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("patient_id, tracking_number")
    .eq("shipping_date", today)
    .not("tracking_number", "is", null);

  if (error) throw new Error(error.message);
  if (!orders || orders.length === 0) return [];

  // patient_id単位でユニーク化
  const uniquePids = [...new Set(orders.map(o => o.patient_id))];

  // intake から patient_name, line_id を取得
  const { data: intakes } = await supabaseAdmin
    .from("intake")
    .select("patient_id, patient_name, line_id")
    .in("patient_id", uniquePids)
    .not("patient_id", "is", null)
    .order("id", { ascending: false });

  const patientMap = new Map<string, { patient_id: string; patient_name: string; line_id: string | null }>();
  for (const row of intakes || []) {
    if (!patientMap.has(row.patient_id)) {
      patientMap.set(row.patient_id, row);
    }
  }

  return uniquePids.map(pid => {
    const p = patientMap.get(pid);
    return {
      patient_id: pid,
      patient_name: p?.patient_name || "",
      line_id: p?.line_id || null,
    };
  });
}

// GET: プレビュー（送信対象者リスト）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const patients = await getTodayShippedPatients();
    const sendable = patients.filter(p => p.line_id);
    const noUid = patients.filter(p => !p.line_id);

    return NextResponse.json({
      patients,
      summary: {
        total: patients.length,
        sendable: sendable.length,
        no_uid: noUid.length,
      },
    });
  } catch (e) {
    console.error("[notify-shipped] preview error:", e);
    return NextResponse.json({ error: "取得エラー" }, { status: 500 });
  }
}

// POST: 一斉送信実行 + 対応マーク「処方すみ」＆リッチメニュー「処方後」自動切替
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const patients = await getTodayShippedPatients();
    let sent = 0;
    let failed = 0;
    let noUid = 0;
    let markUpdated = 0;
    let menuSwitched = 0;

    // 「処方すみ」マーク定義を取得
    const { data: markDef } = await supabaseAdmin
      .from("mark_definitions")
      .select("value")
      .eq("label", "処方ずみ")
      .maybeSingle();
    const rxMarkValue = markDef?.value || null;

    // 「処方後」リッチメニューを取得
    const { data: rxMenu } = await supabaseAdmin
      .from("rich_menus")
      .select("line_rich_menu_id")
      .eq("name", "処方後")
      .not("line_rich_menu_id", "is", null)
      .maybeSingle();
    const rxMenuId = rxMenu?.line_rich_menu_id || null;

    const lineToken = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

    for (const p of patients) {
      if (!p.line_id) {
        noUid++;
        continue;
      }

      // 1) 発送通知送信
      try {
        const res = await pushMessage(p.line_id, [{ type: "text", text: SHIPPING_MESSAGE }]);
        const status = res?.ok ? "sent" : "failed";
        if (res?.ok) sent++;
        else failed++;

        await supabaseAdmin.from("message_log").insert({
          patient_id: p.patient_id,
          line_uid: p.line_id,
          direction: "outgoing",
          event_type: "message",
          message_type: "shipping_notify",
          content: SHIPPING_MESSAGE,
          status,
        });
      } catch {
        failed++;
      }

      // 2) 対応マークを「処方すみ」に（未設定 or 別マークの場合のみ）
      if (rxMarkValue) {
        try {
          const { data: current } = await supabaseAdmin
            .from("patient_marks")
            .select("mark")
            .eq("patient_id", p.patient_id)
            .maybeSingle();

          if (!current || current.mark !== rxMarkValue) {
            await supabaseAdmin
              .from("patient_marks")
              .upsert({
                patient_id: p.patient_id,
                mark: rxMarkValue,
                note: null,
                updated_at: new Date().toISOString(),
                updated_by: "system:notify-shipped",
              }, { onConflict: "patient_id" });
            markUpdated++;
          }
        } catch (e) {
          console.error(`[notify-shipped] mark update failed for ${p.patient_id}:`, e);
        }
      }

      // 3) リッチメニューを「処方後」に（別メニューの場合のみ）
      if (rxMenuId && lineToken) {
        try {
          const checkRes = await fetch(`https://api.line.me/v2/bot/user/${p.line_id}/richmenu`, {
            headers: { Authorization: `Bearer ${lineToken}` },
          });

          let needSwitch = true;
          if (checkRes.ok) {
            const cur = await checkRes.json();
            if (cur.richMenuId === rxMenuId) needSwitch = false;
          }

          if (needSwitch) {
            const linkRes = await fetch(`https://api.line.me/v2/bot/user/${p.line_id}/richmenu/${rxMenuId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${lineToken}` },
            });
            if (linkRes.ok) menuSwitched++;
          }
        } catch (e) {
          console.error(`[notify-shipped] menu switch failed for ${p.patient_id}:`, e);
        }
      }
    }

    return NextResponse.json({
      ok: true, sent, failed, no_uid: noUid,
      mark_updated: markUpdated,
      menu_switched: menuSwitched,
    });
  } catch (e) {
    console.error("[notify-shipped] send error:", e);
    return NextResponse.json({ error: "送信エラー" }, { status: 500 });
  }
}
