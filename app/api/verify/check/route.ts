// app/api/verify/check/route.ts
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { getSettingOrEnv } from "@/lib/settings";
import { resolveTenantId } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = (await req.json()) as {
      phone?: string;
      code?: string;
    };

    if (!phone || !code) {
      return NextResponse.json(
        { error: "phone and code are required" },
        { status: 400 }
      );
    }

    // テナント解決 → DB優先で Twilio クレデンシャル取得
    const tenantId = resolveTenantId(req);
    const accountSid = await getSettingOrEnv("sms", "account_sid", "TWILIO_ACCOUNT_SID", tenantId ?? undefined);
    const authToken = await getSettingOrEnv("sms", "auth_token", "TWILIO_AUTH_TOKEN", tenantId ?? undefined);
    const verifySid = await getSettingOrEnv("sms", "verify_sid", "TWILIO_VERIFY_SID", tenantId ?? undefined);

    if (!accountSid || !authToken || !verifySid) {
      console.error("[verify/check] Twilio credentials not configured");
      return NextResponse.json(
        { error: "SMS設定が見つかりません。管理者にお問い合わせください。" },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);

    const check = await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({
        to: phone,
        code,
      });

    return NextResponse.json({ valid: check.valid });
  } catch (e: any) {
    console.error("verify check error", { code: e?.code, status: e?.status });
    return NextResponse.json(
      { error: "認証コードの確認中にエラーが発生しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
