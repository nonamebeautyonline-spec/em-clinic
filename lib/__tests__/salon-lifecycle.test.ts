// lib/__tests__/salon-lifecycle.test.ts
// サロン顧客ライフサイクル — 純粋関数 + DB依存関数のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabaseモック ---
function createMockChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, any> = {};
  const methods = ["from", "select", "eq", "not", "gte", "like", "limit", "maybeSingle"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  buildDormantReminderMessage,
  buildBirthdayMessage,
  findDormantCustomers,
  findBirthdayCustomers,
  DORMANT_THRESHOLDS,
} from "../salon-lifecycle";

// ── DORMANT_THRESHOLDS の値確認 ──

describe("DORMANT_THRESHOLDS", () => {
  it("warning は 30日", () => {
    expect(DORMANT_THRESHOLDS.warning).toBe(30);
  });

  it("alert は 60日", () => {
    expect(DORMANT_THRESHOLDS.alert).toBe(60);
  });

  it("critical は 90日", () => {
    expect(DORMANT_THRESHOLDS.critical).toBe(90);
  });
});

// ── buildDormantReminderMessage ──

describe("buildDormantReminderMessage", () => {
  // === warning（30日） ===
  describe("warning", () => {
    it("text型メッセージを返す", () => {
      const msg = buildDormantReminderMessage(35, "田中", "warning");
      expect(msg.type).toBe("text");
    });

    it("顧客名が含まれる", () => {
      const msg = buildDormantReminderMessage(35, "田中", "warning");
      expect((msg as any).text).toContain("田中様");
    });

    it("経過日数が含まれる", () => {
      const msg = buildDormantReminderMessage(35, "田中", "warning");
      expect((msg as any).text).toContain("35日");
    });

    it("トラッキングタグ salon_dormant_warning が含まれる", () => {
      const msg = buildDormantReminderMessage(35, "田中", "warning");
      expect((msg as any).text).toContain("[salon_dormant_warning]");
    });

    it("来店促進の文言を含む", () => {
      const msg = buildDormantReminderMessage(35, "田中", "warning");
      expect((msg as any).text).toContain("お手入れの時期");
    });
  });

  // === alert（60日） ===
  describe("alert", () => {
    it("特別オファーの文言を含む", () => {
      const msg = buildDormantReminderMessage(65, "鈴木", "alert");
      expect((msg as any).text).toContain("トリートメントをサービス");
    });

    it("トラッキングタグ salon_dormant_alert が含まれる", () => {
      const msg = buildDormantReminderMessage(65, "鈴木", "alert");
      expect((msg as any).text).toContain("[salon_dormant_alert]");
    });

    it("顧客名が含まれる", () => {
      const msg = buildDormantReminderMessage(65, "鈴木", "alert");
      expect((msg as any).text).toContain("鈴木様");
    });
  });

  // === critical（90日） ===
  describe("critical", () => {
    it("最終リマインドの文言を含む", () => {
      const msg = buildDormantReminderMessage(95, "佐藤", "critical");
      expect((msg as any).text).toContain("その後いかがお過ごしでしょうか");
    });

    it("トラッキングタグ salon_dormant_critical が含まれる", () => {
      const msg = buildDormantReminderMessage(95, "佐藤", "critical");
      expect((msg as any).text).toContain("[salon_dormant_critical]");
    });

    it("顧客名が2箇所に含まれる（冒頭とお待ちしております）", () => {
      const msg = buildDormantReminderMessage(95, "佐藤", "critical");
      const text = (msg as any).text as string;
      const count = (text.match(/佐藤様/g) || []).length;
      expect(count).toBe(2);
    });
  });

  // === 顧客名が空の場合 ===
  it("顧客名が空文字の場合「お客様」がデフォルトで使われる", () => {
    const msg = buildDormantReminderMessage(35, "", "warning");
    expect((msg as any).text).toContain("お客様様");
  });
});

// ── buildBirthdayMessage ──

describe("buildBirthdayMessage", () => {
  it("text型メッセージを返す", () => {
    const msg = buildBirthdayMessage("田中", "BD2026MAR", "20%OFF", "2026/03/31");
    expect(msg.type).toBe("text");
  });

  it("顧客名が含まれる", () => {
    const msg = buildBirthdayMessage("田中", "BD2026MAR", "20%OFF", "2026/03/31");
    expect((msg as any).text).toContain("田中様");
  });

  it("クーポンコードが含まれる", () => {
    const msg = buildBirthdayMessage("田中", "BD2026MAR", "20%OFF", "2026/03/31");
    expect((msg as any).text).toContain("BD2026MAR");
  });

  it("割引テキストが含まれる", () => {
    const msg = buildBirthdayMessage("田中", "BD2026MAR", "20%OFF", "2026/03/31");
    expect((msg as any).text).toContain("20%OFF");
  });

  it("有効期限が含まれる", () => {
    const msg = buildBirthdayMessage("田中", "BD2026MAR", "20%OFF", "2026/03/31");
    expect((msg as any).text).toContain("2026/03/31");
  });

  it("トラッキングタグ salon_birthday_coupon が含まれる", () => {
    const msg = buildBirthdayMessage("田中", "BD2026MAR", "20%OFF", "2026/03/31");
    expect((msg as any).text).toContain("[salon_birthday_coupon]");
  });

  it("お誕生日おめでとうの文言を含む", () => {
    const msg = buildBirthdayMessage("田中", "BD2026MAR", "20%OFF", "2026/03/31");
    expect((msg as any).text).toContain("お誕生日おめでとうございます");
  });

  it("顧客名が空文字の場合「お客様」がデフォルトで使われる", () => {
    const msg = buildBirthdayMessage("", "CODE", "10%OFF", "2026/12/31");
    expect((msg as any).text).toContain("お客様様");
  });
});

// ── findDormantCustomers ──

describe("findDormantCustomers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("来店データがない場合は空配列を返す", async () => {
    mockFrom.mockReturnValue(createMockChain([], null));

    const result = await findDormantCustomers("t1", 30, "warning");
    expect(result).toEqual([]);
  });

  it("来店データ取得エラーの場合は空配列を返す", async () => {
    mockFrom.mockReturnValue(createMockChain(null, { message: "error" }));

    const result = await findDormantCustomers("t1", 30, "warning");
    expect(result).toEqual([]);
  });

  it("閾値内の休眠顧客を検出する", async () => {
    const now = new Date();
    const daysAgo40 = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // salon_visits
        return createMockChain([
          { patient_id: 1, visit_date: daysAgo40 },
        ]);
      } else if (callCount === 2) {
        // patients
        return createMockChain([
          { id: 1, patient_id: "pid-1", name: "田中", line_id: "U001" },
        ]);
      } else {
        // message_log（送信済みなし）
        return createMockChain([]);
      }
    });

    const result = await findDormantCustomers("t1", 30, "warning");
    expect(result.length).toBe(1);
    expect(result[0].patientId).toBe("pid-1");
    expect(result[0].name).toBe("田中");
    expect(result[0].daysSinceVisit).toBeGreaterThanOrEqual(39);
  });

  it("既にリマインド送信済みの顧客は除外する", async () => {
    const now = new Date();
    const daysAgo40 = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createMockChain([{ patient_id: 1, visit_date: daysAgo40 }]);
      } else if (callCount === 2) {
        return createMockChain([{ id: 1, patient_id: "pid-1", name: "田中", line_id: "U001" }]);
      } else {
        // 送信済み
        return createMockChain([{ patient_id: "pid-1", content: "salon_dormant_warning" }]);
      }
    });

    const result = await findDormantCustomers("t1", 30, "warning");
    expect(result.length).toBe(0);
  });

  it("LINE IDがない顧客は除外する", async () => {
    const now = new Date();
    const daysAgo40 = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createMockChain([{ patient_id: 1, visit_date: daysAgo40 }]);
      } else if (callCount === 2) {
        return createMockChain([{ id: 1, patient_id: "pid-1", name: "田中", line_id: null }]);
      } else {
        return createMockChain([]);
      }
    });

    const result = await findDormantCustomers("t1", 30, "warning");
    expect(result.length).toBe(0);
  });

  it("対象患者がいない場合は空配列を返す", async () => {
    const now = new Date();
    // 10日前の来店（30日閾値には満たない）
    const daysAgo10 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    mockFrom.mockReturnValue(createMockChain([
      { patient_id: 1, visit_date: daysAgo10 },
    ]));

    const result = await findDormantCustomers("t1", 30, "warning");
    expect(result.length).toBe(0);
  });

  it("患者情報が取得できない場合は空配列を返す", async () => {
    const now = new Date();
    const daysAgo40 = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createMockChain([{ patient_id: 1, visit_date: daysAgo40 }]);
      } else {
        return createMockChain([]);
      }
    });

    const result = await findDormantCustomers("t1", 30, "warning");
    expect(result.length).toBe(0);
  });
});

// ── findBirthdayCustomers ──

describe("findBirthdayCustomers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("患者データ取得エラーの場合は空配列を返す", async () => {
    mockFrom.mockReturnValue(createMockChain(null, { message: "error" }));

    const result = await findBirthdayCustomers("t1");
    expect(result).toEqual([]);
  });

  it("今月誕生日の顧客を検出する", async () => {
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createMockChain([
          { id: 1, patient_id: "pid-1", name: "田中", line_id: "U001", birthday: `1990-${currentMonth}-15` },
          { id: 2, patient_id: "pid-2", name: "鈴木", line_id: "U002", birthday: "1990-01-01" }, // 1月（対象外の可能性あり）
        ]);
      } else {
        // coupon_issues & message_log: 発行済みなし
        return createMockChain([]);
      }
    });

    const result = await findBirthdayCustomers("t1");
    // 今月が1月なら2件、それ以外は1件
    const expectedCount = currentMonth === "01" ? 2 : 1;
    expect(result.length).toBe(expectedCount);
  });

  it("クーポン発行済みの顧客は除外する", async () => {
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createMockChain([
          { id: 1, patient_id: "pid-1", name: "田中", line_id: "U001", birthday: `1990-${currentMonth}-15` },
        ]);
      } else if (callCount === 2) {
        // coupon_issues: 発行済み
        return createMockChain([{ patient_id: "pid-1" }]);
      } else {
        return createMockChain([]);
      }
    });

    const result = await findBirthdayCustomers("t1");
    expect(result.length).toBe(0);
  });

  it("バースデーメッセージ送信済みの顧客は除外する", async () => {
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createMockChain([
          { id: 1, patient_id: "pid-1", name: "田中", line_id: "U001", birthday: `1990-${currentMonth}-15` },
        ]);
      } else if (callCount === 2) {
        return createMockChain([]);
      } else {
        // message_log: 送信済み
        return createMockChain([{ patient_id: "pid-1" }]);
      }
    });

    const result = await findBirthdayCustomers("t1");
    expect(result.length).toBe(0);
  });

  it("患者が0件の場合は空配列を返す", async () => {
    mockFrom.mockReturnValue(createMockChain([]));

    const result = await findBirthdayCustomers("t1");
    expect(result).toEqual([]);
  });
});
