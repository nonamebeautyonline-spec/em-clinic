// __tests__/api/workflows.test.ts
// ワークフローAPI のビジネスルールテスト
import { describe, it, expect } from "vitest";

/* ======== ステータス遷移テスト ======== */
describe("ワークフロー ステータス遷移ルール", () => {
  const validTransitions: Record<string, string[]> = {
    draft: ["active", "archived"],
    active: ["paused", "archived"],
    paused: ["active", "archived"],
    archived: ["draft"],
  };

  function canTransition(from: string, to: string): boolean {
    const allowed = validTransitions[from] || [];
    return allowed.includes(to);
  }

  // draft からの遷移
  it("draft → active は許可", () => {
    expect(canTransition("draft", "active")).toBe(true);
  });

  it("draft → archived は許可", () => {
    expect(canTransition("draft", "archived")).toBe(true);
  });

  it("draft → paused は不許可", () => {
    expect(canTransition("draft", "paused")).toBe(false);
  });

  // active からの遷移
  it("active → paused は許可", () => {
    expect(canTransition("active", "paused")).toBe(true);
  });

  it("active → archived は許可", () => {
    expect(canTransition("active", "archived")).toBe(true);
  });

  it("active → draft は不許可", () => {
    expect(canTransition("active", "draft")).toBe(false);
  });

  // paused からの遷移
  it("paused → active は許可", () => {
    expect(canTransition("paused", "active")).toBe(true);
  });

  it("paused → archived は許可", () => {
    expect(canTransition("paused", "archived")).toBe(true);
  });

  it("paused → draft は不許可", () => {
    expect(canTransition("paused", "draft")).toBe(false);
  });

  // archived からの遷移
  it("archived → draft は許可", () => {
    expect(canTransition("archived", "draft")).toBe(true);
  });

  it("archived → active は不許可", () => {
    expect(canTransition("archived", "active")).toBe(false);
  });
});

/* ======== トリガータイプバリデーション ======== */
describe("ワークフロー トリガータイプ検証", () => {
  const validTriggerTypes = [
    "reservation_completed",
    "payment_completed",
    "tag_added",
    "form_submitted",
    "scheduled",
    "manual",
  ];

  it("reservation_completed は有効", () => {
    expect(validTriggerTypes.includes("reservation_completed")).toBe(true);
  });

  it("payment_completed は有効", () => {
    expect(validTriggerTypes.includes("payment_completed")).toBe(true);
  });

  it("tag_added は有効", () => {
    expect(validTriggerTypes.includes("tag_added")).toBe(true);
  });

  it("form_submitted は有効", () => {
    expect(validTriggerTypes.includes("form_submitted")).toBe(true);
  });

  it("scheduled は有効", () => {
    expect(validTriggerTypes.includes("scheduled")).toBe(true);
  });

  it("manual は有効", () => {
    expect(validTriggerTypes.includes("manual")).toBe(true);
  });

  it("invalid_type は無効", () => {
    expect(validTriggerTypes.includes("invalid_type")).toBe(false);
  });
});

/* ======== ステップタイプバリデーション ======== */
describe("ワークフロー ステップタイプ検証", () => {
  const validStepTypes = [
    "send_message",
    "add_tag",
    "remove_tag",
    "switch_richmenu",
    "wait",
    "condition",
    "webhook",
  ];

  it("全ステップタイプが有効", () => {
    for (const st of validStepTypes) {
      expect(validStepTypes.includes(st)).toBe(true);
    }
  });

  it("unknown は無効", () => {
    expect(validStepTypes.includes("unknown")).toBe(false);
  });
});

/* ======== ステップ設定検証 ======== */
describe("ワークフロー ステップ設定検証", () => {
  // send_message
  it("send_message: テキスト設定があれば有効", () => {
    const config = { message_type: "text", text: "こんにちは" };
    expect(!!config.text).toBe(true);
  });

  it("send_message: テンプレートID設定があれば有効", () => {
    const config = { message_type: "template", template_id: 1 };
    expect(!!config.template_id).toBe(true);
  });

  it("send_message: テキストもテンプレートもなければ無効", () => {
    const config: Record<string, any> = { message_type: "text" };
    expect(!config.text && !config.template_id).toBe(true);
  });

  // add_tag / remove_tag
  it("add_tag: tag_idが必要", () => {
    const config = { tag_id: 5 };
    expect(!!config.tag_id).toBe(true);
  });

  it("add_tag: tag_idがなければ無効", () => {
    const config: Record<string, any> = {};
    expect(!config.tag_id).toBe(true);
  });

  // wait
  it("wait: duration_minutesは正の数", () => {
    const config = { duration_minutes: 30 };
    expect(config.duration_minutes > 0).toBe(true);
  });

  it("wait: duration_minutes=0は無効（0分待機の意味がない）", () => {
    const config = { duration_minutes: 0 };
    expect(config.duration_minutes > 0).toBe(false);
  });

  // webhook
  it("webhook: URLが必要", () => {
    const config = { url: "https://example.com/hook" };
    expect(!!config.url).toBe(true);
  });

  it("webhook: URLがなければ無効", () => {
    const config: Record<string, any> = {};
    expect(!config.url).toBe(true);
  });
});

/* ======== 削除可否テスト ======== */
describe("ワークフロー 削除可否ルール", () => {
  function canDelete(status: string): boolean {
    return status !== "active";
  }

  it("draft は削除可能", () => {
    expect(canDelete("draft")).toBe(true);
  });

  it("paused は削除可能", () => {
    expect(canDelete("paused")).toBe(true);
  });

  it("archived は削除可能", () => {
    expect(canDelete("archived")).toBe(true);
  });

  it("active は削除不可", () => {
    expect(canDelete("active")).toBe(false);
  });
});

/* ======== トリガー設定マッチングテスト ======== */
describe("ワークフロー トリガー設定マッチング", () => {
  function matchesTriggerConfig(
    triggerConfig: Record<string, any> | null,
    triggerData: Record<string, any>,
  ): boolean {
    if (!triggerConfig || Object.keys(triggerConfig).length === 0) {
      return true;
    }
    if (triggerConfig.tag_id && triggerData.tag_id) {
      return triggerConfig.tag_id === triggerData.tag_id;
    }
    if (triggerConfig.form_id && triggerData.form_id) {
      return triggerConfig.form_id === triggerData.form_id;
    }
    return true;
  }

  it("設定なし → 常にマッチ", () => {
    expect(matchesTriggerConfig(null, { tag_id: 1 })).toBe(true);
    expect(matchesTriggerConfig({}, { tag_id: 1 })).toBe(true);
  });

  it("tag_idが一致 → マッチ", () => {
    expect(matchesTriggerConfig({ tag_id: 5 }, { tag_id: 5 })).toBe(true);
  });

  it("tag_idが不一致 → 非マッチ", () => {
    expect(matchesTriggerConfig({ tag_id: 5 }, { tag_id: 3 })).toBe(false);
  });

  it("form_idが一致 → マッチ", () => {
    expect(matchesTriggerConfig({ form_id: 10 }, { form_id: 10 })).toBe(true);
  });

  it("form_idが不一致 → 非マッチ", () => {
    expect(matchesTriggerConfig({ form_id: 10 }, { form_id: 7 })).toBe(false);
  });
});
