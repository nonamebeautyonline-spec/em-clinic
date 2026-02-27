// リッチメニューURIアクションのタップ追跡 + リダイレクト
// mapActionToLine() で自動ラップされるため、個別ページへのログ追加は不要
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, tenantPayload } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const label = req.nextUrl.searchParams.get("label") || "リンク";
  const to = req.nextUrl.searchParams.get("to") || "/";

  // Cookie から患者情報を取得（未ログインなら記録スキップ）
  try {
    const cookieStore = await cookies();
    const patientId = cookieStore.get("__Host-patient_id")?.value
      || cookieStore.get("patient_id")?.value;
    const lineUserId = cookieStore.get("__Host-line_user_id")?.value
      || cookieStore.get("line_user_id")?.value;

    if (patientId && lineUserId) {
      const tenantId = resolveTenantId(req);
      const content = `「${label}」をタップしました`;

      // 5分以内の重複スキップ（fire-and-forget）
      supabaseAdmin
        .from("message_log")
        .select("id")
        .eq("patient_id", patientId)
        .eq("event_type", "system")
        .eq("content", content)
        .gte("sent_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) return;
          supabaseAdmin.from("message_log").insert({
            patient_id: patientId,
            line_uid: lineUserId,
            direction: "incoming",
            event_type: "system",
            message_type: "event",
            content,
            status: "received",
            sent_at: new Date().toISOString(),
            ...tenantPayload(tenantId),
          }).then(({ error }) => {
            if (error) console.error("[track] log failed:", error.message);
          });
        });
    }
  } catch {
    // ログ失敗でもリダイレクトは実行
  }

  // リダイレクト（http/https と相対パスのみ許可）
  let redirectUrl: string;
  if (to.startsWith("https://") || to.startsWith("http://")) {
    redirectUrl = to;
  } else if (to.startsWith("/")) {
    redirectUrl = `${req.nextUrl.origin}${to}`;
  } else {
    redirectUrl = req.nextUrl.origin;
  }

  return NextResponse.redirect(redirectUrl, { status: 302 });
}
