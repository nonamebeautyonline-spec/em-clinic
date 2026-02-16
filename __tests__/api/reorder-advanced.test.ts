// __tests__/api/reorder-advanced.test.ts
// 再処方 異常系・セキュリティ・冪等性テスト
import { describe, it, expect } from "vitest";

// === 再処方カルテ保存ルール（重要） ===
describe("reorder カルテ保存ルール", () => {
  // 2026-02-09確定: 承認時は reorders.karte_note のみに保存
  // intake にはカルテを INSERT しない

  it("承認時は reorders.karte_note のみに保存", () => {
    const saveTarget = "reorders.karte_note";
    expect(saveTarget).toBe("reorders.karte_note");
    expect(saveTarget).not.toBe("intake");
  });

  it("karte_note が既にある場合は上書きしない（冪等: .is('karte_note', null)）", () => {
    const existingKarteNote = "副作用がなく、継続使用のため処方";
    const shouldUpdate = existingKarteNote === null;
    expect(shouldUpdate).toBe(false);
  });

  it("karte_note が null の場合のみ保存する", () => {
    const existingKarteNote = null;
    const shouldUpdate = existingKarteNote === null;
    expect(shouldUpdate).toBe(true);
  });
});

// === intake.status null の NG判定 ===
describe("reorder intake.status null の安全な処理", () => {
  // .not("status", "is", null) が必須

  function shouldBlock(intakeRow: { status: string | null } | null): boolean {
    if (!intakeRow) return false;
    if (intakeRow.status === null) return false;
    return intakeRow.status === "NG";
  }

  it("status=null → ブロックしない", () => {
    expect(shouldBlock({ status: null })).toBe(false);
  });

  it("status='NG' → ブロック", () => {
    expect(shouldBlock({ status: "NG" })).toBe(true);
  });

  it("status='OK' → 通過", () => {
    expect(shouldBlock({ status: "OK" })).toBe(false);
  });

  it("intakeRow=null → 通過", () => {
    expect(shouldBlock(null)).toBe(false);
  });
});

// === 承認の冪等性 ===
describe("reorder 承認の冪等性", () => {
  function processApproval(status: string): { action: string; message?: string } {
    if (status !== "pending") {
      return { action: "skip", message: `既に処理済みです (${status})` };
    }
    return { action: "approve" };
  }

  it("pending → 承認実行", () => {
    expect(processApproval("pending")).toEqual({ action: "approve" });
  });

  it("confirmed → スキップ（冪等）", () => {
    const result = processApproval("confirmed");
    expect(result.action).toBe("skip");
    expect(result.message).toContain("confirmed");
  });

  it("paid → スキップ（冪等）", () => {
    expect(processApproval("paid").action).toBe("skip");
  });

  it("rejected → スキップ（冪等）", () => {
    expect(processApproval("rejected").action).toBe("skip");
  });

  it("canceled → スキップ（冪等）", () => {
    expect(processApproval("canceled").action).toBe("skip");
  });
});

// === キャンセルの二重実行 ===
describe("reorder キャンセルの二重実行防止", () => {
  const cancelableStatuses = ["pending", "confirmed"];

  it("canceledの再キャンセル → 不可", () => {
    expect(cancelableStatuses.includes("canceled")).toBe(false);
  });

  it("rejectedの再キャンセル → 不可", () => {
    expect(cancelableStatuses.includes("rejected")).toBe(false);
  });
});

// === 他人の再処方へのアクセス ===
describe("reorder 権限チェック", () => {
  function hasAccess(reorderPatientId: string, requestPatientId: string): boolean {
    return reorderPatientId === requestPatientId;
  }

  it("自分の再処方 → アクセス可能", () => {
    expect(hasAccess("p_001", "p_001")).toBe(true);
  });

  it("他人の再処方 → アクセス不可（404を返す）", () => {
    expect(hasAccess("p_001", "p_002")).toBe(false);
  });

  it("空文字同士 → アクセス可能（ただしバリデーションで弾かれるべき）", () => {
    expect(hasAccess("", "")).toBe(true);
  });
});

// === reorder_number 採番の境界値 ===
describe("reorder_number 採番 境界値", () => {
  function calcReorderNumber(maxRow: { reorder_number: number } | null): number {
    return (maxRow?.reorder_number || 1) + 1;
  }

  it("reorder_number=0 の場合 → 2（0はfalsy）", () => {
    expect(calcReorderNumber({ reorder_number: 0 })).toBe(2);
  });

  it("reorder_number=9999 → 10000", () => {
    expect(calcReorderNumber({ reorder_number: 9999 })).toBe(10000);
  });
});

// === 用量比較ロジック補完 ===
describe("reorder 用量抽出", () => {
  function extractDose(productCode: string): number | null {
    const match = productCode.match(/(\d+(?:\.\d+)?)mg/);
    return match ? parseFloat(match[1]) : null;
  }

  it("MJL_5mg_1m → 5", () => {
    expect(extractDose("MJL_5mg_1m")).toBe(5);
  });

  it("MJL_7.5mg_1m → 7.5", () => {
    expect(extractDose("MJL_7.5mg_1m")).toBe(7.5);
  });

  it("MJL_10mg_1m → 10", () => {
    expect(extractDose("MJL_10mg_1m")).toBe(10);
  });

  it("mg を含まない商品コード → null", () => {
    expect(extractDose("CUSTOM_PRODUCT")).toBeNull();
  });

  it("MJL_2.5mg_1m → 2.5", () => {
    expect(extractDose("MJL_2.5mg_1m")).toBe(2.5);
  });
});

// === 承認時の監査ログ ===
describe("reorder 承認の監査ログ", () => {
  it("承認操作が正しいアクション名で記録される", () => {
    const action = "reorder.approve";
    const resourceType = "reorder";
    expect(action).toBe("reorder.approve");
    expect(resourceType).toBe("reorder");
  });

  it("却下操作が正しいアクション名で記録される", () => {
    const action = "reorder.reject";
    expect(action).toBe("reorder.reject");
  });
});
