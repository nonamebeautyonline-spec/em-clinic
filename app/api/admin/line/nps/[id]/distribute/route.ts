// app/api/admin/line/nps/[id]/distribute/route.ts — NPS調査配信
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { resolveTargets } from "@/app/api/admin/line/broadcast/route";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id: surveyId } = await params;
  const body = await req.json();
  const { filter_rules, message } = body;

  // 調査取得
  const { data: survey } = await withTenant(
    supabaseAdmin.from("nps_surveys").select("*").eq("id", parseInt(surveyId)).single(),
    tenantId
  );

  if (!survey) {
    return NextResponse.json({ error: "調査が見つかりません" }, { status: 404 });
  }

  // 対象者の解決
  const targets = await resolveTargets(filter_rules || {}, tenantId);
  const withLineId = targets.filter(t => t.line_id);

  if (withLineId.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "対象者がいません" });
  }

  // 回答URL（テナントごとのベースURL）
  const baseUrl = process.env.APP_BASE_URL || "https://noname-beauty.l-ope.jp";
  let sent = 0;

  for (const target of withLineId) {
    const surveyUrl = `${baseUrl}/nps/${surveyId}?pid=${target.patient_id}`;
    const text = message || `${survey.question_text}\n\n以下のURLからご回答をお願いいたします。\n${surveyUrl}`;

    try {
      const pushRes = await pushMessage(target.line_id!, [{
        type: "text",
        text,
      }], tenantId ?? undefined);

      if (pushRes?.ok) {
        sent++;
        await supabaseAdmin.from("message_log").insert({
          ...tenantPayload(tenantId),
          patient_id: target.patient_id,
          line_uid: target.line_id,
          direction: "outgoing",
          event_type: "message",
          message_type: "text",
          content: text,
          status: "sent",
        });
      }
    } catch (err) {
      console.error(`[nps/distribute] push error for ${target.patient_id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent, total: withLineId.length });
}
