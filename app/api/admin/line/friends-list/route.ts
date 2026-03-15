import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { getFriendsListCache, setFriendsListCache } from "@/lib/redis";
import { transformFriendsRow as transformRow } from "@/lib/friends-list-transform";

/**
 * ベースデータ取得（Redisキャッシュ or RPC）
 * 検索なし時のみキャッシュを利用
 */
async function fetchBaseData(
  tenantId: string | null,
  effectiveTenantId: string,
  searchId: string,
  searchName: string,
  offset: number,
  limit: number,
  tAuth: number,
): Promise<{ patients: ReturnType<typeof transformRow>[]; hasMore: boolean; tRpc: number; cacheHit: boolean } | NextResponse> {
  const isSearchQuery = !!(searchId || searchName);

  // 検索なし時のみRedisキャッシュを利用
  if (!isSearchQuery) {
    const cached = await getFriendsListCache(effectiveTenantId, offset, limit);
    if (cached) {
      const base = cached as { patients: ReturnType<typeof transformRow>[]; hasMore: boolean };
      return { patients: [...base.patients], hasMore: base.hasMore, tRpc: tAuth, cacheHit: true };
    }
  }

  // RPC で検索・ページネーション
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

  // 検索なし時はキャッシュに保存（ピン補完前のベースデータ）
  if (!isSearchQuery) {
    setFriendsListCache(effectiveTenantId, offset, limit, { patients, hasMore }).catch(() => {});
  }

  return { patients, hasMore, tRpc, cacheHit: false };
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

  const effectiveTenantId = tenantId || "00000000-0000-0000-0000-000000000001";

  const result = await fetchBaseData(tenantId, effectiveTenantId, searchId, searchName, offset, limit, tAuth);
  if (result instanceof NextResponse) return result;

  const { patients, hasMore, tRpc, cacheHit } = result;

  // ピン留め患者を補完（初回ロード時のみ、メイン結果に含まれないピンを別途取得）
  if (pinIdsRaw && !searchId && !searchName && offset === 0) {
    const pinIds = pinIdsRaw.split(",").filter(Boolean);
    const existingIds = new Set(patients.map((p: { patient_id: string }) => p.patient_id));
    const missingPinIds = pinIds.filter(id => !existingIds.has(id));

    if (missingPinIds.length > 0) {
      const tid = effectiveTenantId;
      // FK制約が未定義のため、個別テーブルを別々にクエリして手動結合
      const [fsRes, ptRes, pmRes] = await Promise.all([
        supabaseAdmin
          .from("friend_summaries")
          .select("patient_id, last_msg_content, last_msg_at, last_incoming_at, last_template_content, last_event_content, last_event_type, last_outgoing_content, last_outgoing_at")
          .in("patient_id", missingPinIds)
          .eq("tenant_id", tid),
        supabaseAdmin
          .from("patients")
          .select("patient_id, name, line_id, line_display_name, line_picture_url")
          .in("patient_id", missingPinIds)
          .eq("tenant_id", tid),
        supabaseAdmin
          .from("patient_marks")
          .select("patient_id, mark")
          .in("patient_id", missingPinIds),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fsRows = (fsRes.data || []) as any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ptMap = new Map(((ptRes.data || []) as any[]).map(r => [r.patient_id, r]));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pmMap = new Map(((pmRes.data || []) as any[]).map(r => [r.patient_id, r.mark]));

      const foundIds = new Set<string>();
      // friend_summariesにある患者（メッセージ履歴あり）
      for (const fs of fsRows) {
        const pt = ptMap.get(fs.patient_id);
        if (!pt) continue;
        foundIds.add(fs.patient_id);
        patients.push(transformRow({
          patient_id: fs.patient_id,
          patient_name: pt.name || "",
          line_id: pt.line_id,
          line_display_name: pt.line_display_name,
          line_picture_url: pt.line_picture_url,
          mark: pmMap.get(fs.patient_id) || "none",
          last_msg_content: fs.last_msg_content,
          last_msg_at: fs.last_msg_at,
          last_incoming_at: fs.last_incoming_at,
          last_template_content: fs.last_template_content,
          last_event_content: fs.last_event_content,
          last_event_type: fs.last_event_type,
          last_outgoing_content: fs.last_outgoing_content,
          last_outgoing_at: fs.last_outgoing_at,
        }));
      }

      // friend_summariesにない患者（メッセージ履歴なし）
      for (const id of missingPinIds) {
        if (foundIds.has(id)) continue;
        const pt = ptMap.get(id);
        if (!pt) continue;
        patients.push(transformRow({
          patient_id: id,
          patient_name: pt.name || "",
          line_id: pt.line_id,
          line_display_name: pt.line_display_name,
          line_picture_url: pt.line_picture_url,
          mark: pmMap.get(id) || "none",
          last_msg_content: null,
          last_msg_at: null,
          last_incoming_at: null,
          last_template_content: null,
          last_event_content: null,
          last_event_type: null,
          last_outgoing_content: null,
          last_outgoing_at: null,
        }));
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
    ...(cacheHit ? { cache: "hit" as const } : {}),
  };
  console.log("[friends-list]", _timing);

  return NextResponse.json({ patients, hasMore, _timing });
}
