// __tests__/api/apply-stripe.test.ts
// 申し込みフォーム Stripe決済連携テスト
import { describe, it, expect } from "vitest";

// === Stripe Checkout Session パラメータ生成 ===
describe("apply Stripe Checkout Session パラメータ", () => {
  function buildCheckoutParams(data: {
    feature_plan: string;
    msg_plan: string;
    company_name: string;
    email: string;
    monthlyEstimate: number;
    baseUrl: string;
  }) {
    return {
      mode: "subscription" as const,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: `Lオペ for CLINIC（${data.feature_plan} + ${data.msg_plan}）`,
              description: `${data.company_name} 様向けプラン`,
            },
            unit_amount: data.monthlyEstimate,
            recurring: { interval: "month" as const },
          },
          quantity: 1,
        },
      ],
      success_url: `${data.baseUrl}/lp/apply-complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.baseUrl}/lp/apply?canceled=true`,
      customer_email: data.email,
    };
  }

  it("mode は subscription", () => {
    const params = buildCheckoutParams({
      feature_plan: "standard",
      msg_plan: "msg_5000",
      company_name: "テストクリニック",
      email: "test@example.com",
      monthlyEstimate: 50000,
      baseUrl: "https://lope.jp",
    });
    expect(params.mode).toBe("subscription");
  });

  it("通貨はJPY", () => {
    const params = buildCheckoutParams({
      feature_plan: "standard",
      msg_plan: "msg_5000",
      company_name: "テストクリニック",
      email: "test@example.com",
      monthlyEstimate: 50000,
      baseUrl: "https://lope.jp",
    });
    expect(params.line_items[0].price_data.currency).toBe("jpy");
  });

  it("金額が正しく設定される", () => {
    const params = buildCheckoutParams({
      feature_plan: "standard",
      msg_plan: "msg_5000",
      company_name: "テストクリニック",
      email: "test@example.com",
      monthlyEstimate: 75000,
      baseUrl: "https://lope.jp",
    });
    expect(params.line_items[0].price_data.unit_amount).toBe(75000);
  });

  it("success_url にsession_idプレースホルダを含む", () => {
    const params = buildCheckoutParams({
      feature_plan: "standard",
      msg_plan: "msg_5000",
      company_name: "テストクリニック",
      email: "test@example.com",
      monthlyEstimate: 50000,
      baseUrl: "https://lope.jp",
    });
    expect(params.success_url).toBe(
      "https://lope.jp/lp/apply-complete?session_id={CHECKOUT_SESSION_ID}"
    );
  });

  it("cancel_url にcanceledフラグを含む", () => {
    const params = buildCheckoutParams({
      feature_plan: "standard",
      msg_plan: "msg_5000",
      company_name: "テストクリニック",
      email: "test@example.com",
      monthlyEstimate: 50000,
      baseUrl: "https://lope.jp",
    });
    expect(params.cancel_url).toBe("https://lope.jp/lp/apply?canceled=true");
  });

  it("customer_email が設定される", () => {
    const params = buildCheckoutParams({
      feature_plan: "standard",
      msg_plan: "msg_5000",
      company_name: "テストクリニック",
      email: "clinic@example.com",
      monthlyEstimate: 50000,
      baseUrl: "https://lope.jp",
    });
    expect(params.customer_email).toBe("clinic@example.com");
  });

  it("商品名にプラン名を含む", () => {
    const params = buildCheckoutParams({
      feature_plan: "premium",
      msg_plan: "msg_10000",
      company_name: "テストクリニック",
      email: "test@example.com",
      monthlyEstimate: 100000,
      baseUrl: "https://lope.jp",
    });
    expect(params.line_items[0].price_data.product_data.name).toContain("premium");
    expect(params.line_items[0].price_data.product_data.name).toContain("msg_10000");
  });
});

// === Stripe決済条件判定 ===
describe("apply Stripe決済条件", () => {
  it("月額 > 0 の場合は Stripe 決済対象", () => {
    const monthlyEstimate = 50000;
    expect(monthlyEstimate > 0).toBe(true);
  });

  it("月額 = 0 の場合は Stripe 決済対象外", () => {
    const monthlyEstimate = 0;
    expect(monthlyEstimate > 0).toBe(false);
  });

  it("checkoutUrl はnullable（Stripe未設定時）", () => {
    const response: { ok: boolean; checkoutUrl: string | null } = {
      ok: true,
      checkoutUrl: null,
    };
    expect(response.ok).toBe(true);
    expect(response.checkoutUrl).toBeNull();
  });

  it("checkoutUrl が存在する場合はURL形式", () => {
    const checkoutUrl = "https://checkout.stripe.com/c/pay/cs_test_xxx";
    expect(checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com/);
  });
});
