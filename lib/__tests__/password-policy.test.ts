// lib/__tests__/password-policy.test.ts — パスワードポリシーのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { strongPasswordSchema } from "@/lib/validations/password-policy";

// --- モック ---
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockRange = vi.fn();
const mockIn = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "password_history") {
        return {
          select: mockSelect,
          insert: mockInsert,
          delete: mockDelete,
        };
      }
      return { select: vi.fn(), insert: vi.fn(), delete: vi.fn() };
    }),
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

describe("strongPasswordSchema", () => {
  it("8文字以上の有効なパスワードを受け入れる", () => {
    const result = strongPasswordSchema.safeParse("Abc123!@");
    expect(result.success).toBe(true);
  });

  it("7文字のパスワードを拒否する", () => {
    const result = strongPasswordSchema.safeParse("Ab1!xyz");
    expect(result.success).toBe(false);
  });

  it("201文字のパスワードを拒否する", () => {
    // A(1) + a(197) + 1(1) + !(1) + @(1) = 201文字
    const longPass = "A" + "a".repeat(197) + "1!@";
    expect(longPass.length).toBe(201);
    const result = strongPasswordSchema.safeParse(longPass);
    expect(result.success).toBe(false);
  });

  it("大文字がないパスワードを拒否する", () => {
    const result = strongPasswordSchema.safeParse("abcdefg1!");
    expect(result.success).toBe(false);
  });

  it("小文字がないパスワードを拒否する", () => {
    const result = strongPasswordSchema.safeParse("ABCDEFG1!");
    expect(result.success).toBe(false);
  });

  it("数字がないパスワードを拒否する", () => {
    const result = strongPasswordSchema.safeParse("Abcdefgh!");
    expect(result.success).toBe(false);
  });

  it("記号がないパスワードを拒否する", () => {
    const result = strongPasswordSchema.safeParse("Abcdefg1");
    expect(result.success).toBe(false);
  });

  it("200文字ちょうどのパスワードを受け入れる", () => {
    // A(大文字1) + a(小文字196) + 1(数字1) + !(記号1) + @(記号1) = 200
    const pass = "A" + "a".repeat(196) + "1!@";
    expect(pass.length).toBe(200);
    const result = strongPasswordSchema.safeParse(pass);
    expect(result.success).toBe(true);
  });

  it("空文字列を拒否する", () => {
    const result = strongPasswordSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("checkPasswordHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトのチェーン設定
    mockLimit.mockResolvedValue({ data: [] });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
  });

  it("履歴が空の場合はtrueを返す", async () => {
    mockLimit.mockResolvedValue({ data: [] });

    const { checkPasswordHistory } = await import("@/lib/password-policy");
    const result = await checkPasswordHistory("user-1", "NewPass123!");
    expect(result).toBe(true);
  });

  it("履歴にマッチするパスワードがある場合はfalseを返す", async () => {
    const bcrypt = await import("bcryptjs");
    (bcrypt.default.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

    mockLimit.mockResolvedValue({
      data: [{ password_hash: "$2a$10$hash1" }],
    });

    const { checkPasswordHistory } = await import("@/lib/password-policy");
    const result = await checkPasswordHistory("user-1", "OldPass123!");
    expect(result).toBe(false);
  });

  it("履歴にマッチしないパスワードの場合はtrueを返す", async () => {
    const bcrypt = await import("bcryptjs");
    (bcrypt.default.compare as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);

    mockLimit.mockResolvedValue({
      data: [
        { password_hash: "$2a$10$hash1" },
        { password_hash: "$2a$10$hash2" },
      ],
    });

    const { checkPasswordHistory } = await import("@/lib/password-policy");
    const result = await checkPasswordHistory("user-1", "BrandNew123!");
    expect(result).toBe(true);
  });
});

describe("isPasswordExpired", () => {
  it("nullの場合はfalseを返す（既存ユーザー救済）", async () => {
    const { isPasswordExpired } = await import("@/lib/password-policy");
    expect(isPasswordExpired(null)).toBe(false);
  });

  it("89日前のパスワードは期限切れではない", async () => {
    const { isPasswordExpired } = await import("@/lib/password-policy");
    const date = new Date();
    date.setDate(date.getDate() - 89);
    expect(isPasswordExpired(date.toISOString())).toBe(false);
  });

  it("90日ちょうどのパスワードは期限切れではない", async () => {
    const { isPasswordExpired } = await import("@/lib/password-policy");
    const date = new Date();
    date.setDate(date.getDate() - 90);
    // 90日ちょうどは diffDays === 90 で > 90 は false
    expect(isPasswordExpired(date.toISOString())).toBe(false);
  });

  it("91日前のパスワードは期限切れ", async () => {
    const { isPasswordExpired } = await import("@/lib/password-policy");
    const date = new Date();
    date.setDate(date.getDate() - 91);
    expect(isPasswordExpired(date.toISOString())).toBe(true);
  });
});

describe("savePasswordHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockRange.mockResolvedValue({ data: [] });
    mockOrder.mockReturnValue({ range: mockRange });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
  });

  it("履歴を保存する", async () => {
    const { savePasswordHistory } = await import("@/lib/password-policy");
    await savePasswordHistory("user-1", "$2a$10$newhash");
    expect(mockInsert).toHaveBeenCalledWith({
      admin_user_id: "user-1",
      password_hash: "$2a$10$newhash",
    });
  });

  it("6件目以降の古い履歴を削除する", async () => {
    mockIn.mockResolvedValue({ error: null });
    mockDelete.mockReturnValue({ in: mockIn });
    mockRange.mockResolvedValue({
      data: [{ id: "old-1" }, { id: "old-2" }],
    });

    const { savePasswordHistory } = await import("@/lib/password-policy");
    await savePasswordHistory("user-1", "$2a$10$newhash");

    expect(mockIn).toHaveBeenCalledWith("id", ["old-1", "old-2"]);
  });
});
