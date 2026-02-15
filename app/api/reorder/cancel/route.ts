// app/api/reorder/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";

const LINE_NOTIFY_CHANNEL_ACCESS_TOKEN = process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || "";
const LINE_ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID || "";

// LINE通知送信
async function pushToAdminGroup(text: string) {
  if (!LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || !LINE_ADMIN_GROUP_ID) {
    console.log("[reorder/cancel] LINE notification skipped (missing config)");
    return;
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_NOTIFY_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: LINE_ADMIN_GROUP_ID,
        messages: [{ type: "text", text }],
      }),
      cache: "no-store",
    });

    const body = await res.text();
    console.log("[reorder/cancel] LINE push status=", res.status, "body=", body);
  } catch (err) {
    console.error("[reorder/cancel] LINE push error:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const patientId =
      cookieStore.get("__Host-patient_id")?.value ||
      cookieStore.get("patient_id")?.value ||
      "";

    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized: no patient_id cookie" },
        { status: 401 }
      );
    }

    const tenantId = resolveTenantId(req);

    // ★ リクエストボディから reorder_id を取得
    const body = await req.json().catch(() => ({} as any));
    const reorderId = body.reorder_id as number | undefined;

    if (!reorderId) {
      return NextResponse.json(
        { ok: false, error: "reorder_id_required", message: "キャンセル対象のIDが指定されていません" },
        { status: 400 }
      );
    }

    // ★ 指定されたIDでレコードを取得（patient_idも確認してセキュリティ担保）
    let targetReorder: { id: number; reorder_number: number; status: string; product_code: string } | null = null;

    try {
      const { data, error } = await withTenant(
        supabaseAdmin
          .from("reorders")
          .select("id, reorder_number, status, product_code")
          .eq("id", reorderId)
          .eq("patient_id", patientId)
          .in("status", ["pending", "confirmed"]),
        tenantId
      ).maybeSingle();

      if (error) {
        console.error("[reorder/cancel] DB select error:", error);
        return NextResponse.json(
          { ok: false, error: "db_error" },
          { status: 500 }
        );
      } else if (data) {
        targetReorder = data;
        console.log(`[reorder/cancel] Found reorder to cancel: id=${data.id}, status=${data.status}`);
      } else {
        console.log(`[reorder/cancel] Reorder not found or not cancellable: id=${reorderId}, patient=${patientId}`);
        return NextResponse.json(
          { ok: false, error: "not_found", message: "キャンセル対象の申請が見つかりません（既にキャンセル済みか、別の患者の申請です）" },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error("[reorder/cancel] DB exception:", err);
      return NextResponse.json(
        { ok: false, error: "db_error" },
        { status: 500 }
      );
    }

    // ★ DB先行でキャンセル
    if (targetReorder) {
      try {
        const { error: dbError } = await withTenant(
          supabaseAdmin
            .from("reorders")
            .update({ status: "canceled" })
            .eq("id", targetReorder.id),
          tenantId
        );

        if (dbError) {
          console.error("[reorder/cancel] DB update error:", dbError);
          return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
        }
        console.log(`[reorder/cancel] DB update success, id=${targetReorder.id}`);
      } catch (dbErr) {
        console.error("[reorder/cancel] DB update exception:", dbErr);
        return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
      }
    }

    if (targetReorder) {

      // ★ LINE通知（管理者に即通知して誤操作防止）
      const statusLabel = targetReorder.status === "pending" ? "申請中" : "承認済み";
      const notifyText = `【再処方キャンセル】患者が自らキャンセルしました

患者ID: ${patientId}
申請ID: ${targetReorder.reorder_number || targetReorder.id}
状態: ${statusLabel} → キャンセル
商品: ${targetReorder.product_code}

※ このLINE botでの操作は不要です`;

      // 非同期で送信（レスポンスは待たない）
      pushToAdminGroup(notifyText).catch(() => {});
    }

    // ★ キャッシュ削除
    await invalidateDashboardCache(patientId);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("POST /api/reorder/cancel error", e);
    return NextResponse.json({ ok: false, error: "unexpected error" }, { status: 500 });
  }
}
