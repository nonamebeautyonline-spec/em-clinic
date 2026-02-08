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

// POST: 一斉送信実行
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const patients = await getTodayShippedPatients();
    let sent = 0;
    let failed = 0;
    let noUid = 0;

    for (const p of patients) {
      if (!p.line_id) {
        noUid++;
        continue;
      }

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
    }

    return NextResponse.json({ ok: true, sent, failed, no_uid: noUid });
  } catch (e) {
    console.error("[notify-shipped] send error:", e);
    return NextResponse.json({ error: "送信エラー" }, { status: 500 });
  }
}
