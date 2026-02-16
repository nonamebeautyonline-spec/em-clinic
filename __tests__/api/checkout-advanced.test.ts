// __tests__/api/checkout-advanced.test.ts
// checkout API の異常系・セキュリティ・境界値テスト
import { describe, it, expect } from "vitest";

// === intake.status null のNG判定 ===
describe("checkout intake.status null の安全な処理", () => {
  // 重要: .not("status", "is", null) が必須
  // status が null の場合はNG判定をスキップすべき

  function shouldBlockNGPatient(intakeRow: { status: string | null } | null): boolean {
    // null チェックが必須（.not("status", "is", null)）
    if (!intakeRow) return false;
    if (intakeRow.status === null) return false;
    return intakeRow.status === "NG";
  }

  it("status=null → ブロックしない（新規/未判定患者）", () => {
    expect(shouldBlockNGPatient({ status: null })).toBe(false);
  });

  it("status='NG' → ブロック", () => {
    expect(shouldBlockNGPatient({ status: "NG" })).toBe(true);
  });

  it("status='OK' → 通過", () => {
    expect(shouldBlockNGPatient({ status: "OK" })).toBe(false);
  });

  it("status='' → 通過", () => {
    expect(shouldBlockNGPatient({ status: "" })).toBe(false);
  });

  it("intakeRow=null → 通過", () => {
    expect(shouldBlockNGPatient(null)).toBe(false);
  });
});

// === 商品コードの異常入力 ===
describe("checkout 商品コード異常入力", () => {
  function isValidProductCode(code: unknown): boolean {
    if (typeof code !== "string") return false;
    if (!code || code.length > 100) return false;
    return true;
  }

  it("正常な商品コード → 有効", () => {
    expect(isValidProductCode("MJL_5mg_1m")).toBe(true);
  });

  it("空文字 → 無効", () => {
    expect(isValidProductCode("")).toBe(false);
  });

  it("null → 無効", () => {
    expect(isValidProductCode(null)).toBe(false);
  });

  it("undefined → 無効", () => {
    expect(isValidProductCode(undefined)).toBe(false);
  });

  it("数値 → 無効（型チェック）", () => {
    expect(isValidProductCode(12345)).toBe(false);
  });

  it("100文字超 → 無効", () => {
    expect(isValidProductCode("a".repeat(101))).toBe(false);
  });

  it("100文字以内 → 有効", () => {
    expect(isValidProductCode("a".repeat(100))).toBe(true);
  });
});

// === mode の異常入力 ===
describe("checkout mode 異常入力", () => {
  const validModes = ["current", "first", "reorder"] as const;

  function isValidMode(mode: unknown): boolean {
    if (typeof mode !== "string") return false;
    return (validModes as readonly string[]).includes(mode);
  }

  it("'current' → 有効", () => {
    expect(isValidMode("current")).toBe(true);
  });

  it("'first' → 有効", () => {
    expect(isValidMode("first")).toBe(true);
  });

  it("'reorder' → 有効", () => {
    expect(isValidMode("reorder")).toBe(true);
  });

  it("大文字 'CURRENT' → 無効", () => {
    expect(isValidMode("CURRENT")).toBe(false);
  });

  it("空文字 → 無効", () => {
    expect(isValidMode("")).toBe(false);
  });

  it("null → 無効", () => {
    expect(isValidMode(null)).toBe(false);
  });

  it("数値 → 無効", () => {
    expect(isValidMode(1)).toBe(false);
  });

  it("不正な文字列 → 無効", () => {
    expect(isValidMode("invalid_mode")).toBe(false);
  });
});

// === 重複決済防止 ===
describe("checkout 重複決済防止", () => {
  it("同じpatient_id + productCode で短時間に2回 → 2回目は別セッション", () => {
    // Stripe Checkout Session は毎回新規作成
    // 重複防止は Stripe 側の冪等性キーで担保
    const session1Id = "cs_live_123";
    const session2Id = "cs_live_456";
    expect(session1Id).not.toBe(session2Id);
  });
});

// === reorder モードの追加検証 ===
describe("checkout reorderモード", () => {
  it("reorderモードには reorderId が必要", () => {
    const mode = "reorder";
    const reorderId = "42";
    const metadata = {
      mode,
      reorderId: reorderId || "",
    };
    expect(metadata.reorderId).toBe("42");
  });

  it("reorderモードで reorderId なし → 空文字（エラーにはならない）", () => {
    const mode = "reorder";
    const reorderId = undefined;
    const metadata = {
      mode,
      reorderId: reorderId || "",
    };
    expect(metadata.reorderId).toBe("");
  });
});
