// lib/stripe.ts — Stripe SDKラッパー
// platform_settings から APIキーを取得、環境変数フォールバック

import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

let cachedClient: Stripe | null = null;
let cachedKeyHash: string | null = null;

/**
 * platform_settings テーブルから Stripe Secret Key を取得
 * 未設定時は環境変数 STRIPE_SECRET_KEY にフォールバック
 */
async function getStripeSecretKey(): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from("platform_settings")
      .select("value")
      .eq("key", "stripe_secret_key")
      .single();

    if (data?.value) return data.value;
  } catch {
    // DB未接続時は環境変数フォールバック
  }

  return process.env.STRIPE_SECRET_KEY || null;
}

/**
 * Stripe クライアントを取得
 * キー未設定時は null を返す（graceful degradation）
 * キーが変更された場合はクライアントを再生成
 */
export async function getStripeClient(): Promise<Stripe | null> {
  const key = await getStripeSecretKey();
  if (!key) return null;

  // キーが変更されていなければキャッシュを返す
  const keyHash = simpleHash(key);
  if (cachedClient && cachedKeyHash === keyHash) return cachedClient;

  cachedClient = new Stripe(key, {
    apiVersion: "2026-02-25.clover",
    typescript: true,
  });
  cachedKeyHash = keyHash;

  return cachedClient;
}

/**
 * Stripe Webhook署名を検証
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string,
): Promise<Stripe.Event | null> {
  const stripe = await getStripeClient();
  if (!stripe) return null;

  // Webhook Secret を取得
  let webhookSecret: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from("platform_settings")
      .select("value")
      .eq("key", "stripe_webhook_secret")
      .single();
    webhookSecret = data?.value || null;
  } catch {
    // フォールバック
  }

  if (!webhookSecret) {
    webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;
  }

  if (!webhookSecret) return null;

  try {
    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe] Webhook署名検証失敗:", err);
    return null;
  }
}

/**
 * Stripe接続テスト（アカウント情報取得）
 */
export async function testStripeConnection(): Promise<{
  ok: boolean;
  accountName?: string;
  error?: string;
}> {
  try {
    const stripe = await getStripeClient();
    if (!stripe) return { ok: false, error: "Stripe APIキーが設定されていません" };

    const account = await stripe.accounts.retrieve();
    return {
      ok: true,
      accountName: account.settings?.dashboard?.display_name || account.id,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "接続テストに失敗しました",
    };
  }
}

/** 簡易ハッシュ（キャッシュ比較用、セキュリティ目的ではない） */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}
