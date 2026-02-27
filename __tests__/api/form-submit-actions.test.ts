// __tests__/api/form-submit-actions.test.ts
// フォーム送信API — executeFormAction / save_target / post_actions のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ---------- モック設定 ---------- */

const mockPushMessage = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/line-push", () => ({
  pushMessage: (...args: any[]) => mockPushMessage(...args),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn().mockReturnValue("test-tenant"),
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn((id) => ({ tenant_id: id })),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/validations/forms", () => ({
  formSubmitSchema: {},
}));

vi.mock("@/lib/form-conditions", () => ({
  evaluateDisplayConditions: vi.fn().mockReturnValue(true),
}));

const { parseBody } = await import("@/lib/validations/helpers");
const { POST } = await import("@/app/api/forms/[slug]/submit/route");

/* ---------- ヘルパー ---------- */

function createChain(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return chain;
}

function makeRequest(body: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/forms/test-form/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PARAMS = { params: Promise.resolve({ slug: "test-form" }) };

/** POSTハンドラを実行するための共通モック設定 */
function setupBaseMocks(options: {
  formFields?: any[];
  formSettings?: Record<string, any>;
  answers?: Record<string, any>;
  lineUserId?: string | null;
  patientId?: string | null;
  actionSteps?: any[];
  templateContent?: string | null;
} = {}) {
  const {
    formFields = [],
    formSettings = {},
    answers = {},
    lineUserId = "U-line-001",
    patientId = "p-001",
    actionSteps = [],
    templateContent = null,
  } = options;

  // parseBody モック: バリデーション通過
  (parseBody as any).mockResolvedValue({
    data: {
      answers,
      line_user_id: lineUserId,
      respondent_name: "テスト回答者",
    },
  });

  // テーブル別チェーン
  const formsChain = createChain({
    single: vi.fn().mockResolvedValue({
      data: {
        id: 1,
        fields: formFields,
        settings: formSettings,
        is_published: true,
      },
      error: null,
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { name: "テストフォーム" },
      error: null,
    }),
  });

  const formResponsesChain = createChain({
    single: vi.fn().mockResolvedValue({
      data: { id: "resp-001" },
      error: null,
    }),
  });

  const intakeChain = createChain({
    maybeSingle: vi.fn().mockResolvedValue({
      data: patientId ? { patient_id: patientId } : null,
      error: null,
    }),
  });

  const actionsChain = createChain({
    single: vi.fn().mockResolvedValue({
      data: actionSteps.length > 0 ? { id: 1, name: "テストアクション", steps: actionSteps } : null,
      error: null,
    }),
  });

  const messageTemplatesChain = createChain({
    single: vi.fn().mockResolvedValue({
      data: templateContent ? { content: templateContent } : null,
      error: null,
    }),
  });

  const patientTagsChain = createChain({
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  const patientsChain = createChain({
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  });

  const friendFieldValuesChain = createChain({
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  const messageLogChain = createChain({
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case "forms": return formsChain;
      case "form_responses": return formResponsesChain;
      case "intake": return intakeChain;
      case "actions": return actionsChain;
      case "message_templates": return messageTemplatesChain;
      case "patient_tags": return patientTagsChain;
      case "patients": return patientsChain;
      case "friend_field_values": return friendFieldValuesChain;
      case "message_log": return messageLogChain;
      default: return createChain();
    }
  });

  return {
    formsChain,
    formResponsesChain,
    intakeChain,
    actionsChain,
    messageTemplatesChain,
    patientTagsChain,
    patientsChain,
    friendFieldValuesChain,
    messageLogChain,
  };
}

/* ---------- executeFormAction テスト ---------- */

describe("フォーム送信 - executeFormAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("send_textアクション: pushMessageが正しいテキストで呼ばれる", async () => {
    setupBaseMocks({
      formSettings: { post_actions: [1] },
      answers: { q1: "回答" },
      actionSteps: [{ type: "send_text", content: "ありがとうございます" }],
    });

    const req = makeRequest({ answers: { q1: "回答" }, line_user_id: "U-line-001" });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(200);

    expect(mockPushMessage).toHaveBeenCalledWith(
      "U-line-001",
      [{ type: "text", text: "ありがとうございます" }],
      "test-tenant",
    );
  });

  it("send_textアクション: line_user_id未設定→送信スキップ", async () => {
    setupBaseMocks({
      formSettings: { post_actions: [1] },
      lineUserId: null,
      patientId: null,
      actionSteps: [{ type: "send_text", content: "テスト" }],
    });

    const req = makeRequest({ answers: {} });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(200);

    // line_user_idがnullなのでpost_actions自体がスキップされる
    expect(mockPushMessage).not.toHaveBeenCalled();
  });

  it("send_templateアクション: テンプレートIDでDB取得→pushMessage呼出", async () => {
    setupBaseMocks({
      formSettings: { post_actions: [1] },
      actionSteps: [{ type: "send_template", template_id: 10 }],
      templateContent: "テンプレートメッセージ",
    });

    const req = makeRequest({ answers: {} });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(200);

    expect(mockFrom).toHaveBeenCalledWith("message_templates");
    expect(mockPushMessage).toHaveBeenCalledWith(
      "U-line-001",
      [{ type: "text", text: "テンプレートメッセージ" }],
      "test-tenant",
    );
  });

  it("send_templateアクション: テンプレート未存在→スキップ（エラーにならない）", async () => {
    setupBaseMocks({
      formSettings: { post_actions: [1] },
      actionSteps: [{ type: "send_template", template_id: 999 }],
      templateContent: null,
    });

    const req = makeRequest({ answers: {} });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(200);

    // テンプレートが見つからないのでpushMessageは呼ばれない（エラーにもならない）
    expect(mockPushMessage).not.toHaveBeenCalled();
  });

  it("tag_addアクション: patient_tags upsert呼出", async () => {
    const { patientTagsChain } = setupBaseMocks({
      formSettings: { post_actions: [1] },
      actionSteps: [{ type: "tag_add", tag_id: 5 }],
    });

    const req = makeRequest({ answers: {} });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(200);

    expect(mockFrom).toHaveBeenCalledWith("patient_tags");
    expect(patientTagsChain.upsert).toHaveBeenCalledTimes(1);
    const upsertArg = patientTagsChain.upsert.mock.calls[0][0];
    expect(upsertArg.patient_id).toBe("p-001");
    expect(upsertArg.tag_id).toBe(5);
  });

  it("tag_removeアクション: patient_tags delete呼出", async () => {
    const { patientTagsChain } = setupBaseMocks({
      formSettings: { post_actions: [1] },
      actionSteps: [{ type: "tag_remove", tag_id: 3 }],
    });

    const req = makeRequest({ answers: {} });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(200);

    expect(mockFrom).toHaveBeenCalledWith("patient_tags");
    expect(patientTagsChain.delete).toHaveBeenCalled();
  });

  it("mark_changeアクション: patients update呼出", async () => {
    const { patientsChain } = setupBaseMocks({
      formSettings: { post_actions: [1] },
      actionSteps: [{ type: "mark_change", mark: "vip" }],
    });

    const req = makeRequest({ answers: {} });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(200);

    expect(mockFrom).toHaveBeenCalledWith("patients");
    expect(patientsChain.update).toHaveBeenCalledWith({ mark: "vip" });
  });
});

/* ---------- save_target friend_field テスト ---------- */

describe("フォーム送信 - save_target friend_field", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("friend_field_valuesにupsertされる", async () => {
    const { friendFieldValuesChain } = setupBaseMocks({
      formFields: [
        {
          id: "q1",
          label: "好きな色",
          save_target: "friend_field",
          save_target_field_id: "100",
        },
      ],
      answers: { q1: "青" },
    });

    const req = makeRequest({ answers: { q1: "青" } });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(200);

    expect(mockFrom).toHaveBeenCalledWith("friend_field_values");
    expect(friendFieldValuesChain.upsert).toHaveBeenCalledTimes(1);
    const upsertArg = friendFieldValuesChain.upsert.mock.calls[0][0];
    // 配列の1要素目を検証
    expect(upsertArg[0].patient_id).toBe("p-001");
    expect(upsertArg[0].field_id).toBe(100);
    expect(upsertArg[0].value).toBe("青");
  });

  it("配列回答がカンマ区切り文字列に変換される", async () => {
    const { friendFieldValuesChain } = setupBaseMocks({
      formFields: [
        {
          id: "q1",
          label: "好きなフルーツ",
          save_target: "friend_field",
          save_target_field_id: "200",
        },
      ],
      answers: { q1: ["りんご", "みかん", "ぶどう"] },
    });

    const req = makeRequest({ answers: { q1: ["りんご", "みかん", "ぶどう"] } });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(200);

    const upsertArg = friendFieldValuesChain.upsert.mock.calls[0][0];
    expect(upsertArg[0].value).toBe("りんご, みかん, ぶどう");
  });

  it("save_target未設定のフィールドはスキップ", async () => {
    const { friendFieldValuesChain } = setupBaseMocks({
      formFields: [
        { id: "q1", label: "名前" },
        { id: "q2", label: "メモ" },
      ],
      answers: { q1: "太郎", q2: "テスト" },
    });

    const req = makeRequest({ answers: { q1: "太郎", q2: "テスト" } });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(200);

    // save_targetが設定されていないのでfriend_field_valuesは呼ばれない
    expect(friendFieldValuesChain.upsert).not.toHaveBeenCalled();
  });
});

/* ---------- post_actions 連鎖テスト ---------- */

describe("フォーム送信 - post_actions連鎖", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("複数アクションが順次実行される", async () => {
    // actionsテーブルへのfrom呼出が複数回行われる（アクションIDごとに）
    let actionCallCount = 0;
    const actionSteps1 = [{ type: "send_text", content: "アクション1" }];
    const actionSteps2 = [{ type: "send_text", content: "アクション2" }];

    setupBaseMocks({
      formSettings: { post_actions: [1, 2] },
    });

    // actionsチェーンを呼び出し回数で切り替え
    mockFrom.mockImplementation((table: string) => {
      if (table === "actions") {
        actionCallCount++;
        return createChain({
          single: vi.fn().mockResolvedValue({
            data: {
              id: actionCallCount,
              name: `アクション${actionCallCount}`,
              steps: actionCallCount === 1 ? actionSteps1 : actionSteps2,
            },
            error: null,
          }),
        });
      }
      if (table === "forms") {
        return createChain({
          single: vi.fn().mockResolvedValue({
            data: { id: 1, fields: [], settings: { post_actions: [1, 2] }, is_published: true },
            error: null,
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: { name: "テストフォーム" }, error: null }),
        });
      }
      if (table === "form_responses") {
        return createChain({
          single: vi.fn().mockResolvedValue({ data: { id: "resp-001" }, error: null }),
        });
      }
      if (table === "intake") {
        return createChain({
          maybeSingle: vi.fn().mockResolvedValue({ data: { patient_id: "p-001" }, error: null }),
        });
      }
      return createChain();
    });

    const req = makeRequest({ answers: {} });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(200);

    // pushMessage が2回呼ばれる（各アクションのsend_text）
    expect(mockPushMessage).toHaveBeenCalledTimes(2);
    expect(mockPushMessage).toHaveBeenCalledWith(
      "U-line-001",
      [{ type: "text", text: "アクション1" }],
      "test-tenant",
    );
    expect(mockPushMessage).toHaveBeenCalledWith(
      "U-line-001",
      [{ type: "text", text: "アクション2" }],
      "test-tenant",
    );
  });

  it("アクション実行エラーでも200を返す（try/catch内）", async () => {
    setupBaseMocks({
      formSettings: { post_actions: [1] },
      actionSteps: [{ type: "send_text", content: "テスト" }],
    });

    // pushMessage がエラーを投げるように設定
    mockPushMessage.mockRejectedValueOnce(new Error("LINE API error"));

    const req = makeRequest({ answers: {} });
    const res = await POST(req, PARAMS);

    // try/catchでキャッチされるので200が返る
    expect(res.status).toBe(200);
  });

  it("patientIdがnullの場合post_actionsはスキップ", async () => {
    setupBaseMocks({
      formSettings: { post_actions: [1] },
      patientId: null,
      actionSteps: [{ type: "send_text", content: "テスト" }],
    });

    const req = makeRequest({ answers: {} });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(200);

    // patientId=nullのためpost_actionsの条件 `patientId && line_user_id` が偽
    expect(mockFrom).not.toHaveBeenCalledWith("actions");
  });

  it("line_user_idがnullの場合post_actionsはスキップ", async () => {
    setupBaseMocks({
      formSettings: { post_actions: [1] },
      lineUserId: null,
      patientId: null,
      actionSteps: [{ type: "send_text", content: "テスト" }],
    });

    const req = makeRequest({ answers: {} });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(200);

    // line_user_id=null → patientIdの取得自体もスキップされる → post_actionsも未実行
    expect(mockFrom).not.toHaveBeenCalledWith("actions");
  });
});
