// __tests__/api/reservations-calendar.test.ts
// カレンダービュー用予約API（app/api/admin/reservations/calendar/route.ts）のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// === モック設定 ===
const mockFrom = vi.fn();

// Supabaseチェーンモック用ヘルパー
function createChainMock(
  resolvedValue: { data: unknown; error: unknown } = { data: null, error: null }
) {
  const chain: Record<string, any> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "eq",
    "neq",
    "not",
    "gte",
    "lte",
    "limit",
    "order",
    "in",
  ];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue);
  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  // thenable: await chain で { data, error } が返る
  chain.then = (resolve: (v: any) => any, reject?: (e: any) => any) => {
    return Promise.resolve(resolvedValue).then(resolve, reject);
  };
  return chain;
}

// テーブルごとのチェーンを管理
const chainMap = new Map<string, ReturnType<typeof createChainMock>>();

function getOrCreateChain(table: string) {
  if (!chainMap.has(table)) {
    chainMap.set(table, createChainMock());
  }
  return chainMap.get(table)!;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return getOrCreateChain(args[0] as string);
    },
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((query: unknown) => query),
}));

vi.mock("@/lib/session", () => ({
  validateSession: vi.fn().mockResolvedValue(true),
}));

// === テスト本体 ===
import { GET } from "@/app/api/admin/reservations/calendar/route";
import { verifyAdminAuth } from "@/lib/admin-auth";

function createRequest(url: string): any {
  return {
    nextUrl: new URL(url, "http://localhost"),
    headers: new Headers(),
    cookies: { get: () => undefined },
  } as any;
}

describe("GET /api/admin/reservations/calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainMap.clear();
  });

  it("認証なしで401を返す", async () => {
    (verifyAdminAuth as any).mockResolvedValueOnce(false);

    const req = createRequest("http://localhost/api/admin/reservations/calendar?start=2026-03-01&end=2026-03-31");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("startパラメータなしで400を返す", async () => {
    const req = createRequest("http://localhost/api/admin/reservations/calendar?end=2026-03-31");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("start");
  });

  it("endパラメータなしで400を返す", async () => {
    const req = createRequest("http://localhost/api/admin/reservations/calendar?start=2026-03-01");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("end");
  });

  it("start/end両方なしで400を返す", async () => {
    const req = createRequest("http://localhost/api/admin/reservations/calendar");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
  });

  it("不正な日付形式で400を返す", async () => {
    const req = createRequest("http://localhost/api/admin/reservations/calendar?start=2026/03/01&end=2026-03-31");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("YYYY-MM-DD");
  });

  it("正常時に期間内の予約をeventsとして返す", async () => {
    // reservationsチェーンの設定
    const reservationsChain = getOrCreateChain("reservations");
    reservationsChain.then = (resolve: any) =>
      resolve({
        data: [
          {
            id: 1,
            reserve_id: "RSV001",
            patient_id: "P001",
            patient_name: "テスト太郎",
            doctor_id: "dr_001",
            reserved_date: "2026-03-01",
            reserved_time: "10:00:00",
            status: "pending",
            prescription_menu: "AGA",
          },
          {
            id: 2,
            reserve_id: "RSV002",
            patient_id: "P002",
            patient_name: null,
            doctor_id: "dr_002",
            reserved_date: "2026-03-02",
            reserved_time: "14:30:00",
            status: "completed",
            prescription_menu: "",
          },
        ],
        error: null,
      });

    // patientsチェーンの設定
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = (resolve: any) =>
      resolve({
        data: [
          { patient_id: "P001", name: "テスト太郎", tel: "09012345678" },
          { patient_id: "P002", name: "テスト花子", tel: "09087654321" },
        ],
        error: null,
      });

    // doctorsチェーンの設定
    const doctorsChain = getOrCreateChain("doctors");
    doctorsChain.then = (resolve: any) =>
      resolve({
        data: [
          { doctor_id: "dr_001", doctor_name: "山田先生" },
          { doctor_id: "dr_002", doctor_name: "鈴木先生" },
        ],
        error: null,
      });

    const req = createRequest("http://localhost/api/admin/reservations/calendar?start=2026-03-01&end=2026-03-31");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.start).toBe("2026-03-01");
    expect(json.end).toBe("2026-03-31");
    expect(json.events).toHaveLength(2);

    // 1件目の詳細確認
    const ev1 = json.events[0];
    expect(ev1.patient_name).toBe("テスト太郎");
    expect(ev1.doctor_name).toBe("山田先生");
    expect(ev1.reserved_date).toBe("2026-03-01");
    expect(ev1.reserved_time).toBe("10:00");
    expect(ev1.status).toBe("pending");

    // 2件目: patient_nameがnullの場合、patients名にフォールバック
    const ev2 = json.events[1];
    expect(ev2.patient_name).toBe("テスト花子");
    expect(ev2.doctor_name).toBe("鈴木先生");
    expect(ev2.reserved_time).toBe("14:30");
    expect(ev2.status).toBe("completed");
  });

  it("予約がない期間では空配列を返す", async () => {
    // 全テーブルで空データ
    const reservationsChain = getOrCreateChain("reservations");
    reservationsChain.then = (resolve: any) =>
      resolve({ data: [], error: null });

    const req = createRequest("http://localhost/api/admin/reservations/calendar?start=2026-04-01&end=2026-04-30");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.events).toHaveLength(0);
  });

  it("DBエラー時に500を返す", async () => {
    const reservationsChain = getOrCreateChain("reservations");
    reservationsChain.then = (resolve: any) =>
      resolve({
        data: null,
        error: { message: "connection timeout" },
      });

    const req = createRequest("http://localhost/api/admin/reservations/calendar?start=2026-03-01&end=2026-03-31");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toContain("Database error");
  });
});
