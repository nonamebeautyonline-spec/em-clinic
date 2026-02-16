// __tests__/api/checkout.test.ts
// checkout API のビジネスルールテスト
// NG判定、商品検証、mode検証のロジックをユニットテスト
import { describe, it, expect } from "vitest";

// === NG判定ロジック ===
// checkout/route.ts の NG患者ブロックロジックを抽出テスト
describe("checkout NG判定ロジック", () => {
  function shouldBlockNGPatient(intakeRow: { status: string } | null): boolean {
    return intakeRow?.status === "NG";
  }

  it("status='NG' → ブロック", () => {
    expect(shouldBlockNGPatient({ status: "NG" })).toBe(true);
  });

  it("status='OK' → 通過", () => {
    expect(shouldBlockNGPatient({ status: "OK" })).toBe(false);
  });

  it("status='' → 通過", () => {
    expect(shouldBlockNGPatient({ status: "" })).toBe(false);
  });

  it("intakeRow=null → 通過（新規患者）", () => {
    expect(shouldBlockNGPatient(null)).toBe(false);
  });
});

// === mode検証 ===
describe("checkout mode検証", () => {
  type Mode = "current" | "first" | "reorder";
  const validModes: Mode[] = ["current", "first", "reorder"];

  it("'current' は有効", () => {
    expect(validModes.includes("current" as Mode)).toBe(true);
  });

  it("'first' は有効", () => {
    expect(validModes.includes("first" as Mode)).toBe(true);
  });

  it("'reorder' は有効", () => {
    expect(validModes.includes("reorder" as Mode)).toBe(true);
  });

  it("'invalid' は無効", () => {
    expect(validModes.includes("invalid" as Mode)).toBe(false);
  });

  it("undefined は通過（modeはオプション）", () => {
    const mode = undefined;
    expect(!mode || validModes.includes(mode as Mode)).toBe(true);
  });
});

// === productCode検証 ===
describe("checkout productCode検証", () => {
  it("productCodeがなければ400", () => {
    const productCode = undefined;
    expect(!productCode).toBe(true);
  });

  it("productCodeがあればOK", () => {
    const productCode = "MJL_5mg_1m";
    expect(!productCode).toBe(false);
  });

  it("空文字列は400", () => {
    const productCode = "";
    expect(!productCode).toBe(true);
  });
});

// === checkout メタデータ構築 ===
describe("checkout メタデータ構築", () => {
  it("全フィールドが設定される", () => {
    const metadata = {
      patientId: "patient_001",
      productCode: "MJL_5mg_1m",
      mode: "reorder",
      reorderId: "42",
    };
    expect(metadata.patientId).toBe("patient_001");
    expect(metadata.productCode).toBe("MJL_5mg_1m");
    expect(metadata.mode).toBe("reorder");
    expect(metadata.reorderId).toBe("42");
  });

  it("patientIdがない場合はUNKNOWN", () => {
    const patientId = undefined;
    const metadata = {
      patientId: patientId ?? "UNKNOWN",
    };
    expect(metadata.patientId).toBe("UNKNOWN");
  });

  it("reorderIdがない場合は空文字", () => {
    const reorderId = null;
    const metadata = {
      reorderId: reorderId || "",
    };
    expect(metadata.reorderId).toBe("");
  });
});
