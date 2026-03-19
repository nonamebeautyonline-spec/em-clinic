import { NextResponse } from "next/server";
import crypto from "crypto";
import { resolveTenantId, DEFAULT_TENANT_ID } from "@/lib/tenant";
import { resolveSquareTenantBySignatureKey } from "@/lib/webhook-tenant-resolver";
import { getActiveSquareAccount } from "@/lib/square-account-server";
import { checkIdempotency } from "@/lib/idempotency";
import { processSquareEvent, type SquareEvent } from "@/lib/webhook-handlers/square";
import { notifyWebhookFailure } from "@/lib/notifications/webhook-failure";

export const runtime = "nodejs";

function timingSafeEqual(a: string, b: string) {
  const abuf = Buffer.from(a, "utf8");
  const bbuf = Buffer.from(b, "utf8");
  if (abuf.length !== bbuf.length) return false;
  return crypto.timingSafeEqual(abuf, bbuf);
}

export async function GET() {
  return new NextResponse("ok", { status: 200 });
}

export async function POST(req: Request) {
  const bodyText = await req.text();
  let tenantId = resolveTenantId(req);

  // 署名検証に使うURL
  const signatureHeader = req.headers.get("x-square-hmacsha256-signature");
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  const verifyUrl = (notificationUrl || req.url.split("?")[0]).trim();

  // テナント逆引き: webhook_signature_keyで署名検証→テナント特定
  if (!tenantId && signatureHeader) {
    tenantId = await resolveSquareTenantBySignatureKey(bodyText, signatureHeader, verifyUrl);
  }
  if (!tenantId) {
    console.warn("[square/webhook] テナントID解決失敗 — DEFAULT_TENANT_IDにフォールバック");
    tenantId = DEFAULT_TENANT_ID;
  }
  const tid = tenantId ?? undefined;

  // Square設定を動的取得
  const sqConfig = await getActiveSquareAccount(tid);
  const signatureKey = sqConfig?.webhookSignatureKey || "";
  const squareToken = sqConfig?.accessToken || "";
  const squareEnv = sqConfig?.env || "production";

  if (signatureKey && !signatureHeader) {
    console.error("Square signature header missing; rejecting", {
      verifyUrl,
      bodyLen: bodyText.length,
      keyLen: signatureKey.length,
    });
    return new NextResponse("unauthorized", { status: 401 });
  } else if (signatureKey) {
    const payload = verifyUrl + bodyText;
    const expected = crypto.createHmac("sha256", signatureKey).update(payload, "utf8").digest("base64");
    const ok = timingSafeEqual(expected, signatureHeader || "");
    if (!ok) {
      console.error("Square signature mismatch", {
        expected,
        got: signatureHeader,
        verifyUrl,
        bodyLen: bodyText.length,
        keyLen: signatureKey.length,
      });
      return new NextResponse("unauthorized", { status: 401 });
    }
  }

  let event: SquareEvent | null = null;
  try { event = JSON.parse(bodyText); } catch (_) { /* ignore */ }

  const eventType = String(event?.type || "");
  const eventId = String(event?.event_id || event?.id || "");

  // 冪等チェック（ペイロード全体をoriginal_payloadとして保存）
  const idem = await checkIdempotency("square", eventId, tenantId, event);
  if (idem.duplicate) {
    return new NextResponse("ok", { status: 200 });
  }

  try {
    // 業務ロジック（リプレイ可能なハンドラに委譲）
    await processSquareEvent({ event: event!, tenantId, squareToken, squareEnv });
    await idem.markCompleted();
    return new NextResponse("ok", { status: 200 });
  } catch (err) {
    console.error("webhook handler error:", err instanceof Error ? err.stack || err.message : err);
    await idem.markFailed(err instanceof Error ? err.message : "unknown error");
    notifyWebhookFailure("square", eventId, err, tenantId ?? undefined).catch(() => {});
    return new NextResponse("ok", { status: 200 });
  }
}
export {};
