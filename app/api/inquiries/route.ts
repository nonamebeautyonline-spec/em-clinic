// app/api/inquiries/route.ts — お問い合わせフォーム送信API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { parseBody } from "@/lib/validations/helpers";
import { inquirySchema } from "@/lib/validations/inquiry";
import { normalizeJPPhone } from "@/lib/phone";
import { sendEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveTenantId, tenantPayload } from "@/lib/tenant";

const NOTIFY_EMAIL =
  process.env.APPLICATION_NOTIFY_EMAIL || "info@l-ope.jp";

export async function POST(req: NextRequest) {
  // レート制限: 同一IP 5回/時
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await checkRateLimit(`inquiry:${ip}`, 5, 3600);
  if (rl.limited) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMITED", message: "送信回数の上限に達しました。しばらく時間を置いてお試しください。" },
      { status: 429 },
    );
  }

  // バリデーション
  const parsed = await parseBody(req, inquirySchema);
  if ("error" in parsed) return parsed.error;
  const data = parsed.data;

  // 電話番号正規化
  const phone = data.phone ? normalizeJPPhone(data.phone) : "";

  // DB保存
  const tenantId = resolveTenantId(req);
  const { error: dbError } = await supabaseAdmin.from("inquiries").insert({
    ...tenantPayload(tenantId),
    company_name: data.company_name || null,
    contact_name: data.contact_name,
    product: data.product || null,
    industry: data.industry || null,
    service_name: data.service_name || null,
    implementation_timing: data.implementation_timing || null,
    has_existing_line: data.has_existing_line,
    existing_line_detail: data.existing_line_detail || null,
    message: data.message || null,
    email: data.email,
    phone: phone || null,
    referrer_page: data.referrer_page || null,
    utm_source: data.utm_source || null,
    utm_medium: data.utm_medium || null,
    utm_campaign: data.utm_campaign || null,
  });

  if (dbError) {
    console.error("[inquiries] DB保存エラー:", dbError);
    return NextResponse.json(
      { ok: false, error: "DB_ERROR", message: "お問い合わせの送信に失敗しました" },
      { status: 500 },
    );
  }

  // 管理者宛通知メール（失敗してもレスポンスは成功にする）
  try {
    await sendEmail({
      to: NOTIFY_EMAIL,
      subject: `【Lオペ】新規お問い合わせ: ${data.contact_name}${data.company_name ? `（${data.company_name}）` : ""}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">新規お問い合わせ</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">お名前</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${data.contact_name}</td></tr>
            ${data.company_name ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">会社名</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.company_name}</td></tr>` : ""}
            ${data.service_name ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">サービス名</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.service_name}</td></tr>` : ""}
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">メール</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.email}</td></tr>
            ${phone ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">電話番号</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${phone}</td></tr>` : ""}
            ${data.implementation_timing ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">導入希望時期</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.implementation_timing}</td></tr>` : ""}
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">既存LINEシステム</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.has_existing_line ? "あり" : "なし"}</td></tr>
            ${data.existing_line_detail ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">既存LINEの詳細</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.existing_line_detail}</td></tr>` : ""}
            ${data.message ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">お問い合わせ内容</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.message}</td></tr>` : ""}
            ${data.referrer_page ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">流入元ページ</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.referrer_page}</td></tr>` : ""}
            ${data.utm_source ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">UTM</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${data.utm_source}${data.utm_medium ? ` / ${data.utm_medium}` : ""}${data.utm_campaign ? ` / ${data.utm_campaign}` : ""}</td></tr>` : ""}
          </table>
        </div>
      `,
    });
  } catch (e) {
    console.error("[inquiries] 管理者通知メール送信失敗:", e);
  }

  return NextResponse.json({ ok: true });
}
