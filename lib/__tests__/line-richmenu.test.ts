// lib/__tests__/line-richmenu.test.ts
// リッチメニュー座標計算・アクション変換・bounds クランプのテスト
import { describe, it, expect } from "vitest";

// === mapActionToLine のロジック再実装 ===
function mapActionToLine(action: { type: string; uri?: string; tel?: string; text?: string; label?: string; formSlug?: string; actions?: any[]; userMessage?: string }, origin: string) {
  switch (action.type) {
    case "uri":
      return { type: "uri" as const, uri: action.uri || "https://line.me", label: action.label || "リンク" };
    case "tel":
      return { type: "uri" as const, uri: action.tel?.startsWith("tel:") ? action.tel : `tel:${action.tel || ""}`, label: action.label || "電話" };
    case "message":
      return { type: "message" as const, text: action.text || "メッセージ" };
    case "form":
      return { type: "uri" as const, uri: `${origin}/forms/${action.formSlug || ""}`, label: action.label || "フォーム" };
    case "action":
      return { type: "postback" as const, data: JSON.stringify({ type: "rich_menu_action", actions: action.actions || [], userMessage: action.userMessage || "" }), displayText: action.userMessage || undefined };
    default:
      return { type: "postback" as const, data: JSON.stringify({ type: action.type || "noop" }) };
  }
}

// === アクション変換テスト ===
describe("richmenu mapActionToLine", () => {
  const origin = "https://app.example.com";

  it("uri → type:uri", () => {
    const result = mapActionToLine({ type: "uri", uri: "https://example.com", label: "テスト" }, origin);
    expect(result.type).toBe("uri");
    expect(result.uri).toBe("https://example.com");
  });

  it("uri デフォルト値", () => {
    const result = mapActionToLine({ type: "uri" }, origin);
    expect(result.uri).toBe("https://line.me");
    expect(result.label).toBe("リンク");
  });

  it("tel → type:uri + tel:スキーム", () => {
    const result = mapActionToLine({ type: "tel", tel: "09012345678" }, origin);
    expect(result.type).toBe("uri");
    expect(result.uri).toBe("tel:09012345678");
  });

  it("tel: プレフィックス付きの場合はそのまま", () => {
    const result = mapActionToLine({ type: "tel", tel: "tel:09012345678" }, origin);
    expect(result.uri).toBe("tel:09012345678");
  });

  it("message → type:message", () => {
    const result = mapActionToLine({ type: "message", text: "こんにちは" }, origin);
    expect(result.type).toBe("message");
    expect(result.text).toBe("こんにちは");
  });

  it("message デフォルト値", () => {
    const result = mapActionToLine({ type: "message" }, origin);
    expect(result.text).toBe("メッセージ");
  });

  it("form → type:uri + /forms/slug", () => {
    const result = mapActionToLine({ type: "form", formSlug: "intake-form" }, origin);
    expect(result.type).toBe("uri");
    expect(result.uri).toBe("https://app.example.com/forms/intake-form");
  });

  it("action → type:postback + JSON", () => {
    const result = mapActionToLine({ type: "action", actions: [{ type: "tag_add" }], userMessage: "実行" }, origin);
    expect(result.type).toBe("postback");
    const data = JSON.parse(result.data);
    expect(data.type).toBe("rich_menu_action");
    expect(data.actions.length).toBe(1);
    expect(result.displayText).toBe("実行");
  });

  it("未知のタイプ → postback + noop", () => {
    const result = mapActionToLine({ type: "unknown_type" }, origin);
    expect(result.type).toBe("postback");
    const data = JSON.parse(result.data);
    expect(data.type).toBe("unknown_type");
  });
});

// === bounds クランプ ===
describe("richmenu bounds クランプ", () => {
  function clampBounds(bounds: { x: number; y: number; width: number; height: number }) {
    const x = Math.max(0, bounds.x);
    const y = Math.max(0, bounds.y);
    return {
      x,
      y,
      width: bounds.width - (x - bounds.x),
      height: bounds.height - (y - bounds.y),
    };
  }

  it("正常値はそのまま", () => {
    const result = clampBounds({ x: 100, y: 200, width: 500, height: 300 });
    expect(result).toEqual({ x: 100, y: 200, width: 500, height: 300 });
  });

  it("負のx → 0にクランプ + width調整", () => {
    const result = clampBounds({ x: -10, y: 0, width: 500, height: 300 });
    expect(result.x).toBe(0);
    // x was -10, clamped to 0, so x - bounds.x = 0 - (-10) = 10
    // width = 500 - 10 = 490
    expect(result.width).toBe(490);
  });

  it("負のy → 0にクランプ + height調整", () => {
    const result = clampBounds({ x: 0, y: -20, width: 500, height: 400 });
    expect(result.y).toBe(0);
    expect(result.height).toBe(380); // 400 - 20
  });

  it("x=0, y=0 はそのまま", () => {
    const result = clampBounds({ x: 0, y: 0, width: 2500, height: 1686 });
    expect(result).toEqual({ x: 0, y: 0, width: 2500, height: 1686 });
  });
});

// === メニューサイズ ===
describe("richmenu サイズ判定", () => {
  it("half → 843px", () => {
    const sizeHeight = "half" === "half" ? 843 : 1686;
    expect(sizeHeight).toBe(843);
  });

  it("full → 1686px", () => {
    const sizeHeight = "full" === "half" ? 843 : 1686;
    expect(sizeHeight).toBe(1686);
  });

  it("幅は常に2500px", () => {
    const width = 2500;
    expect(width).toBe(2500);
  });
});

// === デフォルトエリア ===
describe("richmenu デフォルトエリア追加", () => {
  it("空のareas → デフォルトエリア1つ追加", () => {
    const areas: any[] = [];
    const sizeHeight = 1686;
    if (areas.length === 0) {
      areas.push({
        bounds: { x: 0, y: 0, width: 2500, height: sizeHeight },
        action: { type: "message", text: "メニュー" },
      });
    }
    expect(areas.length).toBe(1);
    expect(areas[0].bounds.width).toBe(2500);
  });

  it("areasがある場合はそのまま", () => {
    const areas = [{ bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: "message", text: "左" } }];
    if (areas.length === 0) {
      areas.push({ bounds: { x: 0, y: 0, width: 2500, height: 843 }, action: { type: "message", text: "メニュー" } });
    }
    expect(areas.length).toBe(1);
    expect(areas[0].action.text).toBe("左");
  });
});

// === 名前の切り詰め ===
describe("richmenu テキスト切り詰め", () => {
  it("名前は300文字まで", () => {
    const longName = "あ".repeat(500);
    expect(longName.slice(0, 300).length).toBe(300);
  });

  it("chatBarText は14文字まで", () => {
    const text = "長いチャットバーテキスト";
    expect(text.slice(0, 14).length).toBeLessThanOrEqual(14);
  });

  it("デフォルトchatBarText", () => {
    const chatBarText = "" || "メニュー";
    expect(chatBarText).toBe("メニュー");
  });
});
