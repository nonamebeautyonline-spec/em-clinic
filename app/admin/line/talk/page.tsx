import { cookies, headers } from "next/headers";
import { Suspense } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { getAdminPayloadFromCookies } from "@/lib/admin-auth";
import { resolveTenantId, DEFAULT_TENANT_ID } from "@/lib/tenant";
import { getFriendsListCache, setFriendsListCache } from "@/lib/redis";
import { transformFriendsRow } from "@/lib/friends-list-transform";
import { getSetting } from "@/lib/settings";
import TalkClient from "./_components/TalkClient";

const PAGE_SIZE = 50;
const MAX_PINS = 15;

// ピン留め患者ID取得（admin_users.pinned_patients を統合）
async function fetchPins(tenantId: string): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .select("pinned_patients")
      .eq("tenant_id", tenantId);

    if (error || !data) return [];

    const merged: string[] = [];
    const seen = new Set<string>();
    for (const row of data) {
      for (const pid of (row.pinned_patients as string[]) || []) {
        if (!seen.has(pid)) {
          seen.add(pid);
          merged.push(pid);
        }
      }
    }
    return merged.slice(0, MAX_PINS);
  } catch {
    return [];
  }
}

// 既読タイムスタンプ取得
async function fetchChatReads(tenantId: string): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabaseAdmin
      .from("chat_reads")
      .select("patient_id, read_at")
      .eq("tenant_id", tenantId);

    if (error || !data) return {};

    const reads: Record<string, string> = {};
    for (const row of data) {
      reads[row.patient_id] = row.read_at;
    }
    return reads;
  } catch {
    return {};
  }
}

// 右カラム表示設定取得
async function fetchColumnSettings(tenantId: string): Promise<Record<string, boolean>> {
  try {
    const raw = await getSetting("line", "right_column_sections", tenantId);
    if (raw) {
      return JSON.parse(raw);
    }
    return {};
  } catch {
    return {};
  }
}

// 友達リスト取得（ピン補完込み）
async function fetchInitialFriends(tenantId: string | null, pinIds: string[]) {
  const effectiveTenantId = tenantId || DEFAULT_TENANT_ID;

  // Redisキャッシュから取得を試みる（ベースリストのみ）
  let friends: ReturnType<typeof transformFriendsRow>[] = [];
  let hasMore = false;
  const cached = await getFriendsListCache(effectiveTenantId, 0, PAGE_SIZE);
  if (cached) {
    const base = cached as { patients: ReturnType<typeof transformFriendsRow>[]; hasMore: boolean };
    friends = base.patients;
    hasMore = base.hasMore;
  } else {
    // RPCで取得
    const { data, error } = await supabaseAdmin.rpc("get_friends_list_v2", {
      p_tenant_id: tenantId || null,
      p_search_id: null,
      p_search_name: null,
      p_limit: PAGE_SIZE + 1,
      p_offset: 0,
    });

    if (error) {
      console.error("[talk/page SSR] RPC error:", error.message);
      return { friends: [], hasMore: false };
    }

    const rows = data || [];
    hasMore = rows.length > PAGE_SIZE;
    const sliced = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    friends = sliced.map(transformFriendsRow);

    // キャッシュに保存（ピン補完前のベースデータ）
    setFriendsListCache(effectiveTenantId, 0, PAGE_SIZE, { patients: friends, hasMore }).catch(() => {});
  }

  // ピン留め患者を補完（リストに含まれないピンを別途取得してリスト先頭に挿入）
  if (pinIds.length > 0) {
    const existingIds = new Set(friends.map(f => f.patient_id));
    const missingPinIds = pinIds.filter(id => !existingIds.has(id));

    if (missingPinIds.length > 0) {
      try {
        const [fsRes, ptRes, pmRes] = await Promise.all([
          supabaseAdmin
            .from("friend_summaries")
            .select("patient_id, last_msg_content, last_msg_at, last_incoming_at, last_template_content, last_event_content, last_event_type, last_outgoing_content, last_outgoing_at")
            .in("patient_id", missingPinIds)
            .eq("tenant_id", effectiveTenantId),
          supabaseAdmin
            .from("patients")
            .select("patient_id, name, line_id, line_display_name, line_picture_url, pid")
            .in("patient_id", missingPinIds)
            .eq("tenant_id", effectiveTenantId),
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

        const pinFriends: ReturnType<typeof transformFriendsRow>[] = [];
        const foundIds = new Set<string>();

        // friend_summariesにある患者（メッセージ履歴あり）
        for (const fs of fsRows) {
          const pt = ptMap.get(fs.patient_id);
          if (!pt) continue;
          foundIds.add(fs.patient_id);
          pinFriends.push(transformFriendsRow({
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
          pinFriends.push(transformFriendsRow({
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

        // ピン患者をリスト先頭に挿入
        friends = [...pinFriends, ...friends];
      } catch (err) {
        console.error("[talk/page SSR] pin supplement error:", err);
      }
    }
  }

  return { friends, hasMore };
}

// Suspense fallback: スケルトンUI
function TalkSkeleton() {
  return (
    <div className="h-full flex">
      <div className="w-80 border-r bg-white flex flex-col">
        <div className="p-3 border-b">
          <div className="h-9 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex-1 overflow-hidden p-2 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-24" />
                <div className="h-3 bg-gray-50 rounded animate-pulse w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center text-gray-400">
        読み込み中...
      </div>
    </div>
  );
}

// Server Component: 初期データを取得してClientに渡す
async function TalkPageContent() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;
  const payload = await getAdminPayloadFromCookies(sessionCookie);

  // 認証失敗時はクライアント側のレイアウト認証にフォールバック
  // （admin layout.tsxが未認証時にリダイレクトする）
  if (!payload) {
    return <TalkClient />;
  }

  const headerStore = await headers();
  const tenantId = resolveTenantId({ headers: headerStore as unknown as Headers });
  const effectiveTenantId = tenantId || DEFAULT_TENANT_ID;

  try {
    // ピン・カラム設定・友達リストを並列取得
    // 未読状態はfriends-listレスポンスのis_unreadで完結（chat_reads一括取得不要）
    const [pins, columnSettings] = await Promise.all([
      fetchPins(effectiveTenantId),
      fetchColumnSettings(effectiveTenantId),
    ]);

    // ピンIDを渡して友達リスト取得（ピン補完込み）
    const { friends, hasMore } = await fetchInitialFriends(tenantId, pins);

    return (
      <TalkClient
        initialFriends={friends}
        initialHasMore={hasMore}
        initialPinnedIds={pins}
        initialVisibleSections={columnSettings}
      />
    );
  } catch (err) {
    console.error("[talk/page SSR] error:", err);
    return <TalkClient />;
  }
}

export default function TalkPage() {
  return (
    <Suspense fallback={<TalkSkeleton />}>
      <TalkPageContent />
    </Suspense>
  );
}
