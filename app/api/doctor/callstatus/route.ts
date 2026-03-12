// app/api/doctor/callstatus/route.ts
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { callStatusSchema } from "@/lib/validations/doctor";
import { getBusinessRules, DEFAULT_NO_ANSWER_MESSAGE } from "@/lib/business-rules";
import { pushMessage } from "@/lib/line-push";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  try {
    const parsed = await parseBody(req, callStatusSchema);
    if ("error" in parsed) return parsed.error;
    const reserveId = parsed.data.reserveId.trim();
    const callStatus = (parsed.data.callStatus || "").trim();

    const updatedAt = new Date().toISOString();

    const { error: supabaseError } = await withTenant(
      supabaseAdmin
        .from("intake")
        .update({
          call_status: callStatus,
          call_status_updated_at: updatedAt,
        })
        .eq("reserve_id", reserveId),
      tenantId
    );

    if (supabaseError) {
      console.error("[doctor/callstatus] Supabase update failed:", supabaseError);
      return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
    }

    console.log(`[doctor/callstatus] DB updated: reserve_id=${reserveId}, call_status=${callStatus}`);

    // 不通時のLINE自動通知
    let notifySent = false;
    if (callStatus === "no_answer") {
      try {
        const rules = await getBusinessRules(tenantId ?? undefined);
        if (rules.notifyNoAnswer) {
          // intakeからpatient_idを取得
          const { data: intakeRow } = await withTenant(
            supabaseAdmin
              .from("intake")
              .select("patient_id")
              .eq("reserve_id", reserveId),
            tenantId
          ).then(r => ({ data: (r.data as { patient_id: string }[] | null)?.[0] ?? null }));

          if (intakeRow?.patient_id) {
            // patientsからline_idを取得
            const { data: patient } = await withTenant(
              supabaseAdmin
                .from("patients")
                .select("line_id")
                .eq("patient_id", intakeRow.patient_id),
              tenantId
            ).then(r => ({ data: (r.data as { line_id: string }[] | null)?.[0] ?? null }));

            if (patient?.line_id) {
              const message = rules.noAnswerMessage || DEFAULT_NO_ANSWER_MESSAGE;
              const res = await pushMessage(patient.line_id, [{ type: "text", text: message }], tenantId ?? undefined);
              const status = res?.ok ? "sent" : "failed";

              await supabaseAdmin.from("message_log").insert({
                ...tenantPayload(tenantId ?? null),
                patient_id: intakeRow.patient_id,
                line_uid: patient.line_id,
                direction: "outgoing",
                event_type: "message",
                message_type: "no_answer_notify",
                content: message,
                status,
              });

              notifySent = status === "sent";
              console.log(`[doctor/callstatus] no_answer_notify: patient=${intakeRow.patient_id}, status=${status}`);

              // 送信成功時は call_status を no_answer_sent に更新 + 対応マーク「不通」設定
              if (notifySent) {
                await withTenant(
                  supabaseAdmin
                    .from("intake")
                    .update({ call_status: "no_answer_sent" })
                    .eq("reserve_id", reserveId),
                  tenantId
                );

                // 対応マークを「不通」に変更
                try {
                  const { data: futsuMark } = await withTenant(
                    supabaseAdmin
                      .from("mark_definitions")
                      .select("value")
                      .eq("label", "不通")
                      .limit(1)
                      .maybeSingle(),
                    tenantId
                  );
                  if (futsuMark?.value) {
                    await withTenant(
                      supabaseAdmin
                        .from("patient_marks")
                        .upsert(
                          { patient_id: intakeRow.patient_id, mark: futsuMark.value, ...tenantPayload(tenantId ?? null) },
                          { onConflict: "patient_id" }
                        ),
                      tenantId
                    );
                    console.log(`[doctor/callstatus] mark set to 不通: patient=${intakeRow.patient_id}`);
                  }
                } catch (markErr) {
                  console.warn("[doctor/callstatus] mark update failed:", markErr);
                }
              }
            }
          }
        }
      } catch (notifyErr) {
        console.error("[doctor/callstatus] no_answer_notify error:", notifyErr);
      }
    }

    return NextResponse.json({ ok: true, updated_at: updatedAt, notifySent });
  } catch (e) {
    console.error("[doctor/callstatus] error:", e);
    return serverError(String(e));
  }
}
