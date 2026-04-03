// app/api/verify/check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";
import twilio from "twilio";
import { getSettingOrEnv } from "@/lib/settings";
import { resolveTenantId } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { verifyCheckSchema } from "@/lib/validations/patient";

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseBody(req, verifyCheckSchema);
    if ("error" in parsed) return parsed.error;
    const { phone, code } = parsed.data;

    // Twilioクレデンシャルは運営共通（テナントIDを渡さず取得）
    const accountSid = await getSettingOrEnv("sms", "account_sid", "TWILIO_ACCOUNT_SID");
    const authToken = await getSettingOrEnv("sms", "auth_token", "TWILIO_AUTH_TOKEN");
    const verifySid = await getSettingOrEnv("sms", "verify_sid", "TWILIO_VERIFY_SID");

    if (!accountSid || !authToken || !verifySid) {
      console.error("[verify/check] Twilio credentials not configured");
      return serverError("SMS設定が見つかりません。管理者にお問い合わせください。");
    }

    const client = twilio(accountSid, authToken);

    const check = await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({
        to: phone,
        code,
      });

    return NextResponse.json({ valid: check.valid });
  } catch (e) {
    const err = e as Record<string, unknown>;
    console.error("verify check error", { code: err?.code, status: err?.status });
    return serverError("認証コードの確認中にエラーが発生しました。時間をおいて再度お試しください。");
  }
}
