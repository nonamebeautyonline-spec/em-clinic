// lib/__tests__/undo.test.ts — Undo機能のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn((id) => ({ tenant_id: id })),
}));

const { recordUndoableAction, executeUndo, getRecentUndoActions } =
  await import("@/lib/undo");

/* ---------- ヘルパー ---------- */

function createMockChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, any> = {};
  const methods = [
    "from", "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte",
    "like", "ilike", "contains", "containedBy", "filter", "or",
    "order", "limit", "range", "single", "maybeSingle", "match",
    "textSearch", "csv", "rpc", "count", "head",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) =>
    resolve({ data, error, count: Array.isArray(data) ? data.length : 0 });
  return chain;
}

const TENANT = "tenant-001";

/* ---------- recordUndoableAction ---------- */

describe("recordUndoableAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常に記録してIDを返す", async () => {
    mockFrom.mockReturnValue(createMockChain({ id: 42 }));

    const result = await recordUndoableAction({
      tenantId: TENANT,
      actionType: "update",
      resourceType: "intake",
      resourceId: "123",
      previousData: { status: "pending" },
      currentData: { status: "approved" },
      description: "ステータス変更",
    });

    expect(result).toBe(42);
    expect(mockFrom).toHaveBeenCalledWith("undo_history");
  });

  it("DB挿入エラー時にnullを返す（例外はスローしない）", async () => {
    mockFrom.mockReturnValue(
      createMockChain(null, { message: "insert error" }),
    );

    const result = await recordUndoableAction({
      tenantId: TENANT,
      actionType: "delete",
      resourceType: "patient",
      resourceId: "p-1",
      previousData: { name: "テスト" },
      description: "患者削除",
    });

    expect(result).toBeNull();
  });

  it("予期しない例外でもnullを返す", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("unexpected");
    });

    const result = await recordUndoableAction({
      tenantId: TENANT,
      actionType: "insert",
      resourceType: "reservation",
      resourceId: "r-1",
      previousData: {},
      description: "予約挿入",
    });

    expect(result).toBeNull();
  });

  it("adminUserIdとcurrentDataがオプションで設定される", async () => {
    const insertChain = createMockChain({ id: 10 });
    mockFrom.mockReturnValue(insertChain);

    await recordUndoableAction({
      tenantId: TENANT,
      actionType: "update",
      resourceType: "intake",
      resourceId: "i-1",
      previousData: { a: 1 },
      currentData: { a: 2 },
      adminUserId: "admin-1",
      description: "テスト",
    });

    // insert が呼ばれ、admin_user_id を含むデータが渡される
    expect(insertChain.insert).toHaveBeenCalled();
    const insertArg = (insertChain.insert as any).mock.calls[0][0];
    expect(insertArg.admin_user_id).toBe("admin-1");
    expect(insertArg.current_data).toEqual({ a: 2 });
  });
});

/* ---------- executeUndo ---------- */

describe("executeUndo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("update操作の取り消し: previous_dataでUPDATEする", async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 12);

    const undoRecord = {
      id: 1,
      undone: false,
      expires_at: futureDate.toISOString(),
      resource_type: "intake",
      resource_id: "i-100",
      action_type: "update",
      previous_data: { status: "pending", name: "旧データ", id: 99, created_at: "2025-01-01", tenant_id: TENANT },
    };

    // 1回目: undo_history取得, 2回目: intakeのupdate, 3回目: undone更新
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createMockChain(undoRecord);
      return createMockChain(null);
    });

    const result = await executeUndo(1, TENANT);
    expect(result.success).toBe(true);
  });

  it("delete操作の取り消し: previous_dataを再INSERTする", async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 12);

    const undoRecord = {
      id: 2,
      undone: false,
      expires_at: futureDate.toISOString(),
      resource_type: "patient",
      resource_id: "p-100",
      action_type: "delete",
      previous_data: { id: "p-100", name: "削除済み患者" },
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createMockChain(undoRecord);
      return createMockChain(null);
    });

    const result = await executeUndo(2, TENANT);
    expect(result.success).toBe(true);
  });

  it("insert操作の取り消し: 挿入レコードをDELETEする", async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 12);

    const undoRecord = {
      id: 3,
      undone: false,
      expires_at: futureDate.toISOString(),
      resource_type: "reservation",
      resource_id: "r-100",
      action_type: "insert",
      previous_data: {},
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createMockChain(undoRecord);
      return createMockChain(null);
    });

    const result = await executeUndo(3, TENANT);
    expect(result.success).toBe(true);
  });

  it("取り消し済みの場合エラーを返す", async () => {
    const undoRecord = {
      id: 4,
      undone: true,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      resource_type: "intake",
      resource_id: "i-1",
      action_type: "update",
      previous_data: {},
    };

    mockFrom.mockReturnValue(createMockChain(undoRecord));
    const result = await executeUndo(4, TENANT);
    expect(result.success).toBe(false);
    expect(result.error).toBe("この操作は既に取り消し済みです");
  });

  it("有効期限切れの場合エラーを返す", async () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1);

    const undoRecord = {
      id: 5,
      undone: false,
      expires_at: pastDate.toISOString(),
      resource_type: "intake",
      resource_id: "i-2",
      action_type: "update",
      previous_data: {},
    };

    mockFrom.mockReturnValue(createMockChain(undoRecord));
    const result = await executeUndo(5, TENANT);
    expect(result.success).toBe(false);
    expect(result.error).toContain("有効期限が切れています");
  });

  it("Undo履歴が見つからない場合エラーを返す", async () => {
    mockFrom.mockReturnValue(
      createMockChain(null, { message: "not found" }),
    );
    const result = await executeUndo(999, TENANT);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Undo履歴が見つかりません");
  });

  it("未対応リソースタイプの場合エラーを返す", async () => {
    const undoRecord = {
      id: 6,
      undone: false,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      resource_type: "unknown_type",
      resource_id: "x-1",
      action_type: "update",
      previous_data: {},
    };

    mockFrom.mockReturnValue(createMockChain(undoRecord));
    const result = await executeUndo(6, TENANT);
    expect(result.success).toBe(false);
    expect(result.error).toContain("未対応のリソースタイプ");
  });
});

/* ---------- getRecentUndoActions ---------- */

describe("getRecentUndoActions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("有効なUndo操作一覧を返す", async () => {
    const actions = [
      { id: 1, action_type: "update", undone: false },
      { id: 2, action_type: "delete", undone: false },
    ];
    mockFrom.mockReturnValue(createMockChain(actions));

    const result = await getRecentUndoActions(TENANT);
    expect(result).toHaveLength(2);
  });

  it("DBエラー時に空配列を返す", async () => {
    mockFrom.mockReturnValue(
      createMockChain(null, { message: "error" }),
    );
    const result = await getRecentUndoActions(TENANT);
    expect(result).toEqual([]);
  });
});
