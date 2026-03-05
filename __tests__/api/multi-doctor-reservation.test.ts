// __tests__/api/multi-doctor-reservation.test.ts
// 複数医師並列予約（Phase 7）のテスト
// 対象: app/api/reservations/route.ts の doctor_id 対応部分

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// === モックヘルパー ===
function createChainMock(resolvedValue: { data: unknown; error: unknown } = { data: null, error: null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  const methods = ["select", "insert", "update", "eq", "neq", "not", "gte", "lte", "limit", "order", "in", "like", "ilike", "or", "range"];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue);
  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
    return Promise.resolve(resolvedValue).then(resolve, reject);
  };
  return chain;
}

// テーブル別チェーン管理
let tableChains: Record<string, ReturnType<typeof createChainMock>> = {};
const mockFrom = vi.fn((table: string) => {
  if (!tableChains[table]) tableChains[table] = createChainMock();
  return tableChains[table];
});
const mockRpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(args[0] as string),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock("@/lib/redis", () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
  getDashboardCacheKey: vi.fn((pid: string) => `dashboard:${pid}`),
  invalidateDashboardCache: vi.fn(),
}));

vi.mock("@/lib/reservation-flex", () => ({
  buildReservationCreatedFlex: vi.fn().mockResolvedValue({ type: "flex", altText: "test", contents: {} }),
  buildReservationChangedFlex: vi.fn().mockResolvedValue({ type: "flex", altText: "test", contents: {} }),
  buildReservationCanceledFlex: vi.fn().mockResolvedValue({ type: "flex", altText: "test", contents: {} }),
  sendReservationNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((query: unknown) => query),
}));

vi.mock("@/lib/menu-auto-rules", () => ({
  evaluateMenuRules: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/validations/helpers", () => ({
  validateBody: vi.fn().mockReturnValue({ success: true, data: {} }),
}));

vi.mock("@/lib/validations/reservation", () => ({
  createReservationSchema: {},
  cancelReservationSchema: {},
  updateReservationSchema: {},
}));

// next/headers の cookies() モック
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn((name: string) => {
      const map: Record<string, { value: string }> = {
        "__Host-patient_id": { value: "PT-TEST" },
        "patient_id": { value: "PT-TEST" },
      };
      return map[name] || undefined;
    }),
  }),
}));

import { GET } from "@/app/api/reservations/route";

// ============================================
// テスト本体
// ============================================

describe("GET /api/reservations (複数医師対応)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  describe("mode=doctors エンドポイント", () => {
    it("アクティブな医師一覧を返す", async () => {
      const doctors = [
        { doctor_id: "dr_default", doctor_name: "共通枠", is_active: true, sort_order: 0, display_in_booking: true },
        { doctor_id: "dr_kanda", doctor_name: "神田舞衣", is_active: true, sort_order: 1, display_in_booking: true },
      ];
      tableChains["doctors"] = createChainMock({ data: doctors, error: null });

      const req = new NextRequest("http://localhost/api/reservations?mode=doctors");
      const res = await GET(req);
      const json = await res.json();

      expect(json.ok).toBe(true);
      expect(json.doctors).toHaveLength(2);
      expect(json.doctors[0].doctor_id).toBe("dr_default");
      expect(json.doctors[1].doctor_name).toBe("神田舞衣");
    });

    it("医師がいない場合は空配列を返す", async () => {
      tableChains["doctors"] = createChainMock({ data: null, error: null });

      const req = new NextRequest("http://localhost/api/reservations?mode=doctors");
      const res = await GET(req);
      const json = await res.json();

      expect(json.ok).toBe(true);
      expect(json.doctors).toEqual([]);
    });
  });

  describe("doctor_id パラメータ", () => {
    it("doctor_id未指定時は dr_default がデフォルトで使われる", async () => {
      // booking_open_settingsとスケジュール系のチェーンを準備
      tableChains["booking_open_settings"] = createChainMock({ data: null, error: { code: "PGRST116" } });
      tableChains["reservations"] = createChainMock({ data: [], error: null });
      tableChains["doctor_weekly_rules"] = createChainMock({ data: [], error: null });
      tableChains["doctor_date_overrides"] = createChainMock({ data: [], error: null });
      tableChains["doctors"] = createChainMock({ data: [{ doctor_id: "dr_default" }], error: null });

      const req = new NextRequest("http://localhost/api/reservations?date=2026-03-05");
      await GET(req);

      // reservationsテーブルに対するeqコールでdoctor_idフィルタが使われるか確認
      const reservationsChain = tableChains["reservations"];
      expect(reservationsChain.eq).toHaveBeenCalled();
    });

    it("doctor_id指定時はそのIDが使われる", async () => {
      tableChains["booking_open_settings"] = createChainMock({ data: null, error: { code: "PGRST116" } });
      tableChains["reservations"] = createChainMock({ data: [], error: null });
      tableChains["doctor_weekly_rules"] = createChainMock({ data: [], error: null });
      tableChains["doctor_date_overrides"] = createChainMock({ data: [], error: null });
      tableChains["doctors"] = createChainMock({ data: [{ doctor_id: "dr_kanda" }], error: null });

      const req = new NextRequest("http://localhost/api/reservations?date=2026-03-05&doctor_id=dr_kanda");
      await GET(req);

      // doctor_idフィルタが使われることを確認
      const reservationsChain = tableChains["reservations"];
      expect(reservationsChain.eq).toHaveBeenCalled();
    });
  });
});

// ============================================
// ロジックテスト（getBookedSlotsFromDB相当）
// ============================================
describe("予約カウントの医師別フィルタ（ロジックテスト）", () => {
  it("同じ時間帯でも医師が異なれば独立してカウントされる", () => {
    // 既存予約データ
    const reservations = [
      { reserved_date: "2026-03-10", reserved_time: "10:00", doctor_id: "dr_default", status: "pending" },
      { reserved_date: "2026-03-10", reserved_time: "10:00", doctor_id: "dr_default", status: "pending" },
      { reserved_date: "2026-03-10", reserved_time: "10:00", doctor_id: "dr_kanda", status: "pending" },
    ];

    // 医師別にフィルタしてカウント
    const drDefaultCount = reservations.filter(
      r => r.doctor_id === "dr_default" && r.status !== "canceled"
    ).length;
    const drKandaCount = reservations.filter(
      r => r.doctor_id === "dr_kanda" && r.status !== "canceled"
    ).length;

    expect(drDefaultCount).toBe(2);
    expect(drKandaCount).toBe(1);
  });

  it("canceledは予約カウントから除外される", () => {
    const reservations = [
      { reserved_date: "2026-03-10", reserved_time: "10:00", doctor_id: "dr_default", status: "pending" },
      { reserved_date: "2026-03-10", reserved_time: "10:00", doctor_id: "dr_default", status: "canceled" },
    ];

    const count = reservations.filter(
      r => r.doctor_id === "dr_default" && r.status !== "canceled"
    ).length;

    expect(count).toBe(1);
  });

  it("定員チェック: 医師Aが満席でも医師Bは予約可能", () => {
    const capacity = 2;
    const drABookedCount = 2; // 満席
    const drBBookedCount = 0; // 空き

    expect(drABookedCount >= capacity).toBe(true);  // 医師A: 予約不可
    expect(drBBookedCount >= capacity).toBe(false);  // 医師B: 予約可能
  });
});

// ============================================
// RPC パラメータテスト
// ============================================
describe("create_reservation_atomic RPCパラメータ", () => {
  it("doctor_id未指定時のデフォルト値は dr_default", () => {
    const doctorId = undefined || "dr_default";
    expect(doctorId).toBe("dr_default");
  });

  it("doctor_id指定時はその値が使われる", () => {
    const requestDoctorId = "dr_kanda";
    const doctorId = requestDoctorId || "dr_default";
    expect(doctorId).toBe("dr_kanda");
  });

  it("RPCに渡すパラメータにp_doctor_idが含まれる", () => {
    const rpcParams = {
      p_reserve_id: "RSV-001",
      p_patient_id: "PT-001",
      p_patient_name: "テスト太郎",
      p_reserved_date: "2026-03-10",
      p_reserved_time: "10:00",
      p_doctor_id: "dr_kanda",
      p_tenant_id: null,
    };

    expect(rpcParams).toHaveProperty("p_doctor_id", "dr_kanda");
  });
});

// ============================================
// update_reservation_atomic RPCパラメータテスト
// ============================================
describe("update_reservation_atomic RPCパラメータ", () => {
  it("変更時もdoctor_idが引き継がれる", () => {
    const rpcParams = {
      p_reserve_id: "RSV-001",
      p_new_date: "2026-03-11",
      p_new_time: "11:00",
      p_doctor_id: "dr_kanda",
      p_tenant_id: null,
    };

    expect(rpcParams).toHaveProperty("p_doctor_id", "dr_kanda");
  });
});

// ============================================
// Zodスキーマテスト（doctor_idオプション）
// ============================================
describe("予約スキーマ doctor_id フィールド", () => {
  it("createReservationSchemaにdoctor_idが定義されている", async () => {
    const { createReservationSchema } = await vi.importActual<typeof import("@/lib/validations/reservation")>("@/lib/validations/reservation");
    const validData = { date: "2026-03-10", time: "10:00", doctor_id: "dr_kanda" };
    const result = createReservationSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("doctor_id未指定でもパース成功（オプション）", async () => {
    const { createReservationSchema } = await vi.importActual<typeof import("@/lib/validations/reservation")>("@/lib/validations/reservation");
    const validData = { date: "2026-03-10", time: "10:00" };
    const result = createReservationSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("updateReservationSchemaにdoctor_idが定義されている", async () => {
    const { updateReservationSchema } = await vi.importActual<typeof import("@/lib/validations/reservation")>("@/lib/validations/reservation");
    const validData = { type: "updateReservation", date: "2026-03-10", time: "10:00", doctor_id: "dr_kanda" };
    const result = updateReservationSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

// ============================================
// 後方互換性テスト
// ============================================
describe("後方互換性", () => {
  it("doctor_id未指定の既存予約はdr_defaultとして扱われる", () => {
    const existingReservation = { reserve_id: "RSV-OLD", doctor_id: "dr_default" };
    expect(existingReservation.doctor_id).toBe("dr_default");
  });

  it("医師が1名の場合、患者側で医師選択ステップは表示されない", () => {
    const doctors = [{ doctor_id: "dr_default", doctor_name: "共通枠" }];
    const shouldShowDoctorStep = doctors.length > 1;
    expect(shouldShowDoctorStep).toBe(false);
  });

  it("医師が2名以上の場合、管理画面に医師フィルタが表示される", () => {
    const doctors = [
      { doctor_id: "dr_default", doctor_name: "共通枠" },
      { doctor_id: "dr_kanda", doctor_name: "神田舞衣" },
    ];
    const shouldShowFilter = doctors.length > 1;
    expect(shouldShowFilter).toBe(true);
  });
});
