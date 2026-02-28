// __tests__/api/cron-process-steps.test.ts
// ステップ配信 Cron API のテスト
// 対象: app/api/cron/process-steps/route.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// === モックヘルパー ===
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, any> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// === モック定義 ===
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/step-enrollment", () => ({
  calculateNextSendAt: vi.fn().mockReturnValue("2026-03-01T10:00:00Z"),
  evaluateStepConditions: vi.fn().mockResolvedValue(false),
  jumpToStep: vi.fn().mockResolvedValue(undefined),
}));

const mockAcquireLock = vi.fn();
vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: (...args: any[]) => mockAcquireLock(...args),
}));

import { GET } from "@/app/api/cron/process-steps/route";
import { pushMessage } from "@/lib/line-push";
import { evaluateStepConditions, jumpToStep, calculateNextSendAt } from "@/lib/step-enrollment";

// === テスト本体 ===
describe("GET /api/cron/process-steps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    // デフォルト: ロック取得成功
    mockAcquireLock.mockResolvedValue({ acquired: true, release: vi.fn() });
  });

  // ------------------------------------------------------------------
  // 空の結果テスト
  // ------------------------------------------------------------------
  describe("enrollments が空の場合", () => {
    it("enrollments が空の場合は processed=0 を返す", async () => {
      const enrollmentsChain = createChain({ data: [], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(0);
    });

    it("enrollments が null の場合も processed=0 を返す", async () => {
      const enrollmentsChain = createChain({ data: null, error: null });
      tableChains["step_enrollments"] = enrollmentsChain;

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // DBエラーテスト
  // ------------------------------------------------------------------
  describe("DBエラー", () => {
    it("クエリエラー時は500を返す", async () => {
      const enrollmentsChain = createChain({ data: null, error: { message: "DB connection failed" } });
      tableChains["step_enrollments"] = enrollmentsChain;

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("DB connection failed");
    });
  });

  // ------------------------------------------------------------------
  // シナリオ無効化テスト
  // ------------------------------------------------------------------
  describe("シナリオ無効化", () => {
    it("シナリオが無効化されている場合はpausedに更新する", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: "U123",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テストシナリオ", is_enabled: false },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      expect(res.status).toBe(200);

      // enrollmentsのupdateが呼ばれ、status: "paused" が設定されている
      const updateCalls = enrollmentsChain.update.mock.calls;
      expect(updateCalls.length).toBeGreaterThan(0);
      const pausedCall = updateCalls.find((c: any[]) =>
        c[0] && c[0].status === "paused"
      );
      expect(pausedCall).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // ステップ未発見テスト（完了扱い）
  // ------------------------------------------------------------------
  describe("ステップ未発見（完了扱い）", () => {
    it("ステップが見つからない場合はcompletedに更新する", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 99,
        line_uid: "U123",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テストシナリオ", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;
      // step_items: 見つからない
      const stepsChain = createChain({ data: null, error: null });
      tableChains["step_items"] = stepsChain;
      // step_scenarios: 統計更新
      const scenariosChain = createChain({ data: { total_completed: 5 }, error: null });
      tableChains["step_scenarios"] = scenariosChain;

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      expect(res.status).toBe(200);

      // completedステータスに更新される
      const updateCalls = enrollmentsChain.update.mock.calls;
      const completedCall = updateCalls.find((c: any[]) =>
        c[0] && c[0].status === "completed"
      );
      expect(completedCall).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // 離脱条件テスト
  // ------------------------------------------------------------------
  describe("離脱条件チェック", () => {
    it("離脱条件にマッチし、exit_action=exit の場合はexitedに更新する", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: "U123",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テスト", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;
      const stepsChain = createChain({
        data: {
          step_type: "send_text",
          content: "テスト",
          exit_condition_rules: [{ type: "tag", tag_id: 1 }],
          exit_action: "exit",
        },
        error: null,
      });
      tableChains["step_items"] = stepsChain;

      // 離脱条件にマッチ
      (evaluateStepConditions as any).mockResolvedValue(true);

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(1);

      // exitedに更新される
      const updateCalls = enrollmentsChain.update.mock.calls;
      const exitedCall = updateCalls.find((c: any[]) =>
        c[0] && c[0].status === "exited"
      );
      expect(exitedCall).toBeDefined();
    });

    it("離脱条件にマッチし、exit_action=skip の場合は次のステップへ進む", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: "U123",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テスト", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;
      const stepsChain = createChain({
        data: {
          step_type: "send_text",
          content: "テスト",
          exit_condition_rules: [{ type: "tag", tag_id: 1 }],
          exit_action: "skip",
        },
        error: null,
      });
      tableChains["step_items"] = stepsChain;

      (evaluateStepConditions as any).mockResolvedValue(true);

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(1);
    });

    it("離脱条件にマッチし、exit_action=jump の場合はjumpToStepが呼ばれる", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: "U123",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テスト", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;
      const stepsChain = createChain({
        data: {
          step_type: "send_text",
          content: "テスト",
          exit_condition_rules: [{ type: "tag", tag_id: 1 }],
          exit_action: "jump",
          exit_jump_to: 5,
        },
        error: null,
      });
      tableChains["step_items"] = stepsChain;

      (evaluateStepConditions as any).mockResolvedValue(true);

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(1);
      expect(jumpToStep).toHaveBeenCalledWith("enroll-1", 5, "scn-1", "test-tenant");
    });
  });

  // ------------------------------------------------------------------
  // 条件分岐ステップテスト
  // ------------------------------------------------------------------
  describe("条件分岐ステップ", () => {
    it("条件がtrueの場合はbranch_true_stepにジャンプする", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: "U123",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テスト", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;
      const stepsChain = createChain({
        data: {
          step_type: "condition",
          condition_rules: [{ type: "tag", tag_id: 2 }],
          branch_true_step: 3,
          branch_false_step: 5,
        },
        error: null,
      });
      tableChains["step_items"] = stepsChain;

      // 離脱条件はfalse（通過）、条件分岐はtrue
      (evaluateStepConditions as any).mockResolvedValue(true);

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(jumpToStep).toHaveBeenCalledWith("enroll-1", 3, "scn-1", "test-tenant");
    });

    it("条件がfalseの場合はbranch_false_stepにジャンプする", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: "U123",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テスト", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;
      const stepsChain = createChain({
        data: {
          step_type: "condition",
          condition_rules: [{ type: "tag", tag_id: 2 }],
          branch_true_step: 3,
          branch_false_step: 5,
        },
        error: null,
      });
      tableChains["step_items"] = stepsChain;

      // 条件分岐はfalse
      (evaluateStepConditions as any).mockResolvedValue(false);

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(jumpToStep).toHaveBeenCalledWith("enroll-1", 5, "scn-1", "test-tenant");
    });

    it("条件ルールが空の場合は次のステップへ進む", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: "U123",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テスト", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;
      const stepsChain = createChain({
        data: {
          step_type: "condition",
          condition_rules: [],
          branch_true_step: 3,
          branch_false_step: 5,
        },
        error: null,
      });
      tableChains["step_items"] = stepsChain;

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(1);
    });
  });

  // ------------------------------------------------------------------
  // send_text ステップ実行テスト
  // ------------------------------------------------------------------
  describe("send_text ステップ実行", () => {
    it("LINE UIDがある場合はメッセージを送信する", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: "U123abc",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テスト", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;
      const stepsChain = createChain({
        data: {
          step_type: "send_text",
          content: "こんにちは{name}さん",
          sort_order: 1,
        },
        error: null,
      });
      tableChains["step_items"] = stepsChain;
      // 患者名取得
      const patientsChain = createChain({ data: { name: "田中太郎" }, error: null });
      tableChains["patients"] = patientsChain;
      // メッセージログ
      const msgLogChain = createChain();
      tableChains["message_log"] = msgLogChain;

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(1);

      // pushMessageが呼ばれたことを確認
      expect(pushMessage).toHaveBeenCalledWith(
        "U123abc",
        [{ type: "text", text: "こんにちは田中太郎さん" }],
        "test-tenant"
      );
    });

    it("LINE UIDがない場合はスキップして次のステップへ進む", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: null,
        tenant_id: "test-tenant",
        step_scenarios: { name: "テスト", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;
      const stepsChain = createChain({
        data: {
          step_type: "send_text",
          content: "テスト",
          sort_order: 1,
        },
        error: null,
      });
      tableChains["step_items"] = stepsChain;

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(1);

      // pushMessageは呼ばれない
      expect(pushMessage).not.toHaveBeenCalled();
    });

    it("変数{patient_id}が正しく置換される", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-REPLACE",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: "U999",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テスト", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;
      const stepsChain = createChain({
        data: {
          step_type: "send_text",
          content: "ID: {patient_id}",
          sort_order: 1,
        },
        error: null,
      });
      tableChains["step_items"] = stepsChain;
      const patientsChain = createChain({ data: { name: "" }, error: null });
      tableChains["patients"] = patientsChain;
      const msgLogChain = createChain();
      tableChains["message_log"] = msgLogChain;

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      await GET(req);

      expect(pushMessage).toHaveBeenCalledWith(
        "U999",
        [{ type: "text", text: "ID: PT-REPLACE" }],
        "test-tenant"
      );
    });
  });

  // ------------------------------------------------------------------
  // send_template ステップ実行テスト
  // ------------------------------------------------------------------
  describe("send_template ステップ実行", () => {
    it("テンプレートメッセージを送信する", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: "U123",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テスト", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;
      const stepsChain = createChain({
        data: {
          step_type: "send_template",
          template_id: 1,
          sort_order: 1,
        },
        error: null,
      });
      tableChains["step_items"] = stepsChain;
      // テンプレート取得
      const tmplChain = createChain({ data: { content: "テンプレ: {name}様", message_type: "text" }, error: null });
      tableChains["message_templates"] = tmplChain;
      const patientsChain = createChain({ data: { name: "佐藤" }, error: null });
      tableChains["patients"] = patientsChain;
      const msgLogChain = createChain();
      tableChains["message_log"] = msgLogChain;

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(pushMessage).toHaveBeenCalledWith(
        "U123",
        [{ type: "text", text: "テンプレ: 佐藤様" }],
        "test-tenant"
      );
    });
  });

  // ------------------------------------------------------------------
  // tag_add / tag_remove ステップテスト
  // ------------------------------------------------------------------
  describe("tag_add / tag_remove ステップ", () => {
    it("tag_add: patient_tagsにupsertする", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: "U123",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テスト", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;
      const stepsChain = createChain({
        data: {
          step_type: "tag_add",
          tag_id: 5,
          sort_order: 1,
        },
        error: null,
      });
      tableChains["step_items"] = stepsChain;
      const tagChain = createChain({ data: null, error: null });
      tableChains["patient_tags"] = tagChain;

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(1);

      // upsertが呼ばれた
      expect(tagChain.upsert).toHaveBeenCalled();
    });

    it("tag_remove: patient_tagsからdeleteする", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: "U123",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テスト", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;
      const stepsChain = createChain({
        data: {
          step_type: "tag_remove",
          tag_id: 5,
          sort_order: 1,
        },
        error: null,
      });
      tableChains["step_items"] = stepsChain;
      const tagChain = createChain({ data: null, error: null });
      tableChains["patient_tags"] = tagChain;

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(tagChain.delete).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // mark_change ステップテスト
  // ------------------------------------------------------------------
  describe("mark_change ステップ", () => {
    it("patient_marksにupsertする", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: "U123",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テスト", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;
      const stepsChain = createChain({
        data: {
          step_type: "mark_change",
          mark: "対応済み",
          sort_order: 1,
        },
        error: null,
      });
      tableChains["step_items"] = stepsChain;
      const markChain = createChain({ data: null, error: null });
      tableChains["patient_marks"] = markChain;

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(markChain.upsert).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // 次のステップへの遷移テスト
  // ------------------------------------------------------------------
  describe("次のステップへの遷移", () => {
    it("次のステップが存在する場合はnext_send_atを更新する", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: "U123",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テスト", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;

      // 現在のステップ + 次のステップ
      const stepsChain = createChain({
        data: {
          step_type: "tag_add",
          tag_id: 1,
          sort_order: 1,
          delay_type: "minutes",
          delay_value: 30,
          send_time: null,
        },
        error: null,
      });
      tableChains["step_items"] = stepsChain;
      const tagChain = createChain({ data: null, error: null });
      tableChains["patient_tags"] = tagChain;

      (calculateNextSendAt as any).mockReturnValue("2026-03-01T12:00:00Z");

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(1);
    });
  });

  // ------------------------------------------------------------------
  // 複数enrollment処理テスト
  // ------------------------------------------------------------------
  describe("複数enrollment処理", () => {
    it("複数のenrollmentを順に処理する", async () => {
      const enrollments = [
        {
          id: "enroll-1",
          patient_id: "PT-001",
          scenario_id: "scn-1",
          current_step_order: 1,
          line_uid: "U111",
          step_scenarios: { name: "シナリオ1", is_enabled: true },
        },
        {
          id: "enroll-2",
          patient_id: "PT-002",
          scenario_id: "scn-2",
          current_step_order: 1,
          line_uid: "U222",
          step_scenarios: { name: "シナリオ2", is_enabled: true },
        },
      ];

      const enrollmentsChain = createChain({ data: enrollments, error: null });
      tableChains["step_enrollments"] = enrollmentsChain;
      const stepsChain = createChain({
        data: {
          step_type: "mark_change",
          mark: "対応中",
          sort_order: 1,
        },
        error: null,
      });
      tableChains["step_items"] = stepsChain;
      const markChain = createChain({ data: null, error: null });
      tableChains["patient_marks"] = markChain;

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.processed).toBe(2);
    });
  });

  // ------------------------------------------------------------------
  // 例外処理テスト
  // ------------------------------------------------------------------
  describe("例外処理", () => {
    it("個別enrollment処理中のエラーはerrorsカウントに加算される", async () => {
      const enrollment = {
        id: "enroll-1",
        patient_id: "PT-001",
        scenario_id: "scn-1",
        current_step_order: 1,
        line_uid: "U123",
        tenant_id: "test-tenant",
        step_scenarios: { name: "テスト", is_enabled: true },
      };

      const enrollmentsChain = createChain({ data: [enrollment], error: null });
      tableChains["step_enrollments"] = enrollmentsChain;

      // step_items取得で例外
      const stepsChain = createChain();
      stepsChain.maybeSingle = vi.fn().mockImplementation(() => {
        throw new Error("unexpected step error");
      });
      tableChains["step_items"] = stepsChain;

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.errors).toBe(1);
    });
  });

  // ------------------------------------------------------------------
  // 排他制御テスト
  // ------------------------------------------------------------------
  describe("排他制御", () => {
    it("ロック取得失敗時はスキップレスポンスを返す", async () => {
      mockAcquireLock.mockResolvedValue({ acquired: false, release: vi.fn() });

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();

      expect(body.ok).toBe(true);
      expect(body.skipped).toBe("別のプロセスが実行中");
    });

    it("ロック取得成功時は処理を実行する", async () => {
      const releaseMock = vi.fn();
      mockAcquireLock.mockResolvedValue({ acquired: true, release: releaseMock });

      // 空の結果を返す
      const chain = getOrCreateChain("step_enrollments");
      chain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));

      const req = new NextRequest("http://localhost/api/cron/process-steps");
      const res = await GET(req);
      const body = await res.json();

      expect(body.ok).toBe(true);
      expect(body.processed).toBe(0);
      // ロック解放が呼ばれることを確認
      expect(releaseMock).toHaveBeenCalled();
    });
  });
});
