// lib/__tests__/ai-reply-approval.test.ts — AI返信承認Flex Messageテスト

import type { TimedMessage } from "@/lib/ai-reply-approval";

// --- モック定義 ---
const mockGetSettingOrEnv = vi.fn();
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: (...args: any[]) => mockGetSettingOrEnv(...args),
}));

const mockBuildEditUrl = vi.fn(() => "https://example.com/ai-reply/edit?id=1&exp=999&sig=abc");
vi.mock("@/lib/ai-reply-sign", () => ({
  buildEditUrl: (...args: any[]) => mockBuildEditUrl(...args),
}));

// fetch モック
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { sendApprovalFlexMessage } from "@/lib/ai-reply-approval";

// ============================================================
// ヘルパー: 設定を有効化
// ============================================================
function enableSettings() {
  mockGetSettingOrEnv.mockImplementation(
    (_cat: string, key: string) => {
      if (key === "notify_channel_access_token") return "test-token";
      if (key === "admin_group_id") return "group-123";
      return "";
    }
  );
}

// ============================================================
// sendApprovalFlexMessage
// ============================================================
describe("sendApprovalFlexMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve("") });
  });

  // --- 設定不足スキップ ---

  it("notify_channel_access_token未設定 → スキップ（fetchされない）", async () => {
    mockGetSettingOrEnv.mockImplementation(
      (_cat: string, key: string) => {
        if (key === "notify_channel_access_token") return "";
        if (key === "admin_group_id") return "group-123";
        return "";
      }
    );
    await sendApprovalFlexMessage(1, "p1", "田中", "元メッセージ", "AI返信", 0.8, "operational");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("admin_group_id未設定 → スキップ", async () => {
    mockGetSettingOrEnv.mockImplementation(
      (_cat: string, key: string) => {
        if (key === "notify_channel_access_token") return "token";
        if (key === "admin_group_id") return "";
        return "";
      }
    );
    await sendApprovalFlexMessage(1, "p1", "田中", "元メッセージ", "AI返信", 0.8, "operational");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("両方未設定 → スキップ", async () => {
    mockGetSettingOrEnv.mockResolvedValue("");
    await sendApprovalFlexMessage(1, "p1", "田中", "テスト", "返信", 0.5, "other");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // --- 正常送信 ---

  it("正常送信 → LINE API にPOSTされる", async () => {
    enableSettings();
    await sendApprovalFlexMessage(1, "p1", "田中太郎", "質問です", "回答です", 0.9, "operational");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.line.me/v2/bot/message/push");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer test-token");
    const body = JSON.parse(options.body);
    expect(body.to).toBe("group-123");
  });

  it("altTextに患者名が含まれる", async () => {
    enableSettings();
    await sendApprovalFlexMessage(1, "p1", "佐藤花子", "こんにちは", "返信", 0.5, "operational");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0].altText).toBe("【AI返信案】佐藤花子");
  });

  // --- Flex Message構造検証 ---

  it("Flex Messageがbubble構造を持つ", async () => {
    enableSettings();
    await sendApprovalFlexMessage(1, "p1", "田中", "元", "AI返信", 0.7, "operational");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const flex = body.messages[0];
    expect(flex.type).toBe("flex");
    expect(flex.contents.type).toBe("bubble");
    expect(flex.contents.header).toBeDefined();
    expect(flex.contents.body).toBeDefined();
    expect(flex.contents.footer).toBeDefined();
  });

  it("ヘッダーに「AI返信案」とカテゴリラベルが含まれる", async () => {
    enableSettings();
    await sendApprovalFlexMessage(1, "p1", "田中", "元", "返信", 0.7, "operational");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const header = body.messages[0].contents.header;
    const texts = header.contents.map((c: any) => c.text);
    expect(texts).toContain("AI返信案");
    expect(texts).toContain("手続き系");
  });

  it("medicalカテゴリ → 「医学系」ラベル＋赤色", async () => {
    enableSettings();
    await sendApprovalFlexMessage(1, "p1", "田中", "元", "返信", 0.5, "medical");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const header = body.messages[0].contents.header;
    const categoryContent = header.contents.find((c: any) => c.text === "医学系");
    expect(categoryContent).toBeDefined();
    expect(categoryContent.color).toBe("#DC2626");
  });

  it("otherカテゴリ → 「その他」ラベル", async () => {
    enableSettings();
    await sendApprovalFlexMessage(1, "p1", "田中", "元", "返信", 0.5, "other");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const header = body.messages[0].contents.header;
    const categoryContent = header.contents.find((c: any) => c.text === "その他");
    expect(categoryContent).toBeDefined();
  });

  it("未知カテゴリ → そのままカテゴリ文字列が表示される", async () => {
    enableSettings();
    await sendApprovalFlexMessage(1, "p1", "田中", "元", "返信", 0.5, "unknown_cat");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const header = body.messages[0].contents.header;
    const categoryContent = header.contents.find((c: any) => c.text === "unknown_cat");
    expect(categoryContent).toBeDefined();
  });

  // --- 信頼度の星変換 ---

  it("confidence=1.0 → ★★★★★（5つ星）", async () => {
    enableSettings();
    await sendApprovalFlexMessage(1, "p1", "田中", "元", "返信", 1.0, "operational");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const bodyContents = body.messages[0].contents.body.contents;
    const confidenceText = bodyContents.find((c: any) => c.text?.startsWith("信頼度:"));
    expect(confidenceText.text).toBe("信頼度: ★★★★★");
  });

  it("confidence=0.0 → ☆☆☆☆☆（0つ星）", async () => {
    enableSettings();
    await sendApprovalFlexMessage(1, "p1", "田中", "元", "返信", 0.0, "operational");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const bodyContents = body.messages[0].contents.body.contents;
    const confidenceText = bodyContents.find((c: any) => c.text?.startsWith("信頼度:"));
    expect(confidenceText.text).toBe("信頼度: ☆☆☆☆☆");
  });

  it("confidence=0.5 → ★★★☆☆（3つ星: Math.round(0.5*5)=3）", async () => {
    enableSettings();
    await sendApprovalFlexMessage(1, "p1", "田中", "元", "返信", 0.5, "operational");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const bodyContents = body.messages[0].contents.body.contents;
    const confidenceText = bodyContents.find((c: any) => c.text?.startsWith("信頼度:"));
    expect(confidenceText.text).toBe("信頼度: ★★★☆☆");
  });

  it("confidence=0.72 → ★★★★☆（4つ星: Math.round(0.72*5)=4）", async () => {
    enableSettings();
    await sendApprovalFlexMessage(1, "p1", "田中", "元", "返信", 0.72, "operational");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const bodyContents = body.messages[0].contents.body.contents;
    const confidenceText = bodyContents.find((c: any) => c.text?.startsWith("信頼度:"));
    expect(confidenceText.text).toBe("信頼度: ★★★★☆");
  });

  // --- フッター（承認・修正・却下ボタン） ---

  it("originあり → 承認・修正・却下の3ボタン", async () => {
    enableSettings();
    await sendApprovalFlexMessage(
      42, "p1", "田中", "元", "返信", 0.8, "operational",
      undefined, "https://example.com"
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const footer = body.messages[0].contents.footer;
    expect(footer.contents).toHaveLength(3);
    expect(footer.contents[0].action.label).toBe("承認して送信");
    expect(footer.contents[0].action.data).toContain("draft_id=42");
    expect(footer.contents[1].action.label).toBe("修正する");
    expect(footer.contents[1].action.type).toBe("uri");
    expect(footer.contents[2].action.label).toBe("却下");
  });

  it("originなし → 承認・却下の2ボタン（修正ボタンなし）", async () => {
    enableSettings();
    await sendApprovalFlexMessage(
      42, "p1", "田中", "元", "返信", 0.8, "operational",
      undefined, undefined // origin なし
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const footer = body.messages[0].contents.footer;
    expect(footer.contents).toHaveLength(2);
    expect(footer.contents[0].action.label).toBe("承認して送信");
    expect(footer.contents[1].action.label).toBe("却下");
  });

  // --- timedMessages（時刻付きメッセージ） ---

  it("timedMessagesあり → 時刻仕切り付きで患者メッセージが構成される", async () => {
    enableSettings();
    const timed: TimedMessage[] = [
      { content: "こんにちは", sent_at: "2026-02-23T03:00:00.000Z" }, // JST 12:00
      { content: "予約できますか", sent_at: "2026-02-23T03:05:00.000Z" }, // JST 12:05
    ];
    await sendApprovalFlexMessage(
      1, "p1", "田中", "こんにちは\n予約できますか", "返信です", 0.8, "operational",
      undefined, "https://example.com", timed
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const bodyContents = body.messages[0].contents.body.contents;
    // 時刻ラベルが含まれる（12:00）
    const timeLabelTexts = bodyContents
      .filter((c: any) => c.text && c.text.includes("──"))
      .map((c: any) => c.text);
    expect(timeLabelTexts.length).toBeGreaterThan(0);
    expect(timeLabelTexts.some((t: string) => t.includes("12:00"))).toBe(true);
  });

  it("timedMessagesなし・originalMessage短い → そのまま表示", async () => {
    enableSettings();
    await sendApprovalFlexMessage(
      1, "p1", "田中", "短いメッセージ", "返信", 0.8, "operational"
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const bodyContents = body.messages[0].contents.body.contents;
    const msgContent = bodyContents.find((c: any) => c.text === "短いメッセージ");
    expect(msgContent).toBeDefined();
  });

  it("originalMessageが200文字超 → 切り詰め+「...」", async () => {
    enableSettings();
    const longMsg = "あ".repeat(250);
    await sendApprovalFlexMessage(
      1, "p1", "田中", longMsg, "返信", 0.8, "operational"
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const bodyContents = body.messages[0].contents.body.contents;
    // 患者メッセージラベルの後にある長文テキスト
    const patientMsgLabels = bodyContents.filter(
      (c: any) => c.text && c.text.startsWith("あ")
    );
    expect(patientMsgLabels.length).toBeGreaterThan(0);
    expect(patientMsgLabels[0].text).toContain("...");
    expect(patientMsgLabels[0].text.length).toBeLessThanOrEqual(204); // 200 + "..."
  });

  // --- LINE API エラーハンドリング ---

  it("LINE API失敗（res.ok=false）→ エラーログのみ（例外なし）", async () => {
    enableSettings();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve("Bad Request"),
    });

    await expect(
      sendApprovalFlexMessage(1, "p1", "田中", "テスト", "返信", 0.5, "operational")
    ).resolves.toBeUndefined();
  });

  // --- buildEditUrlの呼び出し確認 ---

  it("修正ボタンのURL生成にbuildEditUrlが使われる", async () => {
    enableSettings();
    mockBuildEditUrl.mockReturnValue("https://test.com/edit?id=99");

    await sendApprovalFlexMessage(
      99, "p1", "田中", "元", "返信", 0.8, "operational",
      undefined, "https://test.com"
    );

    expect(mockBuildEditUrl).toHaveBeenCalledWith(99, "https://test.com");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const footer = body.messages[0].contents.footer;
    const editButton = footer.contents.find((c: any) => c.action?.label === "修正する");
    expect(editButton.action.uri).toBe("https://test.com/edit?id=99");
  });
});
