// lib/__tests__/lifecycle-actions.test.ts
// ライフサイクルイベント共通アクション実行のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// === モック設定 ===
const { mockPushMessage, mockLinkRichMenuToUser } = vi.hoisted(() => ({
  mockPushMessage: vi.fn().mockResolvedValue(undefined),
  mockLinkRichMenuToUser: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: mockPushMessage,
}));

vi.mock("@/lib/line-richmenu", () => ({
  linkRichMenuToUser: mockLinkRichMenuToUser,
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query) => query),
  strictWithTenant: vi.fn((query: unknown) => query),
  tenantPayload: vi.fn(() => ({ tenant_id: null })),
}));

// === Supabase モック ===
let tableChains: Record<string, ReturnType<typeof createChain>> = {};

function createChain(defaultResolve = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  ["insert", "update", "delete", "select", "eq", "neq", "upsert",
   "order", "limit", "single", "maybeSingle", "in", "is", "not", "gte", "lte", "gt", "lt"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => void) => resolve(defaultResolve));
  return chain;
}

function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
  },
}));

import { executeLifecycleActions, evaluateConditionRules } from "@/lib/lifecycle-actions";
import type { ConditionRule, PatientContext } from "@/lib/lifecycle-actions";
import { supabaseAdmin } from "@/lib/supabase";

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
});

const baseParams = {
  settingKey: "personal_info_completed",
  patientId: "p001",
  lineUserId: "U1234",
  patientName: "田中太郎",
  tenantId: null,
  assignedBy: "register",
};

describe("executeLifecycleActions", () => {
  it("設定がない場合 → executed: false", async () => {
    tableChains["friend_add_settings"] = createChain({ data: null, error: null });

    const result = await executeLifecycleActions(baseParams);
    expect(result.executed).toBe(false);
    expect(result.actionDetails).toEqual([]);
  });

  it("enabled=false の場合 → executed: false", async () => {
    tableChains["friend_add_settings"] = createChain({
      data: { enabled: false, setting_value: { steps: [] } },
      error: null,
    });

    const result = await executeLifecycleActions(baseParams);
    expect(result.executed).toBe(false);
  });

  it("steps が空配列の場合 → executed: false", async () => {
    tableChains["friend_add_settings"] = createChain({
      data: { enabled: true, setting_value: { steps: [] } },
      error: null,
    });

    const result = await executeLifecycleActions(baseParams);
    expect(result.executed).toBe(false);
  });

  it("send_text ステップ → pushMessage が変数置換済みテキストで呼ばれる", async () => {
    tableChains["friend_add_settings"] = createChain({
      data: {
        enabled: true,
        setting_value: {
          steps: [{ type: "send_text", content: "こんにちは{name}さん（ID:{patient_id}）" }],
        },
      },
      error: null,
    });

    const result = await executeLifecycleActions(baseParams);
    expect(result.executed).toBe(true);
    expect(mockPushMessage).toHaveBeenCalledWith(
      "U1234",
      [{ type: "text", text: "こんにちは田中太郎さん（ID:p001）" }],
      undefined,
    );
  });

  it("tag_add ステップ → patient_tags に upsert", async () => {
    tableChains["friend_add_settings"] = createChain({
      data: {
        enabled: true,
        setting_value: {
          steps: [{ type: "tag_add", tag_id: 1, tag_name: "個人情報提出ずみ" }],
        },
      },
      error: null,
    });
    tableChains["patient_tags"] = createChain();

    const result = await executeLifecycleActions(baseParams);
    expect(result.executed).toBe(true);
    expect(vi.mocked(supabaseAdmin.from)).toHaveBeenCalledWith("patient_tags");
    expect(result.actionDetails).toContain("タグ追加[個人情報提出ずみ]");
  });

  it("tag_remove ステップ → patient_tags から delete", async () => {
    tableChains["friend_add_settings"] = createChain({
      data: {
        enabled: true,
        setting_value: {
          steps: [{ type: "tag_remove", tag_id: 2, tag_name: "テストタグ" }],
        },
      },
      error: null,
    });
    tableChains["patient_tags"] = createChain();

    const result = await executeLifecycleActions(baseParams);
    expect(result.executed).toBe(true);
    expect(result.actionDetails).toContain("タグ削除[テストタグ]");
  });

  it("mark_change ステップ → patient_marks に upsert", async () => {
    tableChains["friend_add_settings"] = createChain({
      data: {
        enabled: true,
        setting_value: {
          steps: [{ type: "mark_change", mark: "green" }],
        },
      },
      error: null,
    });
    tableChains["patient_marks"] = createChain();

    const result = await executeLifecycleActions(baseParams);
    expect(result.executed).toBe(true);
    expect(result.actionDetails).toContain("対応マーク[green]");
  });

  it("menu_change ステップ → linkRichMenuToUser が呼ばれる", async () => {
    tableChains["friend_add_settings"] = createChain({
      data: {
        enabled: true,
        setting_value: {
          steps: [{ type: "menu_change", menu_id: "5" }],
        },
      },
      error: null,
    });
    tableChains["rich_menus"] = createChain({
      data: { line_rich_menu_id: "richmenu-abc123", name: "個人情報入力後" },
      error: null,
    });

    const result = await executeLifecycleActions(baseParams);
    expect(result.executed).toBe(true);
    expect(mockLinkRichMenuToUser).toHaveBeenCalledWith("U1234", "richmenu-abc123", undefined);
    expect(result.actionDetails).toContain("メニュー変更[個人情報入力後]");
  });

  it("複数ステップの順次実行", async () => {
    tableChains["friend_add_settings"] = createChain({
      data: {
        enabled: true,
        setting_value: {
          steps: [
            { type: "tag_add", tag_id: 1, tag_name: "個人情報提出ずみ" },
            { type: "menu_change", menu_id: "3" },
            { type: "send_text", content: "登録ありがとうございます" },
          ],
        },
      },
      error: null,
    });
    tableChains["patient_tags"] = createChain();
    tableChains["rich_menus"] = createChain({
      data: { line_rich_menu_id: "richmenu-xyz", name: "登録後メニュー" },
      error: null,
    });

    const result = await executeLifecycleActions(baseParams);
    expect(result.executed).toBe(true);
    expect(result.actionDetails).toHaveLength(3);
    expect(result.actionDetails[0]).toBe("タグ追加[個人情報提出ずみ]");
    expect(result.actionDetails[1]).toBe("メニュー変更[登録後メニュー]");
    expect(result.actionDetails[2]).toBe("テキスト送信");
  });

  it("旧フォーマット互換（greeting_message + assign_tags）", async () => {
    tableChains["friend_add_settings"] = createChain({
      data: {
        enabled: true,
        setting_value: {
          greeting_message: "ようこそ{name}さん",
          assign_tags: [1, 2],
          assign_mark: "green",
          menu_change: "5",
        },
      },
      error: null,
    });
    tableChains["patient_tags"] = createChain();
    tableChains["patient_marks"] = createChain();
    tableChains["rich_menus"] = createChain({
      data: { line_rich_menu_id: "richmenu-old", name: "旧メニュー" },
      error: null,
    });

    const result = await executeLifecycleActions(baseParams);
    expect(result.executed).toBe(true);
    expect(mockPushMessage).toHaveBeenCalledWith(
      "U1234",
      [{ type: "text", text: "ようこそ田中太郎さん" }],
      undefined,
    );
    // タグ2つ + マーク + メニュー + テキスト = 5アクション
    expect(result.actionDetails.length).toBeGreaterThanOrEqual(4);
  });

  it("send_template ステップ（テキストテンプレート）", async () => {
    tableChains["friend_add_settings"] = createChain({
      data: {
        enabled: true,
        setting_value: {
          steps: [{ type: "send_template", template_id: 10 }],
        },
      },
      error: null,
    });
    tableChains["message_templates"] = createChain({
      data: { content: "{name}様へのお知らせ", message_type: "text", flex_content: null },
      error: null,
    });

    const result = await executeLifecycleActions(baseParams);
    expect(result.executed).toBe(true);
    expect(mockPushMessage).toHaveBeenCalledWith(
      "U1234",
      [{ type: "text", text: "田中太郎様へのお知らせ" }],
      undefined,
    );
  });

  it("send_template ステップ（Flexテンプレート）", async () => {
    const flexJson = { type: "bubble", body: { type: "box", layout: "vertical", contents: [] } };
    tableChains["friend_add_settings"] = createChain({
      data: {
        enabled: true,
        setting_value: {
          steps: [{ type: "send_template", template_id: 20 }],
        },
      },
      error: null,
    });
    tableChains["message_templates"] = createChain({
      data: { content: "Flexメッセージ", message_type: "flex", flex_content: flexJson },
      error: null,
    });

    const result = await executeLifecycleActions(baseParams);
    expect(result.executed).toBe(true);
    expect(mockPushMessage).toHaveBeenCalledWith(
      "U1234",
      [{ type: "flex", altText: "Flexメッセージ", contents: flexJson }],
      undefined,
    );
  });

  it("mark_change が none の場合はスキップ", async () => {
    tableChains["friend_add_settings"] = createChain({
      data: {
        enabled: true,
        setting_value: {
          steps: [{ type: "mark_change", mark: "none" }],
        },
      },
      error: null,
    });

    const result = await executeLifecycleActions(baseParams);
    // mark_change none はスキップされるが、stepsは空ではないのでexecutedはtrue
    expect(result.executed).toBe(true);
    expect(result.actionDetails).toHaveLength(0);
  });

  it("条件付きステップ: 条件不一致ならスキップ", async () => {
    tableChains["friend_add_settings"] = createChain({
      data: {
        enabled: true,
        setting_value: {
          steps: [
            {
              type: "send_text",
              content: "条件不一致",
              condition: {
                enabled: true,
                rules: [{ type: "tag", tag_ids: [99], tag_match: "any_include" }],
              },
            },
          ],
        },
      },
      error: null,
    });
    // 患者コンテキスト: タグなし, マークnone
    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: null, error: null });
    tableChains["patients"] = createChain({ data: { name: "テスト" }, error: null });

    const result = await executeLifecycleActions(baseParams);
    expect(result.executed).toBe(true);
    expect(result.actionDetails).toHaveLength(0);
    expect(mockPushMessage).not.toHaveBeenCalled();
  });

  it("条件付きステップ: 条件一致なら実行", async () => {
    tableChains["friend_add_settings"] = createChain({
      data: {
        enabled: true,
        setting_value: {
          steps: [
            {
              type: "send_text",
              content: "条件一致",
              condition: {
                enabled: true,
                rules: [{ type: "tag", tag_ids: [1], tag_match: "any_include" }],
              },
            },
          ],
        },
      },
      error: null,
    });
    // 患者コンテキスト: タグ1あり
    tableChains["patient_tags"] = createChain({ data: [{ tag_id: 1 }], error: null });
    tableChains["patient_marks"] = createChain({ data: null, error: null });
    tableChains["patients"] = createChain({ data: { name: "テスト" }, error: null });

    const result = await executeLifecycleActions(baseParams);
    expect(result.executed).toBe(true);
    expect(result.actionDetails).toContain("テキスト送信");
    expect(mockPushMessage).toHaveBeenCalled();
  });

  it("condition.enabled=false なら条件を無視して実行", async () => {
    tableChains["friend_add_settings"] = createChain({
      data: {
        enabled: true,
        setting_value: {
          steps: [
            {
              type: "send_text",
              content: "条件無効",
              condition: {
                enabled: false,
                rules: [{ type: "tag", tag_ids: [99], tag_match: "any_include" }],
              },
            },
          ],
        },
      },
      error: null,
    });

    const result = await executeLifecycleActions(baseParams);
    expect(result.executed).toBe(true);
    expect(result.actionDetails).toContain("テキスト送信");
  });
});

describe("evaluateConditionRules", () => {
  const ctx: PatientContext = { tagIds: [1, 2], mark: "red", name: "田中太郎", intakeStatus: "OK", hasReservation: true };

  describe("タグ条件", () => {
    it("any_include: いずれかのタグを持っていればtrue", () => {
      const rules: ConditionRule[] = [{ type: "tag", tag_ids: [1, 99], tag_match: "any_include" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(true);
    });

    it("any_include: どのタグも持っていなければfalse", () => {
      const rules: ConditionRule[] = [{ type: "tag", tag_ids: [98, 99], tag_match: "any_include" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(false);
    });

    it("all_include: 全タグを持っていればtrue", () => {
      const rules: ConditionRule[] = [{ type: "tag", tag_ids: [1, 2], tag_match: "all_include" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(true);
    });

    it("all_include: 一部しか持っていなければfalse", () => {
      const rules: ConditionRule[] = [{ type: "tag", tag_ids: [1, 99], tag_match: "all_include" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(false);
    });

    it("any_exclude: いずれかのタグを持っていればfalse", () => {
      const rules: ConditionRule[] = [{ type: "tag", tag_ids: [1, 99], tag_match: "any_exclude" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(false);
    });

    it("any_exclude: どのタグも持っていなければtrue", () => {
      const rules: ConditionRule[] = [{ type: "tag", tag_ids: [98, 99], tag_match: "any_exclude" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(true);
    });

    it("all_exclude: 全タグを持っていればfalse", () => {
      const rules: ConditionRule[] = [{ type: "tag", tag_ids: [1, 2], tag_match: "all_exclude" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(false);
    });

    it("all_exclude: 一部しか持っていなければtrue", () => {
      const rules: ConditionRule[] = [{ type: "tag", tag_ids: [1, 99], tag_match: "all_exclude" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(true);
    });
  });

  describe("マーク条件", () => {
    it("any_match: マークが一致すればtrue", () => {
      const rules: ConditionRule[] = [{ type: "mark", mark_values: ["red", "green"], mark_match: "any_match" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(true);
    });

    it("any_match: マークが一致しなければfalse", () => {
      const rules: ConditionRule[] = [{ type: "mark", mark_values: ["green", "blue"], mark_match: "any_match" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(false);
    });

    it("any_exclude: マークが一致すればfalse", () => {
      const rules: ConditionRule[] = [{ type: "mark", mark_values: ["red"], mark_match: "any_exclude" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(false);
    });

    it("any_exclude: マークが一致しなければtrue", () => {
      const rules: ConditionRule[] = [{ type: "mark", mark_values: ["green"], mark_match: "any_exclude" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(true);
    });
  });

  describe("名前条件", () => {
    it("contains: 名前に含まれればtrue", () => {
      const rules: ConditionRule[] = [{ type: "name", name_operator: "contains", name_value: "田中" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(true);
    });

    it("not_contains: 名前に含まれなければtrue", () => {
      const rules: ConditionRule[] = [{ type: "name", name_operator: "not_contains", name_value: "鈴木" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(true);
    });

    it("equals: 完全一致でtrue", () => {
      const rules: ConditionRule[] = [{ type: "name", name_operator: "equals", name_value: "田中太郎" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(true);
    });
  });

  describe("AND条件（複数ルール）", () => {
    it("全ルール一致でtrue", () => {
      const rules: ConditionRule[] = [
        { type: "tag", tag_ids: [1], tag_match: "any_include" },
        { type: "mark", mark_values: ["red"], mark_match: "any_match" },
      ];
      expect(evaluateConditionRules(rules, ctx)).toBe(true);
    });

    it("1つでも不一致ならfalse", () => {
      const rules: ConditionRule[] = [
        { type: "tag", tag_ids: [1], tag_match: "any_include" },
        { type: "mark", mark_values: ["green"], mark_match: "any_match" },
      ];
      expect(evaluateConditionRules(rules, ctx)).toBe(false);
    });
  });

  describe("診察ステータス条件", () => {
    it("intake_status: OKに一致すればtrue", () => {
      const rules: ConditionRule[] = [{ type: "intake_status", status_value: "OK" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(true);
    });

    it("intake_status: NGに一致しなければfalse", () => {
      const rules: ConditionRule[] = [{ type: "intake_status", status_value: "NG" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(false);
    });

    it("intake_status: 未診察の患者でnone指定", () => {
      const rules: ConditionRule[] = [{ type: "intake_status", status_value: "none" }];
      const noIntakeCtx: PatientContext = { ...ctx, intakeStatus: "none" };
      expect(evaluateConditionRules(rules, noIntakeCtx)).toBe(true);
    });
  });

  describe("予約ステータス条件", () => {
    it("reservation_status: 予約ありでhas指定→true", () => {
      const rules: ConditionRule[] = [{ type: "reservation_status", status_value: "has" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(true);
    });

    it("reservation_status: 予約ありでnone指定→false", () => {
      const rules: ConditionRule[] = [{ type: "reservation_status", status_value: "none" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(false);
    });

    it("reservation_status: 予約なしでnone指定→true", () => {
      const rules: ConditionRule[] = [{ type: "reservation_status", status_value: "none" }];
      const noResCtx: PatientContext = { ...ctx, hasReservation: false };
      expect(evaluateConditionRules(rules, noResCtx)).toBe(true);
    });
  });

  describe("エッジケース", () => {
    it("空のルール配列 → true", () => {
      expect(evaluateConditionRules([], ctx)).toBe(true);
    });

    it("未対応の条件タイプ → true（スキップ）", () => {
      const rules = [{ type: "last_payment_date" as const }] as ConditionRule[];
      expect(evaluateConditionRules(rules, ctx)).toBe(true);
    });

    it("tag_ids が空 → true", () => {
      const rules: ConditionRule[] = [{ type: "tag", tag_ids: [], tag_match: "any_include" }];
      expect(evaluateConditionRules(rules, ctx)).toBe(true);
    });
  });
});
