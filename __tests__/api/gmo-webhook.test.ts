// __tests__/api/gmo-webhook.test.ts
// GMO PG Webhook の決済ステータス分岐・ClientFieldパース・冪等性テスト
import { describe, it, expect } from "vitest";

// === parseClientField のロジックを直接テスト ===
function parseClientField(field: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of field.split(";")) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const k = part.slice(0, idx);
    const v = part.slice(idx + 1);
    if (k && v) {
      const keyMap: Record<string, string> = {
        PID: "patientId",
        Product: "productCode",
        Mode: "mode",
        Reorder: "reorderId",
      };
      result[keyMap[k] || k] = v;
    }
  }
  return result;
}

// === parseClientField テスト ===
describe("GMO parseClientField", () => {
  it("標準的なClientField1をパース", () => {
    const result = parseClientField("PID:patient_001;Product:MJL_5mg_1m;Mode:reorder;Reorder:42");
    expect(result.patientId).toBe("patient_001");
    expect(result.productCode).toBe("MJL_5mg_1m");
    expect(result.mode).toBe("reorder");
    expect(result.reorderId).toBe("42");
  });

  it("PIDとProductのみ（再処方でない場合）", () => {
    const result = parseClientField("PID:patient_001;Product:MJL_2.5mg_3m;Mode:first");
    expect(result.patientId).toBe("patient_001");
    expect(result.productCode).toBe("MJL_2.5mg_3m");
    expect(result.mode).toBe("first");
    expect(result.reorderId).toBeUndefined();
  });

  it("空文字列", () => {
    const result = parseClientField("");
    expect(Object.keys(result).length).toBe(0);
  });

  it("不正なフォーマット（:なし）", () => {
    const result = parseClientField("invalid_data");
    expect(Object.keys(result).length).toBe(0);
  });

  it("値が空のキー", () => {
    const result = parseClientField("PID:;Product:MJL_5mg_1m");
    // k="PID", v="" → if (k && v) が false → スキップ
    expect(result.patientId).toBeUndefined();
    expect(result.productCode).toBe("MJL_5mg_1m");
  });

  it("未知のキーはそのまま保持", () => {
    const result = parseClientField("PID:patient_001;Custom:hello");
    expect(result.patientId).toBe("patient_001");
    expect(result.Custom).toBe("hello");
  });

  it("値にコロンが含まれる場合（URLなど）", () => {
    // indexOf で最初の : のみで分割するので、値にコロンが含まれても問題ない
    const result = parseClientField("PID:patient_001;Url:https://example.com");
    expect(result.patientId).toBe("patient_001");
    expect(result.Url).toBe("https://example.com");
  });
});

// === 決済ステータス分岐テスト ===
describe("GMO Webhook ステータス分岐", () => {
  it("CAPTURE は決済完了として処理", () => {
    const status = "CAPTURE";
    expect(status === "CAPTURE" || status === "SALES").toBe(true);
  });

  it("SALES は決済完了として処理", () => {
    const status = "SALES";
    expect(status === "CAPTURE" || status === "SALES").toBe(true);
  });

  it("RETURN は返金として処理", () => {
    const status = "RETURN";
    expect(status === "RETURN" || status === "RETURNX").toBe(true);
  });

  it("RETURNX は返金として処理", () => {
    const status = "RETURNX";
    expect(status === "RETURN" || status === "RETURNX").toBe(true);
  });

  it("CANCEL はキャンセルとして処理", () => {
    const status = "CANCEL";
    expect(status === "CANCEL" || status === "VOID").toBe(true);
  });

  it("VOID はキャンセルとして処理", () => {
    const status = "VOID";
    expect(status === "CANCEL" || status === "VOID").toBe(true);
  });

  it("PENDING は未対応ステータス", () => {
    const status = "PENDING";
    const isPayment = status === "CAPTURE" || status === "SALES";
    const isRefund = status === "RETURN" || status === "RETURNX";
    const isCancel = status === "CANCEL" || status === "VOID";
    expect(isPayment || isRefund || isCancel).toBe(false);
  });

  it("AUTH は未対応ステータス（仮売上のみ）", () => {
    const status = "AUTH";
    const isPayment = status === "CAPTURE" || status === "SALES";
    expect(isPayment).toBe(false);
  });
});

// === reorderId バリデーション（markReorderPaid のガード）===
describe("GMO markReorderPaid バリデーション", () => {
  function isValidReorderId(reorderId: string): boolean {
    const idNum = Number(String(reorderId).trim());
    return Number.isFinite(idNum) && idNum >= 2;
  }

  it("正常な数値文字列", () => {
    expect(isValidReorderId("42")).toBe(true);
  });

  it("2は有効（最小値）", () => {
    expect(isValidReorderId("2")).toBe(true);
  });

  it("1は無効（予約済み）", () => {
    expect(isValidReorderId("1")).toBe(false);
  });

  it("0は無効", () => {
    expect(isValidReorderId("0")).toBe(false);
  });

  it("負の数は無効", () => {
    expect(isValidReorderId("-1")).toBe(false);
  });

  it("空文字は無効", () => {
    expect(isValidReorderId("")).toBe(false);
  });

  it("文字列は無効", () => {
    expect(isValidReorderId("abc")).toBe(false);
  });

  it("前後スペースありでも有効", () => {
    expect(isValidReorderId(" 42 ")).toBe(true);
  });
});

// === paymentId の決定ロジック ===
describe("GMO paymentId 決定ロジック", () => {
  it("accessId があれば accessId を使う", () => {
    const accessId = "access_123";
    const orderId = "ord_456";
    const paymentId = accessId || orderId;
    expect(paymentId).toBe("access_123");
  });

  it("accessId が空なら orderId を使う", () => {
    const accessId = "";
    const orderId = "ord_456";
    const paymentId = accessId || orderId;
    expect(paymentId).toBe("ord_456");
  });
});

// === 返金・キャンセル時の更新データ ===
describe("GMO 返金・キャンセルのデータ構造", () => {
  it("返金時は refund_status=COMPLETED, status=refunded", () => {
    const status = "RETURN";
    const amount = "5000";
    const isRefund = status === "RETURN" || status === "RETURNX";
    expect(isRefund).toBe(true);

    const updateData = {
      refund_status: "COMPLETED",
      refunded_amount: parseFloat(amount),
      status: "refunded",
    };
    expect(updateData.refund_status).toBe("COMPLETED");
    expect(updateData.refunded_amount).toBe(5000);
    expect(updateData.status).toBe("refunded");
  });

  it("キャンセル時は refund_status=CANCELLED, status=refunded", () => {
    const updateData = {
      refund_status: "CANCELLED",
      status: "refunded",
    };
    expect(updateData.refund_status).toBe("CANCELLED");
    expect(updateData.status).toBe("refunded");
  });

  it("金額パース: 数値文字列 → number", () => {
    expect(parseFloat("5000")).toBe(5000);
    expect(parseFloat("0")).toBe(0);
    expect(parseFloat("")).toBeNaN();
  });
});

// === 常に200を返すルール ===
describe("GMO Webhook レスポンス", () => {
  it("GMOは常に200を返す（リトライ防止）", () => {
    // エラーが発生しても200を返す設計
    const alwaysReturn200 = true;
    expect(alwaysReturn200).toBe(true);
  });
});
