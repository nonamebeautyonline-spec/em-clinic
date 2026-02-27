import { describe, it, expect } from "vitest";

// use-features.ts の hasFeature の内部ロジックを純粋関数として抽出
// React hookは直接テストできないため、同じロジックを関数として再定義
function hasFeature(
  loading: boolean,
  enabledFeatures: string[],
  feature: string,
): boolean {
  if (loading) return true; // ロード中は表示（UIが消えないように）
  return enabledFeatures.includes(feature);
}

describe("hasFeature ロジック", () => {
  it("loading中は常にtrueを返す（UIが消えないように）", () => {
    expect(hasFeature(true, [], "karte")).toBe(true);
    expect(hasFeature(true, [], "nonexistent_feature")).toBe(true);
    expect(hasFeature(true, ["karte"], "karte")).toBe(true);
  });

  it("ロード完了で有効な機能はtrueを返す", () => {
    const features = ["karte", "ai_reply", "broadcast"];
    expect(hasFeature(false, features, "karte")).toBe(true);
    expect(hasFeature(false, features, "ai_reply")).toBe(true);
    expect(hasFeature(false, features, "broadcast")).toBe(true);
  });

  it("ロード完了で無効な機能はfalseを返す", () => {
    const features = ["karte", "ai_reply"];
    expect(hasFeature(false, features, "broadcast")).toBe(false);
    expect(hasFeature(false, features, "nonexistent")).toBe(false);
  });

  it("enabledFeaturesが空配列の場合falseを返す", () => {
    expect(hasFeature(false, [], "karte")).toBe(false);
    expect(hasFeature(false, [], "any_feature")).toBe(false);
  });

  it("大文字小文字を区別する", () => {
    const features = ["karte"];
    expect(hasFeature(false, features, "Karte")).toBe(false);
    expect(hasFeature(false, features, "KARTE")).toBe(false);
    expect(hasFeature(false, features, "karte")).toBe(true);
  });
});
