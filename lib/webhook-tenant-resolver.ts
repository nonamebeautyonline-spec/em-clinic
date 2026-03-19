// lib/webhook-tenant-resolver.ts — webhook受信時のテナント逆引き基盤
// tenant_settings から秘密情報を全テナント分取得し、値→テナントIDのマッピングで逆引きする
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { decrypt } from "@/lib/crypto";
import type { SettingCategory } from "@/lib/settings";

// キャッシュ: カテゴリ+キー → { tenantId → 復号済み値 } のマッピング
type CacheEntry = {
  map: Map<string, string>; // tenantId → decrypted value
  expiresAt: number;
};
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5分

/** キャッシュキー生成 */
function cacheKey(category: string, key: string): string {
  return `${category}:${key}`;
}

/**
 * tenant_settings から指定カテゴリ・キーの全テナント分を取得し、
 * tenantId → 復号済み値 のMapを返す（5分キャッシュ付き）
 */
async function getAllTenantValues(
  category: SettingCategory,
  key: string
): Promise<Map<string, string>> {
  const ck = cacheKey(category, key);
  const cached = cache.get(ck);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.map;
  }

  const map = new Map<string, string>();
  try {
    const { data, error } = await supabaseAdmin
      .from("tenant_settings")
      .select("tenant_id, value")
      .eq("category", category)
      .eq("key", key);

    if (error || !data) return map;

    for (const row of data) {
      if (!row.tenant_id || !row.value) continue;
      let decrypted: string;
      try {
        decrypted = decrypt(row.value);
      } catch {
        // 暗号化前のデータはそのまま使用
        decrypted = row.value;
      }
      map.set(row.tenant_id, decrypted);
    }
  } catch (e) {
    console.error(`[webhook-tenant-resolver] getAllTenantValues失敗: ${category}/${key}`, e);
    return map;
  }

  cache.set(ck, { map, expiresAt: Date.now() + CACHE_TTL_MS });
  return map;
}

/**
 * テナント設定の値でテナントIDを逆引きする（完全一致）
 * GMO（shop_id）、Stripe（webhook_secret）等の単純マッチング用
 */
export async function resolveWebhookTenant(
  category: SettingCategory,
  key: string,
  matchValue: string
): Promise<string | null> {
  if (!matchValue) return null;

  const map = await getAllTenantValues(category, key);
  if (map.size === 0) return null;

  for (const [tenantId, value] of map) {
    if (value === matchValue) return tenantId;
  }

  return null;
}

/**
 * LINE webhook用: 全テナントのchannel_secretで署名検証し、一致するテナントを特定
 * LINE webhookはsecretそのものがリクエストに含まれないため、
 * HMAC署名を各テナントのsecretで試行して一致を探す
 */
export async function resolveLineTenantBySignature(
  rawBody: string,
  signature: string
): Promise<string | null> {
  if (!rawBody || !signature) return null;

  // messaging channel_secret と notify channel_secret の両方を取得
  const messagingSecrets = await getAllTenantValues("line", "channel_secret");
  const notifySecrets = await getAllTenantValues("line", "notify_channel_secret");

  // 全テナントのsecretを集約: tenantId → secret[]
  const tenantSecrets = new Map<string, string[]>();

  for (const [tenantId, secret] of messagingSecrets) {
    if (!tenantSecrets.has(tenantId)) tenantSecrets.set(tenantId, []);
    tenantSecrets.get(tenantId)!.push(secret);
  }
  for (const [tenantId, secret] of notifySecrets) {
    if (!tenantSecrets.has(tenantId)) tenantSecrets.set(tenantId, []);
    tenantSecrets.get(tenantId)!.push(secret);
  }

  for (const [tenantId, secrets] of tenantSecrets) {
    for (const secret of secrets) {
      const hash = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("base64");
      if (
        hash.length === signature.length &&
        crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
      ) {
        return tenantId;
      }
    }
  }

  return null;
}

/**
 * Square webhook用: square_accounts JSON内のwebhook_signature_keyで全テナント検索
 * Square設定はaccounts JSON配列として保存されているため、専用ロジックが必要
 */
export async function resolveSquareTenantBySignatureKey(
  bodyText: string,
  signatureHeader: string,
  notificationUrl: string
): Promise<string | null> {
  if (!signatureHeader || !bodyText) return null;

  const accountsMap = await getAllTenantValues("square", "accounts");
  const verifyUrl = notificationUrl.trim();

  for (const [tenantId, accountsJson] of accountsMap) {
    try {
      const accounts = JSON.parse(accountsJson);
      for (const account of accounts) {
        const sigKey = account.webhook_signature_key;
        if (!sigKey) continue;

        const payload = verifyUrl + bodyText;
        const expected = crypto
          .createHmac("sha256", sigKey)
          .update(payload, "utf8")
          .digest("base64");
        const abuf = Buffer.from(expected, "utf8");
        const bbuf = Buffer.from(signatureHeader, "utf8");
        if (abuf.length === bbuf.length && crypto.timingSafeEqual(abuf, bbuf)) {
          return tenantId;
        }
      }
    } catch {
      // JSONパース失敗はスキップ
    }
  }

  // 旧形式: 個別キーのwebhook_signature_keyも検索
  const legacyKeys = await getAllTenantValues("square", "webhook_signature_key");
  for (const [tenantId, sigKey] of legacyKeys) {
    if (!sigKey) continue;
    const payload = verifyUrl + bodyText;
    const expected = crypto
      .createHmac("sha256", sigKey)
      .update(payload, "utf8")
      .digest("base64");
    const abuf = Buffer.from(expected, "utf8");
    const bbuf = Buffer.from(signatureHeader, "utf8");
    if (abuf.length === bbuf.length && crypto.timingSafeEqual(abuf, bbuf)) {
      return tenantId;
    }
  }

  return null;
}

/** テスト用: キャッシュをクリア */
export function clearWebhookTenantCache(): void {
  cache.clear();
}
