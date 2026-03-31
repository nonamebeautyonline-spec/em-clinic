// lib/__tests__/ai-patient-state.test.ts — 患者業務フロー状態管理テスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabaseモック ---
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
};
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn(() => mockQueryBuilder) },
}));
vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn(async (query: unknown) => query),
  strictWithTenant: vi.fn(async (query: unknown) => query),
  tenantPayload: vi.fn((id: string | null) => ({ tenant_id: id })),
}));

// --- ai-replyモック ---
const mockFetchPatientFlowStatus = vi.fn().mockResolvedValue({
  flowStage: "不明",
  hasRegisteredPersonalInfo: false,
  hasVerifiedPhone: false,
  hasCompletedQuestionnaire: false,
  hasReservation: false,
  latestOrder: null,
  activeReorder: null,
  nextReservation: null,
});
vi.mock("@/lib/ai-reply", () => ({
  fetchPatientFlowStatus: (...args: unknown[]) =>
    mockFetchPatientFlowStatus(...args),
}));

import {
  PATIENT_STATES,
  formatStateForPrompt,
  fetchPatientState,
  type PatientState,
} from "@/lib/ai-patient-state";

// --- テスト用定数 ---
const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const PATIENT_ID = "test-patient-id";

// --- テスト ---

describe("formatStateForPrompt", () => {
  it("各状態のラベルが正しく表示される", () => {
    const stateKeys = Object.keys(PATIENT_STATES) as Array<
      keyof typeof PATIENT_STATES
    >;

    for (const key of stateKeys) {
      const state: PatientState = {
        current_state: key,
        state_confidence: 0.9,
        state_source: "system",
        context: {},
        last_transition_at: new Date().toISOString(),
      };
      const result = formatStateForPrompt(state);
      // ラベルが含まれていること
      expect(result).toContain(PATIENT_STATES[key]);
      // 信頼度が含まれていること
      expect(result).toContain("信頼度: 0.9");
      // ヘッダが含まれていること
      expect(result).toContain("## 患者の業務フロー状態");
    }
  });

  it("contextの各フィールドが展開される", () => {
    const state: PatientState = {
      current_state: "awaiting_payment",
      state_confidence: 0.9,
      state_source: "system",
      context: {
        flowStage: "決済待ち",
        payment_method: "credit_card",
      },
      last_transition_at: new Date().toISOString(),
    };

    const result = formatStateForPrompt(state);
    expect(result).toContain("flowStage: 決済待ち");
    expect(result).toContain("payment_method: credit_card");
  });

  it("contextにオブジェクト値がある場合JSON文字列で展開される", () => {
    const state: PatientState = {
      current_state: "awaiting_consultation",
      state_confidence: 0.9,
      state_source: "system",
      context: {
        next_reservation: { date: "2026-04-01", time: "10:00" },
      },
      last_transition_at: new Date().toISOString(),
    };

    const result = formatStateForPrompt(state);
    // オブジェクトはJSON.stringifyされる
    expect(result).toContain("next_reservation:");
    expect(result).toContain('"date":"2026-04-01"');
  });

  it("contextにnull値がある場合はフィルタされる", () => {
    const state: PatientState = {
      current_state: "idle",
      state_confidence: 0.9,
      state_source: "system",
      context: {
        flowStage: "アイドル",
        removed_field: null,
      },
      last_transition_at: new Date().toISOString(),
    };

    const result = formatStateForPrompt(state);
    expect(result).toContain("flowStage: アイドル");
    expect(result).not.toContain("removed_field");
  });

  it("contextが空の場合はコンテキスト行が出力されない", () => {
    const state: PatientState = {
      current_state: "idle",
      state_confidence: 1.0,
      state_source: "system",
      context: {},
      last_transition_at: new Date().toISOString(),
    };

    const result = formatStateForPrompt(state);
    const lines = result.split("\n");
    // ヘッダ行 + 状態行の2行のみ
    expect(lines).toHaveLength(2);
  });
});

describe("fetchPatientState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: maybeSingleはnullを返す（DB上に状態なし）
    mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });
    // upsertは直接awaitされるのでResolvedValueにする
    mockQueryBuilder.upsert.mockResolvedValue({ data: null, error: null });
    // チェーンメソッドをリセット
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.limit.mockReturnValue(mockQueryBuilder);
  });

  it("DBに状態がある場合はそのまま返却する", async () => {
    const dbState: PatientState = {
      id: 1,
      current_state: "awaiting_reservation",
      state_confidence: 1.0,
      state_source: "manual",
      context: { flowStage: "予約待ち" },
      last_transition_at: "2026-03-30T00:00:00Z",
    };

    // strictWithTenantはクエリ結果をそのまま返すモックなので、
    // maybeSingleの返り値がそのままstrictWithTenantの返り値になる
    mockQueryBuilder.maybeSingle.mockResolvedValue({
      data: dbState,
      error: null,
    });

    const result = await fetchPatientState(PATIENT_ID, TENANT_ID);

    expect(result).toEqual(dbState);
    // flowStatus取得は呼ばれない
    expect(mockFetchPatientFlowStatus).not.toHaveBeenCalled();
  });

  it("DBに状態がない場合、flowStatusから推論して返却する（flowStage=不明→new_patient）", async () => {
    const result = await fetchPatientState(PATIENT_ID, TENANT_ID);

    // flowStage="不明"の場合、new_patientに推論される
    expect(result.current_state).toBe("new_patient");
    expect(result.state_confidence).toBe(0.7);
    expect(result.state_source).toBe("system");
    expect(result.context).toEqual({ flowStage: "不明" });

    // fetchPatientFlowStatusが呼ばれたことを確認
    expect(mockFetchPatientFlowStatus).toHaveBeenCalledWith(
      PATIENT_ID,
      TENANT_ID
    );
  });

  it("個人情報未登録→awaiting_registrationに推論", async () => {
    mockFetchPatientFlowStatus.mockResolvedValueOnce({
      flowStage: "登録中",
      hasRegisteredPersonalInfo: false,
      hasVerifiedPhone: false,
      hasCompletedQuestionnaire: false,
      hasReservation: false,
      latestOrder: null,
      activeReorder: null,
      nextReservation: null,
    });

    const result = await fetchPatientState(PATIENT_ID, TENANT_ID);
    expect(result.current_state).toBe("awaiting_registration");
    expect(result.state_confidence).toBe(0.9);
  });

  it("電話番号未認証→awaiting_verificationに推論", async () => {
    mockFetchPatientFlowStatus.mockResolvedValueOnce({
      flowStage: "認証中",
      hasRegisteredPersonalInfo: true,
      hasVerifiedPhone: false,
      hasCompletedQuestionnaire: false,
      hasReservation: false,
      latestOrder: null,
      activeReorder: null,
      nextReservation: null,
    });

    const result = await fetchPatientState(PATIENT_ID, TENANT_ID);
    expect(result.current_state).toBe("awaiting_verification");
  });

  it("問診未完了→awaiting_questionnaireに推論", async () => {
    mockFetchPatientFlowStatus.mockResolvedValueOnce({
      flowStage: "問診中",
      hasRegisteredPersonalInfo: true,
      hasVerifiedPhone: true,
      hasCompletedQuestionnaire: false,
      hasReservation: false,
      latestOrder: null,
      activeReorder: null,
      nextReservation: null,
    });

    const result = await fetchPatientState(PATIENT_ID, TENANT_ID);
    expect(result.current_state).toBe("awaiting_questionnaire");
  });

  it("予約なし→awaiting_reservationに推論", async () => {
    mockFetchPatientFlowStatus.mockResolvedValueOnce({
      flowStage: "予約待ち",
      hasRegisteredPersonalInfo: true,
      hasVerifiedPhone: true,
      hasCompletedQuestionnaire: true,
      hasReservation: false,
      latestOrder: null,
      activeReorder: null,
      nextReservation: null,
    });

    const result = await fetchPatientState(PATIENT_ID, TENANT_ID);
    expect(result.current_state).toBe("awaiting_reservation");
  });

  it("再処方申請中→reorder_pendingに推論", async () => {
    mockFetchPatientFlowStatus.mockResolvedValueOnce({
      flowStage: "再処方",
      hasRegisteredPersonalInfo: true,
      hasVerifiedPhone: true,
      hasCompletedQuestionnaire: true,
      hasReservation: true,
      latestOrder: null,
      activeReorder: { status: "pending_approval" },
      nextReservation: null,
    });

    const result = await fetchPatientState(PATIENT_ID, TENANT_ID);
    expect(result.current_state).toBe("reorder_pending");
    expect(result.context).toEqual({
      flowStage: "再処方",
      reorder_status: "pending_approval",
    });
  });

  it("未決済→awaiting_paymentに推論", async () => {
    mockFetchPatientFlowStatus.mockResolvedValueOnce({
      flowStage: "決済待ち",
      hasRegisteredPersonalInfo: true,
      hasVerifiedPhone: true,
      hasCompletedQuestionnaire: true,
      hasReservation: true,
      latestOrder: {
        paymentStatus: "unpaid",
        paymentMethod: "credit_card",
        shippingStatus: "pending",
      },
      activeReorder: null,
      nextReservation: null,
    });

    const result = await fetchPatientState(PATIENT_ID, TENANT_ID);
    expect(result.current_state).toBe("awaiting_payment");
    expect(result.context).toEqual({
      flowStage: "決済待ち",
      payment_method: "credit_card",
    });
  });

  it("決済済み・未発送→awaiting_shippingに推論", async () => {
    mockFetchPatientFlowStatus.mockResolvedValueOnce({
      flowStage: "発送待ち",
      hasRegisteredPersonalInfo: true,
      hasVerifiedPhone: true,
      hasCompletedQuestionnaire: true,
      hasReservation: true,
      latestOrder: {
        paymentStatus: "paid",
        shippingStatus: "pending",
      },
      activeReorder: null,
      nextReservation: null,
    });

    const result = await fetchPatientState(PATIENT_ID, TENANT_ID);
    expect(result.current_state).toBe("awaiting_shipping");
  });

  it("決済済み・発送済み→idleに推論", async () => {
    mockFetchPatientFlowStatus.mockResolvedValueOnce({
      flowStage: "完了",
      hasRegisteredPersonalInfo: true,
      hasVerifiedPhone: true,
      hasCompletedQuestionnaire: true,
      hasReservation: true,
      latestOrder: {
        paymentStatus: "paid",
        shippingStatus: "shipped",
      },
      activeReorder: null,
      nextReservation: null,
    });

    const result = await fetchPatientState(PATIENT_ID, TENANT_ID);
    expect(result.current_state).toBe("idle");
  });

  it("次回予約あり→awaiting_consultationに推論", async () => {
    const reservation = { date: "2026-04-15", time: "14:00" };
    mockFetchPatientFlowStatus.mockResolvedValueOnce({
      flowStage: "診察待ち",
      hasRegisteredPersonalInfo: true,
      hasVerifiedPhone: true,
      hasCompletedQuestionnaire: true,
      hasReservation: true,
      latestOrder: null,
      activeReorder: null,
      nextReservation: reservation,
    });

    const result = await fetchPatientState(PATIENT_ID, TENANT_ID);
    expect(result.current_state).toBe("awaiting_consultation");
    expect(result.context).toEqual({
      flowStage: "診察待ち",
      next_reservation: reservation,
    });
  });

  it("upsert失敗でもエラーにならず推論結果を返す", async () => {
    mockQueryBuilder.upsert.mockImplementationOnce(() => {
      throw new Error("DB error");
    });

    const result = await fetchPatientState(PATIENT_ID, TENANT_ID);

    // エラーが発生してもcatchされて推論結果が返る
    expect(result.current_state).toBe("new_patient");
  });
});
