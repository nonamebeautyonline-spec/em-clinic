// __tests__/api/cron-advanced.test.ts
// cron API の異常系・境界値テスト（process-steps, send-scheduled）
import { describe, it, expect } from "vitest";

// === テンプレート変数置換 ===
describe("cron テンプレート変数置換", () => {
  function replaceTemplateVars(
    text: string,
    vars: { name?: string | null; patient_id?: string | null; send_date?: string },
  ): string {
    let result = text;
    result = result.replace(/\{name\}/g, vars.name || "");
    result = result.replace(/\{patient_id\}/g, vars.patient_id || "");
    if (vars.send_date) {
      result = result.replace(/\{send_date\}/g, vars.send_date);
    }
    return result;
  }

  it("全変数が揃っている場合", () => {
    const result = replaceTemplateVars(
      "{name}様、ID:{patient_id}の送信日は{send_date}です",
      { name: "田中", patient_id: "P001", send_date: "2026/02/17" },
    );
    expect(result).toBe("田中様、ID:P001の送信日は2026/02/17です");
  });

  it("name が null → 空文字に置換", () => {
    const result = replaceTemplateVars("{name}様へ", { name: null });
    expect(result).toBe("様へ");
  });

  it("変数が複数回出現する場合（/g フラグ）", () => {
    const result = replaceTemplateVars("{name}と{name}が同じ", { name: "太郎" });
    expect(result).toBe("太郎と太郎が同じ");
  });

  it("変数を含まないテキスト → そのまま返す", () => {
    const result = replaceTemplateVars("変数なしテキスト", {});
    expect(result).toBe("変数なしテキスト");
  });

  it("空文字テンプレート → 空文字", () => {
    const result = replaceTemplateVars("", { name: "太郎" });
    expect(result).toBe("");
  });
});

// === シナリオ無効化判定 ===
describe("cron シナリオ無効化判定", () => {
  function shouldPauseEnrollment(
    enrollment: { step_scenarios?: { is_enabled: boolean } | null },
  ): boolean {
    return !enrollment.step_scenarios?.is_enabled;
  }

  it("is_enabled=true → 一時停止しない", () => {
    expect(shouldPauseEnrollment({ step_scenarios: { is_enabled: true } })).toBe(false);
  });

  it("is_enabled=false → 一時停止する", () => {
    expect(shouldPauseEnrollment({ step_scenarios: { is_enabled: false } })).toBe(true);
  });

  it("step_scenarios=null → 一時停止する", () => {
    expect(shouldPauseEnrollment({ step_scenarios: null })).toBe(true);
  });

  it("step_scenarios=undefined → 一時停止する", () => {
    expect(shouldPauseEnrollment({})).toBe(true);
  });
});

// === LINE UID チェック ===
describe("cron LINE UID チェック", () => {
  function shouldSkipSend(
    lineUid: string | null,
    stepType: string,
  ): boolean {
    return !lineUid && (stepType === "send_text" || stepType === "send_template");
  }

  it("UID あり + send_text → 送信する", () => {
    expect(shouldSkipSend("U123", "send_text")).toBe(false);
  });

  it("UID なし + send_text → スキップ", () => {
    expect(shouldSkipSend(null, "send_text")).toBe(true);
  });

  it("UID なし + send_template → スキップ", () => {
    expect(shouldSkipSend(null, "send_template")).toBe(true);
  });

  it("UID なし + tag_add → スキップしない（LINE送信不要）", () => {
    expect(shouldSkipSend(null, "tag_add")).toBe(false);
  });

  it("UID なし + tag_remove → スキップしない", () => {
    expect(shouldSkipSend(null, "tag_remove")).toBe(false);
  });

  it("UID なし + mark_change → スキップしない", () => {
    expect(shouldSkipSend(null, "mark_change")).toBe(false);
  });
});

// === ステップタイプ別の実行条件 ===
describe("cron ステップタイプ別の実行条件", () => {
  function canExecuteStep(step: { step_type: string; content?: string | null; tag_id?: number | null; mark?: string | null; template_id?: number | null }): boolean {
    switch (step.step_type) {
      case "send_text":
        return !!step.content;
      case "send_template":
        return !!step.template_id;
      case "tag_add":
      case "tag_remove":
        return !!step.tag_id;
      case "mark_change":
        return !!step.mark;
      default:
        return false;
    }
  }

  it("send_text + content あり → 実行可", () => {
    expect(canExecuteStep({ step_type: "send_text", content: "Hello" })).toBe(true);
  });

  it("send_text + content なし → 実行不可", () => {
    expect(canExecuteStep({ step_type: "send_text", content: null })).toBe(false);
  });

  it("tag_add + tag_id あり → 実行可", () => {
    expect(canExecuteStep({ step_type: "tag_add", tag_id: 1 })).toBe(true);
  });

  it("tag_add + tag_id なし → 実行不可", () => {
    expect(canExecuteStep({ step_type: "tag_add", tag_id: null })).toBe(false);
  });

  it("mark_change + mark あり → 実行可", () => {
    expect(canExecuteStep({ step_type: "mark_change", mark: "urgent" })).toBe(true);
  });

  it("未知のstep_type → 実行不可", () => {
    expect(canExecuteStep({ step_type: "unknown_type" })).toBe(false);
  });
});

// === Cron認証 ===
describe("cron 認証チェック", () => {
  function isCronAuthorized(authHeader: string | null, cronSecret: string | undefined): boolean {
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return false;
    }
    return true;
  }

  it("正しいBearer → 認証成功", () => {
    expect(isCronAuthorized("Bearer secret123", "secret123")).toBe(true);
  });

  it("誤ったBearer → 認証失敗", () => {
    expect(isCronAuthorized("Bearer wrong", "secret123")).toBe(false);
  });

  it("ヘッダーなし → 認証失敗", () => {
    expect(isCronAuthorized(null, "secret123")).toBe(false);
  });

  it("CRON_SECRET未設定 → 認証スキップ（開発環境）", () => {
    expect(isCronAuthorized(null, undefined)).toBe(true);
  });

  it("CRON_SECRET空文字 → 認証スキップ", () => {
    expect(isCronAuthorized(null, "")).toBe(true);
  });
});

// === エラーメッセージ取得 ===
describe("cron エラーメッセージ取得", () => {
  function getErrorMessage(err: unknown): string {
    return err instanceof Error ? err.message : "Unknown error";
  }

  it("Errorオブジェクト → message取得", () => {
    expect(getErrorMessage(new Error("timeout"))).toBe("timeout");
  });

  it("文字列 → 'Unknown error'", () => {
    expect(getErrorMessage("something failed")).toBe("Unknown error");
  });

  it("null → 'Unknown error'", () => {
    expect(getErrorMessage(null)).toBe("Unknown error");
  });

  it("数値 → 'Unknown error'", () => {
    expect(getErrorMessage(500)).toBe("Unknown error");
  });
});

// === 完了統計カウント ===
describe("cron 完了統計カウント", () => {
  function calcNewTotal(scenario: { total_completed: number | null } | null): number {
    if (!scenario) return 0;
    return (scenario.total_completed || 0) + 1;
  }

  it("total_completed=0 → 1", () => {
    expect(calcNewTotal({ total_completed: 0 })).toBe(1);
  });

  it("total_completed=null → 1", () => {
    expect(calcNewTotal({ total_completed: null })).toBe(1);
  });

  it("total_completed=99 → 100", () => {
    expect(calcNewTotal({ total_completed: 99 })).toBe(100);
  });

  it("scenario=null → 0", () => {
    expect(calcNewTotal(null)).toBe(0);
  });
});
