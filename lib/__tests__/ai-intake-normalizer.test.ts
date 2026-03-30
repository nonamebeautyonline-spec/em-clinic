// AI Intake Normalizer テスト
// 各チャネルの正規化ロジック（純ロジック、mock不要）

import { describe, it, expect } from "vitest";
import {
  normalizeEmailIntake,
  normalizeFormIntake,
  normalizeSlackIntake,
  normalizeLineIntake,
  normalizePhoneIntake,
  normalizeIntake,
  type EmailRawInput,
  type FormRawInput,
  type SlackRawInput,
  type LineRawInput,
  type PhoneRawInput,
} from "../ai-intake-normalizer";

describe("normalizeEmailIntake", () => {
  it("件名と本文を結合してテキスト化する", () => {
    const raw: EmailRawInput = {
      subject: "予約について",
      body: "来週の予約を変更したいです。",
      from: "test@example.com",
      fromName: "テスト太郎",
      to: "support@l-ope.jp",
      receivedAt: "2026-03-30T10:00:00Z",
    };
    const result = normalizeEmailIntake(raw);

    expect(result.channelType).toBe("email");
    expect(result.text).toContain("件名: 予約について");
    expect(result.text).toContain("来週の予約を変更したいです。");
    expect(result.senderName).toBe("テスト太郎");
    expect(result.senderEmail).toBe("test@example.com");
    expect(result.metadata.subject).toBe("予約について");
    expect(result.metadata.to).toBe("support@l-ope.jp");
  });

  it("添付ファイル情報をmetadataに保持する", () => {
    const raw: EmailRawInput = {
      subject: "添付あり",
      body: "ファイルを送ります",
      from: "user@example.com",
      to: "support@l-ope.jp",
      attachments: [
        { name: "report.pdf", mimeType: "application/pdf", size: 1024 },
      ],
      receivedAt: "2026-03-30T10:00:00Z",
    };
    const result = normalizeEmailIntake(raw);

    const attachments = result.metadata.attachments as Array<{ name: string }>;
    expect(attachments).toHaveLength(1);
    expect(attachments[0].name).toBe("report.pdf");
  });

  it("件名が空の場合は本文のみ", () => {
    const raw: EmailRawInput = {
      subject: "",
      body: "本文のみ",
      from: "user@example.com",
      to: "support@l-ope.jp",
      receivedAt: "2026-03-30T10:00:00Z",
    };
    const result = normalizeEmailIntake(raw);

    expect(result.text).toBe("本文のみ");
  });
});

describe("normalizeFormIntake", () => {
  it("フィールドをkey: value形式でテキスト化する", () => {
    const raw: FormRawInput = {
      formId: "contact-form-1",
      formName: "お問い合わせ",
      fields: {
        "お名前": "山田太郎",
        "メールアドレス": "yamada@example.com",
        "お問い合わせ内容": "料金プランについて教えてください",
      },
      submitterEmail: "yamada@example.com",
      submitterName: "山田太郎",
      submittedAt: "2026-03-30T10:00:00Z",
    };
    const result = normalizeFormIntake(raw);

    expect(result.channelType).toBe("form");
    expect(result.text).toContain("フォーム: お問い合わせ");
    expect(result.text).toContain("お名前: 山田太郎");
    expect(result.text).toContain("お問い合わせ内容: 料金プランについて教えてください");
    expect(result.senderName).toBe("山田太郎");
    expect(result.senderEmail).toBe("yamada@example.com");
    expect(result.metadata.formId).toBe("contact-form-1");
  });

  it("フォーム名がない場合はフィールドのみ", () => {
    const raw: FormRawInput = {
      formId: "form-2",
      fields: { "内容": "テスト" },
      submittedAt: "2026-03-30T10:00:00Z",
    };
    const result = normalizeFormIntake(raw);

    expect(result.text).toBe("内容: テスト");
  });
});

describe("normalizeSlackIntake", () => {
  it("Slackメッセージを正規化する", () => {
    const raw: SlackRawInput = {
      channelId: "C12345",
      channelName: "support",
      userId: "U67890",
      userName: "佐藤花子",
      text: "ダッシュボードが表示されません",
      threadTs: "1711800000.000100",
      ts: "1711800000.000200",
    };
    const result = normalizeSlackIntake(raw);

    expect(result.channelType).toBe("slack");
    expect(result.text).toBe("ダッシュボードが表示されません");
    expect(result.senderName).toBe("佐藤花子");
    expect(result.metadata.channelId).toBe("C12345");
    expect(result.metadata.channelName).toBe("support");
    expect(result.metadata.threadTs).toBe("1711800000.000100");
  });
});

describe("normalizeLineIntake", () => {
  it("LINE入力を正規化する", () => {
    const raw: LineRawInput = {
      text: "予約できますか？",
      lineUid: "Uabc123",
      displayName: "LINE太郎",
      patientId: "P001",
    };
    const result = normalizeLineIntake(raw);

    expect(result.channelType).toBe("line");
    expect(result.text).toBe("予約できますか？");
    expect(result.senderName).toBe("LINE太郎");
    expect(result.patientId).toBe("P001");
    expect(result.metadata.lineUid).toBe("Uabc123");
  });
});

describe("normalizePhoneIntake", () => {
  it("電話文字起こしを正規化する", () => {
    const raw: PhoneRawInput = {
      transcript: "予約の件でお電話しました。来週の木曜日は空いていますか。",
      callerPhone: "09012345678",
      callerName: "鈴木一郎",
      duration: 180,
      recordedAt: "2026-03-30T14:00:00Z",
    };
    const result = normalizePhoneIntake(raw);

    expect(result.channelType).toBe("phone");
    expect(result.text).toContain("予約の件でお電話しました");
    expect(result.senderPhone).toBe("09012345678");
    expect(result.senderName).toBe("鈴木一郎");
    expect(result.metadata.duration).toBe(180);
  });
});

describe("normalizeIntake（統一エントリポイント）", () => {
  it("email チャネルで正しく正規化される", () => {
    const result = normalizeIntake("email", {
      subject: "テスト",
      body: "テスト本文",
      from: "test@test.com",
      to: "support@l-ope.jp",
      receivedAt: "2026-03-30T10:00:00Z",
    });
    expect(result.channelType).toBe("email");
    expect(result.text).toContain("テスト本文");
  });

  it("form チャネルで正しく正規化される", () => {
    const result = normalizeIntake("form", {
      formId: "f1",
      fields: { "質問": "テストです" },
      submittedAt: "2026-03-30T10:00:00Z",
    });
    expect(result.channelType).toBe("form");
    expect(result.text).toContain("質問: テストです");
  });

  it("未対応チャネルでエラーを投げる", () => {
    expect(() => normalizeIntake("unknown" as any, {})).toThrow("未対応のチャネル種別");
  });
});
