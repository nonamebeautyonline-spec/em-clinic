// __tests__/api/apply.test.ts
// SaaS申し込みフォームAPI バリデーション・ビジネスロジックテスト（税込価格）
import { describe, it, expect } from "vitest";
import {
  applicationSchema,
  getFeaturePlanPrice,
  getFeaturePlanInitialCost,
  getMsgPlanPrice,
  getAiOptionsTotal,
  getExtraOptionsTotal,
  getSetupOptionsTotal,
  getIncludedFeatures,
  FEATURE_PLANS,
  AI_OPTIONS,
  EXTRA_OPTIONS,
  MSG_PLANS,
  SETUP_OPTIONS,
} from "@/lib/validations/apply";

describe("applicationSchema バリデーション", () => {
  const valid = {
    company_name: "株式会社テストクリニック",
    industry: "美容皮膚科",
    contact_phone: "090-1234-5678",
    email: "test@example.com",
    feature_plan: "スタンダード",
    msg_plan: "30,000通",
    ai_options: [],
    extra_options: [],
    setup_options: [],
    admin_password: "Test1234!",
    agreed_terms: true as const,
  };

  it("正常なデータでパース成功", () => {
    const result = applicationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("全フィールド入力でパース成功", () => {
    const result = applicationSchema.safeParse({
      ...valid,
      platform_name: "テストビューティー",
      ai_options: ["AI自動返信"],
      extra_options: ["LINEbot通知"],
      setup_options: ["リッチメニュー作成"],
      note: "テスト備考",
    });
    expect(result.success).toBe(true);
  });

  it("会社名が空でエラー", () => {
    const result = applicationSchema.safeParse({ ...valid, company_name: "" });
    expect(result.success).toBe(false);
  });

  it("業種が不正でエラー", () => {
    const result = applicationSchema.safeParse({ ...valid, industry: "存在しない業種" });
    expect(result.success).toBe(false);
  });

  it("電話番号が空でエラー", () => {
    const result = applicationSchema.safeParse({ ...valid, contact_phone: "" });
    expect(result.success).toBe(false);
  });

  it("電話番号に英字が含まれるとエラー", () => {
    const result = applicationSchema.safeParse({ ...valid, contact_phone: "090-abcd-1234" });
    expect(result.success).toBe(false);
  });

  it("メールアドレスが不正でエラー", () => {
    const result = applicationSchema.safeParse({ ...valid, email: "invalid-email" });
    expect(result.success).toBe(false);
  });

  it("機能プランが未選択でエラー", () => {
    const result = applicationSchema.safeParse({ ...valid, feature_plan: "" });
    expect(result.success).toBe(false);
  });

  it("不正な機能プラン名でエラー", () => {
    const result = applicationSchema.safeParse({ ...valid, feature_plan: "存在しないプラン" });
    expect(result.success).toBe(false);
  });

  it("メッセージ通数が未選択でエラー", () => {
    const result = applicationSchema.safeParse({ ...valid, msg_plan: "" });
    expect(result.success).toBe(false);
  });

  it("利用規約未同意でエラー", () => {
    const result = applicationSchema.safeParse({ ...valid, agreed_terms: false });
    expect(result.success).toBe(false);
  });

  it("備考が1000文字超でエラー", () => {
    const result = applicationSchema.safeParse({ ...valid, note: "a".repeat(1001) });
    expect(result.success).toBe(false);
  });
});

describe("見積もり計算（税込）", () => {
  it("機能プラン価格を正しく取得", () => {
    expect(getFeaturePlanPrice("スタンダード")).toBe(71500);
    expect(getFeaturePlanPrice("プロ")).toBe(121000);
    expect(getFeaturePlanPrice("ライト")).toBe(0); // 削除済み
  });

  it("機能プラン初期費用を正しく取得", () => {
    expect(getFeaturePlanInitialCost("スタンダード")).toBe(330000);
    expect(getFeaturePlanInitialCost("プロ")).toBe(550000);
  });

  it("存在しない機能プランは0を返す", () => {
    expect(getFeaturePlanPrice("不明")).toBe(0);
    expect(getFeaturePlanInitialCost("不明")).toBe(0);
  });

  it("メッセージ通数価格を正しく取得", () => {
    expect(getMsgPlanPrice("5,000通")).toBe(4400);
    expect(getMsgPlanPrice("30,000通")).toBe(18700);
    expect(getMsgPlanPrice("1,000,000通")).toBe(173800);
  });

  it("AIオプション合計を正しく計算", () => {
    expect(getAiOptionsTotal([])).toBe(0);
    expect(getAiOptionsTotal(["AI自動返信"])).toBe(22000);
    expect(getAiOptionsTotal(["AI自動返信", "音声カルテ"])).toBe(38500);
    expect(getAiOptionsTotal(AI_OPTIONS.map((o) => o.key))).toBe(38500);
  });

  it("その他オプション合計を正しく計算", () => {
    expect(getExtraOptionsTotal([])).toBe(0);
    expect(getExtraOptionsTotal(["LINEbot通知"])).toBe(5500);
  });

  it("構築オプション合計を正しく計算", () => {
    expect(getSetupOptionsTotal([])).toBe(0);
    expect(getSetupOptionsTotal(["リッチメニュー作成"])).toBe(27500);
    expect(getSetupOptionsTotal(SETUP_OPTIONS.map((o) => o.key))).toBe(247500);
  });

  it("月額合計 = 機能プラン + メッセージ通数 + AI + その他", () => {
    const feature = getFeaturePlanPrice("プロ");
    const msg = getMsgPlanPrice("100,000通");
    const ai = getAiOptionsTotal(["AI自動返信"]);
    const extra = getExtraOptionsTotal(["LINEbot通知"]);
    expect(feature + msg + ai + extra).toBe(121000 + 77000 + 22000 + 5500);
  });

  it("初期費用 = プラン初期費用 + 構築オプション", () => {
    const planInitial = getFeaturePlanInitialCost("プロ");
    const setup = getSetupOptionsTotal(["リッチメニュー作成", "データ移行"]);
    expect(planInitial + setup).toBe(550000 + 27500 + 110000);
  });

  it("存在しないプランは初期費用0", () => {
    expect(getFeaturePlanInitialCost("ライト")).toBe(0);
  });
});

describe("getIncludedFeatures", () => {
  it("スタンダードはスタンダードの全機能", () => {
    const features = getIncludedFeatures("スタンダード");
    expect(features).toContain("管理画面");
    expect(features).toContain("予約カレンダー");
    expect(features).not.toContain("決済管理"); // プロ
  });

  it("プロは全プランの機能", () => {
    const features = getIncludedFeatures("プロ");
    expect(features).toContain("管理画面"); // スタンダード
    expect(features).toContain("予約カレンダー"); // スタンダード
    expect(features).toContain("決済管理"); // プロ
    expect(features).toContain("NPS調査"); // プロ
  });

  it("存在しないプランは空配列", () => {
    expect(getIncludedFeatures("不明")).toEqual([]);
  });
});

describe("定数の整合性", () => {
  it("全機能プランにprice・initialCost・desc・featuresが設定されている", () => {
    for (const p of FEATURE_PLANS) {
      expect(p.key).toBeTruthy();
      expect(p.price).toBeGreaterThan(0);
      expect(p.initialCost).toBeGreaterThanOrEqual(0);
      expect(p.desc).toBeTruthy();
      expect(p.features.length).toBeGreaterThan(0);
    }
  });

  it("機能プランは価格が昇順", () => {
    for (let i = 1; i < FEATURE_PLANS.length; i++) {
      expect(FEATURE_PLANS[i].price).toBeGreaterThan(FEATURE_PLANS[i - 1].price);
    }
  });

  it("機能プランは2つ", () => {
    expect(FEATURE_PLANS).toHaveLength(2);
  });

  it("全AIオプションにprice・descが設定されている", () => {
    for (const o of AI_OPTIONS) {
      expect(o.key).toBeTruthy();
      expect(o.price).toBeGreaterThan(0);
      expect(o.desc).toBeTruthy();
    }
  });

  it("全その他オプションにprice・descが設定されている", () => {
    for (const o of EXTRA_OPTIONS) {
      expect(o.key).toBeTruthy();
      expect(o.price).toBeGreaterThan(0);
      expect(o.desc).toBeTruthy();
    }
  });

  it("全メッセージプランにprice・perが設定されている", () => {
    for (const p of MSG_PLANS) {
      expect(p.key).toBeTruthy();
      expect(p.price).toBeGreaterThan(0);
      expect(p.per).toBeTruthy();
    }
  });

  it("全構築オプションにprice・descが設定されている", () => {
    for (const o of SETUP_OPTIONS) {
      expect(o.key).toBeTruthy();
      expect(o.price).toBeGreaterThan(0);
      expect(o.desc).toBeTruthy();
    }
  });
});
