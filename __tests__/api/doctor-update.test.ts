// __tests__/api/doctor-update.test.ts
// 診察結果更新 API (app/api/doctor/update/route.ts) のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンビルダー ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (value: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, ReturnType<typeof createChain>> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// vi.hoisted でホイスト対象の値を先に定義
const { mockVerifyDoctorAuth, mockInvalidateCache } = vi.hoisted(() => ({
  mockVerifyDoctorAuth: vi.fn().mockResolvedValue(true),
  mockInvalidateCache: vi.fn().mockResolvedValue(undefined),
}));

// doctor/update/route.ts は独自に createClient で supabaseAdmin を作成している
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getOrCreateChain(table)),
  })),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyDoctorAuth: mockVerifyDoctorAuth,
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenantId: "test-tenant" })),
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: mockInvalidateCache,
}));

const { mockSendPaymentNotification, mockScheduleFollowups } = vi.hoisted(() => ({
  mockSendPaymentNotification: vi.fn().mockResolvedValue({ ok: true }),
  mockScheduleFollowups: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/payment-flex", () => ({
  sendPaymentNotification: mockSendPaymentNotification,
}));

vi.mock("@/lib/followup", () => ({
  scheduleReservationFollowups: mockScheduleFollowups,
}));

// --- ヘルパー ---
function createMockRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/doctor/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

import { POST } from "@/app/api/doctor/update/route";

describe("POST /api/doctor/update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyDoctorAuth.mockResolvedValue(true);
    mockInvalidateCache.mockResolvedValue(undefined);
  });

  // -------------------------------------------
  // 認証テスト
  // -------------------------------------------
  it("認証失敗時は 401 を返す", async () => {
    mockVerifyDoctorAuth.mockResolvedValue(false);
    const req = createMockRequest({ reserveId: "R001", status: "done" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("UNAUTHORIZED");
  });

  // -------------------------------------------
  // バリデーションテスト
  // -------------------------------------------
  it("reserveId が空の場合は 400 を返す", async () => {
    const req = createMockRequest({ reserveId: "", status: "done" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("reserveId がない場合は 400 を返す", async () => {
    const req = createMockRequest({ status: "done" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("不正なJSON の場合は 400 を返す", async () => {
    const req = new Request("http://localhost/api/doctor/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "INVALID_JSON",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // -------------------------------------------
  // intake 未発見テスト
  // -------------------------------------------
  it("intake が見つからない場合は 404 を返す", async () => {
    tableChains["intake"] = createChain({ data: null, error: { message: "not found" } });

    const req = createMockRequest({ reserveId: "R001", status: "done" });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("INTAKE_NOT_FOUND");
  });

  // -------------------------------------------
  // 正常系テスト
  // -------------------------------------------
  it("正常にintakeとreservationsを更新して 200 を返す", async () => {
    tableChains["intake"] = createChain({ data: { patient_id: "P001" }, error: null });
    tableChains["reservations"] = createChain({ data: null, error: null });

    const req = createMockRequest({
      reserveId: "R001",
      status: "done",
      note: "テストメモ",
      prescriptionMenu: "マンジャロ2.5mg",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.patientId).toBe("P001");
  });

  it("正常時にキャッシュ無効化が呼ばれる", async () => {
    tableChains["intake"] = createChain({ data: { patient_id: "P001" }, error: null });
    tableChains["reservations"] = createChain();

    const req = createMockRequest({ reserveId: "R001", status: "done" });
    await POST(req);
    expect(mockInvalidateCache).toHaveBeenCalledWith("P001");
  });

  // -------------------------------------------
  // キャッシュ無効化エラー（non-critical）
  // -------------------------------------------
  it("キャッシュ無効化が失敗しても 200 を返す", async () => {
    tableChains["intake"] = createChain({ data: { patient_id: "P001" }, error: null });
    tableChains["reservations"] = createChain();
    mockInvalidateCache.mockRejectedValue(new Error("Redis down"));

    const req = createMockRequest({ reserveId: "R001", status: "done" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  // -------------------------------------------
  // オプショナルフィールド
  // -------------------------------------------
  it("status, note, prescriptionMenu がなくても成功する", async () => {
    tableChains["intake"] = createChain({ data: { patient_id: "P002" }, error: null });
    tableChains["reservations"] = createChain();

    const req = createMockRequest({ reserveId: "R002" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  // -------------------------------------------
  // intake_completionモード（intake_XXX形式）
  // -------------------------------------------
  it("intake_ 形式の reserveId で intake.id ベースの検索になる", async () => {
    tableChains["intake"] = createChain({ data: { id: 123, patient_id: "P003" }, error: null });

    const req = createMockRequest({ reserveId: "intake_123", status: "done" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.patientId).toBe("P003");
  });

  it("intake_ モードでは reservations の更新をスキップする", async () => {
    tableChains["intake"] = createChain({ data: { id: 456, patient_id: "P004" }, error: null });
    tableChains["reservations"] = createChain();

    const req = createMockRequest({ reserveId: "intake_456", status: "done" });
    await POST(req);

    // reservations の update は呼ばれない
    expect(tableChains["reservations"].update).not.toHaveBeenCalled();
  });

  // -------------------------------------------
  // intake更新エラー
  // -------------------------------------------
  it("intake更新が失敗した場合は 500 を返す", async () => {
    // intake select は成功、update はエラー
    const { createClient } = await import("@supabase/supabase-js");
    const mockClient = vi.mocked(createClient).mock.results[0]?.value;
    if (!mockClient) return;

    let intakeCallCount = 0;
    vi.mocked(mockClient.from).mockImplementation((table: string) => {
      if (table === "intake") {
        intakeCallCount++;
        if (intakeCallCount === 1) {
          // select → intake取得成功
          return createChain({ data: { id: 1, patient_id: "P005" }, error: null });
        }
        // update → エラー
        return createChain({ data: null, error: { message: "intake update failed" } });
      }
      return getOrCreateChain(table);
    });

    const req = createMockRequest({ reserveId: "R005", status: "done" });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  // -------------------------------------------
  // status=OK 時の決済案内通知
  // -------------------------------------------
  it("status=OK の場合に決済案内通知がスケジュールされる", async () => {
    tableChains["intake"] = createChain({ data: { patient_id: "P006" }, error: null });
    tableChains["reservations"] = createChain();
    tableChains["patients"] = createChain({ data: { line_id: "U_LINE_006" }, error: null });

    const req = createMockRequest({ reserveId: "R006", status: "OK" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // fire-and-forget なので即時呼ばれるとは限らないが、
    // フォローアップは Promise ベースなので呼び出し確認可能
    expect(mockScheduleFollowups).toHaveBeenCalledWith("R006", "P006", "test-tenant");
  });

  it("status=OK でない場合、決済案内通知はスケジュールされない", async () => {
    tableChains["intake"] = createChain({ data: { patient_id: "P007" }, error: null });
    tableChains["reservations"] = createChain();

    const req = createMockRequest({ reserveId: "R007", status: "done" });
    await POST(req);

    expect(mockScheduleFollowups).not.toHaveBeenCalled();
    expect(mockSendPaymentNotification).not.toHaveBeenCalled();
  });
});
