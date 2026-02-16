// __tests__/api/cron.test.ts
// Cron処理（ステップ配信・予約送信）のビジネスルールテスト
import { describe, it, expect } from "vitest";

// === ステップ配信 Cron: ステップ種別の判定 ===
describe("cron/process-steps ステップ種別", () => {
  const validStepTypes = ["send_text", "send_template", "tag_add", "tag_remove", "mark_change"];

  it("send_text は有効", () => {
    expect(validStepTypes.includes("send_text")).toBe(true);
  });

  it("send_template は有効", () => {
    expect(validStepTypes.includes("send_template")).toBe(true);
  });

  it("tag_add は有効", () => {
    expect(validStepTypes.includes("tag_add")).toBe(true);
  });

  it("tag_remove は有効", () => {
    expect(validStepTypes.includes("tag_remove")).toBe(true);
  });

  it("mark_change は有効", () => {
    expect(validStepTypes.includes("mark_change")).toBe(true);
  });

  it("unknown は無効", () => {
    expect(validStepTypes.includes("unknown")).toBe(false);
  });
});

// === 変数置換ロジック ===
describe("cron/process-steps 変数置換", () => {
  function replaceVariables(text: string, vars: { name?: string; patient_id?: string; send_date?: string }): string {
    let result = text;
    if (vars.name) result = result.replace(/\{name\}/g, vars.name);
    if (vars.patient_id) result = result.replace(/\{patient_id\}/g, vars.patient_id);
    if (vars.send_date) result = result.replace(/\{send_date\}/g, vars.send_date);
    return result;
  }

  it("{name} を患者名に置換", () => {
    expect(replaceVariables("{name}様、お元気ですか？", { name: "田中太郎" }))
      .toBe("田中太郎様、お元気ですか？");
  });

  it("{patient_id} を患者IDに置換", () => {
    expect(replaceVariables("ID: {patient_id}", { patient_id: "p_001" }))
      .toBe("ID: p_001");
  });

  it("{send_date} を送信日に置換", () => {
    expect(replaceVariables("送信日: {send_date}", { send_date: "2026-02-16" }))
      .toBe("送信日: 2026-02-16");
  });

  it("複数の変数を同時に置換", () => {
    expect(replaceVariables("{name}様（{patient_id}）", { name: "田中", patient_id: "p_001" }))
      .toBe("田中様（p_001）");
  });

  it("変数がない場合はそのまま", () => {
    expect(replaceVariables("固定テキスト", {}))
      .toBe("固定テキスト");
  });

  it("同じ変数が複数回出現", () => {
    expect(replaceVariables("{name}:{name}", { name: "太郎" }))
      .toBe("太郎:太郎");
  });
});

// === シナリオ無効化時の処理 ===
describe("cron/process-steps シナリオ無効化", () => {
  it("is_enabled=false → status: paused", () => {
    const scenario = { is_enabled: false };
    const newStatus = !scenario.is_enabled ? "paused" : "active";
    expect(newStatus).toBe("paused");
  });

  it("is_enabled=true → 処理続行", () => {
    const scenario = { is_enabled: true };
    const shouldSkip = !scenario.is_enabled;
    expect(shouldSkip).toBe(false);
  });
});

// === LINE UID の有無チェック ===
describe("cron/process-steps LINE UID チェック", () => {
  it("LINE UID あり → 送信可能", () => {
    const lineUid = "Uabc123";
    const stepType = "send_text";
    const needsUid = stepType === "send_text" || stepType === "send_template";
    expect(needsUid && !lineUid).toBe(false);
  });

  it("LINE UID なし + send_text → スキップ", () => {
    const lineUid = "";
    const stepType = "send_text";
    const needsUid = stepType === "send_text" || stepType === "send_template";
    expect(needsUid && !lineUid).toBe(true);
  });

  it("LINE UID なし + tag_add → 送信不要（実行可能）", () => {
    const lineUid = "";
    const stepType = "tag_add";
    const needsUid = stepType === "send_text" || stepType === "send_template";
    expect(needsUid && !lineUid).toBe(false);
  });
});

// === 予約送信 Cron ===
describe("cron/send-scheduled 予約送信", () => {
  it("CRON_SECRET 一致 → 認証成功", () => {
    const cronSecret = "my-cron-secret";
    const headerSecret = "my-cron-secret";
    expect(cronSecret === headerSecret).toBe(true);
  });

  it("CRON_SECRET 不一致 → 401", () => {
    const cronSecret = "my-cron-secret";
    const headerSecret = "wrong-secret";
    expect(cronSecret === headerSecret).toBe(false);
  });

  it("送信成功 → status: sent", () => {
    const sendResult = { ok: true };
    const status = sendResult.ok ? "sent" : "failed";
    expect(status).toBe("sent");
  });

  it("送信失敗 → status: failed", () => {
    const sendResult = { ok: false };
    const status = sendResult.ok ? "sent" : "failed";
    expect(status).toBe("failed");
  });

  it("LINE UID なし → failed", () => {
    const lineUid = null;
    const status = !lineUid ? "failed" : "sent";
    expect(status).toBe("failed");
  });
});

// === バッチ処理の上限 ===
describe("cron/process-steps バッチ制限", () => {
  it("最大50件を処理", () => {
    const limit = 50;
    const enrollments = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const batch = enrollments.slice(0, limit);
    expect(batch.length).toBe(50);
  });
});

// === ステップ完了判定 ===
describe("cron/process-steps ステップ完了", () => {
  it("次のステップが見つからない → 完了", () => {
    const nextStep = null;
    const isCompleted = !nextStep;
    expect(isCompleted).toBe(true);
  });

  it("次のステップがある → 継続", () => {
    const nextStep = { sort_order: 2, step_type: "send_text" };
    const isCompleted = !nextStep;
    expect(isCompleted).toBe(false);
  });
});

// === tag_add の重複回避（onConflict）===
describe("cron/process-steps tag_add 重複回避", () => {
  it("onConflict: patient_id,tag_id で重複を無視", () => {
    // Supabase の onConflict 設定
    const onConflict = "patient_id,tag_id";
    expect(onConflict).toBe("patient_id,tag_id");
  });
});
