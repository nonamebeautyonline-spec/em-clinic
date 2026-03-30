// __tests__/api/cron-generate-reminders.test.ts
// リマインド生成 Cron API のテスト
// 対象: app/api/cron/generate-reminders/route.ts

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

// === Supabaseチェーンモック ===
type SupabaseChain = Record<string, Mock> & { then: Mock };

function createChain(defaultResolve = { data: null, error: null }): SupabaseChain {
  const chain = {} as SupabaseChain;
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv","like","head"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
function getOrCreateChain(table: string): SupabaseChain {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// === モック定義 ===
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((q: SupabaseChain) => q),
  strictWithTenant: vi.fn((q: SupabaseChain) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

const mockPushMessage = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/line-push", () => ({
  pushMessage: (...args: unknown[]) => mockPushMessage(...args),
}));

vi.mock("@/lib/reservation-flex", () => ({
  buildReminderFlex: vi.fn().mockResolvedValue({
    altText: "予約リマインド",
    contents: { type: "bubble", body: { type: "box", layout: "vertical", contents: [] } },
  }),
}));

vi.mock("@/lib/auto-reminder", () => ({
  getJSTToday: vi.fn().mockReturnValue("2026-03-30"),
  addOneDay: vi.fn().mockReturnValue("2026-03-31"),
  addDays: vi.fn((_today: string, days: number) => {
    const d = new Date("2026-03-30");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }),
  formatReservationTime: vi.fn().mockReturnValue("2026/3/30 14:00-14:15"),
  buildReminderMessage: vi.fn().mockReturnValue("本日、診療のご予約がございます。\n\n予約日時：2026/3/30 14:00-14:15"),
  isInSendWindow: vi.fn().mockReturnValue(true),
  isReservationInHoursWindow: vi.fn().mockReturnValue(true),
}));

const mockAcquireLock = vi.fn();
vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: (...args: unknown[]) => mockAcquireLock(...args),
}));

vi.mock("@/lib/notifications/cron-failure", () => ({
  notifyCronFailure: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from "@/app/api/cron/generate-reminders/route";
import { isInSendWindow, isReservationInHoursWindow } from "@/lib/auto-reminder";

// === テスト本体 ===
describe("GET /api/cron/generate-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockAcquireLock.mockResolvedValue({ acquired: true, release: vi.fn() });
  });

  // ------------------------------------------------------------------
  // 認証テスト
  // ------------------------------------------------------------------
  describe("Cron認証", () => {
    it("CRON_SECRET不一致の場合は401を返す", async () => {
      process.env.CRON_SECRET = "valid-secret";
      const req = new NextRequest("http://localhost/api/cron/generate-reminders", {
        headers: { authorization: "Bearer wrong-secret" },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
      delete process.env.CRON_SECRET;
    });
  });

  // ------------------------------------------------------------------
  // 排他制御テスト
  // ------------------------------------------------------------------
  describe("排他制御", () => {
    it("ロック取得失敗時はスキップレスポンスを返す", async () => {
      mockAcquireLock.mockResolvedValue({ acquired: false, release: vi.fn() });

      const req = new NextRequest("http://localhost/api/cron/generate-reminders");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.skipped).toBe("別のプロセスが実行中");
    });
  });

  // ------------------------------------------------------------------
  // ルールなしテスト
  // ------------------------------------------------------------------
  describe("ルールなし", () => {
    it("有効なルールがない場合は sent=0 で終了", async () => {
      tableChains["reminder_rules"] = createChain({ data: [], error: null });

      const req = new NextRequest("http://localhost/api/cron/generate-reminders");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.sent).toBe(0);
    });

    it("ルール取得エラーの場合は500を返す", async () => {
      tableChains["reminder_rules"] = createChain({ data: null, error: { message: "DB error" } });

      const req = new NextRequest("http://localhost/api/cron/generate-reminders");
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------
  // fixed_time ルールテスト
  // ------------------------------------------------------------------
  describe("fixed_time ルール", () => {
    it("対象日の予約にリマインドを送信する", async () => {
      const rule = {
        id: 1,
        tenant_id: "test-tenant",
        timing_type: "fixed_time",
        timing_value: 0,
        target_day_offset: 0,
        send_hour: null,
        send_minute: null,
        is_enabled: true,
        message_format: "text",
        message_template: "明日の予約: {date} {time}",
      };

      tableChains["reminder_rules"] = createChain({ data: [rule], error: null });
      // 予約データ
      tableChains["reservations"] = createChain({
        data: [{
          id: "rsv-1",
          patient_id: "PT-001",
          patient_name: "田中太郎",
          reserved_date: "2026-03-30",
          reserved_time: "14:00:00",
        }],
        error: null,
      });
      // 送信済みログなし
      tableChains["reminder_sent_log"] = createChain({ data: [], error: null });
      // 患者情報
      tableChains["patients"] = createChain({
        data: [{ patient_id: "PT-001", name: "田中太郎", line_id: "U001" }],
        error: null,
      });
      tableChains["message_log"] = createChain({ data: null, error: null });

      const req = new NextRequest("http://localhost/api/cron/generate-reminders?offset=0");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.sent).toBe(1);
      expect(mockPushMessage).toHaveBeenCalledWith(
        "U001",
        expect.any(Array),
        "test-tenant"
      );
    });

    it("送信済みの予約はスキップする", async () => {
      const rule = {
        id: 2,
        tenant_id: "test-tenant",
        timing_type: "fixed_time",
        timing_value: 0,
        target_day_offset: 0,
        send_hour: null,
        send_minute: null,
        is_enabled: true,
        message_format: "text",
        message_template: null,
      };

      tableChains["reminder_rules"] = createChain({ data: [rule], error: null });
      tableChains["reservations"] = createChain({
        data: [{
          id: "rsv-2",
          patient_id: "PT-002",
          patient_name: "鈴木花子",
          reserved_date: "2026-03-30",
          reserved_time: "15:00:00",
        }],
        error: null,
      });
      // 既に送信済み
      tableChains["reminder_sent_log"] = createChain({
        data: [{ reservation_id: "rsv-2" }],
        error: null,
      });

      const req = new NextRequest("http://localhost/api/cron/generate-reminders?offset=0");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.sent).toBe(0);
      expect(mockPushMessage).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // before_days ルールテスト
  // ------------------------------------------------------------------
  describe("before_days ルール", () => {
    it("N日前のルールで対象日を計算して送信する", async () => {
      const rule = {
        id: 3,
        tenant_id: "test-tenant",
        timing_type: "before_days",
        timing_value: 1,
        target_day_offset: 0,
        send_hour: 9,
        send_minute: 0,
        is_enabled: true,
        message_format: "text",
        message_template: "{name}様、明日 {time} にご予約がございます。",
      };

      tableChains["reminder_rules"] = createChain({ data: [rule], error: null });
      // addDays("2026-03-30", 1) = "2026-03-31"
      tableChains["reservations"] = createChain({
        data: [{
          id: "rsv-bd1",
          patient_id: "PT-BD1",
          patient_name: "山田一郎",
          reserved_date: "2026-03-31",
          reserved_time: "10:30:00",
        }],
        error: null,
      });
      tableChains["reminder_sent_log"] = createChain({ data: [], error: null });
      tableChains["patients"] = createChain({
        data: [{ patient_id: "PT-BD1", name: "山田一郎", line_id: "Ubd1" }],
        error: null,
      });
      tableChains["message_log"] = createChain({ data: null, error: null });

      const req = new NextRequest("http://localhost/api/cron/generate-reminders?type=relative");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.sent).toBe(1);
    });

    it("送信時間帯外の場合はスキップする", async () => {
      vi.mocked(isInSendWindow).mockReturnValue(false);

      const rule = {
        id: 4,
        tenant_id: "test-tenant",
        timing_type: "before_days",
        timing_value: 1,
        target_day_offset: 0,
        send_hour: 9,
        send_minute: 0,
        is_enabled: true,
        message_format: "text",
        message_template: null,
      };

      tableChains["reminder_rules"] = createChain({ data: [rule], error: null });

      const req = new NextRequest("http://localhost/api/cron/generate-reminders?type=relative");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.sent).toBe(0);
      expect(mockPushMessage).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // before_hours ルールテスト
  // ------------------------------------------------------------------
  describe("before_hours ルール", () => {
    it("N時間前のウィンドウ内の予約に送信する", async () => {
      vi.mocked(isInSendWindow).mockReturnValue(true);
      vi.mocked(isReservationInHoursWindow).mockReturnValue(true);

      const rule = {
        id: 5,
        tenant_id: "test-tenant",
        timing_type: "before_hours",
        timing_value: 2,
        target_day_offset: 0,
        send_hour: null,
        send_minute: null,
        is_enabled: true,
        message_format: "text",
        message_template: "まもなく予約時間です",
      };

      tableChains["reminder_rules"] = createChain({ data: [rule], error: null });
      tableChains["reservations"] = createChain({
        data: [{
          id: "rsv-bh1",
          patient_id: "PT-BH1",
          patient_name: "佐藤次郎",
          reserved_date: "2026-03-30",
          reserved_time: "16:00:00",
        }],
        error: null,
      });
      tableChains["reminder_sent_log"] = createChain({ data: [], error: null });
      tableChains["patients"] = createChain({
        data: [{ patient_id: "PT-BH1", name: "佐藤次郎", line_id: "Ubh1" }],
        error: null,
      });
      tableChains["message_log"] = createChain({ data: null, error: null });

      const req = new NextRequest("http://localhost/api/cron/generate-reminders?type=relative");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.sent).toBe(1);
    });

    it("ウィンドウ外の予約には送信しない", async () => {
      vi.mocked(isReservationInHoursWindow).mockReturnValue(false);

      const rule = {
        id: 6,
        tenant_id: "test-tenant",
        timing_type: "before_hours",
        timing_value: 3,
        target_day_offset: 0,
        send_hour: null,
        send_minute: null,
        is_enabled: true,
        message_format: "text",
        message_template: null,
      };

      tableChains["reminder_rules"] = createChain({ data: [rule], error: null });
      tableChains["reservations"] = createChain({
        data: [{
          id: "rsv-bh2",
          patient_id: "PT-BH2",
          patient_name: "高橋三郎",
          reserved_date: "2026-03-30",
          reserved_time: "20:00:00",
        }],
        error: null,
      });

      const req = new NextRequest("http://localhost/api/cron/generate-reminders?type=relative");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.sent).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // LINE ID なしテスト
  // ------------------------------------------------------------------
  describe("LINE IDなし", () => {
    it("line_idがない患者にはリマインドを送信しない", async () => {
      const rule = {
        id: 7,
        tenant_id: "test-tenant",
        timing_type: "fixed_time",
        timing_value: 0,
        target_day_offset: 0,
        send_hour: null,
        send_minute: null,
        is_enabled: true,
        message_format: "text",
        message_template: null,
      };

      tableChains["reminder_rules"] = createChain({ data: [rule], error: null });
      tableChains["reservations"] = createChain({
        data: [{
          id: "rsv-nl",
          patient_id: "PT-NL",
          patient_name: "LINE無し患者",
          reserved_date: "2026-03-30",
          reserved_time: "11:00:00",
        }],
        error: null,
      });
      tableChains["reminder_sent_log"] = createChain({ data: [], error: null });
      // line_idがnull
      tableChains["patients"] = createChain({
        data: [{ patient_id: "PT-NL", name: "LINE無し患者", line_id: null }],
        error: null,
      });

      const req = new NextRequest("http://localhost/api/cron/generate-reminders?offset=0");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.sent).toBe(0);
      expect(mockPushMessage).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // Flex メッセージフォーマットテスト
  // ------------------------------------------------------------------
  describe("Flexメッセージフォーマット", () => {
    it("message_format=flex の場合はFlex Messageを送信する", async () => {
      const rule = {
        id: 8,
        tenant_id: "test-tenant",
        timing_type: "fixed_time",
        timing_value: 0,
        target_day_offset: 0,
        send_hour: null,
        send_minute: null,
        is_enabled: true,
        message_format: "flex",
        message_template: null,
      };

      tableChains["reminder_rules"] = createChain({ data: [rule], error: null });
      tableChains["reservations"] = createChain({
        data: [{
          id: "rsv-flex",
          patient_id: "PT-FLX",
          patient_name: "Flex患者",
          reserved_date: "2026-03-30",
          reserved_time: "13:00:00",
        }],
        error: null,
      });
      tableChains["reminder_sent_log"] = createChain({ data: [], error: null });
      tableChains["patients"] = createChain({
        data: [{ patient_id: "PT-FLX", name: "Flex患者", line_id: "Uflx" }],
        error: null,
      });
      tableChains["message_log"] = createChain({ data: null, error: null });

      const req = new NextRequest("http://localhost/api/cron/generate-reminders?offset=0");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.sent).toBe(1);

      // Flexメッセージが送信される
      const callArgs = mockPushMessage.mock.calls[0];
      expect(callArgs[1][0].type).toBe("flex");
    });
  });

  // ------------------------------------------------------------------
  // ロック解放テスト
  // ------------------------------------------------------------------
  describe("ロック解放", () => {
    it("正常終了時にロックが解放される", async () => {
      const releaseMock = vi.fn();
      mockAcquireLock.mockResolvedValue({ acquired: true, release: releaseMock });
      tableChains["reminder_rules"] = createChain({ data: [], error: null });

      const req = new NextRequest("http://localhost/api/cron/generate-reminders");
      await GET(req);
      expect(releaseMock).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // 予約なしテスト
  // ------------------------------------------------------------------
  describe("予約なし", () => {
    it("対象日に予約がない場合は送信しない", async () => {
      const rule = {
        id: 9,
        tenant_id: "test-tenant",
        timing_type: "fixed_time",
        timing_value: 0,
        target_day_offset: 0,
        send_hour: null,
        send_minute: null,
        is_enabled: true,
        message_format: "text",
        message_template: null,
      };

      tableChains["reminder_rules"] = createChain({ data: [rule], error: null });
      // 予約なし
      tableChains["reservations"] = createChain({ data: [], error: null });

      const req = new NextRequest("http://localhost/api/cron/generate-reminders?offset=0");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.sent).toBe(0);
    });
  });
});
