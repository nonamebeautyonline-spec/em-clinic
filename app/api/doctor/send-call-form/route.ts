// app/api/doctor/send-call-form/route.ts
// LINE通話フォーム（Flex Message）を患者に送信するAPI
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { sendCallFormSchema } from "@/lib/validations/doctor";
import { pushMessage } from "@/lib/line-push";
import { buildCallFormFlex } from "@/lib/call-form-flex";
import { getSettingOrEnv } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  try {
    const parsed = await parseBody(req, sendCallFormSchema);
    if ("error" in parsed) return parsed.error;
    const { patientId, reserveId } = parsed.data;

    // LINEコールURL取得
    const lineCallUrl = await getSettingOrEnv(
      "consultation" as any,
      "line_call_url",
      "NEXT_PUBLIC_LINE_CALL_URL",
      tenantId ?? undefined
    );
    if (!lineCallUrl) {
      return NextResponse.json(
        { ok: false, error: "LINEコールURLが設定されていません。設定画面で登録してください。" },
        { status: 400 }
      );
    }

    // 患者のLINE UID取得
    const { data: patient } = await withTenant(
      supabaseAdmin.from("patients").select("line_id, name").eq("patient_id", patientId),
      tenantId
    ).maybeSingle();

    if (!patient?.line_id) {
      return NextResponse.json(
        { ok: false, error: "LINE UIDが見つかりません" },
        { status: 400 }
      );
    }

    // Flex Message構築
    const flex = await buildCallFormFlex(lineCallUrl, tenantId ?? undefined);

    // LINE Push送信
    const pushRes = await pushMessage(patient.line_id, [flex], tenantId ?? undefined);
    const status = pushRes?.ok ? "sent" : "failed";

    if (status === "failed") {
      return NextResponse.json({ ok: false, error: "LINE送信に失敗しました" }, { status: 500 });
    }

    // message_log に記録（fire-and-forget）
    supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tenantId),
      patient_id: patientId,
      line_uid: patient.line_id,
      direction: "outgoing",
      event_type: "message",
      message_type: "call_form",
      content: "[通話フォーム]",
      flex_json: flex.contents,
      status,
    }).then(() => {}).catch(() => {});

    // call_status 更新（reserveIdがある場合）
    if (reserveId) {
      const updatedAt = new Date().toISOString();
      await withTenant(
        supabaseAdmin
          .from("intake")
          .update({ call_status: "call_form_sent", call_status_updated_at: updatedAt })
          .eq("reserve_id", reserveId),
        tenantId
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[doctor/send-call-form] error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
