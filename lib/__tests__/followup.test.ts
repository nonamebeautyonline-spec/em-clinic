// lib/__tests__/followup.test.ts
// フォローアップ自動送信ロジックのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// === モック設定 ===
const { mockPushMessage } = vi.hoisted(() => ({
  mockPushMessage: vi.fn(),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: mockPushMessage,
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((tid: string | null) => ({ tenant_id: tid || null })),
}));

// Supabaseチェーンモック生成ヘルパー
function createChain(defaultResolve: any = { data: null, error: null }) {
  const chain: any = {};
  ["select", "eq", "neq", "in", "is", "not", "lte", "gte",
   "order", "limit", "update", "insert", "upsert",
   "maybeSingle", "single"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

// テーブルごとにチェーンキューを管理（同一テーブルへの複数回アクセスに対応）
let tableChainQueues: Record<string, any[]> = {};
let tableChainIndex: Record<string, number> = {};

function getNextChain(table: string) {
  const queue = tableChainQueues[table];
  if (!queue || queue.length === 0) return createChain();
  const idx = tableChainIndex[table] || 0;
  tableChainIndex[table] = idx + 1;
  // キューを超えたら最後のチェーンを再利用
  return queue[Math.min(idx, queue.length - 1)];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getNextChain(table)),
  },
}));

import { scheduleFollowups, processFollowups } from "@/lib/followup";
import { supabaseAdmin } from "@/lib/supabase";

beforeEach(() => {
  vi.clearAllMocks();
  tableChainQueues = {};
  tableChainIndex = {};
  mockPushMessage.mockReset();
});

// === scheduleFollowups テスト ===
describe("scheduleFollowups", () => {
  it("ルール取得エラー → 早期リターン", async () => {
    const rulesChain = createChain({ data: null, error: { message: "DB接続エラー" } });
    tableChainQueues["followup_rules"] = [rulesChain];

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await scheduleFollowups(100, "patient-1", null);

    expect(errorSpy).toHaveBeenCalledWith(
      "[Followup] ルール取得エラー:",
      "DB接続エラー"
    );
    // followup_logs への insert は行われない
    expect(supabaseAdmin.from).toHaveBeenCalledTimes(1);
    expect(supabaseAdmin.from).toHaveBeenCalledWith("followup_rules");
    errorSpy.mockRestore();
  });

  it("ルール0件 → 何もしない", async () => {
    const rulesChain = createChain({ data: [], error: null });
    tableChainQueues["followup_rules"] = [rulesChain];

    await scheduleFollowups(100, "patient-1", null);

    // followup_logs への insert は行われない
    expect(supabaseAdmin.from).toHaveBeenCalledTimes(1);
    expect(supabaseAdmin.from).toHaveBeenCalledWith("followup_rules");
  });

  it("ルール複数件 → 全件のログがinsertされる", async () => {
    const rules = [
      { id: 1, delay_days: 3, message_template: "3日後メッセージ" },
      { id: 2, delay_days: 7, message_template: "7日後メッセージ" },
      { id: 3, delay_days: 14, message_template: "14日後メッセージ" },
    ];
    const rulesChain = createChain({ data: rules, error: null });
    const logsInsertChain = createChain({ error: null });
    tableChainQueues["followup_rules"] = [rulesChain];
    tableChainQueues["followup_logs"] = [logsInsertChain];

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await scheduleFollowups(100, "patient-1", null);

    // insert が1回呼ばれ、3件のログが渡される
    expect(logsInsertChain.insert).toHaveBeenCalledTimes(1);
    const insertedLogs = logsInsertChain.insert.mock.calls[0][0];
    expect(insertedLogs).toHaveLength(3);
    // 全件に共通の値が含まれる
    insertedLogs.forEach((log: any) => {
      expect(log.patient_id).toBe("patient-1");
      expect(log.order_id).toBe(100);
      expect(log.status).toBe("pending");
    });
    // ルールIDが正しく設定されている
    expect(insertedLogs[0].rule_id).toBe(1);
    expect(insertedLogs[1].rule_id).toBe(2);
    expect(insertedLogs[2].rule_id).toBe(3);

    logSpy.mockRestore();
  });

  it("delay_days が反映される（送信時刻は10:00 JST固定 = UTC 01:00）", async () => {
    const rules = [
      { id: 1, delay_days: 5, message_template: "テスト" },
    ];
    const rulesChain = createChain({ data: rules, error: null });
    const logsInsertChain = createChain({ error: null });
    tableChainQueues["followup_rules"] = [rulesChain];
    tableChainQueues["followup_logs"] = [logsInsertChain];

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await scheduleFollowups(200, "patient-2", null);

    const insertedLogs = logsInsertChain.insert.mock.calls[0][0];
    const scheduledAt = new Date(insertedLogs[0].scheduled_at);

    // UTC 01:00（= JST 10:00）に固定されているか
    expect(scheduledAt.getUTCHours()).toBe(1);
    expect(scheduledAt.getUTCMinutes()).toBe(0);
    expect(scheduledAt.getUTCSeconds()).toBe(0);

    // delay_days=5 なので、現在日+5日後の日付であること
    const now = new Date();
    const expectedDate = new Date(now);
    expectedDate.setDate(expectedDate.getDate() + 5);
    expectedDate.setUTCHours(1, 0, 0, 0);
    // 日付が正しいか（テスト実行タイミングによる誤差を考慮して日単位で比較）
    expect(scheduledAt.getUTCFullYear()).toBe(expectedDate.getUTCFullYear());
    expect(scheduledAt.getUTCMonth()).toBe(expectedDate.getUTCMonth());
    expect(scheduledAt.getUTCDate()).toBe(expectedDate.getUTCDate());

    logSpy.mockRestore();
  });
});

// === processFollowups テスト ===
describe("processFollowups", () => {
  it("ログなし → { sent: 0, failed: 0, skipped: 0 }", async () => {
    const logsChain = createChain({ data: [], error: null });
    tableChainQueues["followup_logs"] = [logsChain];

    const result = await processFollowups();
    expect(result).toEqual({ sent: 0, failed: 0, skipped: 0 });
  });

  it("ルール無効 → skipped", async () => {
    const logsChain = createChain({
      data: [{
        id: 1,
        patient_id: "p1",
        tenant_id: null,
        followup_rules: null, // ルールなし
      }],
      error: null,
    });
    // 1回目: ログ取得、2回目: ステータス更新（skipped）
    const updateChain = createChain({ data: null, error: null });
    tableChainQueues["followup_logs"] = [logsChain, updateChain];

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await processFollowups();

    expect(result).toEqual({ sent: 0, failed: 0, skipped: 1 });
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "skipped", error_message: "ルール無効" })
    );
    logSpy.mockRestore();
  });

  it("LINE UIDなし → skipped", async () => {
    const logsChain = createChain({
      data: [{
        id: 2,
        patient_id: "p2",
        tenant_id: null,
        followup_rules: { id: 1, is_enabled: true, message_template: "テスト" },
      }],
      error: null,
    });
    // patients: line_id なし
    const patientChain = createChain({ data: { name: "田中", line_id: null }, error: null });
    // followup_logs 更新（skipped）
    const updateChain = createChain({ data: null, error: null });
    tableChainQueues["followup_logs"] = [logsChain, updateChain];
    tableChainQueues["patients"] = [patientChain];

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await processFollowups();

    expect(result).toEqual({ sent: 0, failed: 0, skipped: 1 });
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "skipped", error_message: "LINE UIDなし" })
    );
    logSpy.mockRestore();
  });

  it("テキスト送信成功 → sent + message_log挿入", async () => {
    const logsChain = createChain({
      data: [{
        id: 3,
        patient_id: "p3",
        tenant_id: null,
        followup_rules: {
          id: 1,
          is_enabled: true,
          message_template: "こんにちは{name}さん",
          flex_json: null,
        },
      }],
      error: null,
    });
    const patientChain = createChain({
      data: { name: "佐藤", line_id: "U_LINE_123" },
      error: null,
    });
    // followup_logs 更新（sent）
    const updateSentChain = createChain({ data: null, error: null });
    // message_log 挿入
    const msgLogChain = createChain({ data: null, error: null });

    tableChainQueues["followup_logs"] = [logsChain, updateSentChain];
    tableChainQueues["patients"] = [patientChain];
    tableChainQueues["message_log"] = [msgLogChain];

    mockPushMessage.mockResolvedValue({ ok: true });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await processFollowups();

    expect(result).toEqual({ sent: 1, failed: 0, skipped: 0 });
    // pushMessage がテキストメッセージで呼ばれたか
    expect(mockPushMessage).toHaveBeenCalledWith(
      "U_LINE_123",
      [{ type: "text", text: expect.stringContaining("佐藤") }],
      undefined,
    );
    // followup_logs が sent に更新されたか
    expect(updateSentChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "sent" })
    );
    // message_log に挿入されたか
    expect(msgLogChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        patient_id: "p3",
        line_uid: "U_LINE_123",
        message_type: "followup",
        status: "sent",
        direction: "outgoing",
      })
    );
    logSpy.mockRestore();
  });

  it("Flex送信成功 → sent", async () => {
    const flexJson = { type: "bubble", body: { type: "box" } };
    const logsChain = createChain({
      data: [{
        id: 4,
        patient_id: "p4",
        tenant_id: null,
        followup_rules: {
          id: 2,
          is_enabled: true,
          message_template: "Flexメッセージ",
          flex_json: flexJson,
        },
      }],
      error: null,
    });
    const patientChain = createChain({
      data: { name: "鈴木", line_id: "U_LINE_456" },
      error: null,
    });
    const updateSentChain = createChain({ data: null, error: null });
    const msgLogChain = createChain({ data: null, error: null });

    tableChainQueues["followup_logs"] = [logsChain, updateSentChain];
    tableChainQueues["patients"] = [patientChain];
    tableChainQueues["message_log"] = [msgLogChain];

    mockPushMessage.mockResolvedValue({ ok: true });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await processFollowups();

    expect(result).toEqual({ sent: 1, failed: 0, skipped: 0 });
    // pushMessage がFlexメッセージで呼ばれたか
    expect(mockPushMessage).toHaveBeenCalledWith(
      "U_LINE_456",
      [{ type: "flex", altText: "Flexメッセージ", contents: flexJson }],
      undefined,
    );
    logSpy.mockRestore();
  });

  it("pushMessage失敗（ok=false） → failed", async () => {
    const logsChain = createChain({
      data: [{
        id: 5,
        patient_id: "p5",
        tenant_id: null,
        followup_rules: {
          id: 3,
          is_enabled: true,
          message_template: "テスト",
          flex_json: null,
        },
      }],
      error: null,
    });
    const patientChain = createChain({
      data: { name: "山田", line_id: "U_LINE_789" },
      error: null,
    });
    const updateFailedChain = createChain({ data: null, error: null });

    tableChainQueues["followup_logs"] = [logsChain, updateFailedChain];
    tableChainQueues["patients"] = [patientChain];

    // ok=false を返す
    mockPushMessage.mockResolvedValue({ ok: false });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await processFollowups();

    expect(result).toEqual({ sent: 0, failed: 1, skipped: 0 });
    expect(updateFailedChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        error_message: "LINE API error",
      })
    );
    logSpy.mockRestore();
  });

  it("例外発生 → failed + error_message記録", async () => {
    const logsChain = createChain({
      data: [{
        id: 6,
        patient_id: "p6",
        tenant_id: null,
        followup_rules: {
          id: 4,
          is_enabled: true,
          message_template: "テスト",
          flex_json: null,
        },
      }],
      error: null,
    });
    const patientChain = createChain({
      data: { name: "高橋", line_id: "U_LINE_000" },
      error: null,
    });
    const updateFailedChain = createChain({ data: null, error: null });

    tableChainQueues["followup_logs"] = [logsChain, updateFailedChain];
    tableChainQueues["patients"] = [patientChain];

    // pushMessage が例外をスロー
    mockPushMessage.mockRejectedValue(new Error("ネットワークエラー"));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await processFollowups();

    expect(result).toEqual({ sent: 0, failed: 1, skipped: 0 });
    expect(updateFailedChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        error_message: "ネットワークエラー",
      })
    );
    logSpy.mockRestore();
  });

  it("tenantId指定 → query.eq('tenant_id', ...) が呼ばれる", async () => {
    const logsChain = createChain({ data: [], error: null });
    tableChainQueues["followup_logs"] = [logsChain];

    const result = await processFollowups("tenant-abc");

    // followup_logs チェーンで tenant_id フィルターが適用されたか
    expect(logsChain.eq).toHaveBeenCalledWith("tenant_id", "tenant-abc");
    expect(result).toEqual({ sent: 0, failed: 0, skipped: 0 });
  });
});
