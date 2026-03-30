// lib/__tests__/em-name-cleaner.test.ts
// EM氏名フィールドクリーニングのテスト
import { describe, it, expect } from "vitest";
import { cleanEmName } from "@/lib/em-name-cleaner";

describe("cleanEmName", () => {
  // === そのまま返すケース ===
  it("普通の氏名はそのまま返す（スペースは除去して結合）", () => {
    const result = cleanEmName("田中太郎");
    expect(result.cleaned).toBe("田中太郎");
  });

  it("姓名スペース区切りは結合して返す", () => {
    const result = cleanEmName("田中 太郎");
    expect(result.cleaned).toBe("田中太郎");
  });

  // === 絵文字除去 ===
  it("先頭の絵文字を除去する（🟥郵便局　田中）", () => {
    const result = cleanEmName("🟥郵便局　田中");
    expect(result.cleaned).toBe("田中");
  });

  it("先頭の⭕️を除去して業務メモも除去する", () => {
    const result = cleanEmName("⭕️診断書　鈴木");
    expect(result.cleaned).toBe("鈴木");
  });

  it("先頭の❌を除去する", () => {
    const result = cleanEmName("❌要確認 山田太郎");
    expect(result.cleaned).toBe("山田太郎");
  });

  // === 業務メモ接頭語除去 ===
  it("業務メモ接頭語「郵便局」を除去する", () => {
    const result = cleanEmName("郵便局 佐藤");
    expect(result.cleaned).toBe("佐藤");
  });

  it("業務メモ接頭語「再発送」を除去する", () => {
    const result = cleanEmName("再発送 高橋花子");
    expect(result.cleaned).toBe("高橋花子");
  });

  it("業務メモ接頭語「レターパック」を除去する", () => {
    const result = cleanEmName("レターパック 伊藤");
    expect(result.cleaned).toBe("伊藤");
  });

  // === 空・null ===
  it("空文字列は空を返す", () => {
    const result = cleanEmName("");
    expect(result.cleaned).toBe("");
    expect(result.raw).toBe("");
  });

  it("スペースのみは空を返す", () => {
    const result = cleanEmName("   ");
    expect(result.cleaned).toBe("");
  });

  // === rawフィールド ===
  it("rawにはトリム後の元の文字列が入る", () => {
    const result = cleanEmName("  🟥郵便局　田中  ");
    expect(result.raw).toBe("🟥郵便局　田中");
    expect(result.cleaned).toBe("田中");
  });

  // === 全角スペース ===
  it("全角スペース区切りでも正しく処理する", () => {
    // 「確認済み」は接頭語として除去 → 残りは「渡辺」
    // ただし「確認済み」の「み」が部分一致で残る可能性をチェック
    const result = cleanEmName("確認済　渡辺");
    expect(result.cleaned).toBe("渡辺");
  });
});
