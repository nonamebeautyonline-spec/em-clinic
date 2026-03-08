// app/api/gmo/webhook/route.ts — GMO PG 結果通知エンドポイント
import { NextResponse } from "next/server";
import crypto from "crypto";
import { resolveTenantId } from "@/lib/tenant";
import { checkIdempotency } from "@/lib/idempotency";
import { getSettingOrEnv } from "@/lib/settings";
import { processGmoEvent } from "@/lib/webhook-handlers/gmo";

export const runtime = "nodejs";

/** ClientField1 からメタデータをパース */
function parseClientField(field: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of field.split(";")) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const k = part.slice(0, idx);
    const v = part.slice(idx + 1);
    if (k && v) {
      const keyMap: Record<string, string> = {
        PID: "patientId",
        Product: "productCode",
        Mode: "mode",
        Reorder: "reorderId",
      };
      result[keyMap[k] || k] = v;
    }
  }
  return result;
}

/** GMO PG 結果通知の署名検証（CheckStringパラメータ） */
function verifyGmoSignature(params: URLSearchParams, shopPass: string): boolean {
  if (!shopPass) return true;
  const checkString = params.get("CheckString") || "";
  if (!checkString) return true;
  const shopId = params.get("ShopID") || "";
  const orderId = params.get("OrderID") || "";
  const status = params.get("Status") || "";
  const amount = params.get("Amount") || "";
  const accessId = params.get("AccessID") || "";
  const raw = `${shopId}${orderId}${status}${amount}${accessId}${shopPass}`;
  const hash = crypto.createHash("sha256").update(raw, "utf8").digest("hex");
  return hash === checkString;
}

export async function GET() {
  return new NextResponse("ok", { status: 200 });
}

export async function POST(req: Request) {
  try {
    const tenantId = resolveTenantId(req);
    const tid = tenantId ?? undefined;
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    // 署名検証
    const shopPass = (await getSettingOrEnv("gmo", "shop_pass", "GMO_SHOP_PASS", tid)) || "";
    if (!verifyGmoSignature(params, shopPass)) {
      console.error("[gmo/webhook] 署名検証失敗");
      return new NextResponse("unauthorized", { status: 401 });
    }

    const orderId = params.get("OrderID") || "";
    const status = params.get("Status") || "";
    const amount = params.get("Amount") || "";
    const accessId = params.get("AccessID") || "";

    const clientField1 = params.get("ClientField1") || "";
    const clientField2 = params.get("ClientField2") || "";

    const meta = parseClientField(clientField1);
    const patientId = meta.patientId || "";
    const productCode = meta.productCode || "";
    const reorderId = meta.reorderId || "";

    console.log("[gmo/webhook] 結果通知受信:", {
      orderId,
      status,
      amount,
      patientId: patientId ? `${patientId.slice(0, 8)}...` : "",
    });

    // 冪等チェック
    const idempotencyKey = `${accessId || orderId}_${status}`;
    const idem = await checkIdempotency("gmo", idempotencyKey, tenantId, { orderId, status, amount, patientId, productCode, reorderId, productName: clientField2 });
    if (idem.duplicate) {
      return new NextResponse("ok", { status: 200 });
    }

    // 業務ロジック（リプレイ可能なハンドラに委譲）
    await processGmoEvent({
      status,
      orderId,
      amount,
      accessId,
      patientId,
      productCode,
      productName: clientField2,
      reorderId,
      tenantId,
    });

    await idem.markCompleted();
    return new NextResponse("ok", { status: 200 });
  } catch (err) {
    const e = err instanceof Error ? err : null;
    console.error("[gmo/webhook] handler error:", e?.stack || e?.message || err);
    return new NextResponse("ok", { status: 200 });
  }
}
