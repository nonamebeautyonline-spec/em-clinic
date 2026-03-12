// app/api/admin/line/nps/[id]/distribute/route.ts — NPS調査配信
import { NextRequest, NextResponse } from "next/server";
import { notFound, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { resolveTargets } from "@/app/api/admin/line/broadcast/route";
import { parseBody } from "@/lib/validations/helpers";
import { distributeNpsSchema } from "@/lib/validations/line-management";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { id: surveyId } = await params;
  const parsed = await parseBody(req, distributeNpsSchema);
  if ("error" in parsed) return parsed.error;
  const { filter_rules, message } = parsed.data;

  // 調査取得
  const { data: survey } = await withTenant(
    supabaseAdmin.from("nps_surveys").select("*").eq("id", parseInt(surveyId)).single(),
    tenantId
  );

  if (!survey) {
    return notFound("調査が見つかりません");
  }

  // 対象者の解決
  const targets = await resolveTargets(filter_rules || {}, tenantId);
  const withLineId = targets.filter(t => t.line_id);

  if (withLineId.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "対象者がいません" });
  }

  // 回答URL（テナントごとのベースURL）
  const baseUrl = process.env.APP_BASE_URL || "";
  let sent = 0;

  // 10件バッチで並列送信
  const BATCH_SIZE = 10;
  for (let i = 0; i < withLineId.length; i += BATCH_SIZE) {
    const batch = withLineId.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (target) => {
        const surveyUrl = `${baseUrl}/nps/${surveyId}?pid=${target.patient_id}`;
        const text = message || `${survey.question_text}\n\n以下のURLからご回答をお願いいたします。\n${surveyUrl}`;

        const pushRes = await pushMessage(target.line_id!, [{
          type: "text",
          text,
        }], tenantId ?? undefined);

        if (pushRes?.ok) {
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
          return { pushSent: true };
        }
        return { pushSent: false };
      })
    );

    // バッチ結果を集計
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled" && result.value.pushSent) {
        sent++;
      } else if (result.status === "rejected") {
        console.error(`[nps/distribute] push error for ${batch[j].patient_id}:`, result.reason);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, total: withLineId.length });
}
