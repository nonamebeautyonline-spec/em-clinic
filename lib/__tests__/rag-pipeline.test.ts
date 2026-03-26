// RAGパイプライン テスト（チャンキングのユニットテスト）
// ※ Supabase/OpenAI非依存のロジックのみテスト

import { describe, it, expect, vi } from "vitest";

// Supabase/Redis/OpenAI をモック
vi.mock("@/lib/supabase", () => ({
  supabase: {},
  supabaseAdmin: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock("@/lib/redis", () => ({
  redis: { get: vi.fn(), set: vi.fn() },
}));
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue(""),
}));
vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query: unknown) => query),
  tenantPayload: vi.fn(() => ({ tenant_id: "00000000-0000-0000-0000-000000000001" })),
}));

import { chunkKnowledgeBase } from "@/lib/embedding";

describe("chunkKnowledgeBase", () => {
  it("## 区切りのKBを正しくチャンク分割する", () => {
    const kb = `## 診療時間
月〜金: 10:00〜19:00
土曜: 10:00〜17:00
日祝: 休診

## 料金
初診料: 3,300円（税込）
再診料: 1,100円（税込）
GLP-1注射: 月額 19,800円〜

## アクセス
東京都渋谷区xxx 1-2-3
渋谷駅から徒歩5分`;

    const chunks = chunkKnowledgeBase(kb);
    expect(chunks.length).toBe(3);
    expect(chunks[0].title).toBe("診療時間");
    expect(chunks[0].content).toContain("月〜金");
    expect(chunks[1].title).toBe("料金");
    expect(chunks[2].title).toBe("アクセス");
  });

  it("【】区切りのKBを正しくチャンク分割する", () => {
    const kb = `【営業時間】
10:00〜19:00です。予約制です。

【支払い方法】
クレジットカード、銀行振込に対応しています。`;

    const chunks = chunkKnowledgeBase(kb);
    expect(chunks.length).toBe(2);
    expect(chunks[0].title).toBe("営業時間");
    expect(chunks[1].title).toBe("支払い方法");
  });

  it("区切りなしのKBは段落単位で分割する", () => {
    const kb = `当クリニックは渋谷区にある美容クリニックです。GLP-1ダイエット注射を中心に、医学的エビデンスに基づいた治療を提供しています。初診は完全予約制で、LINEから簡単にご予約いただけます。

料金は初診料3,300円、GLP-1注射は月額19,800円からとなっております。クレジットカードと銀行振込に対応しています。

副作用として軽い吐き気や食欲減退が報告されていますが、多くの場合1〜2週間で軽減します。気になる症状があればいつでもご相談ください。`;

    const chunks = chunkKnowledgeBase(kb);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeGreaterThan(10);
    }
  });

  it("空のKBは空配列を返す", () => {
    expect(chunkKnowledgeBase("")).toEqual([]);
    expect(chunkKnowledgeBase("   ")).toEqual([]);
  });

  it("長いチャンクは500文字超で分割される", () => {
    const longSection = "## 長いセクション\n" + "あいうえお。".repeat(120);
    const chunks = chunkKnowledgeBase(longSection);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it("短すぎるセクション（10文字未満）はスキップされる", () => {
    const kb = `## 見出し1
これは十分な長さのコンテンツです。最低限の説明があります。

## 短い
abc`;

    const chunks = chunkKnowledgeBase(kb);
    expect(chunks.length).toBe(1);
    expect(chunks[0].title).toBe("見出し1");
  });
});
