import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";

// 友達一覧（RPC 1回で全データ取得）
export async function GET(req: NextRequest) {
  console.time("[friends-list] total");
  console.time("[friends-list] auth");
  const isAuthorized = await verifyAdminAuth(req);
  console.timeEnd("[friends-list] auth");
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  // RPC 1回で friend_summaries + patients + patient_marks をJOIN取得
  console.time("[friends-list] rpc");
  const { data, error } = await supabaseAdmin.rpc("get_friends_list", {
    p_tenant_id: tenantId || null,
  });
  console.timeEnd("[friends-list] rpc");

  if (error) {
    console.error("[friends-list] RPC error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.time("[friends-list] transform");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patients = (data || []).map((row: any) => {
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
      last_message: row.last_msg_content || tplName || eventDisplay || null,
      last_sent_at: row.last_incoming_at || null,
      last_text_at: row.last_msg_at || null,
    };
  });
  console.timeEnd("[friends-list] transform");

  console.timeEnd("[friends-list] total");
  return NextResponse.json({ patients });
}
