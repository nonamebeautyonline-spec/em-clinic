// DB-only: 再処方承認（GAS不要）+ LINE通知（管理者グループ＆患者個別）
import { NextRequest, NextResponse } from "next/server";
import { notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { formatProductCode } from "@/lib/patient-utils";
import { extractDose, buildKarteNote } from "@/lib/reorder-karte";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { getBusinessRules } from "@/lib/business-rules";
import { logAudit } from "@/lib/audit";
import { evaluateMenuRules } from "@/lib/menu-auto-rules";
import { parseBody } from "@/lib/validations/helpers";
import { adminReorderApproveSchema } from "@/lib/validations/admin-operations";

async function pushToGroup(text: string, token: string, groupId: string) {
  if (!token || !groupId) return;
  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{ type: "text", text }],
      }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[admin/approve] LINE push error:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(req);
    const lineToken = await getSettingOrEnv("line", "channel_access_token", "LINE_NOTIFY_CHANNEL_ACCESS_TOKEN", tenantId ?? undefined) || "";
    const lineGroupId = await getSettingOrEnv("line", "admin_group_id", "LINE_ADMIN_GROUP_ID", tenantId ?? undefined) || "";

    const parsed = await parseBody(req, adminReorderApproveSchema);
    if ("error" in parsed) return parsed.error;
    const { id } = parsed.data; // id = reorder_number

    // まずpatient_idとstatusを取得
    const { data: reorderData, error: fetchError } = await strictWithTenant(
      supabaseAdmin
        .from("reorders")
        .select("id, patient_id, status, product_code")
        .eq("reorder_number", Number(id))
        .single(),
      tenantId
    );

    if (fetchError || !reorderData) {
      console.error("[admin/reorders/approve] Reorder not found:", id);
      return notFound("Reorder not found");
    }

    // 重複チェック: 既に処理済みならスキップ
    if (reorderData.status !== "pending") {
      console.log(`[admin/reorders/approve] Already processed: ${reorderData.status}`);
      return NextResponse.json({
        ok: true,
        message: `既に処理済みです (${reorderData.status})`
      });
    }

    // ステータス更新（レースコンディション防止: status=pending条件付き）
    const { data: updatedRows, error: dbError } = await strictWithTenant(
      supabaseAdmin
        .from("reorders")
        .update({
          status: "confirmed",
          approved_at: new Date().toISOString(),
        })
        .eq("reorder_number", Number(id))
        .eq("status", "pending")
        .select("id"),
      tenantId
    );

    if (dbError) {
      console.error("[admin/reorders/approve] DB update error:", dbError);
      return serverError("DB error");
    }

    // 更新件数0 = 別リクエストで既に処理済み
    if (!updatedRows || updatedRows.length === 0) {
      console.log(`[admin/reorders/approve] Race condition detected: reorder ${id} already processed`);
      return NextResponse.json({
        ok: true,
        message: "既に処理済みです",
      });
    }

    console.log(`[admin/reorders/approve] Approved: reorder_num=${id}, patient=${reorderData.patient_id}`);

    // カルテ自動追加（用量比較付き）
    if (reorderData.patient_id && reorderData.product_code) {
      try {
        const currentDose = extractDose(reorderData.product_code);
        let prevDose: number | null = null;

        // 前回の決済済みreorderから用量を取得
        const { data: prevReorders } = await strictWithTenant(
          supabaseAdmin
            .from("reorders")
            .select("product_code")
            .eq("patient_id", reorderData.patient_id)
            .eq("status", "paid")
            .order("paid_at", { ascending: false })
            .limit(1),
          tenantId
        );

        if (prevReorders && prevReorders.length > 0) {
          prevDose = extractDose(prevReorders[0].product_code || "");
        }

        const note = buildKarteNote(reorderData.product_code, prevDose, currentDose);

        // reorders.karte_note に保存（来院履歴は patientbundle で reorders から直接表示）
        await strictWithTenant(
          supabaseAdmin
            .from("reorders")
            .update({ karte_note: note })
            .eq("id", reorderData.id)
            .is("karte_note", null),
          tenantId
        );

        console.log(`[admin/reorders/approve] karte saved: patient=${reorderData.patient_id}, dose=${currentDose}mg, prev=${prevDose}mg`);
      } catch (karteErr) {
        console.error("[admin/reorders/approve] karte error:", karteErr);
      }
    }

    // キャッシュ削除
    if (reorderData.patient_id) {
      await invalidateDashboardCache(reorderData.patient_id);
    }

    // ビジネスルール取得
    const rules = await getBusinessRules(tenantId ?? undefined);

    // LINE通知（管理者グループ）
    if (rules.notifyReorderApprove) {
      pushToGroup(`【再処方】承認しました（管理画面）\n申請ID: ${id}`, lineToken, lineGroupId).catch(() => {});
    }

    // LINE通知（患者へ承認通知）
    let lineNotify: "sent" | "no_uid" | "failed" | "skipped" = "no_uid";

    if (!rules.notifyReorderApprove) {
      lineNotify = "skipped";
    } else if (reorderData.patient_id) {
      const { data: patient } = await strictWithTenant(
        supabaseAdmin
          .from("patients")
          .select("line_id")
          .eq("patient_id", reorderData.patient_id)
          .maybeSingle(),
        tenantId
      );

      if (patient?.line_id) {
        try {
          const { DEFAULT_APPROVE_MESSAGE } = await import("@/lib/business-rules");
          const approveText = rules.approveMessage || DEFAULT_APPROVE_MESSAGE;
          const pushRes = await pushMessage(patient.line_id, [{
            type: "text",
            text: approveText,
          }], tenantId ?? undefined);
          lineNotify = pushRes?.ok ? "sent" : "failed";
          if (pushRes?.ok) {
            await supabaseAdmin.from("message_log").insert({
              ...tenantPayload(tenantId),
              patient_id: reorderData.patient_id,
              line_uid: patient.line_id,
              direction: "outgoing",
              event_type: "message",
              message_type: "text",
              content: approveText,
              status: "sent",
            });
          } else {
            console.error(`[admin/approve] LINE push failed: ${pushRes?.status}`);
          }
        } catch (err) {
          lineNotify = "failed";
          console.error("[admin/approve] Patient LINE push error:", err);
        }
      } else {
        console.log(`[admin/approve] No LINE UID for patient ${reorderData.patient_id}, skipping push`);
      }
    }

    // LINE通知結果をDBに保存
    await strictWithTenant(
      supabaseAdmin
        .from("reorders")
        .update({ line_notify_result: lineNotify })
        .eq("reorder_number", Number(id)),
      tenantId
    );

    logAudit(req, "reorder.approve", "reorder", String(id), { patient_id: reorderData.patient_id });

    // リッチメニュー自動切替（fire-and-forget）
    evaluateMenuRules(reorderData.patient_id, tenantId ?? undefined).catch(() => {});

    return NextResponse.json({ ok: true, lineNotify });
  } catch (error) {
    console.error("API error:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
