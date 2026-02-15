import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const LINE_ACCESS_TOKEN =
  process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN ||
  process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || "";

// 患者のLINEブロック状態を確認し、未記録ならmessage_logに記録
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = resolveTenantId(req);
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patient_id");
    if (!patientId) return NextResponse.json({ error: "patient_id required" }, { status: 400 });

    // patient_id から line_id を patients テーブルから取得
    const { data: patientRow } = await withTenant(
      supabaseAdmin
        .from("patients")
        .select("line_id")
        .eq("patient_id", patientId),
      tenantId
    ).maybeSingle();

    const lineId = patientRow?.line_id || null;

    if (!lineId || !LINE_ACCESS_TOKEN) {
      return NextResponse.json({ blocked: false, no_line_id: !lineId });
    }

    // LINE Profile APIでブロック確認
    const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${lineId}`, {
      headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
      cache: "no-store",
    });

    const blocked = !profileRes.ok;

    if (blocked) {
      // 最新のイベントが既にブロックなら重複挿入しない
      const { data: lastEvent } = await withTenant(
        supabaseAdmin
          .from("message_log")
          .select("id, event_type")
          .eq("patient_id", patientId)
          .eq("message_type", "event")
          .order("sent_at", { ascending: false })
          .limit(1),
        tenantId
      ).maybeSingle();

      if (!lastEvent || lastEvent.event_type !== "unfollow") {
        await supabaseAdmin.from("message_log").insert({
          ...tenantPayload(tenantId),
          patient_id: patientId,
          line_uid: lineId,
          direction: "incoming",
          event_type: "unfollow",
          message_type: "event",
          content: "ブロック（友だち解除）",
          status: "received",
        });
      }
    }

    return NextResponse.json({ blocked });
  } catch (e: any) {
    console.error("[Check Block] error:", e?.message || e);
    return NextResponse.json({ blocked: false, error: e?.message });
  }
}
