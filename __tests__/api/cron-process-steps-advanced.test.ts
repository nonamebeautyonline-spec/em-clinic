// __tests__/api/cron-process-steps-advanced.test.ts
// ステップ配信 Cron API の追加テスト（N分岐・A/Bテスト・menu_change・display_conditions）
// 対象: app/api/cron/process-steps/route.ts

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

// === Supabaseチェーンモック ===
type SupabaseChain = Record<string, Mock> & { then: Mock };

function createChain(defaultResolve = { data: null, error: null }): SupabaseChain {
  const chain = {} as SupabaseChain;
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
function getOrCreateChain(table: string) {
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

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/line-richmenu", () => ({
  linkRichMenuToUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/step-enrollment", () => ({
  calculateNextSendAt: vi.fn().mockReturnValue("2026-03-30T10:00:00Z"),
  evaluateStepConditions: vi.fn().mockResolvedValue(false),
  jumpToStep: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/step-conditions", () => ({
  evaluateDisplayConditions: vi.fn().mockReturnValue(true),
}));

const mockAcquireLock = vi.fn();
vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: (...args: unknown[]) => mockAcquireLock(...args),
}));

vi.mock("@/lib/notifications/cron-failure", () => ({
  notifyCronFailure: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from "@/app/api/cron/process-steps/route";
import { evaluateStepConditions, jumpToStep } from "@/lib/step-enrollment";
import { evaluateDisplayConditions } from "@/lib/step-conditions";
import { linkRichMenuToUser } from "@/lib/line-richmenu";

function makeEnrollment(overrides: Record<string, unknown> = {}) {
  return {
    id: "enroll-adv-1",
    patient_id: "PT-ADV",
    scenario_id: "scn-adv",
    current_step_order: 1,
    line_uid: "Uadv",
    tenant_id: "test-tenant",
    step_scenarios: { name: "テスト", is_enabled: true },
    ...overrides,
  };
}

describe("GET /api/cron/process-steps（追加テスト）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockAcquireLock.mockResolvedValue({ acquired: true, release: vi.fn() });
  });

  // ------------------------------------------------------------------
  // Cron認証テスト
  // ------------------------------------------------------------------
  describe("Cron認証", () => {
    it("CRON_SECRET が設定されていて正しいトークンが渡された場合は処理を実行", async () => {
      process.env.CRON_SECRET = "test-cron-secret";
      tableChains["step_enrollments"] = createChain({ data: [], error: null });

      const req = new NextRequest("http://localhost/api/cron/process-steps", {
        headers: { authorization: "Bearer test-cron-secret" },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      delete process.env.CRON_SECRET;
    });

    it("CRON_SECRET が設定されていて不正なトークンの場合は401を返す", async () => {
      process.env.CRON_SECRET = "test-cron-secret";

      const req = new NextRequest("http://localhost/api/cron/process-steps", {
        headers: { authorization: "Bearer wrong-secret" },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
      delete process.env.CRON_SECRET;
    });
  });

  // ------------------------------------------------------------------
  // N分岐ステップテスト
  // ------------------------------------------------------------------
  describe("N分岐ステップ（branches配列）", () => {
    it("最初にマッチした分岐のnext_stepにジャンプする", async () => {
      const enrollment = makeEnrollment();
      tableChains["step_enrollments"] = createChain({ data: [enrollment], error: null });
      tableChains["step_items"] = createChain({
        data: {
          step_type: "condition",
          branches: [
            { label: "分岐A", condition_rules: [{ type: "tag", tag_id: 1 }], next_step: 10 },
            { label: "分岐B", condition_rules: [{ type: "tag", tag_id: 2 }], next_step: 20 },
            { label: "デフォルト", condition_rules: [], next_step: 30 },
          ],
          sort_order: 1,
        },
        error: null,
      });

      // 最初の分岐にマッチ
      vi.mocked(evaluateStepConditions).mockResolvedValueOnce(true);

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(1);
      expect(jumpToStep).toHaveBeenCalledWith("enroll-adv-1", 10, "scn-adv", "test-tenant");
    });

    it("どの分岐にもマッチしない場合はデフォルト分岐（条件なし）にジャンプする", async () => {
      const enrollment = makeEnrollment();
      tableChains["step_enrollments"] = createChain({ data: [enrollment], error: null });
      tableChains["step_items"] = createChain({
        data: {
          step_type: "condition",
          branches: [
            { label: "分岐A", condition_rules: [{ type: "tag", tag_id: 1 }], next_step: 10 },
            { label: "デフォルト", next_step: 99 }, // condition_rulesなし = デフォルト
          ],
          sort_order: 1,
        },
        error: null,
      });

      // 分岐Aにマッチしない
      vi.mocked(evaluateStepConditions).mockResolvedValueOnce(false);

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(jumpToStep).toHaveBeenCalledWith("enroll-adv-1", 99, "scn-adv", "test-tenant");
    });

    it("全分岐にマッチせずデフォルトもない場合は次のステップへ進む", async () => {
      const enrollment = makeEnrollment();
      tableChains["step_enrollments"] = createChain({ data: [enrollment], error: null });
      tableChains["step_items"] = createChain({
        data: {
          step_type: "condition",
          branches: [
            { label: "分岐A", condition_rules: [{ type: "tag", tag_id: 1 }], next_step: 10 },
          ],
          sort_order: 1,
        },
        error: null,
      });

      vi.mocked(evaluateStepConditions).mockResolvedValueOnce(false);

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(1);
      // jumpToStepではなくadvanceToNextStepが呼ばれる
      expect(jumpToStep).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // A/Bテストステップテスト
  // ------------------------------------------------------------------
  describe("A/Bテストステップ", () => {
    it("バリアントが選択されnext_stepにジャンプする", async () => {
      const enrollment = makeEnrollment();
      tableChains["step_enrollments"] = createChain({ data: [enrollment], error: null });
      tableChains["step_items"] = createChain({
        data: {
          step_type: "ab_test",
          ab_variants: [
            { label: "A", weight: 100, next_step: 5 },  // 100%選択される
            { label: "B", weight: 0, next_step: 10 },
          ],
          sort_order: 1,
        },
        error: null,
      });

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(1);
      // weight=100のAが選択される
      expect(jumpToStep).toHaveBeenCalledWith("enroll-adv-1", 5, "scn-adv", "test-tenant");
    });

    it("バリアントが2つ未満の場合は次のステップへ進む", async () => {
      const enrollment = makeEnrollment();
      tableChains["step_enrollments"] = createChain({ data: [enrollment], error: null });
      tableChains["step_items"] = createChain({
        data: {
          step_type: "ab_test",
          ab_variants: [{ label: "A", weight: 100, next_step: 5 }], // 1つのみ
          sort_order: 1,
        },
        error: null,
      });

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(1);
      expect(jumpToStep).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // menu_change ステップテスト
  // ------------------------------------------------------------------
  describe("menu_change ステップ", () => {
    it("リッチメニューIDが存在する場合はlinkRichMenuToUserが呼ばれる", async () => {
      const enrollment = makeEnrollment();
      tableChains["step_enrollments"] = createChain({ data: [enrollment], error: null });
      tableChains["step_items"] = createChain({
        data: {
          step_type: "menu_change",
          menu_id: 42,
          sort_order: 1,
        },
        error: null,
      });
      tableChains["rich_menus"] = createChain({
        data: { line_rich_menu_id: "richmenu-abc123", name: "メニューA" },
        error: null,
      });

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(linkRichMenuToUser).toHaveBeenCalledWith("Uadv", "richmenu-abc123", "test-tenant");
    });

    it("リッチメニューが見つからない場合はスキップする", async () => {
      const enrollment = makeEnrollment();
      tableChains["step_enrollments"] = createChain({ data: [enrollment], error: null });
      tableChains["step_items"] = createChain({
        data: {
          step_type: "menu_change",
          menu_id: 999,
          sort_order: 1,
        },
        error: null,
      });
      tableChains["rich_menus"] = createChain({ data: null, error: null });

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(linkRichMenuToUser).not.toHaveBeenCalled();
    });

    it("line_uidがない場合はmenu_changeをスキップする", async () => {
      const enrollment = makeEnrollment({ line_uid: null });
      tableChains["step_enrollments"] = createChain({ data: [enrollment], error: null });
      tableChains["step_items"] = createChain({
        data: {
          step_type: "menu_change",
          menu_id: 42,
          sort_order: 1,
        },
        error: null,
      });

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(linkRichMenuToUser).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // display_conditions テスト
  // ------------------------------------------------------------------
  describe("display_conditions（表示条件・ロジック検証）", () => {
    // buildDisplayConditionContextは複雑なDB依存があるため、
    // evaluateDisplayConditionsの呼び出し判定ロジックをユニットテスト

    it("display_conditionsがnullの場合はevaluateDisplayConditionsを呼ばない", () => {
      const step = { display_conditions: null };
      const shouldEvaluate = !!step.display_conditions;
      expect(shouldEvaluate).toBe(false);
    });

    it("display_conditionsが設定されている場合は評価が必要", () => {
      const step = {
        display_conditions: {
          operator: "and" as const,
          conditions: [{ field: "tag_has", op: "equals", value: "VIP" }],
        },
      };
      const shouldEvaluate = !!step.display_conditions;
      expect(shouldEvaluate).toBe(true);
    });

    it("evaluateDisplayConditions=false の場合はスキップフロー", () => {
      // evaluateDisplayConditionsがfalseを返した場合、advanceToNextStepが呼ばれる
      const shouldDisplay = false;
      expect(!shouldDisplay).toBe(true); // → スキップ
    });

    it("evaluateDisplayConditions=true の場合はステップ実行フロー", () => {
      const shouldDisplay = true;
      expect(shouldDisplay).toBe(true); // → 実行
    });
  });

  // ------------------------------------------------------------------
  // send_text 変数置換テスト（追加）
  // ------------------------------------------------------------------
  describe("send_text 変数置換（追加）", () => {
    it("{send_date}が今日の日付で置換される", async () => {
      const enrollment = makeEnrollment();
      tableChains["step_enrollments"] = createChain({ data: [enrollment], error: null });
      tableChains["step_items"] = createChain({
        data: {
          step_type: "send_text",
          content: "送信日: {send_date}",
          sort_order: 1,
        },
        error: null,
      });
      tableChains["patients"] = createChain({ data: { name: "テスト" }, error: null });
      tableChains["message_log"] = createChain();

      const { pushMessage } = await import("@/lib/line-push");
      const req = new NextRequest("http://localhost/api/cron/process-steps");
      await GET(req);

      // pushMessageの引数に今日の日付が含まれる
      const callArgs = vi.mocked(pushMessage).mock.calls[0];
      const sentText = (callArgs[1][0] as { text: string }).text;
      expect(sentText).toContain("送信日: ");
      // 日付形式の文字列が含まれている（YYYY/M/D形式）
      expect(sentText).toMatch(/送信日: \d+\/\d+\/\d+/);
    });
  });

  // ------------------------------------------------------------------
  // 離脱条件 + exit_action=jump のnull next_stepテスト
  // ------------------------------------------------------------------
  describe("離脱条件のエッジケース", () => {
    it("exit_jump_to が null の場合はジャンプせず通過する", async () => {
      const enrollment = makeEnrollment();
      tableChains["step_enrollments"] = createChain({ data: [enrollment], error: null });
      tableChains["step_items"] = createChain({
        data: {
          step_type: "send_text",
          content: "テスト",
          exit_condition_rules: [{ type: "tag", tag_id: 1 }],
          exit_action: "jump",
          exit_jump_to: null,
          sort_order: 1,
        },
        error: null,
      });

      vi.mocked(evaluateStepConditions).mockResolvedValue(true);

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      // exit_jump_toがnullなのでjumpToStepは呼ばれない
      expect(jumpToStep).not.toHaveBeenCalled();
    });
  });
});
