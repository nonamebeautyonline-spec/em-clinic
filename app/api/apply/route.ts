// app/api/apply/route.ts — SaaS申し込みフォーム送信API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { parseBody } from "@/lib/validations/helpers";
import {
  applicationSchema,
  getFeaturePlanPrice,
  getFeaturePlanInitialCost,
  getMsgPlanPrice,
  getAiOptionsTotal,
  getExtraOptionsTotal,
  getSetupOptionsTotal,
} from "@/lib/validations/apply";
import { normalizeJPPhone } from "@/lib/phone";
import { sendEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

const NOTIFY_EMAIL =
  process.env.APPLICATION_NOTIFY_EMAIL || "info@l-ope.jp";

export async function POST(req: NextRequest) {
  // レート制限: 同一IP 5回/時
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await checkRateLimit(`apply:${ip}`, 5, 3600);
  if (rl.limited) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMITED", message: "送信回数の上限に達しました。しばらく時間を置いてお試しください。" },
      { status: 429 },
    );
  }

  // バリデーション
  const parsed = await parseBody(req, applicationSchema);
  if ("error" in parsed) return parsed.error;
  const data = parsed.data;

  // 電話番号正規化
  const phone = normalizeJPPhone(data.contact_phone);

  // 見積もり計算（税抜き）
  const featurePrice = getFeaturePlanPrice(data.feature_plan);
  const msgPrice = getMsgPlanPrice(data.msg_plan);
  const aiPrice = getAiOptionsTotal(data.ai_options);
  const extraPrice = getExtraOptionsTotal(data.extra_options);
  const monthlyEstimate = featurePrice + msgPrice + aiPrice + extraPrice;
  const planInitialCost = getFeaturePlanInitialCost(data.feature_plan);
  const setupCost = getSetupOptionsTotal(data.setup_options);
  const initialEstimate = planInitialCost + setupCost;

  // DB保存
  const { error: dbError } = await supabaseAdmin.from("applications").insert({
    company_name: data.company_name,
    platform_name: data.platform_name || null,
    industry: data.industry,
    contact_phone: phone,
    email: data.email,
    plan: `${data.feature_plan} + ${data.msg_plan}`,
    ai_options: data.ai_options,
    extra_options: data.extra_options,
    setup_options: data.setup_options,
    monthly_estimate: monthlyEstimate,
    initial_estimate: initialEstimate,
    note: data.note || null,
  });

  if (dbError) {
    console.error("[apply] DB保存エラー:", dbError);
    return NextResponse.json(
      { ok: false, error: "DB_ERROR", message: "申し込みの保存に失敗しました" },
      { status: 500 },
    );
  }

  // メール送信（失敗してもレスポンスは成功にする）
  const fmt = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

  // 管理者宛通知
  try {
    await sendEmail({
      to: NOTIFY_EMAIL,
      subject: `【Lオペ】新規申し込み: ${data.company_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">新規お申し込み</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">会社名</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${data.company_name}</td></tr>
            ${data.platform_name ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">プラットフォーム名</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.platform_name}</td></tr>` : ""}
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">業種</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.industry}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">電話番号</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${phone}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">メール</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.email}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">機能プラン</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${data.feature_plan}（${fmt(featurePrice)}/月）</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">メッセージ通数</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.msg_plan}（${fmt(msgPrice)}/月）</td></tr>
            ${data.ai_options.length > 0 ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">AIオプション</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.ai_options.join(", ")}（${fmt(aiPrice)}/月）</td></tr>` : ""}
            ${data.setup_options.length > 0 ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">構築オプション</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.setup_options.join(", ")}</td></tr>` : ""}
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">月額見積もり（税抜）</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #2563eb;">${fmt(monthlyEstimate)}/月</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">初期費用（税抜）</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #2563eb;">${fmt(initialEstimate)}</td></tr>
            ${data.note ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">備考</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.note}</td></tr>` : ""}
          </table>
        </div>
      `,
    });
  } catch (e) {
    console.error("[apply] 管理者通知メール送信失敗:", e);
  }

  // 申込者宛確認メール
  try {
    await sendEmail({
      to: data.email,
      subject: "【Lオペ for CLINIC】お申し込みありがとうございます",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">お申し込みを受け付けました</h2>
          <p>${data.company_name} 様</p>
          <p>Lオペ for CLINICへのお申し込みありがとうございます。<br>2営業日以内に担当者よりご連絡いたします。</p>

          <div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">お申し込み内容</h3>
            <p style="margin: 4px 0; font-size: 14px;"><span style="color: #64748b;">機能プラン:</span> <strong>${data.feature_plan}</strong>（${fmt(featurePrice)}/月）</p>
            <p style="margin: 4px 0; font-size: 14px;"><span style="color: #64748b;">メッセージ通数:</span> <strong>${data.msg_plan}</strong>（${fmt(msgPrice)}/月）</p>
            ${data.ai_options.length > 0 ? `<p style="margin: 4px 0; font-size: 14px;"><span style="color: #64748b;">AIオプション:</span> ${data.ai_options.join(", ")}（${fmt(aiPrice)}/月）</p>` : ""}
            ${data.setup_options.length > 0 ? `<p style="margin: 4px 0; font-size: 14px;"><span style="color: #64748b;">構築オプション:</span> ${data.setup_options.join(", ")}</p>` : ""}
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 12px 0;" />
            <p style="margin: 4px 0; font-size: 16px;"><span style="color: #64748b;">月額（税抜）:</span> <strong style="color: #2563eb;">${fmt(monthlyEstimate)}/月</strong></p>
            ${initialEstimate > 0 ? `<p style="margin: 4px 0; font-size: 16px;"><span style="color: #64748b;">初期費用（税抜）:</span> <strong style="color: #2563eb;">${fmt(initialEstimate)}</strong></p>` : ""}
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">※ 表示価格は税抜きです。別途消費税がかかります。</p>
          </div>

          <p style="color: #64748b; font-size: 13px;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">Lオペ for CLINIC</p>
        </div>
      `,
    });
  } catch (e) {
    console.error("[apply] 確認メール送信失敗:", e);
  }

  return NextResponse.json({ ok: true });
}
