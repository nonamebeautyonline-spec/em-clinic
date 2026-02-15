// app/api/verify/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { redis } from "@/lib/redis";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const verifySid = process.env.TWILIO_VERIFY_SID!;

const client = twilio(accountSid, authToken);

// レート制限: 同一電話番号は60秒に1回、同一IPは10分に5回
async function checkRateLimit(phone: string, ip: string): Promise<string | null> {
  try {
    // 電話番号単位: 60秒に1回
    const phoneKey = `sms_rate:phone:${phone}`;
    const phoneCount = await redis.get<number>(phoneKey);
    if (phoneCount) {
      return "認証コードは60秒に1回のみ送信できます。しばらくお待ちください。";
    }

    // IP単位: 10分に5回
    const ipKey = `sms_rate:ip:${ip}`;
    const ipCount = await redis.get<number>(ipKey);
    if (ipCount && ipCount >= 5) {
      return "送信回数の上限に達しました。しばらくお待ちください。";
    }

    // カウンター更新
    await redis.set(phoneKey, 1, { ex: 60 });
    await redis.incr(ipKey);
    if (!ipCount) {
      await redis.expire(ipKey, 600);
    }
  } catch (err) {
    // Redis障害時はレート制限をスキップ（SMS送信は許可）
    console.error("[verify/send] Rate limit check failed:", err);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = (await req.json()) as { phone?: string };
    if (!phone) {
      return NextResponse.json(
        { error: "phone is required" },
        { status: 400 }
      );
    }

    // レート制限チェック
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";
    const rateLimitError = await checkRateLimit(phone, ip);
    if (rateLimitError) {
      return NextResponse.json(
        { error: rateLimitError },
        { status: 429 }
      );
    }

    const verification = await client.verify.v2
      .services(verifySid)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    return NextResponse.json({ status: verification.status });
  } catch (e: any) {
    console.error("verify send error", { code: e?.code, status: e?.status });
    return NextResponse.json(
      { error: "認証コードの送信中にエラーが発生しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
