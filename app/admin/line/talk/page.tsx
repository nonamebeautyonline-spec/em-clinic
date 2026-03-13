import { cookies, headers } from "next/headers";
import { Suspense } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { getAdminPayloadFromCookies } from "@/lib/admin-auth";
import { resolveTenantId, DEFAULT_TENANT_ID } from "@/lib/tenant";
import { getFriendsListCache, setFriendsListCache } from "@/lib/redis";
import { transformFriendsRow } from "@/lib/friends-list-transform";
import TalkClient from "./_components/TalkClient";

const PAGE_SIZE = 50;

async function fetchInitialFriends(tenantId: string | null) {
  const effectiveTenantId = tenantId || DEFAULT_TENANT_ID;

  // Redisキャッシュから取得を試みる
  const cached = await getFriendsListCache(effectiveTenantId, 0, PAGE_SIZE);
  if (cached) {
    const base = cached as { patients: ReturnType<typeof transformFriendsRow>[]; hasMore: boolean };
    return { friends: base.patients, hasMore: base.hasMore };
  }

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
  const hasMore = rows.length > PAGE_SIZE;
  const sliced = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const friends = sliced.map(transformFriendsRow);

  // キャッシュに保存
  setFriendsListCache(effectiveTenantId, 0, PAGE_SIZE, { patients: friends, hasMore }).catch(() => {});

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

  try {
    const { friends, hasMore } = await fetchInitialFriends(tenantId);
    return <TalkClient initialFriends={friends} initialHasMore={hasMore} />;
  } catch (err) {
    console.error("[talk/page SSR] fetchInitialFriends error:", err);
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
