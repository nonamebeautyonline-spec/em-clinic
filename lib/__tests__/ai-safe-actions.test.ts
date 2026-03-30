// AI Safe Actions テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// supabaseAdmin モック
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle.mockReturnValue({ data: { id: 1 }, error: null }),
        }),
      }),
      update: mockUpdate.mockReturnValue({
        eq: mockEq.mockReturnValue({
          eq: mockEq.mockReturnValue({ error: null }),
        }),
      }),
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          eq: mockEq.mockReturnValue({
            single: mockSingle.mockReturnValue({ data: null, error: null }),
          }),
        }),
        order: mockOrder.mockReturnValue({
          limit: mockLimit.mockReturnValue({ data: [], error: null }),
        }),
      }),
    })),
  },
}));

import { validateActionParams } from "../ai-safe-actions";

describe("validateActionParams", () => {
  it("resend_payment_link: patientIdありで有効", () => {
    const result = validateActionParams("resend_payment_link", { patientId: "p-001" });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("resend_payment_link: patientIdなしで無効", () => {
    const result = validateActionParams("resend_payment_link", {});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("必須パラメータが不足: patientId");
  });

  it("resend_payment_link: patientIdが空文字で無効", () => {
    const result = validateActionParams("resend_payment_link", { patientId: "" });
    expect(result.valid).toBe(false);
  });

  it("resend_questionnaire: patientIdありで有効", () => {
    const result = validateActionParams("resend_questionnaire", {
      patientId: "p-002",
      questionnaireType: "initial",
    });
    expect(result.valid).toBe(true);
  });

  it("create_staff_task: title+assigneeIdありで有効", () => {
    const result = validateActionParams("create_staff_task", {
      title: "確認タスク",
      assigneeId: "staff-001",
    });
    expect(result.valid).toBe(true);
  });

  it("create_staff_task: titleのみで無効（assigneeId不足）", () => {
    const result = validateActionParams("create_staff_task", {
      title: "確認タスク",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("必須パラメータが不足: assigneeId");
  });

  it("create_staff_task: 複数必須パラメータ不足", () => {
    const result = validateActionParams("create_staff_task", {});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("必須パラメータが不足: title");
    expect(result.errors).toContain("必須パラメータが不足: assigneeId");
  });

  it("suggest_reservation_slots: patientIdありで有効", () => {
    const result = validateActionParams("suggest_reservation_slots", {
      patientId: "p-003",
      preferredDate: "2026-04-01",
    });
    expect(result.valid).toBe(true);
  });

  it("不明なパラメータはエラーに含む", () => {
    const result = validateActionParams("resend_payment_link", {
      patientId: "p-001",
      unknownKey: "value",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("不明なパラメータ: unknownKey");
  });

  it("オプションパラメータは許可", () => {
    const result = validateActionParams("resend_payment_link", {
      patientId: "p-001",
      paymentAmount: 5000,
      paymentNote: "テスト",
    });
    expect(result.valid).toBe(true);
  });
});
