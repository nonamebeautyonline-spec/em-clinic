// app/api/gmo/webhook/route.ts — GMO PG 結果通知エンドポイント
import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { normalizeJPPhone } from "@/lib/phone";
import { createReorderPaymentKarte } from "@/lib/reorder-karte";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { evaluateMenuRules } from "@/lib/menu-auto-rules";
import { checkIdempotency } from "@/lib/idempotency";
import { getSettingOrEnv } from "@/lib/settings";

export const runtime = "nodejs";

/**
 * GMO PG は決済完了時に POST（application/x-www-form-urlencoded）で結果通知を送信
 * 通知パラメータ例:
 *   ShopID, OrderID, Status, Amount, AccessID, AccessPass,
 *   ClientField1 (メタデータ), ClientField2 (商品名), ClientField3 (注文ID)
 */

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
  // 段階導入: ShopPass未設定ならスキップ
  if (!shopPass) return true;

  const checkString = params.get("CheckString") || "";
  if (!checkString) return true; // CheckStringなし = 旧形式の通知

  const shopId = params.get("ShopID") || "";
  const orderId = params.get("OrderID") || "";
  const status = params.get("Status") || "";
  const amount = params.get("Amount") || "";
  const accessId = params.get("AccessID") || "";

  // GMO PGの検証用文字列: ShopID + OrderID + Status + Amount + AccessID + ShopPass
  const raw = `${shopId}${orderId}${status}${amount}${accessId}${shopPass}`;
  const hash = crypto.createHash("sha256").update(raw, "utf8").digest("hex");

  return hash === checkString;
}

/** 再処方を決済済みに更新 */
async function markReorderPaid(reorderId: string, patientId: string | undefined, tenantId: string | null) {
  const idNum = Number(String(reorderId).trim());
  if (!Number.isFinite(idNum) || idNum < 2) {
    console.error("[gmo/webhook] invalid reorderId for paid:", reorderId);
    return;
  }

  try {
    const paidPayload = { status: "paid" as const, paid_at: new Date().toISOString() };

    // reorder_number でマッチング → ダメなら id でフォールバック
    let query = withTenant(
      supabaseAdmin
        .from("reorders")
        .update(paidPayload)
        .eq("reorder_number", idNum)
        .eq("status", "confirmed"),
      tenantId
    );
    if (patientId) query = query.eq("patient_id", patientId);

    const { data: updated, error: dbError } = await query.select("id");

    if (dbError) {
      console.error("[gmo/webhook] Supabase reorder paid error:", dbError);
    } else if (updated && updated.length > 0) {
      console.log(`[gmo/webhook] reorder paid success (reorder_number), row=${idNum}`);
    } else {
      // id でフォールバック
      let fallback = withTenant(
        supabaseAdmin
          .from("reorders")
          .update(paidPayload)
          .eq("id", idNum)
          .eq("status", "confirmed"),
        tenantId
      );
      if (patientId) fallback = fallback.eq("patient_id", patientId);

      const { data: fb, error: fbErr } = await fallback.select("id");
      if (fbErr) {
        console.error("[gmo/webhook] reorder paid fallback error:", fbErr);
      } else if (fb && fb.length > 0) {
        console.log(`[gmo/webhook] reorder paid success (id fallback), id=${idNum}`);
      } else {
        console.warn(`[gmo/webhook] reorder paid: no rows matched (reorder_num=${idNum}, id=${idNum})`);
      }
    }
  } catch (dbErr) {
    console.error("[gmo/webhook] reorder paid exception:", dbErr);
  }
}

export async function GET() {
  return new NextResponse("ok", { status: 200 });
}

export async function POST(req: Request) {
  // GMO は常に200を返す（リトライ防止）
  try {
    const tenantId = resolveTenantId(req);
    const tid = tenantId ?? undefined;
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    // 署名検証（段階導入: ShopPass未設定ならスキップ）
    const shopPass = (await getSettingOrEnv("gmo", "shop_pass", "GMO_SHOP_PASS", tid)) || "";
    if (!verifyGmoSignature(params, shopPass)) {
      console.error("[gmo/webhook] 署名検証失敗");
      return new NextResponse("unauthorized", { status: 401 });
    }

    const orderId = params.get("OrderID") || "";
    const status = params.get("Status") || "";
    const amount = params.get("Amount") || "";
    const accessId = params.get("AccessID") || "";

    // ClientField からメタデータを復元
    const clientField1 = params.get("ClientField1") || "";
    const clientField2 = params.get("ClientField2") || ""; // 商品名
    const clientField3 = params.get("ClientField3") || ""; // 注文ID

    const meta = parseClientField(clientField1);
    const patientId = meta.patientId || "";
    const productCode = meta.productCode || "";
    const mode = meta.mode || "";
    const reorderId = meta.reorderId || "";

    console.log("[gmo/webhook] 結果通知受信:", {
      orderId,
      status,
      amount,
      patientId: patientId ? `${patientId.slice(0, 8)}...` : "",
      mode,
    });

    // 冪等チェック: AccessID×Statusで重複処理を防止
    const idempotencyKey = `${accessId || orderId}_${status}`;
    const idem = await checkIdempotency("gmo", idempotencyKey, tenantId, { orderId, status, amount });
    if (idem.duplicate) {
      return new NextResponse("ok", { status: 200 });
    }

    // ---- 決済完了（CAPTURE / SALES） ----
    if (status === "CAPTURE" || status === "SALES") {
      const paymentId = accessId || orderId;
      const amountNum = amount ? parseFloat(amount) : 0;
      const paidAt = new Date().toISOString();

      // 再処方の場合: reorder を paid に更新 + カルテ自動作成
      if (reorderId) {
        await markReorderPaid(reorderId, patientId, tenantId);

        if (patientId && productCode) {
          try {
            await createReorderPaymentKarte(patientId, productCode, paidAt, undefined, tenantId ?? undefined);
          } catch (karteErr) {
            console.error("[gmo/webhook] reorder payment karte error:", karteErr);
          }
        }
      }

      // orders テーブルに INSERT / UPDATE
      if (patientId) {
        try {
          const { data: existingOrder } = await withTenant(
            supabaseAdmin
              .from("orders")
              .select("id, tracking_number")
              .eq("id", paymentId)
              .maybeSingle(),
            tenantId
          );

          if (existingOrder) {
            // 既存注文 → shipping情報を保持して更新
            const { error } = await withTenant(
              supabaseAdmin
                .from("orders")
                .update({
                  patient_id: patientId,
                  product_code: productCode || null,
                  product_name: clientField2 || null,
                  amount: amountNum,
                  paid_at: paidAt,
                  payment_status: "COMPLETED",
                  payment_method: "credit_card",
                  status: "confirmed",
                })
                .eq("id", paymentId),
              tenantId
            );

            if (error) {
              console.error("[gmo/webhook] orders update failed:", error);
            } else {
              console.log("[gmo/webhook] orders updated:", paymentId);
            }
          } else {
            // 新規注文
            const { error } = await supabaseAdmin.from("orders").insert({
              ...tenantPayload(tenantId),
              id: paymentId,
              patient_id: patientId,
              product_code: productCode || null,
              product_name: clientField2 || null,
              amount: amountNum,
              paid_at: paidAt,
              shipping_status: "pending",
              payment_status: "COMPLETED",
              payment_method: "credit_card",
              status: "confirmed",
            });

            if (error) {
              console.error("[gmo/webhook] orders insert failed:", error);
            } else {
              console.log("[gmo/webhook] orders inserted:", paymentId);
            }
          }
        } catch (err) {
          console.error("[gmo/webhook] orders Supabase error:", err);
        }

        // キャッシュ削除
        await invalidateDashboardCache(patientId);

        // リッチメニュー自動切替（fire-and-forget）
        evaluateMenuRules(patientId, tenantId ?? undefined).catch(() => {});
      }

      await idem.markCompleted();
      return new NextResponse("ok", { status: 200 });
    }

    // ---- 返金（RETURN / RETURNX） ----
    if (status === "RETURN" || status === "RETURNX") {
      const paymentId = accessId || orderId;
      const refundedAmount = amount ? parseFloat(amount) : null;

      try {
        const { error: updateErr } = await withTenant(
          supabaseAdmin
            .from("orders")
            .update({
              refund_status: "COMPLETED",
              refunded_amount: refundedAmount,
              refunded_at: new Date().toISOString(),
              status: "refunded",
            })
            .eq("id", paymentId),
          tenantId
        );

        if (updateErr) {
          console.error("[gmo/webhook] refund update failed:", updateErr);
        } else {
          console.log("[gmo/webhook] refund updated:", paymentId, status);
        }
      } catch (e) {
        console.error("[gmo/webhook] refund Supabase error:", e);
      }

      // キャッシュ削除
      if (patientId) {
        await invalidateDashboardCache(patientId);
      }

      await idem.markCompleted();
      return new NextResponse("ok", { status: 200 });
    }

    // ---- キャンセル（CANCEL / VOID） ----
    if (status === "CANCEL" || status === "VOID") {
      const paymentId = accessId || orderId;

      try {
        const { error: updateErr } = await withTenant(
          supabaseAdmin
            .from("orders")
            .update({
              refund_status: "CANCELLED",
              refunded_at: new Date().toISOString(),
              status: "refunded",
            })
            .eq("id", paymentId),
          tenantId
        );

        if (updateErr) {
          console.error("[gmo/webhook] cancel update failed:", updateErr);
        } else {
          console.log("[gmo/webhook] cancel updated:", paymentId, status);
        }
      } catch (e) {
        console.error("[gmo/webhook] cancel Supabase error:", e);
      }

      if (patientId) {
        await invalidateDashboardCache(patientId);
      }

      await idem.markCompleted();
      return new NextResponse("ok", { status: 200 });
    }

    // 未対応ステータス
    console.warn("[gmo/webhook] 未対応ステータス:", status, { orderId });
    await idem.markCompleted();
    return new NextResponse("ok", { status: 200 });
  } catch (err: any) {
    console.error("[gmo/webhook] handler error:", err?.stack || err?.message || err);
    // GMO には200返してリトライを防止
    return new NextResponse("ok", { status: 200 });
  }
}
