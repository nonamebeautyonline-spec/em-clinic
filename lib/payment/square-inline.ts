// lib/payment/square-inline.ts — Square Customers/Cards/Payments API ヘルパー（アプリ内決済用）
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";

/** Square APIエラーコードを日本語に変換 */
const SQUARE_ERROR_MAP: Record<string, string> = {
  // カード関連
  CARD_DECLINED: "カードが拒否されました。別のカードをお試しください。",
  GENERIC_DECLINE: "カードが拒否されました。別のカードをお試しください。",
  CARD_EXPIRED: "カードの有効期限が切れています。",
  INVALID_CARD: "カード情報が正しくありません。",
  CARD_NOT_SUPPORTED: "このカードはサポートされていません。",
  INVALID_CARD_DATA: "カード情報が正しくありません。",
  // 入力エラー
  CVV_FAILURE: "セキュリティコード（CVV）が正しくありません。",
  INVALID_EXPIRATION: "有効期限が正しくありません。",
  BAD_EXPIRATION: "有効期限が正しくありません。",
  EXPIRATION_FAILURE: "有効期限が正しくありません。",
  PAN_FAILURE: "カード番号が正しくありません。",
  INVALID_POSTAL_CODE: "郵便番号が正しくありません。",
  ADDRESS_VERIFICATION_FAILURE: "住所の確認に失敗しました。",
  // 残高・限度額
  INSUFFICIENT_FUNDS: "残高が不足しています。",
  AMOUNT_TOO_HIGH: "金額が取引上限を超えています。",
  AMOUNT_TOO_LOW: "金額が下限を下回っています。",
  TRANSACTION_LIMIT: "取引限度額を超えています。",
  // nonce/token
  CARD_TOKEN_EXPIRED: "カード情報の有効期限が切れました。ページを再読み込みしてお試しください。",
  CARD_TOKEN_USED: "カード情報が既に使用されています。ページを再読み込みしてお試しください。",
  // PIN
  ALLOWABLE_PIN_TRIES_EXCEEDED: "PINの入力回数が上限を超えました。",
  CHIP_INSERTION_REQUIRED: "ICチップの挿入が必要です。",
  // システム
  TEMPORARILY_UNAVAILABLE: "一時的に利用できません。しばらくしてから再度お試しください。",
  INVALID_ACCOUNT: "無効なアカウントです。",
};

/** Square APIエラーを日本語に変換 */
export function translateSquareError(errors: Array<{ code?: string; detail?: string }> | undefined): string {
  if (!errors || errors.length === 0) return "決済に失敗しました";

  const err = errors[0];
  // コードで翻訳マッチ
  if (err.code && SQUARE_ERROR_MAP[err.code]) {
    return SQUARE_ERROR_MAP[err.code];
  }
  // detail に "nonce" が含まれる場合（コードがなくてもキャッチ）
  if (err.detail?.toLowerCase().includes("nonce")) {
    return "カード情報の有効期限が切れました。ページを再読み込みしてお試しください。";
  }
  return "決済に失敗しました。時間をおいて再度お試しください。";
}

/** Square API 共通 fetch */
async function squareFetch(
  baseUrl: string,
  path: string,
  method: "GET" | "POST",
  token: string,
  body?: unknown,
) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Square-Version": "2024-04-17",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

/** 患者に紐づく Square Customer を取得 or 作成 */
export async function ensureSquareCustomer(
  baseUrl: string,
  accessToken: string,
  patientId: string,
  tenantId: string | null,
): Promise<string | null> {
  // 1. DB から既存の square_customer_id を確認
  const { data: patient } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("square_customer_id, name, tel")
      .eq("patient_id", patientId),
    tenantId,
  ).maybeSingle();

  if (patient?.square_customer_id) return patient.square_customer_id;

  // 2. Square Customers API で新規作成
  const { ok, json } = await squareFetch(baseUrl, "/v2/customers", "POST", accessToken, {
    idempotency_key: crypto.randomUUID(),
    reference_id: patientId,
    given_name: patient?.name || undefined,
    phone_number: patient?.tel || undefined,
  });

  if (!ok || !json?.customer?.id) {
    console.error("[square-inline] CreateCustomer failed:", json);
    return null;
  }

  const customerId = json.customer.id;

  // 3. DB に保存
  await withTenant(
    supabaseAdmin
      .from("patients")
      .update({ square_customer_id: customerId })
      .eq("patient_id", patientId),
    tenantId,
  );

  return customerId;
}

/** カードを保存（Cards API: CreateCard）— source_id は nonce or payment_id */
export async function saveCardOnFile(
  baseUrl: string,
  accessToken: string,
  patientId: string,
  sourceId: string,
  tenantId: string | null,
): Promise<string | null> {
  const customerId = await ensureSquareCustomer(baseUrl, accessToken, patientId, tenantId);
  if (!customerId) return null;

  const { ok, json } = await squareFetch(baseUrl, "/v2/cards", "POST", accessToken, {
    idempotency_key: crypto.randomUUID(),
    source_id: sourceId,
    card: {
      customer_id: customerId,
      reference_id: patientId,
    },
  });

  if (!ok || !json?.card?.id) {
    console.error("[square-inline] CreateCard failed:", json);
    return null;
  }

  const cardId = json.card.id;

  // DB に保存
  await withTenant(
    supabaseAdmin
      .from("patients")
      .update({ square_card_id: cardId })
      .eq("patient_id", patientId),
    tenantId,
  );

  return cardId;
}

/** Square Payments API で決済実行 */
export async function createSquarePayment(
  baseUrl: string,
  accessToken: string,
  params: {
    sourceId: string;
    amount: number;
    locationId: string;
    note: string;
    customerId?: string;
    idempotencyKey?: string;
  },
): Promise<{ ok: boolean; payment?: Record<string, unknown>; error?: string }> {
  // 冪等性キー: 呼び出し元から渡された場合はそれを使用（二重決済防止）
  const idempotencyKey = params.idempotencyKey || crypto.randomUUID();
  const { ok, json } = await squareFetch(baseUrl, "/v2/payments", "POST", accessToken, {
    idempotency_key: idempotencyKey,
    source_id: params.sourceId,
    amount_money: { amount: params.amount, currency: "JPY" },
    location_id: params.locationId,
    note: params.note,
    autocomplete: true,
    ...(params.customerId ? { customer_id: params.customerId } : {}),
  });

  if (!ok || !json?.payment?.id) {
    console.error("[square-inline] CreatePayment failed:", JSON.stringify(json, null, 2));
    return { ok: false, error: translateSquareError(json?.errors) };
  }

  return { ok: true, payment: json.payment };
}

/** reorder paid マーク（webhook + /api/square/pay で共有） */
export async function markReorderPaid(
  reorderId: string,
  patientId?: string,
  tenantId: string | null = null,
) {
  const idNum = Number(String(reorderId).trim());
  if (!Number.isFinite(idNum) || idNum < 2) {
    console.error("invalid reorderId for paid:", reorderId);
    return;
  }

  try {
    const paidPayload = { status: "paid" as const, paid_at: new Date().toISOString() };

    // 1) reorder_number で更新を試みる
    let query = withTenant(
      supabaseAdmin
        .from("reorders")
        .update(paidPayload)
        .eq("reorder_number", idNum)
        .eq("status", "confirmed"),
      tenantId,
    );
    if (patientId) query = query.eq("patient_id", patientId);

    const { data: updated, error: dbError } = await query.select("id");

    if (dbError) {
      console.error("[square-inline] reorder paid error:", dbError);
    } else if (updated && updated.length > 0) {
      console.log(`[square-inline] reorder paid success (reorder_number), row=${idNum}`);
    } else {
      // 2) reorder_number でヒットしなかった場合、id（SERIAL PK）でフォールバック
      console.warn(`[square-inline] reorder_number=${idNum} matched 0 rows, trying id fallback`);
      let fallback = withTenant(
        supabaseAdmin
          .from("reorders")
          .update(paidPayload)
          .eq("id", idNum)
          .eq("status", "confirmed"),
        tenantId,
      );
      if (patientId) fallback = fallback.eq("patient_id", patientId);

      const { data: fb, error: fbErr } = await fallback.select("id");
      if (fbErr) {
        console.error("[square-inline] reorder paid fallback error:", fbErr);
      } else if (fb && fb.length > 0) {
        console.log(`[square-inline] reorder paid success (id fallback), id=${idNum}`);
      } else {
        console.warn(`[square-inline] reorder paid: no rows matched (reorder_num=${idNum}, id=${idNum})`);
      }
    }
  } catch (dbErr) {
    console.error("[square-inline] reorder paid exception:", dbErr);
  }
}

/** Square API でカード詳細を取得 */
export async function getCardDetails(
  baseUrl: string,
  accessToken: string,
  cardId: string,
): Promise<{ ok: boolean; card?: Record<string, unknown> }> {
  const { ok, json } = await squareFetch(baseUrl, `/v2/cards/${cardId}`, "GET", accessToken);
  if (!ok || !json?.card) return { ok: false };
  return { ok: true, card: json.card };
}
