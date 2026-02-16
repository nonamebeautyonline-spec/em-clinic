// DB-only: 再処方承認（GAS不要）+ LINE通知（管理者グループ＆患者個別）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { formatProductCode } from "@/lib/patient-utils";
import { extractDose, buildKarteNote } from "@/lib/reorder-karte";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);
    const lineToken = await getSettingOrEnv("line", "channel_access_token", "LINE_NOTIFY_CHANNEL_ACCESS_TOKEN", tenantId ?? undefined) || "";
    const lineGroupId = await getSettingOrEnv("line", "admin_group_id", "LINE_ADMIN_GROUP_ID", tenantId ?? undefined) || "";

    const body = await req.json();
    const { id } = body; // id = reorder_number

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // まずpatient_idとstatusを取得
    const { data: reorderData, error: fetchError } = await withTenant(
      supabaseAdmin
        .from("reorders")
        .select("id, patient_id, status, product_code")
        .eq("reorder_number", Number(id))
        .single(),
      tenantId
    );

    if (fetchError || !reorderData) {
      console.error("[admin/reorders/approve] Reorder not found:", id);
      return NextResponse.json({ error: "Reorder not found" }, { status: 404 });
    }

    // 重複チェック: 既に処理済みならスキップ
    if (reorderData.status !== "pending") {
      console.log(`[admin/reorders/approve] Already processed: ${reorderData.status}`);
      return NextResponse.json({
        ok: true,
        message: `既に処理済みです (${reorderData.status})`
      });
    }

    // ステータス更新
    const { error: dbError } = await withTenant(
      supabaseAdmin
        .from("reorders")
        .update({
          status: "confirmed",
          approved_at: new Date().toISOString(),
        })
        .eq("reorder_number", Number(id)),
      tenantId
    );

    if (dbError) {
      console.error("[admin/reorders/approve] DB update error:", dbError);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    console.log(`[admin/reorders/approve] Approved: reorder_num=${id}, patient=${reorderData.patient_id}`);

    // カルテ自動追加（用量比較付き）
    if (reorderData.patient_id && reorderData.product_code) {
      try {
        const currentDose = extractDose(reorderData.product_code);
        let prevDose: number | null = null;

        // 前回の決済済みreorderから用量を取得
        const { data: prevReorders } = await withTenant(
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
        await withTenant(
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

    // LINE通知（管理者グループ）
    pushToGroup(`【再処方】承認しました（管理画面）\n申請ID: ${id}`, lineToken, lineGroupId).catch(() => {});

    // LINE通知（患者へ承認通知）
    let lineNotify: "sent" | "no_uid" | "failed" = "no_uid";

    if (reorderData.patient_id) {
      const { data: patient } = await withTenant(
        supabaseAdmin
          .from("patients")
          .select("line_id")
          .eq("patient_id", reorderData.patient_id)
          .maybeSingle(),
        tenantId
      );

      if (patient?.line_id) {
        try {
          const pushRes = await pushMessage(patient.line_id, [{
            type: "text",
            text: "再処方申請が承認されました🌸\nマイページより決済のお手続きをお願いいたします。\n何かご不明な点がございましたら、お気軽にお知らせください🫧",
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
              content: "再処方申請が承認されました🌸\nマイページより決済のお手続きをお願いいたします。\n何かご不明な点がございましたら、お気軽にお知らせください🫧",
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
    await withTenant(
      supabaseAdmin
        .from("reorders")
        .update({ line_notify_result: lineNotify })
        .eq("reorder_number", Number(id)),
      tenantId
    );

    logAudit(req, "reorder.approve", "reorder", String(id), { patient_id: reorderData.patient_id });
    return NextResponse.json({ ok: true, lineNotify });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
