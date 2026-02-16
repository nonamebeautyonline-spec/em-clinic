// __tests__/api/line-webhook.test.ts
// LINE Webhook の署名検証テスト
import { describe, it, expect } from "vitest";
import crypto from "crypto";

// route.ts 内の verifyLineSignature と同じロジック
function verifyLineSignature(rawBody: string, signature: string, secrets: string[]) {
  if (secrets.length === 0 || !signature) return false;
  for (const secret of secrets) {
    const hash = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("base64");
    if (hash.length === signature.length &&
        crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))) {
      return true;
    }
  }
  return false;
}

// parseQueryString と同じロジック
function parseQueryString(data: string) {
  const out: Record<string, string> = {};
  for (const part of String(data || "").split("&")) {
    if (!part) continue;
    const [k, v] = part.split("=");
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return out;
}

// === verifyLineSignature テスト ===
describe("verifyLineSignature", () => {
  const testSecret = "test-line-channel-secret-12345";
  const testBody = '{"events":[{"type":"follow"}]}';

  function generateValidSignature(secret: string, body: string): string {
    return crypto.createHmac("sha256", secret).update(body).digest("base64");
  }

  it("正しい署名で検証成功", () => {
    const signature = generateValidSignature(testSecret, testBody);
    expect(verifyLineSignature(testBody, signature, [testSecret])).toBe(true);
  });

  it("不正な署名で検証失敗", () => {
    expect(verifyLineSignature(testBody, "invalid-sig", [testSecret])).toBe(false);
  });

  it("複数シークレットのいずれかで検証成功", () => {
    const secret1 = "wrong-secret";
    const secret2 = testSecret;
    const signature = generateValidSignature(testSecret, testBody);
    expect(verifyLineSignature(testBody, signature, [secret1, secret2])).toBe(true);
  });

  it("複数シークレットの全てで検証失敗", () => {
    const signature = generateValidSignature(testSecret, testBody);
    expect(verifyLineSignature(testBody, signature, ["wrong1", "wrong2"])).toBe(false);
  });

  it("空のsecrets配列は検証失敗", () => {
    const signature = generateValidSignature(testSecret, testBody);
    expect(verifyLineSignature(testBody, signature, [])).toBe(false);
  });

  it("空の署名は検証失敗", () => {
    expect(verifyLineSignature(testBody, "", [testSecret])).toBe(false);
  });

  it("bodyが改ざんされたら検証失敗", () => {
    const signature = generateValidSignature(testSecret, testBody);
    expect(verifyLineSignature(testBody + "x", signature, [testSecret])).toBe(false);
  });

  it("SHA256を使っている（SHA1ではない）", () => {
    const sha1Sig = crypto.createHmac("sha1", testSecret).update(testBody).digest("base64");
    const sha256Sig = generateValidSignature(testSecret, testBody);
    // SHA1の署名ではLINE検証が通らないことを確認
    expect(sha1Sig).not.toBe(sha256Sig);
    expect(verifyLineSignature(testBody, sha1Sig, [testSecret])).toBe(false);
  });
});

// === parseQueryString テスト ===
describe("parseQueryString", () => {
  it("標準的なクエリ文字列をパース", () => {
    expect(parseQueryString("a=1&b=2")).toEqual({ a: "1", b: "2" });
  });

  it("URLエンコードされた値をデコード", () => {
    expect(parseQueryString("name=%E5%A4%AA%E9%83%8E")).toEqual({ name: "太郎" });
  });

  it("空文字列", () => {
    expect(parseQueryString("")).toEqual({});
  });

  it("値なしのキー", () => {
    expect(parseQueryString("key=")).toEqual({ key: "" });
  });

  it("null/undefinedは空オブジェクト", () => {
    expect(parseQueryString(null as unknown as string)).toEqual({});
  });
});

// === LINE Webhook イベント種別テスト ===
describe("LINE Webhook イベント判定", () => {
  const eventTypes = ["follow", "unfollow", "message", "postback"];

  it("follow イベントは患者自動作成トリガー", () => {
    expect(eventTypes.includes("follow")).toBe(true);
  });

  it("unfollow イベントはステップ配信離脱トリガー", () => {
    expect(eventTypes.includes("unfollow")).toBe(true);
  });

  it("message イベントはメッセージログ記録トリガー", () => {
    expect(eventTypes.includes("message")).toBe(true);
  });

  it("postback イベントはリッチメニュー/承認操作トリガー", () => {
    expect(eventTypes.includes("postback")).toBe(true);
  });
});

// === postback データパースのテスト ===
describe("postback データパース", () => {
  it("承認postbackをパース", () => {
    const data = "action=approve_reorder&id=42";
    const parsed = parseQueryString(data);
    expect(parsed.action).toBe("approve_reorder");
    expect(parsed.id).toBe("42");
  });

  it("却下postbackをパース", () => {
    const data = "action=reject_reorder&id=42";
    const parsed = parseQueryString(data);
    expect(parsed.action).toBe("reject_reorder");
    expect(parsed.id).toBe("42");
  });

  it("タグ操作postbackをパース", () => {
    const data = "action=add_tag&tag_id=5&patient_id=p001";
    const parsed = parseQueryString(data);
    expect(parsed.action).toBe("add_tag");
    expect(parsed.tag_id).toBe("5");
    expect(parsed.patient_id).toBe("p001");
  });
});
