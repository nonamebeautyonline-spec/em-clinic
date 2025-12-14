// app/api/verify/check/route.ts
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const verifySid = process.env.TWILIO_VERIFY_SID!;

const client = twilio(accountSid, authToken);

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
