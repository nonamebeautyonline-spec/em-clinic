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
    expect(json.error).toBe("missing parameters");
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
});
