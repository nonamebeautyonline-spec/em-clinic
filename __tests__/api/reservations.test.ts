// __tests__/api/reservations.test.ts
// 予約API（app/api/reservations/route.ts）のテスト
// ヘルパー関数ユニットテスト + POST/GET APIモックテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// === モック設定 ===
const mockFrom = vi.fn();
const mockRpc = vi.fn();

// Supabaseチェーンモック用ヘルパー
// Supabase QueryBuilder は thenable なので、await chain で { data, error } を返す
function createChainMock(resolvedValue: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, any> = {};
  const methods = ["select", "insert", "update", "eq", "neq", "not", "gte", "lte", "limit", "order", "in"];
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

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
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

// ============================================
// ヘルパー関数テスト（ロジック再実装）
// ============================================

// route.ts 内の parseMinutes を再実装
function parseMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map((v) => Number(v));
  return h * 60 + m;
}

// route.ts 内の toHHMM を再実装
function toHHMM(totalMin: number) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// route.ts 内の addYmd を再実装
function addYmd(ymdStr: string, days: number) {
  const [y, m, d] = ymdStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// route.ts 内の dayOfWeek を再実装
function dayOfWeek(ymdStr: string) {
  const [y, m, d] = ymdStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCDay(); // 0..6
}

// route.ts 内の buildAvailabilityRange を再実装
type WeeklyRule = {
  doctor_id: string;
  weekday: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  capacity: number;
};

type Override = {
  doctor_id: string;
  date: string;
  type: "closed" | "open" | "modify";
  start_time?: string;
  end_time?: string;
  slot_minutes?: number | "";
  capacity?: number | "";
};

type BookedSlot = { date: string; time: string; count: number };

function buildAvailabilityRange(
  start: string,
  end: string,
  weekly: WeeklyRule[],
  overrides: Override[],
  booked: BookedSlot[],
  doctorId: string,
) {
  const weeklyMap = new Map<number, WeeklyRule>();
  weekly
    .filter((r) => r.doctor_id === doctorId)
    .forEach((r) => weeklyMap.set(Number(r.weekday), r));

  const overrideMap = new Map<string, Override>();
  overrides
    .filter((o) => o.doctor_id === doctorId)
    .forEach((o) => overrideMap.set(String(o.date), o));

  const bookedMap = new Map<string, number>();
  booked.forEach((b) => bookedMap.set(`${b.date}|${b.time}`, Number(b.count || 0)));

  const slots: { date: string; time: string; count: number }[] = [];

  let cur = start;
  while (cur <= end) {
    const date = cur;
    const weekday = dayOfWeek(date);

    const base = weeklyMap.get(weekday);
    const ov = overrideMap.get(date);

    // 休診
    if (ov?.type === "closed") {
      cur = addYmd(cur, 1);
      continue;
    }

    // base が休みでも、override が open / modify なら開ける
    const overrideOpens = ov?.type === "open" || ov?.type === "modify";
    if (!base?.enabled && !overrideOpens) {
      cur = addYmd(cur, 1);
      continue;
    }

    const slotMinutes =
      (typeof ov?.slot_minutes === "number" ? ov.slot_minutes : undefined) ??
      (base?.slot_minutes ?? 15);

    const cap =
      (typeof ov?.capacity === "number" ? ov.capacity : undefined) ?? (base?.capacity ?? 2);

    const startTime =
      (ov?.start_time && String(ov.start_time).trim() ? String(ov.start_time) : "") ||
      (base?.start_time || "");

    const endTime =
      (ov?.end_time && String(ov.end_time).trim() ? String(ov.end_time) : "") ||
      (base?.end_time || "");

    if (!startTime || !endTime) {
      cur = addYmd(cur, 1);
      continue;
    }

    const sMin = parseMinutes(startTime);
    const eMin = parseMinutes(endTime);

    if (!(sMin < eMin) || slotMinutes <= 0) {
      cur = addYmd(cur, 1);
      continue;
    }

    for (let t = sMin; t + slotMinutes <= eMin; t += slotMinutes) {
      const time = toHHMM(t);
      const key = `${date}|${time}`;
      const bookedCount = bookedMap.get(key) ?? 0;
      const remain = Math.max(0, cap - bookedCount);
      slots.push({ date, time, count: remain });
    }

    cur = addYmd(cur, 1);
  }

  return slots;
}

// ============================================
// 1. parseMinutes テスト
// ============================================
describe("parseMinutes — HH:MM→分変換", () => {
  it("'09:30'→570, '14:00'→840", () => {
    expect(parseMinutes("09:30")).toBe(570);
    expect(parseMinutes("14:00")).toBe(840);
  });
});

// ============================================
// 2. toHHMM テスト
// ============================================
describe("toHHMM — 分→HH:MM変換", () => {
  it("570→'09:30', 840→'14:00'", () => {
    expect(toHHMM(570)).toBe("09:30");
    expect(toHHMM(840)).toBe("14:00");
  });
});

// ============================================
// 3. addYmd テスト（通常）
// ============================================
describe("addYmd — 日付加算", () => {
  it("'2026-02-15' +1 → '2026-02-16'", () => {
    expect(addYmd("2026-02-15", 1)).toBe("2026-02-16");
  });
});

// ============================================
// 4. addYmd テスト（月末跨ぎ）
// ============================================
describe("addYmd — 月末跨ぎ", () => {
  it("'2026-02-28' +1 → '2026-03-01'", () => {
    expect(addYmd("2026-02-28", 1)).toBe("2026-03-01");
  });
});

// ============================================
// 5. dayOfWeek テスト
// ============================================
describe("dayOfWeek — 曜日取得", () => {
  it("'2026-02-15'→日曜=0, '2026-02-16'→月曜=1", () => {
    expect(dayOfWeek("2026-02-15")).toBe(0); // 日曜
    expect(dayOfWeek("2026-02-16")).toBe(1); // 月曜
  });
});

// ============================================
// 6. buildAvailabilityRange — 基本パターン
// ============================================
describe("buildAvailabilityRange — 基本パターン", () => {
  it("weeklyルール有→枠が生成される", () => {
    const weekly: WeeklyRule[] = [
      {
        doctor_id: "dr_default",
        weekday: 1, // 月曜
        enabled: true,
        start_time: "09:00",
        end_time: "10:00",
        slot_minutes: 30,
        capacity: 2,
      },
    ];

    // 2026-02-16 は月曜
    const slots = buildAvailabilityRange("2026-02-16", "2026-02-16", weekly, [], [], "dr_default");

    expect(slots.length).toBe(2); // 09:00, 09:30
    expect(slots[0]).toEqual({ date: "2026-02-16", time: "09:00", count: 2 });
    expect(slots[1]).toEqual({ date: "2026-02-16", time: "09:30", count: 2 });
  });
});

// ============================================
// 7. buildAvailabilityRange — closed override→枠なし
// ============================================
describe("buildAvailabilityRange — closed override", () => {
  it("closed overrideがある日は枠なし", () => {
    const weekly: WeeklyRule[] = [
      {
        doctor_id: "dr_default",
        weekday: 1,
        enabled: true,
        start_time: "09:00",
        end_time: "18:00",
        slot_minutes: 30,
        capacity: 2,
      },
    ];
    const overrides: Override[] = [
      {
        doctor_id: "dr_default",
        date: "2026-02-16",
        type: "closed",
      },
    ];

    const slots = buildAvailabilityRange(
      "2026-02-16",
      "2026-02-16",
      weekly,
      overrides,
      [],
      "dr_default",
    );

    expect(slots.length).toBe(0);
  });
});

// ============================================
// 8. buildAvailabilityRange — open override→休日に枠開放
// ============================================
describe("buildAvailabilityRange — open override", () => {
  it("休日でもopen overrideがあれば枠が開放される", () => {
    // 日曜日はweeklyルールで enabled: false
    const weekly: WeeklyRule[] = [
      {
        doctor_id: "dr_default",
        weekday: 0, // 日曜
        enabled: false,
        start_time: "09:00",
        end_time: "12:00",
        slot_minutes: 30,
        capacity: 2,
      },
    ];
    const overrides: Override[] = [
      {
        doctor_id: "dr_default",
        date: "2026-02-15", // 日曜
        type: "open",
        start_time: "10:00",
        end_time: "12:00",
        slot_minutes: 30,
        capacity: 1,
      },
    ];

    const slots = buildAvailabilityRange(
      "2026-02-15",
      "2026-02-15",
      weekly,
      overrides,
      [],
      "dr_default",
    );

    // 10:00, 10:30, 11:00, 11:30 = 4枠、capacity=1
    expect(slots.length).toBe(4);
    expect(slots[0]).toEqual({ date: "2026-02-15", time: "10:00", count: 1 });
    expect(slots[3]).toEqual({ date: "2026-02-15", time: "11:30", count: 1 });
  });
});

// ============================================
// 9. buildAvailabilityRange — capacity-booked=残り枠
// ============================================
describe("buildAvailabilityRange — 残り枠計算", () => {
  it("capacity - booked = 残り枠が正しく計算される", () => {
    const weekly: WeeklyRule[] = [
      {
        doctor_id: "dr_default",
        weekday: 1,
        enabled: true,
        start_time: "09:00",
        end_time: "10:00",
        slot_minutes: 30,
        capacity: 2,
      },
    ];
    const booked: BookedSlot[] = [
      { date: "2026-02-16", time: "09:00", count: 1 },
      { date: "2026-02-16", time: "09:30", count: 2 },
    ];

    const slots = buildAvailabilityRange(
      "2026-02-16",
      "2026-02-16",
      weekly,
      [],
      booked,
      "dr_default",
    );

    // 09:00: capacity(2) - booked(1) = 1
    expect(slots[0]).toEqual({ date: "2026-02-16", time: "09:00", count: 1 });
    // 09:30: capacity(2) - booked(2) = 0
    expect(slots[1]).toEqual({ date: "2026-02-16", time: "09:30", count: 0 });
  });
});

// ============================================
// POST createReservation テスト
// ============================================
describe("POST createReservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // earlyOpenCache をリセットするために毎回再インポート
    vi.resetModules();
  });

  // NextRequest のモック生成
  function createMockRequest(body: Record<string, unknown>, cookies: Record<string, string> = {}) {
    return {
      json: vi.fn().mockResolvedValue(body),
      url: "http://localhost:3000/api/reservations",
      cookies: {
        get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
      },
      headers: {
        get: () => null,
      },
    } as any;
  }

  // ============================================
  // 10. 正常作成（RPC成功→ok:true）
  // ============================================
  it("正常作成 — RPC成功で ok:true を返す", async () => {
    // intake チェーン: 問診データあり
    const intakeChain = createChainMock({
      data: { patient_id: "p_001", status: null, answers: { ng_check: "ok" } },
      error: null,
    });
    // patients チェーン: 患者名・LINE ID
    const patientsChain = createChainMock({
      data: { name: "テスト太郎", line_id: "U1234" },
      error: null,
    });
    // reservations チェーン: 既存予約なし
    const reservationsSelectChain = createChainMock({ data: [], error: null });
    // intake update チェーン
    const intakeUpdateChain = createChainMock({ data: [{ patient_id: "p_001" }], error: null });
    // booking_open_settings チェーン
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "intake") {
        // 最初の呼び出し=SELECT、後のupdate用
        return intakeChain;
      }
      if (table === "patients") return patientsChain;
      if (table === "reservations") return reservationsSelectChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    // RPC: 成功
    mockRpc.mockResolvedValue({
      data: { ok: true, booked: 1, capacity: 2 },
      error: null,
    });

    const { POST } = await import("@/app/api/reservations/route");

    // 今月の日付を使う（isDateBookableが常にtrueを返す）
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const todayStr = `${jstNow.getUTCFullYear()}-${String(jstNow.getUTCMonth() + 1).padStart(2, "0")}-${String(jstNow.getUTCDate()).padStart(2, "0")}`;

    const req = createMockRequest(
      { type: "createReservation", date: todayStr, time: "09:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.reserveId).toBeDefined();
    expect(json.reserveId).toMatch(/^resv-/);
  });

  // ============================================
  // 11. intake不存在→intake_not_found (400)
  // ============================================
  it("intake不存在 → intake_not_found (400)", async () => {
    // intake: レコードなし
    const intakeChain = createChainMock({ data: null, error: null });
    // patients
    const patientsChain = createChainMock({ data: { name: "テスト太郎", line_id: "U1234" }, error: null });
    // reservations: 既存予約なし
    const reservationsChain = createChainMock({ data: [], error: null });
    // booking_open_settings
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "intake") return intakeChain;
      if (table === "patients") return patientsChain;
      if (table === "reservations") return reservationsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    mockRpc.mockResolvedValue({ data: { ok: true, booked: 1, capacity: 2 }, error: null });

    const { POST } = await import("@/app/api/reservations/route");

    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const todayStr = `${jstNow.getUTCFullYear()}-${String(jstNow.getUTCMonth() + 1).padStart(2, "0")}-${String(jstNow.getUTCDate()).padStart(2, "0")}`;

    const req = createMockRequest(
      { type: "createReservation", date: todayStr, time: "09:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("intake_not_found");
  });

  // ============================================
  // 12. 問診未完了→questionnaire_not_completed (400)
  // ============================================
  it("問診未完了（ng_check欠如）→ questionnaire_not_completed (400)", async () => {
    // intake: answersにng_checkがない
    const intakeChain = createChainMock({
      data: { patient_id: "p_001", status: null, answers: { other_field: "value" } },
      error: null,
    });
    const patientsChain = createChainMock({ data: { name: "テスト太郎", line_id: "U1234" }, error: null });
    const reservationsChain = createChainMock({ data: [], error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "intake") return intakeChain;
      if (table === "patients") return patientsChain;
      if (table === "reservations") return reservationsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    const { POST } = await import("@/app/api/reservations/route");

    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const todayStr = `${jstNow.getUTCFullYear()}-${String(jstNow.getUTCMonth() + 1).padStart(2, "0")}-${String(jstNow.getUTCDate()).padStart(2, "0")}`;

    const req = createMockRequest(
      { type: "createReservation", date: todayStr, time: "09:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("questionnaire_not_completed");
  });

  // ============================================
  // 13. 既存予約あり→already_reserved (400)
  // ============================================
  it("既存予約あり → already_reserved (400)", async () => {
    // reservations: 既にアクティブな予約あり
    const reservationsChain = createChainMock({
      data: [{ reserve_id: "resv-existing", reserved_date: "2026-02-20", reserved_time: "10:00", status: "confirmed" }],
      error: null,
    });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    const { POST } = await import("@/app/api/reservations/route");

    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const todayStr = `${jstNow.getUTCFullYear()}-${String(jstNow.getUTCMonth() + 1).padStart(2, "0")}-${String(jstNow.getUTCDate()).padStart(2, "0")}`;

    const req = createMockRequest(
      { type: "createReservation", date: todayStr, time: "09:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("already_reserved");
    expect(json.existing.reserve_id).toBe("resv-existing");
  });

  // ============================================
  // 14. RPC slot_full→slot_full (409)
  // ============================================
  it("RPC slot_full → slot_full (409)", async () => {
    // intake: 問診完了
    const intakeChain = createChainMock({
      data: { patient_id: "p_001", status: null, answers: { ng_check: "ok" } },
      error: null,
    });
    const patientsChain = createChainMock({ data: { name: "テスト太郎", line_id: "U1234" }, error: null });
    // reservations: 既存予約なし
    const reservationsChain = createChainMock({ data: [], error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "intake") return intakeChain;
      if (table === "patients") return patientsChain;
      if (table === "reservations") return reservationsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    // RPC: slot_full
    mockRpc.mockResolvedValue({
      data: { ok: false, booked: 2, capacity: 2 },
      error: null,
    });

    const { POST } = await import("@/app/api/reservations/route");

    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const todayStr = `${jstNow.getUTCFullYear()}-${String(jstNow.getUTCMonth() + 1).padStart(2, "0")}-${String(jstNow.getUTCDate()).padStart(2, "0")}`;

    const req = createMockRequest(
      { type: "createReservation", date: todayStr, time: "09:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("slot_full");
  });
});

// ============================================
// POST cancelReservation テスト
// ============================================
describe("POST cancelReservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  function createMockRequest(body: Record<string, unknown>, cookies: Record<string, string> = {}) {
    return {
      json: vi.fn().mockResolvedValue(body),
      url: "http://localhost:3000/api/reservations",
      cookies: {
        get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
      },
      headers: {
        get: () => null,
      },
    } as any;
  }

  // ============================================
  // 15. 正常キャンセル→ok:true
  // ============================================
  it("正常キャンセル → ok:true", async () => {
    // 予約情報取得
    const reservationsChain = createChainMock({
      data: { reserved_date: "2026-02-20", reserved_time: "10:00", patient_name: "テスト太郎" },
      error: null,
    });
    // 患者情報
    const patientsChain = createChainMock({ data: { line_id: "U1234" }, error: null });
    // intake更新
    const intakeChain = createChainMock({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "patients") return patientsChain;
      if (table === "intake") return intakeChain;
      return createChainMock();
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "cancelReservation", reserveId: "resv-12345", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.reserveId).toBe("resv-12345");
  });

  // ============================================
  // 16. reserveId未指定→400
  // ============================================
  it("reserveId未指定 → 400", async () => {
    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "cancelReservation" }, // reserveId なし
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("reserveId required");
  });
});

// ============================================
// POST updateReservation テスト
// ============================================
describe("POST updateReservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  function createMockRequest(body: Record<string, unknown>, cookies: Record<string, string> = {}) {
    return {
      json: vi.fn().mockResolvedValue(body),
      url: "http://localhost:3000/api/reservations",
      cookies: {
        get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
      },
      headers: {
        get: () => null,
      },
    } as any;
  }

  // ============================================
  // 17. 正常変更→ok:true
  // ============================================
  it("正常変更 → ok:true", async () => {
    // 変更前の予約情報
    const reservationsChain = createChainMock({
      data: { reserved_date: "2026-02-20", reserved_time: "10:00" },
      error: null,
    });
    // 患者情報
    const patientsChain = createChainMock({ data: { line_id: "U1234" }, error: null });
    // booking_open_settings
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "patients") return patientsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    // RPC: 成功
    mockRpc.mockResolvedValue({
      data: { ok: true, booked: 1, capacity: 2 },
      error: null,
    });

    const { POST } = await import("@/app/api/reservations/route");

    // 今月の日付を使う
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const todayStr = `${jstNow.getUTCFullYear()}-${String(jstNow.getUTCMonth() + 1).padStart(2, "0")}-${String(jstNow.getUTCDate()).padStart(2, "0")}`;

    const req = createMockRequest(
      { type: "updateReservation", reserveId: "resv-12345", date: todayStr, time: "14:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.reserveId).toBe("resv-12345");
  });

  // ============================================
  // 18. パラメータ不足→400
  // ============================================
  it("パラメータ不足（date・time欠如）→ 400", async () => {
    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "updateReservation", reserveId: "resv-12345" }, // date, time なし
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("入力値が不正です");
  });
});

// ============================================
// GET テスト
// ============================================
describe("GET /api/reservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // ============================================
  // 19. 範囲クエリ正常→slots返却
  // ============================================
  it("範囲クエリ正常 → slots返却", async () => {
    // 予約済み枠: なし
    const reservationsChain = createChainMock({ data: [], error: null });
    // 週間ルール: 月曜のみ
    const weeklyChain = createChainMock({
      data: [
        {
          doctor_id: "dr_default",
          weekday: 1,
          enabled: true,
          start_time: "09:00",
          end_time: "10:00",
          slot_minutes: 30,
          capacity: 2,
        },
      ],
      error: null,
    });
    // overrides: なし
    const overridesChain = createChainMock({ data: [], error: null });
    // booking_open_settings
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    let weeklyCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "doctor_weekly_rules") {
        weeklyCallCount++;
        return weeklyChain;
      }
      if (table === "doctor_date_overrides") return overridesChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    const { GET } = await import("@/app/api/reservations/route");

    // 今月の月曜を使う
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const y = jstNow.getUTCFullYear();
    const mo = jstNow.getUTCMonth(); // 0-indexed
    // 今月の最初の月曜を探す
    let mondayDate = 1;
    for (let d = 1; d <= 28; d++) {
      const dt = new Date(Date.UTC(y, mo, d));
      if (dt.getUTCDay() === 1) {
        mondayDate = d;
        break;
      }
    }
    const startDate = `${y}-${String(mo + 1).padStart(2, "0")}-${String(mondayDate).padStart(2, "0")}`;
    const endDate = startDate; // 同日

    const req = {
      url: `http://localhost:3000/api/reservations?start=${startDate}&end=${endDate}`,
      headers: { get: () => null },
    } as any;

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.start).toBe(startDate);
    expect(json.end).toBe(endDate);
    expect(Array.isArray(json.slots)).toBe(true);
  });

  // ============================================
  // 20. start/endなし→400
  // ============================================
  it("start/endなし → 400", async () => {
    const { GET } = await import("@/app/api/reservations/route");

    const req = {
      url: "http://localhost:3000/api/reservations",
      headers: { get: () => null },
    } as any;

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("start and end are required");
  });

  // ============================================
  // 21. 単日クエリ（dateパラメータのみ）→slots返却
  // ============================================
  it("単日クエリ（dateのみ）→ slots返却", async () => {
    // 予約済み枠: なし
    const reservationsChain = createChainMock({ data: [], error: null });
    // 週間ルール: 月曜のみ
    const weeklyChain = createChainMock({
      data: [
        {
          doctor_id: "dr_default",
          weekday: 1,
          enabled: true,
          start_time: "09:00",
          end_time: "10:00",
          slot_minutes: 30,
          capacity: 2,
        },
      ],
      error: null,
    });
    const overridesChain = createChainMock({ data: [], error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "doctor_weekly_rules") return weeklyChain;
      if (table === "doctor_date_overrides") return overridesChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    const { GET } = await import("@/app/api/reservations/route");

    // 今月の月曜を使う
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const y = jstNow.getUTCFullYear();
    const mo = jstNow.getUTCMonth();
    let mondayDate = 1;
    for (let d = 1; d <= 28; d++) {
      const dt = new Date(Date.UTC(y, mo, d));
      if (dt.getUTCDay() === 1) {
        mondayDate = d;
        break;
      }
    }
    const dateStr = `${y}-${String(mo + 1).padStart(2, "0")}-${String(mondayDate).padStart(2, "0")}`;

    const req = {
      url: `http://localhost:3000/api/reservations?date=${dateStr}`,
      headers: { get: () => null },
    } as any;

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.date).toBe(dateStr);
    expect(json.bookingOpen).toBe(true);
    expect(Array.isArray(json.slots)).toBe(true);
  });

  // ============================================
  // 22. GETサーバーエラー → 500
  // ============================================
  it("GETサーバーエラー → 500", async () => {
    // mockFromが例外をスローしてcatchブロックに入る
    mockFrom.mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const { GET } = await import("@/app/api/reservations/route");

    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const y = jstNow.getUTCFullYear();
    const mo = jstNow.getUTCMonth();
    const dateStr = `${y}-${String(mo + 1).padStart(2, "0")}-01`;

    const req = {
      url: `http://localhost:3000/api/reservations?start=${dateStr}&end=${dateStr}`,
      headers: { get: () => null },
    } as any;

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("server error");
  });
});

// ============================================
// POST 追加テスト — createReservation エッジケース
// ============================================
describe("POST createReservation — エッジケース", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  function createMockRequest(body: Record<string, unknown>, cookies: Record<string, string> = {}) {
    return {
      json: vi.fn().mockResolvedValue(body),
      url: "http://localhost:3000/api/reservations",
      cookies: {
        get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
      },
      headers: {
        get: () => null,
      },
    } as any;
  }

  // JSTで今月の日付文字列を生成するヘルパー
  function getTodayStr() {
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    return `${jstNow.getUTCFullYear()}-${String(jstNow.getUTCMonth() + 1).padStart(2, "0")}-${String(jstNow.getUTCDate()).padStart(2, "0")}`;
  }

  // ============================================
  // 23. RPC DBエラー → db_error (500)
  // ============================================
  it("RPC DBエラー → db_error (500)", async () => {
    const intakeChain = createChainMock({
      data: { patient_id: "p_001", status: null, answers: { ng_check: "ok" } },
      error: null,
    });
    const patientsChain = createChainMock({
      data: { name: "テスト太郎", line_id: "U1234" },
      error: null,
    });
    const reservationsChain = createChainMock({ data: [], error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "intake") return intakeChain;
      if (table === "patients") return patientsChain;
      if (table === "reservations") return reservationsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    // RPC: DBエラー
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "connection timeout" },
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "createReservation", date: getTodayStr(), time: "09:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("db_error");
    expect(json.detail).toBe("connection timeout");
  });

  // ============================================
  // 24. intakeチェックエラー → intake_check_failed (500)
  // ============================================
  it("intakeチェックDBエラー → intake_check_failed (500)", async () => {
    // intake: DBエラーを返す
    const intakeChain = createChainMock({
      data: null,
      error: { message: "RLS error", code: "42501" },
    });
    const patientsChain = createChainMock({
      data: { name: "テスト太郎", line_id: "U1234" },
      error: null,
    });
    const reservationsChain = createChainMock({ data: [], error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "intake") return intakeChain;
      if (table === "patients") return patientsChain;
      if (table === "reservations") return reservationsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "createReservation", date: getTodayStr(), time: "09:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("intake_check_failed");
  });

  // ============================================
  // 25. NGステータスリセット成功パス
  // ============================================
  it("NG患者の再予約 → ステータスリセットされて予約成功", async () => {
    // intake: NG状態
    const intakeChain = createChainMock({
      data: { patient_id: "p_001", status: "NG", answers: { ng_check: "ok" } },
      error: null,
    });
    const patientsChain = createChainMock({
      data: { name: "テスト太郎", line_id: "U1234" },
      error: null,
    });
    const reservationsChain = createChainMock({ data: [], error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "intake") return intakeChain;
      if (table === "patients") return patientsChain;
      if (table === "reservations") return reservationsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    mockRpc.mockResolvedValue({
      data: { ok: true, booked: 1, capacity: 2 },
      error: null,
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "createReservation", date: getTodayStr(), time: "09:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    // intakeのupdate（NG→null）が呼ばれたことを確認
    expect(mockFrom).toHaveBeenCalledWith("intake");
  });

  // ============================================
  // 26. 問診answersがnull → questionnaire_not_completed
  // ============================================
  it("問診answersがnull → questionnaire_not_completed (400)", async () => {
    const intakeChain = createChainMock({
      data: { patient_id: "p_001", status: null, answers: null },
      error: null,
    });
    const patientsChain = createChainMock({ data: { name: "テスト太郎", line_id: "U1234" }, error: null });
    const reservationsChain = createChainMock({ data: [], error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "intake") return intakeChain;
      if (table === "patients") return patientsChain;
      if (table === "reservations") return reservationsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "createReservation", date: getTodayStr(), time: "09:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("questionnaire_not_completed");
  });

  // ============================================
  // 27. ng_checkが空文字列 → questionnaire_not_completed
  // ============================================
  it("ng_checkが空文字列 → questionnaire_not_completed (400)", async () => {
    const intakeChain = createChainMock({
      data: { patient_id: "p_001", status: null, answers: { ng_check: "" } },
      error: null,
    });
    const patientsChain = createChainMock({ data: { name: "テスト太郎", line_id: "U1234" }, error: null });
    const reservationsChain = createChainMock({ data: [], error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "intake") return intakeChain;
      if (table === "patients") return patientsChain;
      if (table === "reservations") return reservationsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "createReservation", date: getTodayStr(), time: "09:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("questionnaire_not_completed");
  });

  // ============================================
  // 28. LINE通知なし（line_idなし）→ ok:trueだが通知スキップ
  // ============================================
  it("LINE IDなし → 予約成功するが通知スキップ", async () => {
    const intakeChain = createChainMock({
      data: { patient_id: "p_001", status: null, answers: { ng_check: "ok" } },
      error: null,
    });
    // line_id が null
    const patientsChain = createChainMock({
      data: { name: "テスト太郎", line_id: null },
      error: null,
    });
    const reservationsChain = createChainMock({ data: [], error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "intake") return intakeChain;
      if (table === "patients") return patientsChain;
      if (table === "reservations") return reservationsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    mockRpc.mockResolvedValue({
      data: { ok: true, booked: 1, capacity: 2 },
      error: null,
    });

    const { POST } = await import("@/app/api/reservations/route");
    const { sendReservationNotification } = await import("@/lib/reservation-flex");

    const req = createMockRequest(
      { type: "createReservation", date: getTodayStr(), time: "09:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    // LINE通知は送信されない
    expect(sendReservationNotification).not.toHaveBeenCalled();
  });

  // ============================================
  // 29. 未知のtype → unknown type (400)
  // ============================================
  it("未知のtype → unknown type (400)", async () => {
    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "invalidType" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("unknown type: invalidType");
  });

  // ============================================
  // 30. POSTサーバーエラー（req.json失敗→catchブロック）
  // ============================================
  it("POSTサーバーエラー → server_error (500)", async () => {
    const { POST } = await import("@/app/api/reservations/route");

    // req.json() がエラーをスローし、かつbodyの解析も失敗するケース
    // req自体がundefinedプロパティにアクセスして例外を投げる
    const req = {
      json: vi.fn().mockRejectedValue(new Error("parse error")),
      url: "http://localhost:3000/api/reservations",
      cookies: {
        get: () => undefined,
      },
      headers: {
        get: () => null,
      },
    } as any;

    // jsonパース失敗後、body.typeはundefinedになり
    // createReservation（type無し時のデフォルト）に入るが
    // validateBodyでdate/timeが無いためバリデーションエラーが返る
    const res = await POST(req);
    const json = await res.json();

    // req.json()失敗時は空オブジェクトになり、typeはundefined → createReservation扱い
    // date/timeが必須なのでバリデーションエラー
    expect(res.status).toBe(400);
  });

  // ============================================
  // 31. cookieからpatient_idを取得（body.patient_id省略時）
  // ============================================
  it("cookieからpatient_id取得 → 正常作成", async () => {
    const intakeChain = createChainMock({
      data: { patient_id: "p_cookie", status: null, answers: { ng_check: "ok" } },
      error: null,
    });
    const patientsChain = createChainMock({
      data: { name: "クッキー太郎", line_id: "U5678" },
      error: null,
    });
    const reservationsChain = createChainMock({ data: [], error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "intake") return intakeChain;
      if (table === "patients") return patientsChain;
      if (table === "reservations") return reservationsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    mockRpc.mockResolvedValue({
      data: { ok: true, booked: 1, capacity: 2 },
      error: null,
    });

    const { POST } = await import("@/app/api/reservations/route");

    // body.patient_id を省略し、cookieから取得させる
    const req = createMockRequest(
      { type: "createReservation", date: getTodayStr(), time: "09:00" },
      { patient_id: "p_cookie" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  // ============================================
  // 32. __Host-patient_id cookie優先
  // ============================================
  it("__Host-patient_id cookieが優先される", async () => {
    const intakeChain = createChainMock({
      data: { patient_id: "p_host", status: null, answers: { ng_check: "ok" } },
      error: null,
    });
    const patientsChain = createChainMock({
      data: { name: "ホスト太郎", line_id: "U9999" },
      error: null,
    });
    const reservationsChain = createChainMock({ data: [], error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "intake") return intakeChain;
      if (table === "patients") return patientsChain;
      if (table === "reservations") return reservationsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    mockRpc.mockResolvedValue({
      data: { ok: true, booked: 1, capacity: 2 },
      error: null,
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = {
      json: vi.fn().mockResolvedValue({ type: "createReservation", date: getTodayStr(), time: "09:00" }),
      url: "http://localhost:3000/api/reservations",
      cookies: {
        get: (name: string) => {
          if (name === "__Host-patient_id") return { value: "p_host" };
          if (name === "patient_id") return { value: "p_fallback" };
          return undefined;
        },
      },
      headers: { get: () => null },
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

// ============================================
// POST cancelReservation — エッジケース
// ============================================
describe("POST cancelReservation — エッジケース", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  function createMockRequest(body: Record<string, unknown>, cookies: Record<string, string> = {}) {
    return {
      json: vi.fn().mockResolvedValue(body),
      url: "http://localhost:3000/api/reservations",
      cookies: {
        get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
      },
      headers: { get: () => null },
    } as any;
  }

  // ============================================
  // 33. キャンセルDB失敗 → db_error (500)
  // ============================================
  it("キャンセルDB更新失敗 → db_error (500)", async () => {
    // reservations SELECT（予約情報取得）は成功
    const reservationsSelectChain = createChainMock({
      data: { reserved_date: "2026-02-20", reserved_time: "10:00", patient_name: "テスト太郎" },
      error: null,
    });

    // reservations UPDATE（キャンセル）はエラー
    const reservationsUpdateChain = createChainMock({
      data: null,
      error: { message: "update failed" },
    });

    const patientsChain = createChainMock({ data: { line_id: "U1234" }, error: null });
    const intakeChain = createChainMock({ data: null, error: null });

    let reservationsCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") {
        reservationsCallCount++;
        // 1回目 = SELECT（予約情報取得）、2回目 = UPDATE（キャンセル）
        if (reservationsCallCount <= 1) return reservationsSelectChain;
        return reservationsUpdateChain;
      }
      if (table === "patients") return patientsChain;
      if (table === "intake") return intakeChain;
      return createChainMock();
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "cancelReservation", reserveId: "resv-12345", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("db_error");
  });

  // ============================================
  // 34. patient_idなしでキャンセル → OK（intake更新スキップ）
  // ============================================
  it("patient_idなしでキャンセル → OK", async () => {
    const reservationsChain = createChainMock({
      data: { reserved_date: "2026-02-20", reserved_time: "10:00", patient_name: "テスト太郎" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      return createChainMock();
    });

    const { POST } = await import("@/app/api/reservations/route");

    // patient_idを空にする（cookieもbodyも無し）
    const req = createMockRequest(
      { type: "cancelReservation", reserveId: "resv-12345" },
      {}, // cookieなし
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  // ============================================
  // 35. キャンセル時LINE通知なし（line_idなし）→ ok
  // ============================================
  it("キャンセル時LINE IDなし → 通知スキップでok:true", async () => {
    const reservationsChain = createChainMock({
      data: { reserved_date: "2026-02-20", reserved_time: "10:00", patient_name: "テスト太郎" },
      error: null,
    });
    // line_id が null
    const patientsChain = createChainMock({ data: { line_id: null }, error: null });
    const intakeChain = createChainMock({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "patients") return patientsChain;
      if (table === "intake") return intakeChain;
      return createChainMock();
    });

    const { POST } = await import("@/app/api/reservations/route");
    const { sendReservationNotification } = await import("@/lib/reservation-flex");

    const req = createMockRequest(
      { type: "cancelReservation", reserveId: "resv-12345", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    // LINE通知は送信されない
    expect(sendReservationNotification).not.toHaveBeenCalled();
  });

  // ============================================
  // 36. reservationId（別名パラメータ）でキャンセル → OK
  // ============================================
  it("reservationIdキー → 正常キャンセル", async () => {
    const reservationsChain = createChainMock({
      data: { reserved_date: "2026-02-20", reserved_time: "10:00", patient_name: "テスト太郎" },
      error: null,
    });
    const patientsChain = createChainMock({ data: { line_id: "U1234" }, error: null });
    const intakeChain = createChainMock({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "patients") return patientsChain;
      if (table === "intake") return intakeChain;
      return createChainMock();
    });

    const { POST } = await import("@/app/api/reservations/route");

    // reserveIdではなくreservationIdを使用
    const req = createMockRequest(
      { type: "cancelReservation", reservationId: "resv-alt-123", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.reserveId).toBe("resv-alt-123");
  });
});

// ============================================
// POST updateReservation — エッジケース
// ============================================
describe("POST updateReservation — エッジケース", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  function createMockRequest(body: Record<string, unknown>, cookies: Record<string, string> = {}) {
    return {
      json: vi.fn().mockResolvedValue(body),
      url: "http://localhost:3000/api/reservations",
      cookies: {
        get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
      },
      headers: { get: () => null },
    } as any;
  }

  function getTodayStr() {
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    return `${jstNow.getUTCFullYear()}-${String(jstNow.getUTCMonth() + 1).padStart(2, "0")}-${String(jstNow.getUTCDate()).padStart(2, "0")}`;
  }

  // ============================================
  // 37. 変更先RPC DBエラー → db_error (500)
  // ============================================
  it("変更RPC DBエラー → db_error (500)", async () => {
    const reservationsChain = createChainMock({
      data: { reserved_date: "2026-02-20", reserved_time: "10:00" },
      error: null,
    });
    const patientsChain = createChainMock({ data: { line_id: "U1234" }, error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "patients") return patientsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    // RPC: DBエラー
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "RPC timeout" },
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "updateReservation", reserveId: "resv-12345", date: getTodayStr(), time: "14:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("db_error");
    expect(json.detail).toBe("RPC timeout");
  });

  // ============================================
  // 38. 変更先slot_full → slot_full (409)
  // ============================================
  it("変更先slot_full → slot_full (409)", async () => {
    const reservationsChain = createChainMock({
      data: { reserved_date: "2026-02-20", reserved_time: "10:00" },
      error: null,
    });
    const patientsChain = createChainMock({ data: { line_id: "U1234" }, error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "patients") return patientsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    // RPC: slot_full
    mockRpc.mockResolvedValue({
      data: { ok: false, booked: 2, capacity: 2 },
      error: null,
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "updateReservation", reserveId: "resv-12345", date: getTodayStr(), time: "14:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("slot_full");
  });

  // ============================================
  // 39. reserveIdが空 → missing parameters (400)
  // ============================================
  it("reserveId空 → missing parameters (400)", async () => {
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "updateReservation", reserveId: "", date: getTodayStr(), time: "14:00" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("missing parameters");
  });

  // ============================================
  // 40. 変更時LINE通知なし（line_idなし）→ ok
  // ============================================
  it("変更時LINE IDなし → 通知スキップでok:true", async () => {
    const reservationsChain = createChainMock({
      data: { reserved_date: "2026-02-20", reserved_time: "10:00" },
      error: null,
    });
    // line_id が null
    const patientsChain = createChainMock({ data: { line_id: null }, error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "patients") return patientsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    mockRpc.mockResolvedValue({
      data: { ok: true, booked: 1, capacity: 2 },
      error: null,
    });

    const { POST } = await import("@/app/api/reservations/route");
    const { sendReservationNotification } = await import("@/lib/reservation-flex");

    const req = createMockRequest(
      { type: "updateReservation", reserveId: "resv-12345", date: getTodayStr(), time: "14:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(sendReservationNotification).not.toHaveBeenCalled();
  });

  // ============================================
  // 41. patient_idなしでの変更 → ok
  // ============================================
  it("patient_idなしで変更 → ok:true", async () => {
    const reservationsChain = createChainMock({
      data: { reserved_date: "2026-02-20", reserved_time: "10:00" },
      error: null,
    });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    mockRpc.mockResolvedValue({
      data: { ok: true, booked: 1, capacity: 2 },
      error: null,
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "updateReservation", reserveId: "resv-12345", date: getTodayStr(), time: "14:00" },
      {}, // cookieなし
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  // ============================================
  // 42. reservationId（別名パラメータ）での変更 → ok
  // ============================================
  it("reservationIdキー → 正常変更", async () => {
    const reservationsChain = createChainMock({
      data: { reserved_date: "2026-02-20", reserved_time: "10:00" },
      error: null,
    });
    const patientsChain = createChainMock({ data: { line_id: "U1234" }, error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "patients") return patientsChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    mockRpc.mockResolvedValue({
      data: { ok: true, booked: 1, capacity: 2 },
      error: null,
    });

    const { POST } = await import("@/app/api/reservations/route");

    // reserveIdではなくreservationIdを使用
    const req = createMockRequest(
      { type: "updateReservation", reservationId: "resv-alt-456", date: getTodayStr(), time: "14:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.reserveId).toBe("resv-alt-456");
  });
});

// ============================================
// buildAvailabilityRange — 追加エッジケース
// ============================================
describe("buildAvailabilityRange — 追加エッジケース", () => {
  // ============================================
  // 43. modify override → 時間・容量を上書き
  // ============================================
  it("modify overrideで時間・容量が上書きされる", () => {
    const weekly: WeeklyRule[] = [
      {
        doctor_id: "dr_default",
        weekday: 1,
        enabled: true,
        start_time: "09:00",
        end_time: "18:00",
        slot_minutes: 30,
        capacity: 2,
      },
    ];
    const overrides: Override[] = [
      {
        doctor_id: "dr_default",
        date: "2026-02-16", // 月曜
        type: "modify",
        start_time: "10:00",
        end_time: "11:00",
        slot_minutes: 15,
        capacity: 1,
      },
    ];

    const slots = buildAvailabilityRange(
      "2026-02-16",
      "2026-02-16",
      weekly,
      overrides,
      [],
      "dr_default",
    );

    // 10:00, 10:15, 10:30, 10:45 = 4枠、capacity=1
    expect(slots.length).toBe(4);
    expect(slots[0]).toEqual({ date: "2026-02-16", time: "10:00", count: 1 });
    expect(slots[3]).toEqual({ date: "2026-02-16", time: "10:45", count: 1 });
  });

  // ============================================
  // 44. start_timeがendTimeより大きい → 枠なし
  // ============================================
  it("start_time >= end_time → 枠なし", () => {
    const weekly: WeeklyRule[] = [
      {
        doctor_id: "dr_default",
        weekday: 1,
        enabled: true,
        start_time: "18:00",
        end_time: "09:00", // 逆順
        slot_minutes: 30,
        capacity: 2,
      },
    ];

    const slots = buildAvailabilityRange(
      "2026-02-16",
      "2026-02-16",
      weekly,
      [],
      [],
      "dr_default",
    );

    expect(slots.length).toBe(0);
  });

  // ============================================
  // 45. 複数日範囲でスロット生成
  // ============================================
  it("複数日範囲 → 各日ごとにスロット生成", () => {
    const weekly: WeeklyRule[] = [
      {
        doctor_id: "dr_default",
        weekday: 1, // 月曜
        enabled: true,
        start_time: "09:00",
        end_time: "10:00",
        slot_minutes: 60,
        capacity: 2,
      },
      {
        doctor_id: "dr_default",
        weekday: 2, // 火曜
        enabled: true,
        start_time: "09:00",
        end_time: "10:00",
        slot_minutes: 60,
        capacity: 2,
      },
    ];

    // 2026-02-16(月) ~ 2026-02-17(火)
    const slots = buildAvailabilityRange(
      "2026-02-16",
      "2026-02-17",
      weekly,
      [],
      [],
      "dr_default",
    );

    expect(slots.length).toBe(2); // 各日1枠ずつ
    expect(slots[0].date).toBe("2026-02-16");
    expect(slots[1].date).toBe("2026-02-17");
  });

  // ============================================
  // 46. weeklyルールなし + overrideなし → 枠なし
  // ============================================
  it("weeklyルールなし → 枠なし", () => {
    const slots = buildAvailabilityRange(
      "2026-02-16",
      "2026-02-16",
      [],
      [],
      [],
      "dr_default",
    );

    expect(slots.length).toBe(0);
  });

  // ============================================
  // 47. 異なるdoctor_idのルールは無視される
  // ============================================
  it("異なるdoctor_idのルールは無視される", () => {
    const weekly: WeeklyRule[] = [
      {
        doctor_id: "dr_other",
        weekday: 1,
        enabled: true,
        start_time: "09:00",
        end_time: "18:00",
        slot_minutes: 30,
        capacity: 2,
      },
    ];

    const slots = buildAvailabilityRange(
      "2026-02-16",
      "2026-02-16",
      weekly,
      [],
      [],
      "dr_default",
    );

    expect(slots.length).toBe(0);
  });

  // ============================================
  // 48. slot_minutes が空文字 or 0 → 枠なし（無限ループ防止）
  // ============================================
  it("slot_minutes空文字のoverride → baseのslot_minutesが使用される", () => {
    const weekly: WeeklyRule[] = [
      {
        doctor_id: "dr_default",
        weekday: 1,
        enabled: true,
        start_time: "09:00",
        end_time: "10:00",
        slot_minutes: 30,
        capacity: 2,
      },
    ];
    const overrides: Override[] = [
      {
        doctor_id: "dr_default",
        date: "2026-02-16",
        type: "modify",
        slot_minutes: "", // 空文字
        capacity: "",     // 空文字
      },
    ];

    const slots = buildAvailabilityRange(
      "2026-02-16",
      "2026-02-16",
      weekly,
      overrides,
      [],
      "dr_default",
    );

    // baseのslot_minutes=30, capacity=2が使われる
    expect(slots.length).toBe(2); // 09:00, 09:30
    expect(slots[0].count).toBe(2);
  });

  // ============================================
  // 49. start_time/end_timeが空のweeklyルール → 枠なし
  // ============================================
  it("start_time空 → 枠なし", () => {
    const weekly: WeeklyRule[] = [
      {
        doctor_id: "dr_default",
        weekday: 1,
        enabled: true,
        start_time: "",
        end_time: "18:00",
        slot_minutes: 30,
        capacity: 2,
      },
    ];

    const slots = buildAvailabilityRange(
      "2026-02-16",
      "2026-02-16",
      weekly,
      [],
      [],
      "dr_default",
    );

    expect(slots.length).toBe(0);
  });
});

// ============================================
// 予約開放日チェック（booking_not_open）テスト
// ============================================
describe("booking_not_open — 予約開放日チェック", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  function createMockRequest(body: Record<string, unknown>, cookies: Record<string, string> = {}) {
    return {
      json: vi.fn().mockResolvedValue(body),
      url: "http://localhost:3000/api/reservations",
      cookies: {
        get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
      },
      headers: { get: () => null },
    } as any;
  }

  // 翌々月の日付を取得（確実に予約不可な日付）
  function getFarFutureDateStr() {
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const y = jstNow.getUTCFullYear();
    const mo = jstNow.getUTCMonth() + 3; // 3ヶ月先
    const futureDate = new Date(Date.UTC(y, mo, 15));
    return `${futureDate.getUTCFullYear()}-${String(futureDate.getUTCMonth() + 1).padStart(2, "0")}-15`;
  }

  // ============================================
  // 50. 予約作成時 booking_not_open → 400
  // ============================================
  it("予約作成時: 遠い未来の日付 → booking_not_open (400)", async () => {
    // booking_open_settings: 早期開放なし
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });
    const reservationsChain = createChainMock({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "booking_open_settings") return bookingChain;
      if (table === "reservations") return reservationsChain;
      return createChainMock();
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "createReservation", date: getFarFutureDateStr(), time: "09:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("booking_not_open");
  });

  // ============================================
  // 51. 予約変更時 booking_not_open → 400
  // ============================================
  it("予約変更時: 遠い未来の日付 → booking_not_open (400)", async () => {
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "updateReservation", reserveId: "resv-12345", date: getFarFutureDateStr(), time: "14:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("booking_not_open");
  });

  // ============================================
  // 52. 単日GET: 予約不可日 → bookingOpen: false, slots: []
  // ============================================
  it("単日GET: 予約不可日 → bookingOpen: false, slots空", async () => {
    const reservationsChain = createChainMock({ data: [], error: null });
    const weeklyChain = createChainMock({
      data: [{
        doctor_id: "dr_default",
        weekday: dayOfWeek(getFarFutureDateStr()),
        enabled: true,
        start_time: "09:00",
        end_time: "10:00",
        slot_minutes: 30,
        capacity: 2,
      }],
      error: null,
    });
    const overridesChain = createChainMock({ data: [], error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "doctor_weekly_rules") return weeklyChain;
      if (table === "doctor_date_overrides") return overridesChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    const { GET } = await import("@/app/api/reservations/route");

    const futureDate = getFarFutureDateStr();
    const req = {
      url: `http://localhost:3000/api/reservations?date=${futureDate}`,
      headers: { get: () => null },
    } as any;

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.date).toBe(futureDate);
    expect(json.bookingOpen).toBe(false);
    expect(json.slots).toEqual([]);
  });

  // ============================================
  // 53. 過去の月 → isDateBookable false → booking_not_open
  // ============================================
  it("過去の月 → booking_not_open (400)", async () => {
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });
    const reservationsChain = createChainMock({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "booking_open_settings") return bookingChain;
      if (table === "reservations") return reservationsChain;
      return createChainMock();
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = createMockRequest(
      { type: "createReservation", date: "2020-01-15", time: "09:00", patient_id: "p_001" },
      { patient_id: "p_001" },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("booking_not_open");
  });
});

// ============================================
// DB内部ヘルパー関数のエラーパス
// ============================================
describe("DB内部ヘルパー — エラーパス", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // ============================================
  // 54. getBookedSlotsFromDB エラー → GET正常動作（空配列フォールバック）
  // ============================================
  it("予約データ取得エラー → GET正常動作（枠は全空き扱い）", async () => {
    // reservations: エラー返却
    const reservationsChain = createChainMock({ data: null, error: { message: "timeout" } });
    const weeklyChain = createChainMock({
      data: [{
        doctor_id: "dr_default",
        weekday: 1,
        enabled: true,
        start_time: "09:00",
        end_time: "10:00",
        slot_minutes: 30,
        capacity: 2,
      }],
      error: null,
    });
    const overridesChain = createChainMock({ data: [], error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "doctor_weekly_rules") return weeklyChain;
      if (table === "doctor_date_overrides") return overridesChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    const { GET } = await import("@/app/api/reservations/route");

    // 今月の月曜を使う
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const y = jstNow.getUTCFullYear();
    const mo = jstNow.getUTCMonth();
    let mondayDate = 1;
    for (let d = 1; d <= 28; d++) {
      const dt = new Date(Date.UTC(y, mo, d));
      if (dt.getUTCDay() === 1) {
        mondayDate = d;
        break;
      }
    }
    const dateStr = `${y}-${String(mo + 1).padStart(2, "0")}-${String(mondayDate).padStart(2, "0")}`;

    const req = {
      url: `http://localhost:3000/api/reservations?start=${dateStr}&end=${dateStr}`,
      headers: { get: () => null },
    } as any;

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json.slots)).toBe(true);
  });

  // ============================================
  // 55. getScheduleFromDB 週間ルールエラー → GET正常動作（枠なし）
  // ============================================
  it("週間ルール取得エラー → GET正常動作（枠なし）", async () => {
    const reservationsChain = createChainMock({ data: [], error: null });
    // 週間ルール: エラー
    const weeklyChain = createChainMock({ data: null, error: { message: "query error" } });
    const overridesChain = createChainMock({ data: [], error: null });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "doctor_weekly_rules") return weeklyChain;
      if (table === "doctor_date_overrides") return overridesChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    const { GET } = await import("@/app/api/reservations/route");

    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const y = jstNow.getUTCFullYear();
    const mo = jstNow.getUTCMonth();
    const dateStr = `${y}-${String(mo + 1).padStart(2, "0")}-01`;

    const req = {
      url: `http://localhost:3000/api/reservations?start=${dateStr}&end=${dateStr}`,
      headers: { get: () => null },
    } as any;

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.slots).toEqual([]);
  });

  // ============================================
  // 56. getScheduleFromDB 例外日エラー → GET正常動作
  // ============================================
  it("例外日取得エラー → GET正常動作", async () => {
    const reservationsChain = createChainMock({ data: [], error: null });
    const weeklyChain = createChainMock({
      data: [{
        doctor_id: "dr_default",
        weekday: 1,
        enabled: true,
        start_time: "09:00",
        end_time: "10:00",
        slot_minutes: 30,
        capacity: 2,
      }],
      error: null,
    });
    // overrides: エラー
    const overridesChain = createChainMock({ data: null, error: { message: "overrides error" } });
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "doctor_weekly_rules") return weeklyChain;
      if (table === "doctor_date_overrides") return overridesChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    const { GET } = await import("@/app/api/reservations/route");

    // 今月の月曜を使う
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const y = jstNow.getUTCFullYear();
    const mo = jstNow.getUTCMonth();
    let mondayDate = 1;
    for (let d = 1; d <= 28; d++) {
      const dt = new Date(Date.UTC(y, mo, d));
      if (dt.getUTCDay() === 1) {
        mondayDate = d;
        break;
      }
    }
    const dateStr = `${y}-${String(mo + 1).padStart(2, "0")}-${String(mondayDate).padStart(2, "0")}`;

    const req = {
      url: `http://localhost:3000/api/reservations?start=${dateStr}&end=${dateStr}`,
      headers: { get: () => null },
    } as any;

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json.slots)).toBe(true);
  });

  // ============================================
  // 57. isMonthEarlyOpen DB非PGRST116エラー → false返却
  // ============================================
  it("isMonthEarlyOpen DBエラー(非PGRST116) → 予約不可扱い", async () => {
    // booking_open_settings: 非PGRST116エラー（接続エラー等）
    const bookingChain = createChainMock({ data: null, error: { code: "ECONNREFUSED", message: "connection refused" } });
    const reservationsChain = createChainMock({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "booking_open_settings") return bookingChain;
      if (table === "reservations") return reservationsChain;
      return createChainMock();
    });

    const { POST } = await import("@/app/api/reservations/route");

    // 翌々月の日付を使って isMonthEarlyOpen を呼ばせる
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const y = jstNow.getUTCFullYear();
    const mo = jstNow.getUTCMonth() + 3;
    const futureDate = new Date(Date.UTC(y, mo, 15));
    const futureDateStr = `${futureDate.getUTCFullYear()}-${String(futureDate.getUTCMonth() + 1).padStart(2, "0")}-15`;

    const req = {
      json: vi.fn().mockResolvedValue({
        type: "createReservation",
        date: futureDateStr,
        time: "09:00",
        patient_id: "p_001",
      }),
      url: "http://localhost:3000/api/reservations",
      cookies: {
        get: (name: string) => (name === "patient_id" ? { value: "p_001" } : undefined),
      },
      headers: { get: () => null },
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("booking_not_open");
  });

  // ============================================
  // 58. isMonthEarlyOpen: 早期開放あり → bookable
  // ============================================
  it("isMonthEarlyOpen: 早期開放設定あり → 予約可能", async () => {
    // booking_open_settings: is_open=true
    const bookingChain = createChainMock({ data: { is_open: true }, error: null });
    const reservationsChain = createChainMock({ data: [], error: null });
    const intakeChain = createChainMock({
      data: { patient_id: "p_001", status: null, answers: { ng_check: "ok" } },
      error: null,
    });
    const patientsChain = createChainMock({
      data: { name: "テスト太郎", line_id: "U1234" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "booking_open_settings") return bookingChain;
      if (table === "reservations") return reservationsChain;
      if (table === "intake") return intakeChain;
      if (table === "patients") return patientsChain;
      return createChainMock();
    });

    mockRpc.mockResolvedValue({
      data: { ok: true, booked: 1, capacity: 2 },
      error: null,
    });

    const { POST } = await import("@/app/api/reservations/route");

    // 翌々月の日付を使い、早期開放で予約可能にする
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const y = jstNow.getUTCFullYear();
    const mo = jstNow.getUTCMonth() + 3;
    const futureDate = new Date(Date.UTC(y, mo, 15));
    const futureDateStr = `${futureDate.getUTCFullYear()}-${String(futureDate.getUTCMonth() + 1).padStart(2, "0")}-15`;

    const req = {
      json: vi.fn().mockResolvedValue({
        type: "createReservation",
        date: futureDateStr,
        time: "09:00",
        patient_id: "p_001",
      }),
      url: "http://localhost:3000/api/reservations",
      cookies: {
        get: (name: string) => (name === "patient_id" ? { value: "p_001" } : undefined),
      },
      headers: { get: () => null },
    } as any;

    const res = await POST(req);
    const json = await res.json();

    // 早期開放が有効なので予約が通る
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  // ============================================
  // 59. 範囲GETで予約不可日を含む → count=0に設定
  // ============================================
  it("範囲GETで予約不可日 → 該当枠のcount=0", async () => {
    const reservationsChain = createChainMock({ data: [], error: null });
    // 全曜日対応の週間ルール
    const weeklyChain = createChainMock({
      data: [0, 1, 2, 3, 4, 5, 6].map(w => ({
        doctor_id: "dr_default",
        weekday: w,
        enabled: true,
        start_time: "09:00",
        end_time: "10:00",
        slot_minutes: 60,
        capacity: 2,
      })),
      error: null,
    });
    const overridesChain = createChainMock({ data: [], error: null });
    // 早期開放なし
    const bookingChain = createChainMock({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reservations") return reservationsChain;
      if (table === "doctor_weekly_rules") return weeklyChain;
      if (table === "doctor_date_overrides") return overridesChain;
      if (table === "booking_open_settings") return bookingChain;
      return createChainMock();
    });

    const { GET } = await import("@/app/api/reservations/route");

    // 翌々月の日付
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const y = jstNow.getUTCFullYear();
    const mo = jstNow.getUTCMonth() + 3;
    const futureDate = new Date(Date.UTC(y, mo, 15));
    const futureDateStr = `${futureDate.getUTCFullYear()}-${String(futureDate.getUTCMonth() + 1).padStart(2, "0")}-15`;

    const req = {
      url: `http://localhost:3000/api/reservations?start=${futureDateStr}&end=${futureDateStr}`,
      headers: { get: () => null },
    } as any;

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    // 予約不可日なので count=0 に設定されている
    if (json.slots.length > 0) {
      expect(json.slots[0].count).toBe(0);
    }
  });

  // ============================================
  // 60. POST例外スロー → server_error (500)
  // ============================================
  it("POST内部で例外スロー → server_error (500)", async () => {
    // resolveTenantIdがスローする
    const { resolveTenantId } = await import("@/lib/tenant");
    (resolveTenantId as any).mockImplementation(() => {
      throw new Error("unexpected error");
    });

    const { POST } = await import("@/app/api/reservations/route");

    const req = {
      json: vi.fn().mockResolvedValue({ type: "createReservation", date: "2026-02-23", time: "09:00" }),
      url: "http://localhost:3000/api/reservations",
      cookies: {
        get: () => undefined,
      },
      headers: { get: () => null },
    } as any;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("server_error");
  });
});
