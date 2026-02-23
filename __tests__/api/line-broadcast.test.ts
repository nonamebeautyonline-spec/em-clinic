// __tests__/api/line-broadcast.test.ts
// LINE個別メッセージ送信（send）と一斉配信（broadcast）GET/POSTのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// === モック設定 ===
const mockVerifyAdminAuth = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/admin-auth", () => ({ verifyAdminAuth: mockVerifyAdminAuth }));

const mockPushMessage = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/line-push", () => ({ pushMessage: mockPushMessage }));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn(() => ({})),
}));

vi.mock("@/lib/behavior-filters", () => ({
  getVisitCounts: vi.fn().mockResolvedValue(new Map()),
  getPurchaseAmounts: vi.fn().mockResolvedValue(new Map()),
  getLastVisitDates: vi.fn().mockResolvedValue(new Map()),
  getReorderCounts: vi.fn().mockResolvedValue(new Map()),
  matchBehaviorCondition: vi.fn().mockReturnValue(false),
}));

// Supabase モックチェーン（テーブル名ベースで分岐可能）
let mockInsertData: unknown = null;
let mockInsertError: unknown = null;
let mockMaybeSingleData: unknown = null;
let mockFetchAllData: unknown[] = [];
// テーブル名->データのマッピング（resolveTargets用）
let mockTableData: Record<string, unknown[]> = {};
// GET用: broadcasts一覧データ
let mockSelectData: unknown[] | null = null;
let mockSelectError: unknown = null;

function createMockChain(tableName?: string): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.neq = vi.fn(() => chain);
  chain.gte = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.not = vi.fn(() => chain);
  chain.or = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.range = vi.fn(() => {
    // テーブル名ベースでデータを返す
    if (tableName && mockTableData[tableName]) {
      const data = mockTableData[tableName];
      mockTableData[tableName] = []; // 次回呼び出しは空（ページネーション終了）
      return { data, error: null };
    }
    return { data: mockFetchAllData, error: null };
  });
  chain.single = vi.fn(() => ({ data: mockInsertData, error: mockInsertError }));
  chain.maybeSingle = vi.fn(() => ({ data: mockMaybeSingleData, error: null }));
  // then: GET の配信履歴一覧用（withTenant 経由のプロミスライク対応）
  chain.then = vi.fn((resolve: any) => resolve({ data: mockSelectData, error: mockSelectError }));
  return chain;
}

// デフォルトチェーン（send API等で使用）
const mockChain = createMockChain();

const mockFrom = vi.fn((table: string) => {
  // テーブル名ベースのデータがある場合は専用チェーンを返す
  if (mockTableData[table] !== undefined) {
    return createMockChain(table);
  }
  return mockChain;
});

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: mockFrom },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertData = null;
  mockInsertError = null;
  mockMaybeSingleData = null;
  mockFetchAllData = [];
  mockTableData = {};
  mockSelectData = null;
  mockSelectError = null;
  mockVerifyAdminAuth.mockResolvedValue(true);
  mockPushMessage.mockResolvedValue({ ok: true });
});

// ======================================
// matchFieldCondition ロジック再実装テスト
// ======================================
describe("matchFieldCondition ロジック", () => {
  // broadcast/route.ts の matchFieldCondition を再実装してテスト
  function matchFieldCondition(actual: string | null, operator: string, expected: string): boolean {
    if (actual === null) return false;
    const numActual = Number(actual);
    const numExpected = Number(expected);
    const isNumeric = !isNaN(numActual) && !isNaN(numExpected);

    switch (operator) {
      case "=": return actual === expected;
      case "!=": return actual !== expected;
      case ">": return isNumeric && numActual > numExpected;
      case ">=": return isNumeric && numActual >= numExpected;
      case "<": return isNumeric && numActual < numExpected;
      case "<=": return isNumeric && numActual <= numExpected;
      case "contains": return actual.includes(expected);
      default: return actual === expected;
    }
  }

  it("= 演算子: actual===expected のとき true", () => {
    expect(matchFieldCondition("tokyo", "=", "tokyo")).toBe(true);
    expect(matchFieldCondition("tokyo", "=", "osaka")).toBe(false);
  });

  it("!= 演算子: actual!==expected のとき true", () => {
    expect(matchFieldCondition("tokyo", "!=", "osaka")).toBe(true);
    expect(matchFieldCondition("tokyo", "!=", "tokyo")).toBe(false);
  });

  it("> 演算子: 数値比較で大きいとき true", () => {
    expect(matchFieldCondition("10", ">", "5")).toBe(true);
    expect(matchFieldCondition("5", ">", "10")).toBe(false);
    expect(matchFieldCondition("5", ">", "5")).toBe(false);
    // 数値でない場合は false
    expect(matchFieldCondition("abc", ">", "5")).toBe(false);
  });

  it(">= 演算子: 数値比較で以上のとき true", () => {
    expect(matchFieldCondition("10", ">=", "5")).toBe(true);
    expect(matchFieldCondition("5", ">=", "5")).toBe(true);
    expect(matchFieldCondition("3", ">=", "5")).toBe(false);
  });

  it("< 演算子: 数値比較で小さいとき true", () => {
    expect(matchFieldCondition("3", "<", "5")).toBe(true);
    expect(matchFieldCondition("5", "<", "5")).toBe(false);
    expect(matchFieldCondition("10", "<", "5")).toBe(false);
  });

  it("<= 演算子: 数値比較で以下のとき true", () => {
    expect(matchFieldCondition("3", "<=", "5")).toBe(true);
    expect(matchFieldCondition("5", "<=", "5")).toBe(true);
    expect(matchFieldCondition("10", "<=", "5")).toBe(false);
  });

  it("contains 演算子: actual.includes(expected) で判定", () => {
    expect(matchFieldCondition("東京都新宿区", "contains", "新宿")).toBe(true);
    expect(matchFieldCondition("東京都新宿区", "contains", "大阪")).toBe(false);
  });

  it("null actual -> 常に false", () => {
    expect(matchFieldCondition(null, "=", "test")).toBe(false);
    expect(matchFieldCondition(null, "!=", "test")).toBe(false);
    expect(matchFieldCondition(null, ">", "5")).toBe(false);
    expect(matchFieldCondition(null, "contains", "test")).toBe(false);
  });

  it("未知の演算子 -> = として扱う", () => {
    expect(matchFieldCondition("a", "unknown_op", "a")).toBe(true);
    expect(matchFieldCondition("a", "unknown_op", "b")).toBe(false);
  });
});

// ======================================
// send API ロジックテスト
// ======================================
describe("LINE send API ロジック", () => {
  it("テキスト送信成功 -> {ok:true, status:'sent'}", async () => {
    // 患者データ（line_id あり）
    mockMaybeSingleData = { name: "田中太郎", line_id: "U1234567890" };
    mockPushMessage.mockResolvedValue({ ok: true });

    const { POST } = await import("@/app/api/admin/line/send/route");
    const req = new Request("http://localhost/api/admin/line/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: "P001", message: "こんにちは" }),
    });

    const res = await POST(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.status).toBe("sent");
    expect(json.patient_name).toBe("田中太郎");
  });

  it("patient_id/message なし -> 400", async () => {
    const { POST } = await import("@/app/api/admin/line/send/route");
    const req = new Request("http://localhost/api/admin/line/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: "", message: "" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("LINE UID なし -> {error, status:'no_uid'}", async () => {
    mockMaybeSingleData = null; // 患者のline_idがない

    const { POST } = await import("@/app/api/admin/line/send/route");
    const req = new Request("http://localhost/api/admin/line/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: "P002", message: "テスト" }),
    });

    const res = await POST(req as never);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.status).toBe("no_uid");
  });

  it("Flex送信 -> message_type:'flex' で記録", async () => {
    mockMaybeSingleData = { name: "佐藤花子", line_id: "U9876543210" };
    mockPushMessage.mockResolvedValue({ ok: true });

    const { POST } = await import("@/app/api/admin/line/send/route");
    const flexContent = {
      type: "flex",
      altText: "テストFlex",
      contents: { type: "bubble", body: { type: "box", layout: "vertical", contents: [] } },
    };
    const req = new Request("http://localhost/api/admin/line/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: "P003",
        message: "",
        message_type: "flex",
        flex: flexContent,
      }),
    });

    const res = await POST(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.status).toBe("sent");
    // pushMessage が呼ばれたことを確認
    expect(mockPushMessage).toHaveBeenCalledWith(
      "U9876543210",
      [flexContent],
      undefined
    );
  });

  it("テンプレート変数置換: {name} -> 患者名", () => {
    // send/route.ts のテンプレート置換ロジックを再実装テスト
    const patientName = "山田太郎";
    const patientId = "P100";
    const template = "こんにちは{name}さん（ID: {patient_id}）";

    const resolved = template
      .replace(/\{name\}/g, patientName || "")
      .replace(/\{patient_id\}/g, patientId);

    expect(resolved).toBe("こんにちは山田太郎さん（ID: P100）");
  });
});

// ======================================
// broadcast GET API テスト（配信履歴一覧）
// ======================================
describe("LINE broadcast GET API", () => {
  it("認証NG -> 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { GET } = await import("@/app/api/admin/line/broadcast/route");
    const req = new Request("http://localhost/api/admin/line/broadcast", {
      method: "GET",
    });

    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it("正常系: 配信履歴一覧を返す", async () => {
    mockSelectData = [
      { id: "b1", name: "テスト配信1", status: "sent", created_at: "2026-01-01" },
      { id: "b2", name: "テスト配信2", status: "scheduled", created_at: "2026-01-02" },
    ];
    mockSelectError = null;

    const { GET } = await import("@/app/api/admin/line/broadcast/route");
    const req = new Request("http://localhost/api/admin/line/broadcast", {
      method: "GET",
    });

    const res = await GET(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.broadcasts).toHaveLength(2);
    expect(json.broadcasts[0].id).toBe("b1");
  });

  it("DBエラー -> 500", async () => {
    mockSelectData = null;
    mockSelectError = { message: "DB接続エラー" };

    const { GET } = await import("@/app/api/admin/line/broadcast/route");
    const req = new Request("http://localhost/api/admin/line/broadcast", {
      method: "GET",
    });

    const res = await GET(req as never);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("DB接続エラー");
  });
});

// ======================================
// broadcast POST API ロジックテスト
// ======================================
describe("LINE broadcast POST API", () => {
  it("メッセージ空 -> 400", async () => {
    const { POST } = await import("@/app/api/admin/line/broadcast/route");
    const req = new Request("http://localhost/api/admin/line/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("入力値が不正です");
    expect(json.details).toBeDefined();
  });

  it("認証NG -> 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { POST } = await import("@/app/api/admin/line/broadcast/route");
    const req = new Request("http://localhost/api/admin/line/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "テスト配信" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("予約送信 -> status:'scheduled'", async () => {
    // resolveTargets が空配列を返す想定（fetchAll が空）
    mockFetchAllData = [];
    // broadcasts insert 成功
    mockInsertData = { id: "broadcast_001" };
    mockInsertError = null;

    const { POST } = await import("@/app/api/admin/line/broadcast/route");
    const req = new Request("http://localhost/api/admin/line/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "予約配信テスト",
        scheduled_at: "2026-03-01T10:00:00.000Z",
      }),
    });

    const res = await POST(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.status).toBe("scheduled");
  });

  it("即時送信: 対象者なし -> sent=0", async () => {
    // 対象者なし
    mockFetchAllData = [];
    mockInsertData = { id: "broadcast_002" };
    mockInsertError = null;

    const { POST } = await import("@/app/api/admin/line/broadcast/route");
    const req = new Request("http://localhost/api/admin/line/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "即時配信テスト" }),
    });

    const res = await POST(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.sent).toBe(0);
    expect(json.total).toBe(0);
  });

  it("broadcasts insert失敗 -> 500", async () => {
    mockFetchAllData = [];
    mockInsertData = null;
    mockInsertError = { message: "insert失敗" };

    const { POST } = await import("@/app/api/admin/line/broadcast/route");
    const req = new Request("http://localhost/api/admin/line/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "テスト" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("insert失敗");
  });

  it("テンプレート変数置換ロジック: {name}, {patient_id}, {send_date}", () => {
    // broadcast/route.ts のテンプレート置換を再実装テスト
    const message = "こんにちは{name}さん（{patient_id}）。本日{send_date}の配信です。次回予約: {next_reservation_date} {next_reservation_time}";
    const todayStr = "2026/2/23";
    const target = { patient_id: "P100", patient_name: "山田花子", line_id: "Uxxx" };
    const nextRes = { date: "2026-03-01", time: "10:00" };

    const resolvedMsg = message
      .replace(/\{name\}/g, target.patient_name || "")
      .replace(/\{patient_id\}/g, target.patient_id)
      .replace(/\{send_date\}/g, todayStr)
      .replace(/\{next_reservation_date\}/g, nextRes?.date || "")
      .replace(/\{next_reservation_time\}/g, nextRes?.time || "");

    expect(resolvedMsg).toBe("こんにちは山田花子さん（P100）。本日2026/2/23の配信です。次回予約: 2026-03-01 10:00");
  });
});

// ======================================
// resolveTargets テスト
// ======================================
describe("resolveTargets", () => {
  it("has_line_uid フィルタ -> UID有のみ残す", async () => {
    const { resolveTargets } = await import("@/app/api/admin/line/broadcast/route");

    mockTableData = {
      intake: [
        { patient_id: "P001" },
        { patient_id: "P002" },
        { patient_id: "P003" },
      ],
      patients: [
        { patient_id: "P001", name: "患者A", line_id: "Uaaa" },
        { patient_id: "P002", name: "患者B", line_id: null },
        { patient_id: "P003", name: "患者C", line_id: "Uccc" },
      ],
    };

    const rules = {
      include: { conditions: [{ type: "has_line_uid" }] },
    };

    const targets = await resolveTargets(rules, null);
    const ids = targets.map((t: { patient_id: string }) => t.patient_id);
    expect(ids).toContain("P001");
    expect(ids).not.toContain("P002");
    expect(ids).toContain("P003");
  });

  it("タグフィルタ（has）-> タグ持ちのみ残す", async () => {
    const { resolveTargets } = await import("@/app/api/admin/line/broadcast/route");

    mockTableData = {
      intake: [
        { patient_id: "P001" },
        { patient_id: "P002" },
        { patient_id: "P003" },
      ],
      patients: [
        { patient_id: "P001", name: "患者A", line_id: "Uaaa" },
        { patient_id: "P002", name: "患者B", line_id: "Ubbb" },
        { patient_id: "P003", name: "患者C", line_id: "Uccc" },
      ],
      patient_tags: [
        { patient_id: "P001" },
        { patient_id: "P003" },
      ],
    };

    const rules = {
      include: { conditions: [{ type: "tag", tag_id: 1, match: "has" }] },
    };

    const targets = await resolveTargets(rules, null);
    const ids = targets.map((t: { patient_id: string }) => t.patient_id);
    expect(ids).toContain("P001");
    expect(ids).not.toContain("P002");
    expect(ids).toContain("P003");
  });

  it("タグフィルタ（not_has）-> タグを持たない患者のみ残す", async () => {
    const { resolveTargets } = await import("@/app/api/admin/line/broadcast/route");

    mockTableData = {
      intake: [
        { patient_id: "P001" },
        { patient_id: "P002" },
      ],
      patients: [
        { patient_id: "P001", name: "患者A", line_id: "Uaaa" },
        { patient_id: "P002", name: "患者B", line_id: "Ubbb" },
      ],
      patient_tags: [
        { patient_id: "P001" },
      ],
    };

    const rules = {
      include: { conditions: [{ type: "tag", tag_id: 1, match: "not_has" }] },
    };

    const targets = await resolveTargets(rules, null);
    const ids = targets.map((t: { patient_id: string }) => t.patient_id);
    expect(ids).not.toContain("P001");
    expect(ids).toContain("P002");
  });

  it("markフィルタ -> マーク持ちのみ残す", async () => {
    const { resolveTargets } = await import("@/app/api/admin/line/broadcast/route");

    mockTableData = {
      intake: [
        { patient_id: "P001" },
        { patient_id: "P002" },
      ],
      patients: [
        { patient_id: "P001", name: "患者A", line_id: "Uaaa" },
        { patient_id: "P002", name: "患者B", line_id: "Ubbb" },
      ],
      patient_marks: [
        { patient_id: "P001", mark: "star" },
      ],
    };

    const rules = {
      include: { conditions: [{ type: "mark", values: ["star"] }] },
    };

    const targets = await resolveTargets(rules, null);
    const ids = targets.map((t: { patient_id: string }) => t.patient_id);
    expect(ids).toContain("P001");
    expect(ids).not.toContain("P002");
  });

  it("intakeが空 -> 空配列を返す", async () => {
    const { resolveTargets } = await import("@/app/api/admin/line/broadcast/route");

    mockTableData = {
      intake: [],
      patients: [],
    };

    const targets = await resolveTargets({}, null);
    expect(targets).toHaveLength(0);
  });

  it("除外条件: タグ持ちを除外する", async () => {
    const { resolveTargets } = await import("@/app/api/admin/line/broadcast/route");

    mockTableData = {
      intake: [
        { patient_id: "P001" },
        { patient_id: "P002" },
        { patient_id: "P003" },
      ],
      patients: [
        { patient_id: "P001", name: "患者A", line_id: "Uaaa" },
        { patient_id: "P002", name: "患者B", line_id: "Ubbb" },
        { patient_id: "P003", name: "患者C", line_id: "Uccc" },
      ],
      patient_tags: [
        { patient_id: "P002" },
      ],
    };

    const rules = {
      exclude: { conditions: [{ type: "tag", tag_id: 5, match: "has" }] },
    };

    const targets = await resolveTargets(rules, null);
    const ids = targets.map((t: { patient_id: string }) => t.patient_id);
    // P002がタグを持つので除外される
    expect(ids).toContain("P001");
    expect(ids).not.toContain("P002");
    expect(ids).toContain("P003");
  });

  it("fieldフィルタ -> フィールド条件にマッチする患者のみ残す", async () => {
    const { resolveTargets } = await import("@/app/api/admin/line/broadcast/route");

    mockTableData = {
      intake: [
        { patient_id: "P001" },
        { patient_id: "P002" },
      ],
      patients: [
        { patient_id: "P001", name: "患者A", line_id: "Uaaa" },
        { patient_id: "P002", name: "患者B", line_id: "Ubbb" },
      ],
      friend_field_values: [
        { patient_id: "P001", value: "tokyo" },
        { patient_id: "P002", value: "osaka" },
      ],
    };

    const rules = {
      include: { conditions: [{ type: "field", field_id: 1, operator: "=", value: "tokyo" }] },
    };

    const targets = await resolveTargets(rules, null);
    const ids = targets.map((t: { patient_id: string }) => t.patient_id);
    expect(ids).toContain("P001");
    expect(ids).not.toContain("P002");
  });

  it("unknownフィルタタイプ -> フィルタなし（全患者返す）", async () => {
    const { resolveTargets } = await import("@/app/api/admin/line/broadcast/route");

    mockTableData = {
      intake: [
        { patient_id: "P001" },
      ],
      patients: [
        { patient_id: "P001", name: "患者A", line_id: "Uaaa" },
      ],
    };

    const rules = {
      include: { conditions: [{ type: "unknown_type" as any }] },
    };

    const targets = await resolveTargets(rules, null);
    expect(targets).toHaveLength(1);
  });
});
