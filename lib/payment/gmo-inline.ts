// lib/payment/gmo-inline.ts — GMO PG インライン決済ヘルパー
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";
import { GmoPaymentProvider } from "./gmo";

// 共通ロジックの再エクスポート
export { markReorderPaid } from "./square-inline";

/** tenantId付きのGmoPaymentProviderを生成 */
function getGmo(tenantId?: string | null) {
  return new GmoPaymentProvider(tenantId ?? undefined);
}

/** GMO PG エラーコードを日本語に変換 */
const GMO_ERROR_MAP: Record<string, string> = {
  // カード拒否系
  "42G020000": "カードが拒否されました。別のカードをお試しください。",
  "42G030000": "カードが拒否されました。別のカードをお試しください。",
  "42G040000": "カードが拒否されました。別のカードをお試しください。",
  "42G050000": "カードが拒否されました。別のカードをお試しください。",
  "42G060000": "カードが拒否されました。別のカードをお試しください。",
  "42G070000": "カードが拒否されました。別のカードをお試しください。",
  // カード無効
  "42G100000": "このカードはご利用いただけません。",
  "42G120000": "このカードはご利用いただけません。",
  // 有効期限
  "42G220000": "カードの有効期限が切れています。",
  "42G300000": "カードの有効期限が正しくありません。",
  // セキュリティコード
  "42G440000": "セキュリティコードが正しくありません。",
  "42G450000": "セキュリティコードが正しくありません。",
  // 残高・限度額
  "42G560000": "残高が不足しています。",
  "42G540000": "取引限度額を超えています。",
  "42G950000": "取引限度額を超えています。",
  // 暗証番号
  "42G830000": "暗証番号が正しくありません。",
  // 3Dセキュア失敗
  "42G780000": "本人認証（3Dセキュア）に失敗しました。再度お試しください。",
  // カード会社不通
  "42G010000": "カード会社との通信に失敗しました。しばらくしてから再度お試しください。",
  // 不正利用検知
  "42G550000": "セキュリティ上の理由によりこの取引は拒否されました。",
  // 入力エラー系（E01系）
  "E01040010": "カード番号を入力してください。",
  "E01050010": "有効期限を入力してください。",
  "E01060010": "セキュリティコードを入力してください。",
  "E01040011": "カード番号が正しくありません。",
  "E01050011": "有効期限の形式が正しくありません。",
  "E01060011": "セキュリティコードの形式が正しくありません。",
};

export function translateGmoError(errInfo: string | undefined): string {
  if (!errInfo) return "決済に失敗しました";
  for (const [code, msg] of Object.entries(GMO_ERROR_MAP)) {
    if (errInfo.includes(code)) return msg;
  }
  return "決済に失敗しました。時間をおいて再度お試しください。";
}

/** GMO OrderID生成（最大27文字、半角英数字とハイフンのみ） */
export function generateOrderId(): string {
  return `o${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`.slice(0, 27);
}

/** 患者のGMO会員IDを確保（DB確認→なければ登録） */
export async function ensureGmoMember(
  patientId: string,
  tenantId: string | null,
): Promise<string> {
  // DBから既存のgmo_member_idを確認
  const { data: patient } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("gmo_member_id")
      .eq("patient_id", patientId),
    tenantId,
  ).maybeSingle();

  if (patient?.gmo_member_id) return patient.gmo_member_id;

  // GMO会員登録（MemberID = patientId）
  const memberId = patientId;
  await getGmo(tenantId).saveMember(memberId);

  // DBに保存
  await withTenant(
    supabaseAdmin
      .from("patients")
      .update({ gmo_member_id: memberId })
      .eq("patient_id", patientId),
    tenantId,
  );

  return memberId;
}

/** トークンでカードを保存 */
export async function saveGmoCard(
  patientId: string,
  token: string,
  tenantId: string | null,
): Promise<string | null> {
  try {
    const memberId = await ensureGmoMember(patientId, tenantId);
    const { cardSeq } = await getGmo(tenantId).saveCard(memberId, token);

    // DBに保存
    await withTenant(
      supabaseAdmin
        .from("patients")
        .update({ gmo_card_seq: cardSeq })
        .eq("patient_id", patientId),
      tenantId,
    );

    return cardSeq;
  } catch (e) {
    console.error("[gmo-inline] saveGmoCard failed:", e);
    return null;
  }
}

/** トークンでGMO決済実行 */
export async function createGmoPayment(params: {
  token: string;
  amount: number;
  patientId: string;
  productCode: string;
  mode?: string;
  reorderId?: string;
  couponId?: string;
  campaignId?: string;
  retUrl?: string;
  tenantId?: string | null;
}): Promise<{ ok: boolean; orderId?: string; error?: string; needs3ds?: boolean; acsUrl?: string; accessId?: string; accessPass?: string }> {
  const orderId = generateOrderId();
  const pg = getGmo(params.tenantId);

  const clientField1 = [
    `PID:${params.patientId}`,
    `Product:${params.productCode}`,
    params.mode ? `Mode:${params.mode}` : "",
    params.reorderId ? `Reorder:${params.reorderId}` : "",
    params.couponId ? `Coupon:${params.couponId}` : "",
    params.campaignId ? `Campaign:${params.campaignId}` : "",
  ].filter(Boolean).join(";").slice(0, 100);

  try {
    // Step 1: 取引登録
    const { accessId, accessPass } = await pg.entryTran({ orderId, amount: params.amount });

    // Step 2: 決済実行（トークン）
    const execRes = await pg.execTranToken({
      accessId,
      accessPass,
      orderId,
      token: params.token,
      amount: params.amount,
      clientField1,
      clientField2: params.productCode,
      clientField3: orderId,
      retUrl: params.retUrl,
    });

    if (execRes.ErrCode) {
      console.error("[gmo-inline] ExecTran failed:", execRes.ErrCode, execRes.ErrInfo);
      return { ok: false, error: translateGmoError(execRes.ErrInfo) };
    }

    // 3DS認証が必要な場合
    if (execRes.ACS === "1" || execRes.RedirectUrl) {
      return {
        ok: false,
        needs3ds: true,
        acsUrl: execRes.RedirectUrl || execRes.AcsUrl,
        accessId,
        accessPass,
        orderId,
      };
    }

    return { ok: true, orderId };
  } catch (e) {
    console.error("[gmo-inline] createGmoPayment error:", e);
    return { ok: false, error: e instanceof Error ? e.message : "決済処理でエラーが発生しました" };
  }
}

/** 保存済みカードで決済実行 */
export async function createGmoPaymentWithSavedCard(params: {
  memberId: string;
  cardSeq: string;
  amount: number;
  patientId: string;
  productCode: string;
  mode?: string;
  reorderId?: string;
  couponId?: string;
  campaignId?: string;
  retUrl?: string;
  tenantId?: string | null;
}): Promise<{ ok: boolean; orderId?: string; error?: string; needs3ds?: boolean; acsUrl?: string; accessId?: string; accessPass?: string }> {
  const orderId = generateOrderId();
  const pg = getGmo(params.tenantId);

  const clientField1 = [
    `PID:${params.patientId}`,
    `Product:${params.productCode}`,
    params.mode ? `Mode:${params.mode}` : "",
    params.reorderId ? `Reorder:${params.reorderId}` : "",
    params.couponId ? `Coupon:${params.couponId}` : "",
    params.campaignId ? `Campaign:${params.campaignId}` : "",
  ].filter(Boolean).join(";").slice(0, 100);

  try {
    const { accessId, accessPass } = await pg.entryTran({ orderId, amount: params.amount });

    const execRes = await pg.execTranWithMember({
      accessId,
      accessPass,
      orderId,
      memberId: params.memberId,
      cardSeq: params.cardSeq,
      amount: params.amount,
      clientField1,
      clientField2: params.productCode,
      clientField3: orderId,
      retUrl: params.retUrl,
    });

    if (execRes.ErrCode) {
      console.error("[gmo-inline] ExecTranWithMember failed:", execRes.ErrCode, execRes.ErrInfo);
      return { ok: false, error: translateGmoError(execRes.ErrInfo) };
    }

    if (execRes.ACS === "1" || execRes.RedirectUrl) {
      return {
        ok: false,
        needs3ds: true,
        acsUrl: execRes.RedirectUrl || execRes.AcsUrl,
        accessId,
        accessPass,
        orderId,
      };
    }

    return { ok: true, orderId };
  } catch (e) {
    console.error("[gmo-inline] createGmoPaymentWithSavedCard error:", e);
    return { ok: false, error: e instanceof Error ? e.message : "決済処理でエラーが発生しました" };
  }
}

/** 保存済みカード情報を取得 */
export async function getGmoSavedCard(
  patientId: string,
  tenantId: string | null,
): Promise<{ hasCard: boolean; cardSeq?: string; last4?: string; brand?: string }> {
  const { data: patient } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("gmo_member_id, gmo_card_seq")
      .eq("patient_id", patientId),
    tenantId,
  ).maybeSingle();

  if (!patient?.gmo_member_id) return { hasCard: false };

  try {
    const card = await getGmo(tenantId).searchCard(patient.gmo_member_id);
    if (!card.hasCard) return { hasCard: false };

    // cardNo は "****1234" 形式
    const last4 = card.cardNo?.replace(/\*/g, "").slice(-4);

    return {
      hasCard: true,
      cardSeq: card.cardSeq,
      last4,
      brand: card.brand,
    };
  } catch (e) {
    console.error("[gmo-inline] getGmoSavedCard error:", e);
    return { hasCard: false };
  }
}
