// lib/stripe-connect.ts — Stripe Connect Express OAuthフロー
// Square OAuthと同パターン: state = base64url(JSON({tenantId, ts})), 10分有効期限

import { getStripeClient } from "@/lib/stripe";

/**
 * Stripe Connect Express アカウント作成 + オンボーディングURL生成
 * Express型 = プラットフォーム決済の推奨方式
 * テナントがStripeアカウントを持っていなくても、Express接続で新規作成できる
 */
export async function createStripeConnectUrl(tenantId: string): Promise<{
  connectUrl: string;
  accountId: string;
}> {
  const stripe = await getStripeClient();
  if (!stripe) throw new Error("Stripe未設定");

  // state: tenantId + タイムスタンプ（10分有効）
  const state = Buffer.from(
    JSON.stringify({ tenantId, ts: Date.now() })
  ).toString("base64url");

  // Connected Account作成（Express型）
  const account = await stripe.accounts.create({
    type: "express",
    country: "JP",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: "company",
  });

  // アカウントリンク（オンボーディングURL）生成
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://admin.l-ope.jp";
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${origin}/api/admin/stripe-connect/refresh?state=${state}&account_id=${account.id}`,
    return_url: `${origin}/api/admin/stripe-connect/callback?state=${state}&account_id=${account.id}`,
    type: "account_onboarding",
  });

  return { connectUrl: accountLink.url, accountId: account.id };
}

/**
 * stateデコード + 有効期限チェック（10分）
 */
export function decodeStripeState(state: string): { tenantId: string; ts: number } {
  const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  const age = Date.now() - decoded.ts;
  if (age > 10 * 60 * 1000) throw new Error("stateの有効期限切れ");
  return decoded;
}

/**
 * Stripe Connectアカウントの状態確認
 */
export async function getConnectAccountStatus(accountId: string): Promise<{
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}> {
  const stripe = await getStripeClient();
  if (!stripe) throw new Error("Stripe未設定");

  const account = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  };
}

/**
 * 既存アカウントのオンボーディングURLを再生成（中断時のリフレッシュ用）
 */
export async function refreshStripeAccountLink(
  accountId: string,
  tenantId: string
): Promise<string> {
  const stripe = await getStripeClient();
  if (!stripe) throw new Error("Stripe未設定");

  // 新しいstateを生成
  const state = Buffer.from(
    JSON.stringify({ tenantId, ts: Date.now() })
  ).toString("base64url");

  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://admin.l-ope.jp";
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/api/admin/stripe-connect/refresh?state=${state}&account_id=${accountId}`,
    return_url: `${origin}/api/admin/stripe-connect/callback?state=${state}&account_id=${accountId}`,
    type: "account_onboarding",
  });

  return accountLink.url;
}
