// lib/__tests__/username.test.ts — ユーザーID生成テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabaseモック
const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (...args: any[]) => mockFrom(...args) },
}));

import { generateUsername } from "@/lib/username";

describe("username", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateUsername", () => {
    it("LP-XXXXX形式のユーザーIDを返す", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null });
      const id = await generateUsername();
      expect(id).toMatch(/^LP-[A-Z2-9]{5}$/);
    });

    it("紛らわしい文字（0,O,1,I）を含まない", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null });
      // 100回生成して紛らわしい文字がないことを確認
      for (let i = 0; i < 100; i++) {
        const id = await generateUsername();
        const suffix = id.slice(3); // "LP-" を除去
        expect(suffix).not.toMatch(/[0OI1]/);
      }
    });

    it("DB重複時にリトライする", async () => {
      // 1回目: 重複あり、2回目: 重複なし
      mockMaybeSingle
        .mockResolvedValueOnce({ data: { id: "existing" } })
        .mockResolvedValueOnce({ data: null });
      const id = await generateUsername();
      expect(id).toMatch(/^LP-[A-Z2-9]{5}$/);
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });

    it("5回全て重複した場合はエラー", async () => {
      mockMaybeSingle.mockResolvedValue({ data: { id: "existing" } });
      await expect(generateUsername()).rejects.toThrow("ユーザーID生成に失敗しました");
      expect(mockFrom).toHaveBeenCalledTimes(5);
    });
  });
});
