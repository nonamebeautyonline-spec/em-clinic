import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { getFriendsListCache, setFriendsListCache } from "@/lib/redis";
import { transformFriendsRow as transformRow } from "@/lib/friends-list-transform";

/**
 * ベースデータ取得（Redisキャッシュ or RPC）
 * 検索・フィルタなし時のみキャッシュを利用
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

/**
 * 総件数を取得（フィルタ条件を適用）
 * RPC と同じ WHERE 条件 + 追加フィルタ（tag, mark, line_status）
 */
async function fetchTotalCount(
  effectiveTenantId: string,
  searchName: string,
  searchId: string,
): Promise<number> {
  // 名前検索時は patients テーブルから該当IDを先に取得
  // （friend_summaries に FK 未定義で !inner JOIN が使えないため2段階クエリ）
  let nameFilterIds: string[] | null = null;
  if (searchName) {
    const { data: pRows } = await supabaseAdmin
      .from("patients")
      .select("patient_id")
      .ilike("name", `%${searchName}%`);
    nameFilterIds = (pRows || []).map(r => r.patient_id);
    if (nameFilterIds.length === 0) return 0;
  }

  // friend_summaries で count クエリ
  let query = supabaseAdmin
    .from("friend_summaries")
    .select("patient_id", { count: "exact", head: true })
    .eq("tenant_id", effectiveTenantId);

  if (searchId) {
    query = query.ilike("patient_id", `%${searchId}%`);
  }
  if (nameFilterIds) {
    query = query.in("patient_id", nameFilterIds);
  }

  const { count, error } = await query;
  if (error) {
    console.error("[friends-list] count error:", error.message);
    return 0;
  }

  return count ?? 0;
}

// 友達一覧（サーバーサイド検索・フィルタ・ページネーション対応）
export async function GET(req: NextRequest) {
  const t0 = Date.now();

  const isAuthorized = await verifyAdminAuth(req);
  const tAuth = Date.now();
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const url = req.nextUrl;

  // クエリパラメータ取得
  // search: 名前/ID統合検索（既存の name/id パラメータも後方互換で対応）
  const search = url.searchParams.get("search")?.trim() || "";
  const searchId = search || url.searchParams.get("id")?.trim() || "";
  const searchName = search || url.searchParams.get("name")?.trim() || "";
  const pinIdsRaw = url.searchParams.get("pin_ids")?.trim() || "";

  // ページネーション: page パラメータ（1始まり）優先、なければ offset
  const pageParam = parseInt(url.searchParams.get("page") || "0", 10);
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10) || 50));
  const offset = pageParam > 0
    ? (pageParam - 1) * limit
    : Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);

  // フィルタパラメータ
  const tagFilter = parseInt(url.searchParams.get("tag") || "0", 10) || null;
  const markFilter = url.searchParams.get("mark")?.trim() || "";
  const lineStatus = url.searchParams.get("line_status")?.trim() || "";
  const unreadOnly = url.searchParams.get("unread_only") === "true";

  const effectiveTenantId = tenantId || "00000000-0000-0000-0000-000000000001";
  const hasFilter = !!(tagFilter || markFilter || lineStatus || unreadOnly);

  // タグフィルタ指定時: 該当 patient_id を先に取得
  let tagPatientIds: Set<string> | null = null;
  if (tagFilter) {
    const { data: tagRows } = await supabaseAdmin
      .from("patient_tags")
      .select("patient_id")
      .eq("tag_id", tagFilter);
    tagPatientIds = new Set((tagRows || []).map(r => r.patient_id));
    if (tagPatientIds.size === 0) {
      // タグに該当する患者がいない場合は空を返す
      const tEnd = Date.now();
      return NextResponse.json({
        patients: [], hasMore: false, total: 0,
        _timing: { auth_ms: tAuth - t0, total_ms: tEnd - t0, rows: 0 },
      });
    }
  }

  // マークフィルタ指定時: 該当 patient_id を先に取得
  let markPatientIds: Set<string> | null = null;
  if (markFilter) {
    if (markFilter === "none") {
      // "none" = patient_marks にレコードがない or mark が "none"（テナントフィルタ付き）
      const { data: nonNoneRows } = await supabaseAdmin
        .from("patient_marks")
        .select("patient_id")
        .neq("mark", "none")
        .eq("tenant_id", effectiveTenantId);
      // "none" マークの患者は除外リストで管理（後段でフィルタ）
      markPatientIds = new Set(); // 空セット = 除外リスト方式
      for (const r of (nonNoneRows || [])) markPatientIds.add(r.patient_id);
    } else {
      const { data: markRows } = await supabaseAdmin
        .from("patient_marks")
        .select("patient_id")
        .eq("mark", markFilter)
        .eq("tenant_id", effectiveTenantId);
      markPatientIds = new Set((markRows || []).map(r => r.patient_id));
      if (markPatientIds.size === 0) {
        const tEnd = Date.now();
        return NextResponse.json({
          patients: [], hasMore: false, total: 0,
          _timing: { auth_ms: tAuth - t0, total_ms: tEnd - t0, rows: 0 },
        });
      }
    }
  }

  // 未読フィルタ専用高速パス（全件ループ不要）
  if (unreadOnly && !tagFilter && !markFilter && !lineStatus) {
    const tUnreadStart = Date.now();
    // 1. 未読patient_idをDBから直接取得（friend_summaries と chat_reads を比較）
    const [fsRes, crRes] = await Promise.all([
      supabaseAdmin
        .from("friend_summaries")
        .select("patient_id, last_msg_at, last_msg_content, last_incoming_at, last_template_content, last_event_content, last_event_type, last_event_at, last_outgoing_content, last_outgoing_at")
        .eq("tenant_id", effectiveTenantId)
        .not("last_msg_at", "is", null),
      supabaseAdmin
        .from("chat_reads")
        .select("patient_id, read_at")
        .eq("tenant_id", effectiveTenantId)
        .limit(100000),
    ]);
    const reads: Record<string, string> = {};
    for (const row of crRes.data || []) reads[row.patient_id] = row.read_at;

    // 未読のみ抽出
    const unreadRows = (fsRes.data || []).filter(row => {
      const readAt = reads[row.patient_id];
      return !readAt || row.last_msg_at! > readAt;
    });

    if (unreadRows.length === 0) {
      const tEnd = Date.now();
      return NextResponse.json({
        patients: [], hasMore: false, total: 0,
        _timing: { auth_ms: tAuth - t0, total_ms: tEnd - t0, rows: 0 },
      });
    }

    // 2. 未読患者の詳細情報を取得
    const unreadIds = unreadRows.map(r => r.patient_id);
    const [ptRes, pmRes] = await Promise.all([
      supabaseAdmin
        .from("patients")
        .select("patient_id, name, line_id, line_display_name, line_picture_url")
        .in("patient_id", unreadIds)
        .eq("tenant_id", effectiveTenantId),
      supabaseAdmin
        .from("patient_marks")
        .select("patient_id, mark")
        .in("patient_id", unreadIds)
        .eq("tenant_id", effectiveTenantId),
    ]);
    const ptMap = new Map((ptRes.data || []).map(r => [r.patient_id, r]));
    const pmMap = new Map((pmRes.data || []).map(r => [r.patient_id, r.mark]));

    // 3. transformRow で統一フォーマットに変換（last_msg_at降順ソート）
    const sorted = [...unreadRows].sort((a, b) => (a.last_msg_at! > b.last_msg_at! ? -1 : 1));
    const patients = sorted.map(fs => {
      const pt = ptMap.get(fs.patient_id);
      return transformRow({
        patient_id: fs.patient_id,
        patient_name: pt?.name || "",
        line_id: pt?.line_id || null,
        line_display_name: pt?.line_display_name || null,
        line_picture_url: pt?.line_picture_url || null,
        mark: pmMap.get(fs.patient_id) || "none",
        last_msg_content: fs.last_msg_content,
        last_msg_at: fs.last_msg_at,
        last_incoming_at: fs.last_incoming_at,
        last_template_content: fs.last_template_content,
        last_event_content: fs.last_event_content,
        last_event_type: fs.last_event_type,
        last_event_at: fs.last_event_at,
        last_outgoing_content: fs.last_outgoing_content,
        last_outgoing_at: fs.last_outgoing_at,
      });
    });

    // 名前/ID検索も適用
    const filtered = patients.filter(p => {
      if (searchId && !p.patient_id.includes(searchId)) return false;
      if (searchName && !p.patient_name.includes(searchName)) return false;
      return true;
    });

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);
    const hasMoreUnread = offset + limit < total;
    const tRpc = Date.now();

    console.log("[friends-list] unread fast path:", { unread: total, ms: tRpc - tUnreadStart });
    return await buildResponse(req, paged, hasMoreUnread, total, effectiveTenantId, tenantId, pinIdsRaw, searchId, searchName, offset, t0, tAuth, tRpc, false, true);
  }

  // 未読フィルタ用: chat_reads を事前取得（他フィルタとの組み合わせ時）
  let unreadReadMap: Record<string, string> | null = null;
  if (unreadOnly) {
    const { data: crData } = await supabaseAdmin
      .from("chat_reads")
      .select("patient_id, read_at")
      .eq("tenant_id", effectiveTenantId);
    unreadReadMap = {};
    for (const row of crData || []) {
      unreadReadMap[row.patient_id] = row.read_at;
    }
  }

  // RPC でベースデータ取得
  // フィルタ時は多めに取得して後フィルタ（RPC は tag/mark/line_status 非対応のため）
  const fetchLimit = hasFilter ? limit * 4 : limit;
  const result = await fetchBaseData(tenantId, effectiveTenantId, searchId, searchName, hasFilter ? 0 : offset, fetchLimit, tAuth);
  if (result instanceof NextResponse) return result;

  let { patients, tRpc, cacheHit } = result;

  // フィルタ適用（tag, mark, line_status, unread_only の組み合わせ）
  if (hasFilter) {
    // 全件取得のため、RPC を再帰的に呼び出して全データを収集
    let allPatients = [...patients];
    let currentOffset = fetchLimit;
    let moreData = result.hasMore;

    while (moreData) {
      const moreResult = await fetchBaseData(tenantId, effectiveTenantId, searchId, searchName, currentOffset, fetchLimit, tRpc);
      if (moreResult instanceof NextResponse) break;
      allPatients = [...allPatients, ...moreResult.patients];
      moreData = moreResult.hasMore;
      currentOffset += fetchLimit;
      if (allPatients.length > 10000) break;
    }

    const filtered = allPatients.filter(p => {
      if (tagPatientIds && !tagPatientIds.has(p.patient_id)) return false;
      if (markFilter && markPatientIds) {
        if (markFilter === "none") {
          if (markPatientIds.has(p.patient_id)) return false;
        } else {
          if (!markPatientIds.has(p.patient_id)) return false;
        }
      }
      if (lineStatus === "yes" && !p.line_id) return false;
      if (lineStatus === "no" && p.line_id) return false;
      if (unreadOnly && unreadReadMap) {
        if (!p.last_text_at) return false;
        const readAt = unreadReadMap[p.patient_id];
        if (readAt && p.last_text_at <= readAt) return false;
      }
      return true;
    });

    const total = filtered.length;
    const pagedFiltered = filtered.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    patients = pagedFiltered;

    return await buildResponse(req, patients, hasMore, total, effectiveTenantId, tenantId, pinIdsRaw, searchId, searchName, offset, t0, tAuth, tRpc, cacheHit, hasFilter);
  }

  // フィルタなし時: total は別途カウントクエリで取得
  const total = await fetchTotalCount(effectiveTenantId, searchName, searchId);
  const { hasMore } = result;

  return await buildResponse(req, patients, hasMore, total, effectiveTenantId, tenantId, pinIdsRaw, searchId, searchName, offset, t0, tAuth, tRpc, cacheHit, hasFilter);
}

/**
 * レスポンスを構築（ピン留め補完・流入経路情報付加・JSON返却）
 */
async function buildResponse(
  _req: NextRequest,
  patients: ReturnType<typeof transformRow>[],
  hasMore: boolean,
  total: number,
  effectiveTenantId: string,
  tenantId: string | null,
  pinIdsRaw: string,
  searchId: string,
  searchName: string,
  offset: number,
  t0: number,
  tAuth: number,
  tRpc: number,
  cacheHit: boolean,
  hasFilter: boolean,
) {
  // ピン留め患者を補完（初回ロード時のみ、メイン結果に含まれないピンを別途取得）
  // 未読フィルタ時はピン補完しない（未読の友だちのみ表示）
  if (pinIdsRaw && !searchId && !searchName && offset === 0 && !hasFilter) {
    const pinIds = pinIdsRaw.split(",").filter(Boolean);
    const existingIds = new Set(patients.map((p: { patient_id: string }) => p.patient_id));
    const missingPinIds = pinIds.filter(id => !existingIds.has(id));

    if (missingPinIds.length > 0) {
      const tid = effectiveTenantId;
      // FK制約が未定義のため、個別テーブルを別々にクエリして手動結合
      const [fsRes, ptRes, pmRes] = await Promise.all([
        supabaseAdmin
          .from("friend_summaries")
          .select("patient_id, last_msg_content, last_msg_at, last_incoming_at, last_template_content, last_event_content, last_event_type, last_event_at, last_outgoing_content, last_outgoing_at")
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
          .in("patient_id", missingPinIds)
          .eq("tenant_id", tid),
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
          last_event_at: fs.last_event_at,
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
          last_event_at: null,
          last_outgoing_content: null,
          last_outgoing_at: null,
        }));
      }
    }
  }

  // 流入経路情報を付加
  const patientIds = patients.map((p: { patient_id: string }) => p.patient_id);
  let trackingMap: Record<string, string> = {};
  if (patientIds.length > 0) {
    const { data: trackingData } = await supabaseAdmin
      .from("patients")
      .select("patient_id, tracking_source_id")
      .in("patient_id", patientIds)
      .not("tracking_source_id", "is", null);
    if (trackingData && trackingData.length > 0) {
      const sourceIds = [...new Set(trackingData.map(t => t.tracking_source_id as number))];
      const { data: sources } = await supabaseAdmin
        .from("tracking_sources")
        .select("id, name")
        .in("id", sourceIds);
      const sourceNameMap = new Map((sources || []).map(s => [s.id, s.name]));
      for (const t of trackingData) {
        trackingMap[t.patient_id] = sourceNameMap.get(t.tracking_source_id as number) || "";
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patientsWithTracking = patients.map((p: any) => ({
    ...p,
    tracking_source_name: trackingMap[p.patient_id] || null,
  }));

  const tEnd = Date.now();

  const _timing = {
    auth_ms: tAuth - t0,
    rpc_ms: tRpc - tAuth,
    transform_ms: tEnd - tRpc,
    total_ms: tEnd - t0,
    rows: patientsWithTracking.length,
    ...(cacheHit ? { cache: "hit" as const } : {}),
  };
  console.log("[friends-list]", _timing);

  return NextResponse.json({ patients: patientsWithTracking, hasMore, total, _timing });
}
