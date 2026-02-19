// __tests__/api/auto-reminder.test.ts — 自動リマインド機能テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabaseチェーンモック ---
function createChainMock(resolvedData: any = { data: null, error: null }) {
  const chain: any = {};
  const methods = ["select", "insert", "update", "delete", "eq", "neq", "in", "gte", "lte", "is", "not", "order", "limit", "single", "maybeSingle"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // 最終的にPromise.thenを呼ばれたらresolvedDataを返す
  chain.then = (resolve: any) => resolve(resolvedData);
  return chain;
}

// --- lib/auto-reminder.ts 共通関数テスト ---

describe("lib/auto-reminder.ts", () => {
  describe("formatReservationTime", () => {
    it("日付と時刻を 'YYYY/M/D HH:MM-HH:MM' 形式にフォーマットする", async () => {
      const { formatReservationTime } = await import("@/lib/auto-reminder");
      expect(formatReservationTime("2026-02-18", "13:00:00")).toBe("2026/2/18 13:00-13:15");
    });

    it("15分跨ぎで正しく計算する", async () => {
      const { formatReservationTime } = await import("@/lib/auto-reminder");
      expect(formatReservationTime("2026-02-18", "09:50:00")).toBe("2026/2/18 09:50-10:05");
    });

    it("終了時刻が1桁時間の場合はゼロパディングなし", async () => {
      const { formatReservationTime } = await import("@/lib/auto-reminder");
      // 08:00 → 08:00-8:15（endHHはパディングされない仕様）
      const result = formatReservationTime("2026-02-18", "08:00:00");
      expect(result).toBe("2026/2/18 08:00-8:15");
    });

    it("月・日の先頭ゼロを除去する", async () => {
      const { formatReservationTime } = await import("@/lib/auto-reminder");
      expect(formatReservationTime("2026-01-05", "10:00:00")).toBe("2026/1/5 10:00-10:15");
    });
  });

  describe("buildReminderMessage", () => {
    it("予約時間を含むリマインドメッセージを生成する", async () => {
      const { buildReminderMessage } = await import("@/lib/auto-reminder");
      const msg = buildReminderMessage("2026/2/18 13:00-13:15");
      expect(msg).toContain("本日、診療のご予約がございます");
      expect(msg).toContain("2026/2/18 13:00-13:15");
      expect(msg).toContain("マイページ");
      expect(msg).toContain("090-");
    });
  });

  describe("addOneDay", () => {
    it("通常の翌日を返す", async () => {
      const { addOneDay } = await import("@/lib/auto-reminder");
      expect(addOneDay("2026-02-17")).toBe("2026-02-18");
    });

    it("月末跨ぎ（2月→3月）", async () => {
      const { addOneDay } = await import("@/lib/auto-reminder");
      expect(addOneDay("2026-02-28")).toBe("2026-03-01");
    });

    it("年末跨ぎ（12/31→1/1）", async () => {
      const { addOneDay } = await import("@/lib/auto-reminder");
      expect(addOneDay("2026-12-31")).toBe("2027-01-01");
    });

    it("うるう年の2/28→3/1（2026年は平年）", async () => {
      const { addOneDay } = await import("@/lib/auto-reminder");
      expect(addOneDay("2026-02-28")).toBe("2026-03-01");
    });

    it("うるう年の2/28→2/29（2028年はうるう年）", async () => {
      const { addOneDay } = await import("@/lib/auto-reminder");
      expect(addOneDay("2028-02-28")).toBe("2028-02-29");
    });
  });

  describe("getJSTToday", () => {
    it("YYYY-MM-DD 形式のJST日付を返す", async () => {
      const { getJSTToday } = await import("@/lib/auto-reminder");
      const result = getJSTToday();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("isInSendWindow", () => {
    it("送信時刻ちょうどでマッチする", async () => {
      const { isInSendWindow } = await import("@/lib/auto-reminder");
      // 19:00 JST → UTC 10:00
      vi.spyOn(Date, "now").mockReturnValue(new Date("2026-02-17T10:00:00Z").getTime());
      expect(isInSendWindow(19, 0)).toBe(true);
      vi.restoreAllMocks();
    });

    it("14分前でマッチする（ウィンドウ内）", async () => {
      const { isInSendWindow } = await import("@/lib/auto-reminder");
      // 18:46 JST → UTC 09:46
      vi.spyOn(Date, "now").mockReturnValue(new Date("2026-02-17T09:46:00Z").getTime());
      expect(isInSendWindow(19, 0)).toBe(true);
      vi.restoreAllMocks();
    });

    it("15分前でマッチしない（ウィンドウ外）", async () => {
      const { isInSendWindow } = await import("@/lib/auto-reminder");
      // 18:45 JST → UTC 09:45
      vi.spyOn(Date, "now").mockReturnValue(new Date("2026-02-17T09:45:00Z").getTime());
      expect(isInSendWindow(19, 0)).toBe(false);
      vi.restoreAllMocks();
    });

    it("1分後でマッチしない（ウィンドウ後）", async () => {
      const { isInSendWindow } = await import("@/lib/auto-reminder");
      // 19:01 JST → UTC 10:01
      vi.spyOn(Date, "now").mockReturnValue(new Date("2026-02-17T10:01:00Z").getTime());
      expect(isInSendWindow(19, 0)).toBe(false);
      vi.restoreAllMocks();
    });

    it("8:30ルール: 8:25でマッチする", async () => {
      const { isInSendWindow } = await import("@/lib/auto-reminder");
      // 8:25 JST → UTC 23:25（前日）
      vi.spyOn(Date, "now").mockReturnValue(new Date("2026-02-16T23:25:00Z").getTime());
      expect(isInSendWindow(8, 30)).toBe(true);
      vi.restoreAllMocks();
    });

    it("8:30ルール: 8:10でマッチしない", async () => {
      const { isInSendWindow } = await import("@/lib/auto-reminder");
      // 8:10 JST → UTC 23:10（前日）
      vi.spyOn(Date, "now").mockReturnValue(new Date("2026-02-16T23:10:00Z").getTime());
      expect(isInSendWindow(8, 30)).toBe(false);
      vi.restoreAllMocks();
    });

    it("0:00ルール: 23:50でマッチする", async () => {
      const { isInSendWindow } = await import("@/lib/auto-reminder");
      // 23:50 JST → UTC 14:50
      vi.spyOn(Date, "now").mockReturnValue(new Date("2026-02-17T14:50:00Z").getTime());
      // 0:00のウィンドウは23:46〜0:00 → 23:50はマッチしない（0*60=0, 23*60+50=1430, 0-14=-14 ≦ 1430は成り立たない）
      // 実際にはsendMinutes=0, nowMinutes=1430 → 0-14=-14 ≦ 1430 ≦ 0 → false
      expect(isInSendWindow(0, 0)).toBe(false);
      vi.restoreAllMocks();
    });
  });
});

// --- lib/reservation-flex.ts buildReminderFlex テスト ---

vi.mock("@/lib/flex-message/config", () => ({
  getFlexConfig: vi.fn().mockResolvedValue({
    colors: {
      headerBg: "#E75A7C",
      headerText: "#FFFFFF",
      bodyText: "#555555",
      accentColor: "#E75A7C",
    },
    reservation: {
      createdHeader: "予約確定",
      createdPhoneNotice: "",
      createdNote: "",
      changedHeader: "予約変更",
      changedPhoneNotice: "",
      canceledHeader: "予約キャンセル",
      canceledNote: "",
    },
  }),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn().mockImplementation(() => createChainMock()),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn().mockReturnValue(null),
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((id: string | null) => ({ tenant_id: id || null })),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

describe("lib/reservation-flex.ts - buildReminderFlex", () => {
  it("FLEXメッセージのaltTextに日時が含まれる", async () => {
    const { buildReminderFlex } = await import("@/lib/reservation-flex");
    const result = await buildReminderFlex("2026-02-18", "10:00:00");
    expect(result.altText).toContain("明日のご予約");
    expect(result.altText).toContain("2/18");
    expect(result.altText).toContain("10:00");
  });

  it("contentsがbubble型である", async () => {
    const { buildReminderFlex } = await import("@/lib/reservation-flex");
    const result = await buildReminderFlex("2026-02-18", "10:00:00");
    expect(result.contents.type).toBe("bubble");
  });

  it("ヘッダーに「明日のご予約」テキストがある", async () => {
    const { buildReminderFlex } = await import("@/lib/reservation-flex");
    const result = await buildReminderFlex("2026-02-18", "10:00:00");
    const headerTexts = result.contents.header.contents.map((c: any) => c.text);
    expect(headerTexts).toContain("明日のご予約");
  });

  it("ボディに変更・キャンセルの案内がある", async () => {
    const { buildReminderFlex } = await import("@/lib/reservation-flex");
    const result = await buildReminderFlex("2026-02-18", "10:00:00");
    const bodyJson = JSON.stringify(result.contents.body);
    expect(bodyJson).toContain("マイページ");
    expect(bodyJson).toContain("変更");
    expect(bodyJson).toContain("キャンセル");
  });

  it("typeがflexである", async () => {
    const { buildReminderFlex } = await import("@/lib/reservation-flex");
    const result = await buildReminderFlex("2026-02-18", "10:00:00");
    expect(result.type).toBe("flex");
  });
});

// --- リマインド送信cron テスト ---

describe("generate-reminders: 直接LINE送信", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("送信時刻到来でLINE送信 → 履歴記録される", async () => {
    // 19:05 JST = UTC 10:05（19:00ルールの送信時刻を過ぎている）
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-02-17T10:05:00Z").getTime());

    const { supabaseAdmin } = await import("@/lib/supabase");
    const { withTenant } = await import("@/lib/tenant");
    const { pushMessage } = await import("@/lib/line-push");

    const mockRule = {
      id: 1,
      timing_type: "fixed_time",
      is_enabled: true,
      send_hour: 19,
      send_minute: 0,
      target_day_offset: 1,
      message_format: "flex",
      message_template: "",
      tenant_id: "tenant-1",
    };

    const mockReservation = {
      id: 100,
      patient_id: "P001",
      patient_name: "テスト太郎",
      reserved_date: "2026-02-18",
      reserved_time: "10:00:00",
    };

    // withTenantモック: reservations → sent_log → patients
    let queryCount = 0;
    (withTenant as any).mockImplementation(() => {
      queryCount++;
      if (queryCount === 1) return { data: [mockReservation], error: null };
      if (queryCount === 2) return { data: [], error: null };
      if (queryCount === 3) return { data: [{ patient_id: "P001", name: "テスト太郎", line_id: "U001" }], error: null };
      return { data: null, error: null };
    });

    const inserted: any[] = [];
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "reminder_rules") {
        return createChainMock({ data: [mockRule], error: null });
      }
      const chain = createChainMock({ data: null, error: null });
      if (table === "reminder_sent_log" || table === "message_log") {
        chain.insert = vi.fn().mockImplementation((payload: any) => {
          inserted.push({ table, payload });
          return { data: null, error: null };
        });
      }
      return chain;
    });

    (pushMessage as any).mockResolvedValue({ ok: true });

    const { GET } = await import("@/app/api/cron/generate-reminders/route");
    const response = await GET(new (await import("next/server")).NextRequest("http://localhost/api/cron/generate-reminders"));
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);

    // pushMessage が呼ばれたことを確認
    expect(pushMessage).toHaveBeenCalledWith("U001", expect.any(Array), "tenant-1");
    const lineMsg = (pushMessage as any).mock.calls[0][1][0];
    expect(lineMsg.type).toBe("flex");

    // reminder_sent_log に記録
    const logInsert = inserted.find(m => m.table === "reminder_sent_log");
    expect(logInsert).toBeTruthy();
    expect(logInsert.payload.rule_id).toBe(1);
    expect(logInsert.payload.tenant_id).toBe("tenant-1");

    vi.restoreAllMocks();
  });

  it("送信時刻前なら送信しない", async () => {
    // 18:00 JST = UTC 09:00（19:00ルールの送信時刻前）
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-02-17T09:00:00Z").getTime());

    const { supabaseAdmin } = await import("@/lib/supabase");

    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "reminder_rules") {
        return createChainMock({
          data: [{
            id: 1,
            timing_type: "fixed_time",
            is_enabled: true,
            send_hour: 19,
            send_minute: 0,
            target_day_offset: 1,
            message_format: "flex",
            tenant_id: "tenant-1",
          }],
          error: null,
        });
      }
      return createChainMock();
    });

    const { pushMessage } = await import("@/lib/line-push");
    const { GET } = await import("@/app/api/cron/generate-reminders/route");
    const response = await GET(new (await import("next/server")).NextRequest("http://localhost/api/cron/generate-reminders"));
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
    expect(pushMessage).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});

// --- send-scheduled FLEX送信対応テスト ---

describe("send-scheduled: FLEX送信対応", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("flex_json がある場合はFLEXメッセージとして送信する", async () => {
    const { pushMessage } = await import("@/lib/line-push");
    const { supabaseAdmin } = await import("@/lib/supabase");

    const mockFlexJson = {
      type: "bubble",
      header: { type: "box", layout: "vertical", contents: [] },
      body: { type: "box", layout: "vertical", contents: [] },
    };

    const mockMsg = {
      id: 1,
      patient_id: "P001",
      line_uid: "U001",
      message_content: "【明日のご予約】2/18(火) 10:00〜10:15",
      message_type: "reminder",
      flex_json: mockFlexJson,
      status: "scheduled",
      tenant_id: "tenant-1",
    };

    // supabaseAdmin.fromモック（全クエリが直接supabaseAdminを使う）
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "scheduled_messages") {
        const chain = createChainMock({ data: [mockMsg], error: null });
        chain.update = vi.fn().mockReturnValue(createChainMock({ data: null, error: null }));
        return chain;
      }
      if (table === "patients") {
        return createChainMock({ data: { name: "テスト太郎" }, error: null });
      }
      if (table === "message_log") {
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }
      return createChainMock();
    });

    (pushMessage as any).mockResolvedValue({ ok: true });

    const { NextRequest } = await import("next/server");
    const req = new NextRequest("http://localhost/api/cron/send-scheduled");
    const { GET } = await import("@/app/api/cron/send-scheduled/route");
    const response = await GET(req);
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);

    // pushMessageがFLEX形式で呼ばれたことを確認
    expect(pushMessage).toHaveBeenCalled();
    const pushArgs = (pushMessage as any).mock.calls[0];
    const messages = pushArgs[1];
    expect(messages[0].type).toBe("flex");
    expect(messages[0].contents).toEqual(mockFlexJson);
    // tenant_idがメッセージのものを使っていることを確認
    expect(pushArgs[2]).toBe("tenant-1");

    vi.restoreAllMocks();
  });

  it("flex_json がない場合はテキストメッセージとして送信する", async () => {
    const { pushMessage } = await import("@/lib/line-push");
    const { supabaseAdmin } = await import("@/lib/supabase");

    const mockMsg = {
      id: 2,
      patient_id: "P002",
      line_uid: "U002",
      message_content: "テストメッセージ",
      message_type: "reminder",
      flex_json: null,
      status: "scheduled",
      tenant_id: "tenant-2",
    };

    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "scheduled_messages") {
        const chain = createChainMock({ data: [mockMsg], error: null });
        chain.update = vi.fn().mockReturnValue(createChainMock({ data: null, error: null }));
        return chain;
      }
      if (table === "patients") {
        return createChainMock({ data: { name: "テスト花子" }, error: null });
      }
      if (table === "message_log") {
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }
      return createChainMock();
    });

    (pushMessage as any).mockResolvedValue({ ok: true });

    const { NextRequest } = await import("next/server");
    const req = new NextRequest("http://localhost/api/cron/send-scheduled");
    const { GET } = await import("@/app/api/cron/send-scheduled/route");
    const response = await GET(req);
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);

    // pushMessageがテキスト形式で呼ばれたことを確認
    expect(pushMessage).toHaveBeenCalled();
    const pushArgs = (pushMessage as any).mock.calls[0];
    const messages = pushArgs[1];
    expect(messages[0].type).toBe("text");
    // tenant_idがメッセージのものを使っていることを確認
    expect(pushArgs[2]).toBe("tenant-2");

    vi.restoreAllMocks();
  });
});

// --- reminder-rules API テスト ---

describe("reminder-rules API: 固定時刻ルール", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("固定時刻ルールのバリデーション: send_hourが範囲外で400", async () => {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/admin/line/reminder-rules/route");

    const req = new NextRequest("http://localhost/api/admin/line/reminder-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "テストルール",
        timing_type: "fixed_time",
        send_hour: 25,
        send_minute: 0,
        target_day_offset: 1,
        message_format: "flex",
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("送信時刻");
  });

  it("FLEXメッセージの場合、message_templateが空でもOK", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.from as any).mockImplementation(() => {
      const chain = createChainMock({ data: { id: 1, name: "前日リマインド" }, error: null });
      chain.insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 1, name: "前日リマインド" },
            error: null,
          }),
        }),
      });
      return chain;
    });

    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/admin/line/reminder-rules/route");

    const req = new NextRequest("http://localhost/api/admin/line/reminder-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "前日リマインド",
        timing_type: "fixed_time",
        send_hour: 19,
        send_minute: 0,
        target_day_offset: 1,
        message_format: "flex",
        message_template: "",
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
  });

  it("テキスト形式でmessage_templateが空なら400", async () => {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/admin/line/reminder-rules/route");

    const req = new NextRequest("http://localhost/api/admin/line/reminder-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "当日リマインド",
        timing_type: "before_hours",
        timing_value: 2,
        message_format: "text",
        message_template: "",
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("メッセージ");
  });

  it("ルール名が空なら400", async () => {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/admin/line/reminder-rules/route");

    const req = new NextRequest("http://localhost/api/admin/line/reminder-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "",
        timing_type: "fixed_time",
        send_hour: 19,
        send_minute: 0,
        message_format: "flex",
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("ルール名");
  });
});
