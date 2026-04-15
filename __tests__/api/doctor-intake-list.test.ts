// __tests__/api/doctor-intake-list.test.ts
// Doctor用intake一覧API (app/api/doctor/intake-list/route.ts) のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンビルダー ---
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
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

let tableChains: Record<string, Record<string, unknown>> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

const { mockVerifyDoctorAuth } = vi.hoisted(() => ({
  mockVerifyDoctorAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyDoctorAuth: mockVerifyDoctorAuth,
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn().mockResolvedValue("reservation"),
}));

function createReq(url = "http://localhost/api/doctor/intake-list") {
  return new Request(url, { method: "GET" }) as unknown as import("next/server").NextRequest;
}

import { GET } from "@/app/api/doctor/intake-list/route";

describe("GET /api/doctor/intake-list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyDoctorAuth.mockResolvedValue(true);
  });

  // -------------------------------------------
  // 認証テスト
  // -------------------------------------------
  it("認証失敗時は 401 を返す", async () => {
    mockVerifyDoctorAuth.mockResolvedValue(false);
    const res = await GET(createReq());
    expect(res.status).toBe(401);
  });

  // -------------------------------------------
  // テナントID不足
  // -------------------------------------------
  it("テナントID不足時は 400 を返す", async () => {
    const { resolveTenantId } = await import("@/lib/tenant");
    vi.mocked(resolveTenantId).mockReturnValueOnce(null as unknown as string);
    const res = await GET(createReq());
    expect(res.status).toBe(400);
  });

  // -------------------------------------------
  // 正常系: reservationモード（日付指定なし）
  // -------------------------------------------
  it("reservationモード（日付なし）で正常にデータを返す", async () => {
    // intake
    const intakeChain = createChain({
      data: [
        {
          id: "i1", patient_id: "p1", reserve_id: "r1", answerer_id: null,
          status: "done", note: "", answers: { q1: "a1" },
          created_at: "2026-01-01T00:00:00Z", call_status: null, call_status_updated_at: null,
        },
      ],
      error: null,
    });
    tableChains["intake"] = intakeChain;

    // reservations
    const resChain = createChain({
      data: [
        { reserve_id: "r1", reserved_date: "2026-01-01", reserved_time: "10:00", prescription_menu: "menu1", status: "confirmed" },
      ],
      error: null,
    });
    tableChains["reservations"] = resChain;

    // patients
    const patChain = createChain({
      data: [{ patient_id: "p1", name: "テスト太郎", line_id: "U001", tel: "09012345678" }],
      error: null,
    });
    tableChains["patients"] = patChain;

    const res = await GET(createReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.rows).toBeDefined();
    expect(json.rows.length).toBe(1);
    expect(json.rows[0].patient_name).toBe("テスト太郎");
    expect(json.rows[0].reserve_id).toBe("r1");
  });

  // -------------------------------------------
  // 正常系: reservationモード（日付指定あり、予約なし → 空配列）
  // -------------------------------------------
  it("reservationモード（日付指定あり、予約0件）→ 空配列を返す", async () => {
    // reservations: 空
    tableChains["reservations"] = createChain({ data: [], error: null });

    const res = await GET(createReq("http://localhost/api/doctor/intake-list?from=2026-01-01&to=2026-01-31"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.rows).toEqual([]);
  });

  // -------------------------------------------
  // 正常系: intake_completionモード
  // -------------------------------------------
  it("intake_completionモードで正常にデータを返す", async () => {
    const { getSetting } = await import("@/lib/settings");
    vi.mocked(getSetting).mockResolvedValueOnce("intake_completion");

    // intake
    tableChains["intake"] = createChain({
      data: [
        {
          id: "i1", patient_id: "p1", reserve_id: null, answerer_id: null,
          status: null, note: "", answers: { q1: "a1" },
          created_at: "2026-01-01T00:00:00Z", call_status: null, call_status_updated_at: null,
        },
      ],
      error: null,
    });

    // patients
    tableChains["patients"] = createChain({
      data: [{ patient_id: "p1", name: "問診太郎", line_id: "U002", tel: "09000000000" }],
      error: null,
    });

    const res = await GET(createReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.rows).toBeDefined();
    expect(json.karteMode).toBe("intake_completion");
  });

  // -------------------------------------------
  // DBエラー
  // -------------------------------------------
  it("DBエラー時は 500 を返す", async () => {
    // intake クエリがエラー
    tableChains["intake"] = createChain({ data: null, error: { message: "DB error" } });

    const res = await GET(createReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });
});
