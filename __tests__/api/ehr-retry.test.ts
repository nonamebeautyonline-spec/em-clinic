// __tests__/api/ehr-retry.test.ts
// EHRリトライAPI + 同期ログAPIのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Supabase チェーンモック ---
type SupabaseChain = Record<string, ReturnType<typeof vi.fn>>;
function createChain(defaultResolve: Record<string, unknown> = { data: [], error: null }) {
  const chain: SupabaseChain = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
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

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

// 管理者認証モック
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(async () => true),
}));

// テナントモック
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "tenant-test-1"),
  resolveTenantIdOrThrow: vi.fn(() => "tenant-test-1"),
}));

// EHR sync モック
const mockPushPatient = vi.fn();
const mockPullPatient = vi.fn();
const mockPushKarte = vi.fn();
const mockPullKarte = vi.fn();
const mockCreateAdapter = vi.fn();

vi.mock("@/lib/ehr/sync", () => ({
  createAdapter: (...args: unknown[]) => mockCreateAdapter(...args),
  pushPatient: (...args: unknown[]) => mockPushPatient(...args),
  pullPatient: (...args: unknown[]) => mockPullPatient(...args),
  pushKarte: (...args: unknown[]) => mockPushKarte(...args),
  pullKarte: (...args: unknown[]) => mockPullKarte(...args),
}));

// 設定モック
vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn(async () => null),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";

// テスト用有効UUID（Zod v4 UUID厳密検証対応）
const UUID_1 = "a0000000-0000-4000-a000-000000000001";
const UUID_2 = "a0000000-0000-4000-a000-000000000002";
const UUID_3 = "a0000000-0000-4000-a000-000000000003";
const UUID_4 = "a0000000-0000-4000-a000-000000000004";
const UUID_5 = "a0000000-0000-4000-a000-000000000005";
const UUID_10 = "a0000000-0000-4000-a000-000000000010";
const UUID_11 = "a0000000-0000-4000-a000-000000000011";

function makeReq(
  method: string,
  url: string,
  body?: Record<string, unknown>,
): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockCreateAdapter.mockResolvedValue({
    provider: "orca",
    pushPatient: vi.fn(),
    pullPatient: vi.fn(),
    pushKarte: vi.fn(),
    pullKarte: vi.fn(),
  });
});

// ============================================================
// POST /api/admin/ehr/retry — 単件リトライ
// ============================================================
describe("POST /api/admin/ehr/retry — 単件リトライ", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/admin/ehr/retry/route");
    POST = mod.POST;
  });

  it("認証エラー → 401", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValueOnce(false);

    const req = makeReq("POST", "/api/admin/ehr/retry", {
      sync_id: "a0000000-0000-4000-a000-000000000001",
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("不正なsync_id → 400", async () => {
    const req = makeReq("POST", "/api/admin/ehr/retry", {
      sync_id: "invalid-uuid",
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("エラーログが存在しない → 404", async () => {
    // ehr_sync_logs: エラーログが見つからない
    const logChain = createChain({ data: [], error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const req = makeReq("POST", "/api/admin/ehr/retry", {
      sync_id: "a0000000-0000-4000-a000-000000000001",
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it("正常: 患者pushリトライが成功", async () => {
    // ehr_sync_logs: エラーログ取得 → update
    const logChain = createChain({
      data: [
        {
          id: "a0000000-0000-4000-a000-000000000001",
          provider: "orca",
          direction: "push",
          resource_type: "patient",
          patient_id: "P-1",
          external_id: null,
          status: "error",
          detail: "接続失敗",
        },
      ],
      error: null,
    });
    tableChains["ehr_sync_logs"] = logChain;

    // pushPatient 成功
    mockPushPatient.mockResolvedValueOnce({
      provider: "orca",
      direction: "push",
      resourceType: "patient",
      patientId: "P-1",
      status: "success",
      detail: "外部カルテに送信完了",
    });

    const req = makeReq("POST", "/api/admin/ehr/retry", {
      sync_id: "a0000000-0000-4000-a000-000000000001",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.summary.success).toBe(1);
    expect(data.summary.error).toBe(0);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].status).toBe("success");
  });

  it("正常: 患者pullリトライが成功", async () => {
    const logChain = createChain({
      data: [
        {
          id: "a0000000-0000-4000-a000-000000000002",
          provider: "orca",
          direction: "pull",
          resource_type: "patient",
          patient_id: null,
          external_id: "EXT-1",
          status: "error",
          detail: "タイムアウト",
        },
      ],
      error: null,
    });
    tableChains["ehr_sync_logs"] = logChain;

    mockPullPatient.mockResolvedValueOnce({
      provider: "orca",
      direction: "pull",
      resourceType: "patient",
      externalId: "EXT-1",
      status: "success",
      detail: "既存患者データを更新しました",
    });

    const req = makeReq("POST", "/api/admin/ehr/retry", {
      sync_id: "a0000000-0000-4000-a000-000000000002",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary.success).toBe(1);
  });

  it("正常: カルテpushリトライが成功", async () => {
    const logChain = createChain({
      data: [
        {
          id: "a0000000-0000-4000-a000-000000000003",
          provider: "orca",
          direction: "push",
          resource_type: "karte",
          patient_id: "P-2",
          external_id: "EXT-2",
          status: "error",
          detail: "送信失敗",
        },
      ],
      error: null,
    });
    tableChains["ehr_sync_logs"] = logChain;

    mockPushKarte.mockResolvedValueOnce({
      provider: "orca",
      direction: "push",
      resourceType: "karte",
      patientId: "P-2",
      status: "success",
      detail: "カルテ1件を送信しました",
    });

    const req = makeReq("POST", "/api/admin/ehr/retry", {
      sync_id: "a0000000-0000-4000-a000-000000000003",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary.success).toBe(1);
  });

  it("正常: カルテpullリトライが成功", async () => {
    const logChain = createChain({
      data: [
        {
          id: "a0000000-0000-4000-a000-000000000004",
          provider: "orca",
          direction: "pull",
          resource_type: "karte",
          patient_id: "P-3",
          external_id: "EXT-3",
          status: "error",
          detail: "取得失敗",
        },
      ],
      error: null,
    });
    tableChains["ehr_sync_logs"] = logChain;

    mockPullKarte.mockResolvedValueOnce({
      provider: "orca",
      direction: "pull",
      resourceType: "karte",
      patientId: "P-3",
      status: "success",
      detail: "カルテ1件をインポートしました",
    });

    const req = makeReq("POST", "/api/admin/ehr/retry", {
      sync_id: "a0000000-0000-4000-a000-000000000004",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary.success).toBe(1);
  });

  it("EHRプロバイダー未設定 → 400", async () => {
    mockCreateAdapter.mockResolvedValueOnce(null);

    const req = makeReq("POST", "/api/admin/ehr/retry", {
      sync_id: "a0000000-0000-4000-a000-000000000001",
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("EHRプロバイダー");
  });

  it("リトライ中にアダプターエラー → エラー結果を返す", async () => {
    const logChain = createChain({
      data: [
        {
          id: "a0000000-0000-4000-a000-000000000005",
          provider: "orca",
          direction: "push",
          resource_type: "patient",
          patient_id: "P-ERR",
          external_id: null,
          status: "error",
          detail: "初回エラー",
        },
      ],
      error: null,
    });
    tableChains["ehr_sync_logs"] = logChain;

    mockPushPatient.mockRejectedValueOnce(new Error("再度接続失敗"));

    const req = makeReq("POST", "/api/admin/ehr/retry", {
      sync_id: "a0000000-0000-4000-a000-000000000005",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary.error).toBe(1);
    expect(data.results[0].detail).toContain("再度接続失敗");
  });
});

// ============================================================
// POST /api/admin/ehr/retry — 一括リトライ
// ============================================================
describe("POST /api/admin/ehr/retry — 一括リトライ", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/admin/ehr/retry/route");
    POST = mod.POST;
  });

  it("正常: 複数件の一括リトライ", async () => {
    const logChain = createChain({
      data: [
        {
          id: "a0000000-0000-4000-a000-000000000010",
          provider: "orca",
          direction: "push",
          resource_type: "patient",
          patient_id: "P-A",
          external_id: null,
          status: "error",
          detail: "エラー1",
        },
        {
          id: "a0000000-0000-4000-a000-000000000011",
          provider: "orca",
          direction: "pull",
          resource_type: "karte",
          patient_id: "P-B",
          external_id: "EXT-B",
          status: "error",
          detail: "エラー2",
        },
      ],
      error: null,
    });
    tableChains["ehr_sync_logs"] = logChain;

    mockPushPatient.mockResolvedValueOnce({
      provider: "orca",
      direction: "push",
      resourceType: "patient",
      patientId: "P-A",
      status: "success",
      detail: "送信完了",
    });

    mockPullKarte.mockResolvedValueOnce({
      provider: "orca",
      direction: "pull",
      resourceType: "karte",
      patientId: "P-B",
      status: "error",
      detail: "再度失敗",
    });

    const req = makeReq("POST", "/api/admin/ehr/retry", {
      sync_ids: [
        "a0000000-0000-4000-a000-000000000010",
        "a0000000-0000-4000-a000-000000000011",
      ],
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.summary.total).toBe(2);
    expect(data.summary.success).toBe(1);
    expect(data.summary.error).toBe(1);
    expect(data.results).toHaveLength(2);
  });

  it("不正なsync_ids → 400", async () => {
    const req = makeReq("POST", "/api/admin/ehr/retry", {
      sync_ids: ["invalid-uuid"],
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("空のsync_ids → 400", async () => {
    const req = makeReq("POST", "/api/admin/ehr/retry", {
      sync_ids: [],
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /api/admin/ehr/retry — 失敗ログ取得
// ============================================================
describe("GET /api/admin/ehr/retry — 失敗ログ取得", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/admin/ehr/retry/route");
    GET = mod.GET;
  });

  it("認証エラー → 401", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValueOnce(false);

    const req = makeReq("GET", "/api/admin/ehr/retry");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("正常: デフォルトでエラーログのみ返す", async () => {
    const logChain = createChain({
      data: [
        { id: "1", status: "error", detail: "接続失敗" },
        { id: "2", status: "error", detail: "タイムアウト" },
      ],
      error: null,
    });
    tableChains["ehr_sync_logs"] = logChain;

    const req = makeReq("GET", "/api/admin/ehr/retry");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.logs).toHaveLength(2);
    // デフォルトでerrorフィルタが適用されていることを確認
    expect(logChain.eq).toHaveBeenCalledWith("status", "error");
  });

  it("statusフィルタ指定", async () => {
    const logChain = createChain({ data: [], error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const req = makeReq("GET", "/api/admin/ehr/retry?status=skipped");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(logChain.eq).toHaveBeenCalledWith("status", "skipped");
  });

  it("limitフィルタ指定", async () => {
    const logChain = createChain({ data: [], error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const req = makeReq("GET", "/api/admin/ehr/retry?limit=10");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(logChain.limit).toHaveBeenCalledWith(10);
  });
});

// ============================================================
// GET /api/admin/ehr/sync-logs — 同期ログ一覧（ページネーション）
// ============================================================
describe("GET /api/admin/ehr/sync-logs — 同期ログ一覧", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/admin/ehr/sync-logs/route");
    GET = mod.GET;
  });

  it("認証エラー → 401", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValueOnce(false);

    const req = makeReq("GET", "/api/admin/ehr/sync-logs");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("正常: デフォルトパラメータでログを返す", async () => {
    const logChain = createChain({
      data: [
        { id: "1", status: "success" },
        { id: "2", status: "error" },
      ],
      error: null,
      count: 2,
    });
    tableChains["ehr_sync_logs"] = logChain;

    const req = makeReq("GET", "/api/admin/ehr/sync-logs");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.logs).toHaveLength(2);
    // デフォルト: offset=0, limit=50
    expect(logChain.range).toHaveBeenCalledWith(0, 49);
  });

  it("ページネーション: offset=10, limit=5", async () => {
    const logChain = createChain({
      data: [],
      error: null,
      count: 100,
    });
    tableChains["ehr_sync_logs"] = logChain;

    const req = makeReq("GET", "/api/admin/ehr/sync-logs?offset=10&limit=5");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(logChain.range).toHaveBeenCalledWith(10, 14);
    expect(data.offset).toBe(10);
    expect(data.limit).toBe(5);
  });

  it("ステータスフィルタ: error", async () => {
    const logChain = createChain({ data: [], error: null, count: 0 });
    tableChains["ehr_sync_logs"] = logChain;

    const req = makeReq("GET", "/api/admin/ehr/sync-logs?status=error");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(logChain.eq).toHaveBeenCalledWith("status", "error");
  });

  it("プロバイダーフィルタ: orca", async () => {
    const logChain = createChain({ data: [], error: null, count: 0 });
    tableChains["ehr_sync_logs"] = logChain;

    const req = makeReq("GET", "/api/admin/ehr/sync-logs?provider=orca");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(logChain.eq).toHaveBeenCalledWith("provider", "orca");
  });

  it("テナントフィルタが適用される", async () => {
    const logChain = createChain({ data: [], error: null, count: 0 });
    tableChains["ehr_sync_logs"] = logChain;

    const req = makeReq("GET", "/api/admin/ehr/sync-logs");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(logChain.eq).toHaveBeenCalledWith("tenant_id", "tenant-test-1");
  });

  it("不正なパラメータ → 400", async () => {
    const req = makeReq("GET", "/api/admin/ehr/sync-logs?limit=abc");
    const res = await GET(req);

    // Zodのcoerceでは"abc"はNaNになりバリデーションエラー
    expect(res.status).toBe(400);
  });

  it("不正なステータス値 → 400", async () => {
    const req = makeReq("GET", "/api/admin/ehr/sync-logs?status=invalid");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it("hasMore計算: データがlimit以上ある場合 true", async () => {
    const logChain = createChain({
      data: Array.from({ length: 5 }, (_, i) => ({ id: String(i) })),
      error: null,
      count: 20,
    });
    tableChains["ehr_sync_logs"] = logChain;

    const req = makeReq("GET", "/api/admin/ehr/sync-logs?limit=5&offset=0");
    const res = await GET(req);
    const data = await res.json();

    expect(data.hasMore).toBe(true);
    expect(data.total).toBe(20);
  });
});

// ============================================================
// バリデーションスキーマのテスト
// ============================================================
describe("EHRリトライ バリデーションスキーマ", () => {
  it("ehrRetrySchema: 有効なUUID → 成功", async () => {
    const { ehrRetrySchema } = await import("@/lib/validations/ehr");
    const result = ehrRetrySchema.safeParse({
      sync_id: "a0000000-0000-4000-a000-000000000001",
    });
    expect(result.success).toBe(true);
  });

  it("ehrRetrySchema: 不正なUUID → 失敗", async () => {
    const { ehrRetrySchema } = await import("@/lib/validations/ehr");
    const result = ehrRetrySchema.safeParse({ sync_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("ehrBulkRetrySchema: 有効なUUID配列 → 成功", async () => {
    const { ehrBulkRetrySchema } = await import("@/lib/validations/ehr");
    const result = ehrBulkRetrySchema.safeParse({
      sync_ids: [
        "a0000000-0000-4000-a000-000000000001",
        "a0000000-0000-4000-a000-000000000002",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("ehrBulkRetrySchema: 空配列 → 失敗", async () => {
    const { ehrBulkRetrySchema } = await import("@/lib/validations/ehr");
    const result = ehrBulkRetrySchema.safeParse({ sync_ids: [] });
    expect(result.success).toBe(false);
  });

  it("ehrSyncLogsQuerySchema: デフォルト値適用", async () => {
    const { ehrSyncLogsQuerySchema } = await import("@/lib/validations/ehr");
    const result = ehrSyncLogsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(0);
    }
  });

  it("ehrSyncLogsQuerySchema: retrying ステータス → 成功", async () => {
    const { ehrSyncLogsQuerySchema } = await import("@/lib/validations/ehr");
    const result = ehrSyncLogsQuerySchema.safeParse({ status: "retrying" });
    expect(result.success).toBe(true);
  });
});
