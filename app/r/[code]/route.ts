// app/r/[code]/route.ts — クリック計測リダイレクト
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { verifyPatientSession } from "@/lib/patient-session";
import { executeActions, ActionSettings } from "@/lib/action-executor";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  // テナントID解決（APIルートなのでreqを渡す）
  const tenantId = resolveTenantId(req);

  // トラッキングリンク取得（action_settingsも含む）
  const { data: link } = await withTenant(
    supabaseAdmin
      .from("click_tracking_links")
      .select("id, original_url, action_settings")
      .eq("tracking_code", code),
    tenantId,
  ).maybeSingle();

  if (!link) {
    return NextResponse.json({ error: "リンクが見つかりません" }, { status: 404 });
  }

  // 患者セッションの取得（Cookie/JWTから）
  // LINEアプリ内ブラウザではCookieが制限される場合があるためnull許容
  let lineUid: string | undefined;
  let patientId: string | undefined;
  try {
    const session = await verifyPatientSession(req);
    if (session) {
      lineUid = session.lineUserId;
      patientId = session.patientId;
    }
  } catch {
    // セッション取得失敗は無視（記録のみ続行）
  }

  // クリックイベント記録
  const ua = req.headers.get("user-agent") || "";
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";

  await supabaseAdmin.from("click_tracking_events").insert({
    ...tenantPayload(tenantId),
    link_id: link.id,
    user_agent: ua.slice(0, 500),
    ip_address: ip,
    line_uid: lineUid || null,
    patient_id: patientId || null,
  });

  // アクション自動実行（患者特定できた場合のみ）
  const actionSettings = link.action_settings as ActionSettings | null;
  if (actionSettings?.enabled && patientId) {
    // 非同期で実行（リダイレクトをブロックしない）
    executeActions(actionSettings, patientId, lineUid, tenantId ?? undefined).catch(
      (e) => console.error("[click-track] action error:", e),
    );
  }

  // リダイレクト
  return NextResponse.redirect(link.original_url, { status: 302 });
}
