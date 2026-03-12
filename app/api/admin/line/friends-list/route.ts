import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformRow(row: any) {
  const isBlocked = row.last_event_type === "unfollow";
  const eventDisplay = isBlocked ? "ブロックされました"
    : row.last_event_content?.includes("再追加") ? "友だち再登録"
    : row.last_event_content ? "【友達追加】" : null;
  const tplName = row.last_template_content?.match(/^【.+?】/)?.[0] || row.last_template_content;
  return {
    patient_id: row.patient_id,
    patient_name: row.patient_name || "",
    line_id: row.line_id,
    line_display_name: row.line_display_name || null,
    line_picture_url: row.line_picture_url || null,
    mark: row.mark || "none",
    is_blocked: !!isBlocked,
    tags: [],
    fields: {},
    last_message: row.last_msg_content || tplName || row.last_outgoing_content || eventDisplay || null,
    last_sent_at: row.last_incoming_at || null,
    last_text_at: row.last_msg_at || null,
    last_activity_at: [row.last_msg_at, row.last_incoming_at, row.last_outgoing_at]
      .filter(Boolean)
      .sort()
      .pop() || null,
  };
}

// 友達一覧（サーバーサイド検索・ページネーション対応）
export async function GET(req: NextRequest) {
  const t0 = Date.now();

  const isAuthorized = await verifyAdminAuth(req);
  const tAuth = Date.now();
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const url = req.nextUrl;
  const searchId = url.searchParams.get("id")?.trim() || "";
  const searchName = url.searchParams.get("name")?.trim() || "";
  const pinIdsRaw = url.searchParams.get("pin_ids")?.trim() || "";
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10) || 50));

  // メイン: RPC で検索・ページネーション
  const { data, error } = await supabaseAdmin.rpc("get_friends_list_v2", {
    p_tenant_id: tenantId || null,
    p_search_id: searchId || null,
    p_search_name: searchName || null,
    p_limit: limit + 1,
    p_offset: offset,
  });
  const tRpc = Date.now();

  if (error) {
    console.error("[friends-list] RPC error:", error.message);
    return serverError(error.message);
  }

  const rows = data || [];
  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;
  const patients = sliced.map(transformRow);

  // ピン留め患者を補完（初回ロード時のみ、メイン結果に含まれないピンを別途取得）
  if (pinIdsRaw && !searchId && !searchName && offset === 0) {
    const pinIds = pinIdsRaw.split(",").filter(Boolean);
    const existingIds = new Set(patients.map((p: { patient_id: string }) => p.patient_id));
    const missingPinIds = pinIds.filter(id => !existingIds.has(id));

    if (missingPinIds.length > 0) {
      // get_friends_list（v1）を patient_id IN で直接フィルタ
      const { data: pinRows } = await supabaseAdmin
        .from("friend_summaries")
        .select(`
          patient_id,
          last_msg_content, last_msg_at, last_incoming_at,
          last_template_content, last_event_content, last_event_type,
          last_outgoing_content, last_outgoing_at,
          patients!inner(name, line_id, line_display_name, line_picture_url),
          patient_marks(mark)
        `)
        .in("patient_id", missingPinIds)
        .eq("tenant_id", tenantId || "00000000-0000-0000-0000-000000000001");

      if (pinRows) {
        for (const row of pinRows) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = row.patients as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pm = row.patient_marks as any;
          patients.push(transformRow({
            patient_id: row.patient_id,
            patient_name: p?.name || "",
            line_id: p?.line_id,
            line_display_name: p?.line_display_name,
            line_picture_url: p?.line_picture_url,
            mark: pm?.[0]?.mark || pm?.mark || "none",
            last_msg_content: row.last_msg_content,
            last_msg_at: row.last_msg_at,
            last_incoming_at: row.last_incoming_at,
            last_template_content: row.last_template_content,
            last_event_content: row.last_event_content,
            last_event_type: row.last_event_type,
            last_outgoing_content: row.last_outgoing_content,
            last_outgoing_at: row.last_outgoing_at,
          }));
        }
      }
    }
  }

  const tEnd = Date.now();

  const _timing = {
    auth_ms: tAuth - t0,
    rpc_ms: tRpc - tAuth,
    transform_ms: tEnd - tRpc,
    total_ms: tEnd - t0,
    rows: patients.length,
  };
  console.log("[friends-list]", _timing);

  return NextResponse.json({ patients, hasMore, _timing });
}
