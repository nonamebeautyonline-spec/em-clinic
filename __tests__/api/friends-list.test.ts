// __tests__/api/friends-list.test.ts
// 友だち一覧API（friends-list）のテスト — ブランチカバレッジ強化

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// 共通モック
// ============================================================
type SupabaseChain = Record<string, ReturnType<typeof vi.fn>>;
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: SupabaseChain = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "or", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "count", "csv", "rpc",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

const mockVerifyAdminAuth = vi.fn();
const mockGetFriendsListCache = vi.fn();
const mockSetFriendsListCache = vi.fn();
const mockTransformRow = vi.fn((row: Record<string, unknown>) => ({
  patient_id: row.patient_id || "",
  patient_name: row.patient_name || "",
  line_id: row.line_id || null,
  line_display_name: row.line_display_name || null,
  line_picture_url: row.line_picture_url || null,
  mark: row.mark || "none",
  last_msg_content: row.last_msg_content || null,
  last_msg_at: row.last_msg_at || null,
  last_incoming_at: row.last_incoming_at || null,
  is_unread: row.is_unread || false,
  pid: row.pid || null,
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
    rpc: vi.fn(() => createChain({ data: [], error: null })),
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query: unknown) => query),
  strictWithTenant: vi.fn((query: unknown) => query),
}));

vi.mock("@/lib/redis", () => ({
  getFriendsListCache: (...args: unknown[]) => mockGetFriendsListCache(...args),
  setFriendsListCache: (...args: unknown[]) => mockSetFriendsListCache(...args),
}));

vi.mock("@/lib/friends-list-transform", () => ({
  transformFriendsRow: (row: Record<string, unknown>) => mockTransformRow(row),
}));

// NextRequest互換
function createReq(method: string, url: string) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
  }) as Request & { nextUrl: URL };
  req.nextUrl = new URL(url);
  return req;
}

// ============================================================
// テスト対象インポート
// ============================================================
import { GET as friendsListGET } from "@/app/api/admin/line/friends-list/route";

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
  mockGetFriendsListCache.mockResolvedValue(null);
  mockSetFriendsListCache.mockResolvedValue(undefined);
});

describe("friends-list API", () => {
  // -- 認証 --
  it("GET 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list") as any);
    expect(res.status).toBe(401);
  });

  // -- 基本動作 --
  it("GET 正常（空結果） → 200", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({ data: [], error: null }),
    );
    // friend_summaries countクエリ
    const fsChain = createChain({ data: null, error: null, count: 0 });
    tableChains["friend_summaries"] = fsChain;
    // patients (tracking)
    const ptChain = createChain({ data: [], error: null });
    tableChains["patients"] = ptChain;

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.patients).toBeDefined();
    expect(json.hasMore).toBeDefined();
  });

  it("GET RPCデータあり → 200 + transformRow呼び出し", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({
        data: [
          { patient_id: "p1", patient_name: "テスト", line_id: "U001", pid: "PID1", mark: "none" },
        ],
        error: null,
      }),
    );
    const fsChain = createChain({ data: null, error: null, count: 1 });
    tableChains["friend_summaries"] = fsChain;
    const ptChain = createChain({ data: [], error: null });
    tableChains["patients"] = ptChain;

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list") as any);
    expect(res.status).toBe(200);
    expect(mockTransformRow).toHaveBeenCalled();
  });

  // -- キャッシュヒット --
  it("GET キャッシュヒット → RPCスキップ", async () => {
    mockGetFriendsListCache.mockResolvedValue({
      patients: [{ patient_id: "p1", patient_name: "キャッシュ" }],
      hasMore: false,
    });

    const fsChain = createChain({ data: null, error: null, count: 1 });
    tableChains["friend_summaries"] = fsChain;
    const ptChain = createChain({ data: [], error: null });
    tableChains["patients"] = ptChain;
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({ data: [], error: null }),
    );

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json._timing).toBeDefined();
  });

  // -- 検索 --
  it("GET 名前検索 → キャッシュなしでRPC呼び出し", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({ data: [], error: null }),
    );
    const fsChain = createChain({ data: null, error: null, count: 0 });
    tableChains["friend_summaries"] = fsChain;
    const ptChain = createChain({ data: [], error: null });
    tableChains["patients"] = ptChain;

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list?name=田中") as any);
    expect(res.status).toBe(200);
  });

  it("GET search統合検索パラメータ", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({ data: [], error: null }),
    );
    const fsChain = createChain({ data: null, error: null, count: 0 });
    tableChains["friend_summaries"] = fsChain;
    const ptChain = createChain({ data: [], error: null });
    tableChains["patients"] = ptChain;

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list?search=test") as any);
    expect(res.status).toBe(200);
  });

  // -- ページネーション --
  it("GET pageパラメータ → offset計算", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({ data: [], error: null }),
    );
    const fsChain = createChain({ data: null, error: null, count: 0 });
    tableChains["friend_summaries"] = fsChain;
    const ptChain = createChain({ data: [], error: null });
    tableChains["patients"] = ptChain;

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list?page=2&limit=20") as any);
    expect(res.status).toBe(200);
  });

  // -- タグフィルタ --
  it("GET tag=1 で該当なし → 空結果", async () => {
    const tagChain = createChain({ data: [], error: null });
    tableChains["patient_tags"] = tagChain;

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list?tag=1") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.patients).toEqual([]);
    expect(json.total).toBe(0);
  });

  it("GET tag=1 で該当あり → フィルタ後結果", async () => {
    const tagChain = createChain({ data: [{ patient_id: "p1" }], error: null });
    tableChains["patient_tags"] = tagChain;

    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({
        data: [
          { patient_id: "p1", patient_name: "タグ付き" },
          { patient_id: "p2", patient_name: "タグなし" },
        ],
        error: null,
      }),
    );
    const ptChain = createChain({ data: [], error: null });
    tableChains["patients"] = ptChain;

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list?tag=1") as any);
    expect(res.status).toBe(200);
  });

  // -- マークフィルタ --
  it("GET mark=none → マークなし患者", async () => {
    const markChain = createChain({ data: [{ patient_id: "p2" }], error: null });
    tableChains["patient_marks"] = markChain;

    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({
        data: [{ patient_id: "p1" }, { patient_id: "p2" }],
        error: null,
      }),
    );
    const ptChain = createChain({ data: [], error: null });
    tableChains["patients"] = ptChain;

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list?mark=none") as any);
    expect(res.status).toBe(200);
  });

  it("GET mark=important → 該当なし → 空", async () => {
    const markChain = createChain({ data: [], error: null });
    tableChains["patient_marks"] = markChain;

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list?mark=important") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.patients).toEqual([]);
  });

  // -- LINE連携フィルタ --
  it("GET line_status=yes → LINE連携済みのみ", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({
        data: [
          { patient_id: "p1", line_id: "U001" },
          { patient_id: "p2", line_id: null },
        ],
        error: null,
      }),
    );
    const ptChain = createChain({ data: [], error: null });
    tableChains["patients"] = ptChain;

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list?line_status=yes") as any);
    expect(res.status).toBe(200);
  });

  it("GET line_status=no → LINE未連携のみ", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({
        data: [
          { patient_id: "p1", line_id: "U001" },
          { patient_id: "p2", line_id: null },
        ],
        error: null,
      }),
    );
    const ptChain = createChain({ data: [], error: null });
    tableChains["patients"] = ptChain;

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list?line_status=no") as any);
    expect(res.status).toBe(200);
  });

  // -- 未読フィルタ --
  it("GET unread_only=true + 未読なし → 空結果", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({ data: [], error: null }),
    );
    const ptChain = createChain({ data: [], error: null });
    tableChains["patients"] = ptChain;

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list?unread_only=true") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total).toBe(0);
  });

  it("GET unread_only=true + 未読あり → 高速パス", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    // get_unread_patient_ids RPC
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({ data: [{ patient_id: "p1" }], error: null }),
    );

    // friend_summaries, patients, patient_marks の並列クエリ
    const fsChain = createChain({
      data: [{ patient_id: "p1", last_msg_at: "2026-01-01T00:00:00Z", last_msg_content: "msg" }],
      error: null,
    });
    tableChains["friend_summaries"] = fsChain;
    const ptChain = createChain({
      data: [{ patient_id: "p1", name: "未読テスト", line_id: "U001", line_display_name: "テスト", line_picture_url: null, pid: "PID1" }],
      error: null,
    });
    tableChains["patients"] = ptChain;
    const pmChain = createChain({ data: [{ patient_id: "p1", mark: "important" }], error: null });
    tableChains["patient_marks"] = pmChain;

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list?unread_only=true") as any);
    expect(res.status).toBe(200);
  });

  // -- RPCエラー --
  it("GET RPCエラー → 500", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({ data: null, error: { message: "RPC failed" } }),
    );

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list") as any);
    expect(res.status).toBe(500);
  });

  // -- ピン留め --
  it("GET pin_ids → ピン留め患者を補完", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    // メインRPC → p1のみ
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({ data: [{ patient_id: "p1" }], error: null }),
    );
    // count
    const fsChain = createChain({ data: null, error: null, count: 2 });
    tableChains["friend_summaries"] = fsChain;
    // ピン補完用のpatients, patient_marks
    const ptChain = createChain({
      data: [{ patient_id: "p2", name: "ピン", line_id: "U002", pid: null }],
      error: null,
    });
    tableChains["patients"] = ptChain;
    const pmChain = createChain({ data: [], error: null });
    tableChains["patient_marks"] = pmChain;
    // tracking
    const trackingChain = createChain({ data: [], error: null });
    tableChains["tracking_sources"] = trackingChain;

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list?pin_ids=p2") as any);
    expect(res.status).toBe(200);
  });

  // -- 流入経路情報 --
  it("GET tracking_source付き患者 → 流入経路名を付与", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValue(
      createChain({ data: [{ patient_id: "p1" }], error: null }),
    );
    const fsChain = createChain({ data: null, error: null, count: 1 });
    tableChains["friend_summaries"] = fsChain;
    // tracking情報
    const ptChain = createChain({
      data: [{ patient_id: "p1", tracking_source_id: 100 }],
      error: null,
    });
    tableChains["patients"] = ptChain;
    const tsChain = createChain({ data: [{ id: 100, name: "Google広告" }], error: null });
    tableChains["tracking_sources"] = tsChain;

    const res = await friendsListGET(createReq("GET", "http://localhost/api/admin/line/friends-list") as any);
    expect(res.status).toBe(200);
  });
});
