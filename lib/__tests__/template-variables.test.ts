// lib/__tests__/template-variables.test.ts — テンプレート変数リゾルバーのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// supabase モック
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockNot = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const chain = {
        select: (...args: unknown[]) => { mockSelect(table, ...args); return chain; },
        eq: (...args: unknown[]) => { mockEq(...args); return chain; },
        gte: (...args: unknown[]) => { mockGte(...args); return chain; },
        not: (...args: unknown[]) => { mockNot(...args); return chain; },
        order: (...args: unknown[]) => { mockOrder(...args); return chain; },
        limit: (...args: unknown[]) => { mockLimit(...args); return chain; },
        maybeSingle: () => mockMaybeSingle(),
      };
      return chain;
    },
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: (query: unknown) => query,
}));

const { expandTemplate } = await import("@/lib/template-variables");

describe("template-variables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("変数なしのテンプレートはそのまま返す", async () => {
    const result = await expandTemplate("こんにちは", {
      patientId: "P001",
      tenantId: "t1",
    });
    expect(result).toBe("こんにちは");
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("{name}と{patient_id}が展開されること", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { name: "田中太郎", patient_id: "P001", tel: "09012345678", line_display_name: "Taro", metadata: {} },
    });

    const result = await expandTemplate("{name}様（ID: {patient_id}）", {
      patientId: "P001",
      tenantId: "t1",
    });

    expect(result).toBe("田中太郎様（ID: P001）");
  });

  it("{send_date}はDB不要でローカル計算されること", async () => {
    const result = await expandTemplate("送信日: {send_date}", {
      patientId: "P001",
      tenantId: "t1",
    });

    // 日本語日付形式（例: 2026/4/1）
    expect(result).toMatch(/送信日: \d{4}\/\d{1,2}\/\d{1,2}/);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("{metadata.KEY}が展開されること", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        name: "田中",
        patient_id: "P001",
        tel: null,
        line_display_name: null,
        metadata: { city: "東京", plan: "プレミアム" },
      },
    });

    const result = await expandTemplate("地域: {metadata.city}, プラン: {metadata.plan}", {
      patientId: "P001",
      tenantId: "t1",
    });

    expect(result).toBe("地域: 東京, プラン: プレミアム");
  });

  it("条件ブロック {#if_tel}...{/if_tel} が正しく動作すること", async () => {
    // tel がある場合
    mockMaybeSingle.mockResolvedValueOnce({
      data: { name: "田中", patient_id: "P001", tel: "09012345678", line_display_name: null, metadata: {} },
    });

    const withTel = await expandTemplate(
      "こんにちは{#if_tel}（電話: {tel}）{/if_tel}",
      { patientId: "P001", tenantId: "t1" },
    );
    expect(withTel).toBe("こんにちは（電話: 09012345678）");

    // tel がない場合
    mockMaybeSingle.mockResolvedValueOnce({
      data: { name: "鈴木", patient_id: "P002", tel: null, line_display_name: null, metadata: {} },
    });

    const withoutTel = await expandTemplate(
      "こんにちは{#if_tel}（電話: {tel}）{/if_tel}",
      { patientId: "P002", tenantId: "t1" },
    );
    expect(withoutTel).toBe("こんにちは");
  });

  it("存在しない変数は空文字に置換されること", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { name: null, patient_id: "P001", tel: null, line_display_name: null, metadata: {} },
    });

    const result = await expandTemplate("{name}様 {metadata.unknown_key}", {
      patientId: "P001",
      tenantId: "t1",
    });

    expect(result).toBe("様 ");
  });
});
