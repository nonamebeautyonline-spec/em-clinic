// lib/shipping/config.ts — 配送設定のDB読み書き
import { getSetting, setSetting } from "@/lib/settings";
import { DEFAULT_SHIPPING_CONFIG, type ShippingConfig, type YamatoConfig } from "./types";

const SETTING_KEY = "shipping_config";

/** DB から配送設定を取得（なければデフォルト） */
export async function getShippingConfig(tenantId?: string): Promise<ShippingConfig> {
  const raw = await getSetting("general", SETTING_KEY, tenantId);
  if (!raw) return DEFAULT_SHIPPING_CONFIG;
  try {
    const parsed = JSON.parse(raw);
    // デフォルト値とマージ（新しいフィールドが追加された場合の互換性）
    return {
      ...DEFAULT_SHIPPING_CONFIG,
      ...parsed,
      yamato: { ...DEFAULT_SHIPPING_CONFIG.yamato, ...parsed.yamato },
      japanpost: { ...DEFAULT_SHIPPING_CONFIG.japanpost, ...parsed.japanpost },
    };
  } catch {
    return DEFAULT_SHIPPING_CONFIG;
  }
}

/** DB に配送設定を保存 */
export async function setShippingConfig(config: Partial<ShippingConfig>, tenantId?: string): Promise<boolean> {
  const current = await getShippingConfig(tenantId);
  const merged = {
    ...current,
    ...config,
    yamato: { ...current.yamato, ...(config.yamato || {}) },
    japanpost: { ...current.japanpost, ...(config.japanpost || {}) },
  };
  return setSetting("general", SETTING_KEY, JSON.stringify(merged), tenantId);
}

/** ヤマト設定のみ取得（フォーマッター向け） */
export async function getYamatoConfig(tenantId?: string): Promise<YamatoConfig> {
  const config = await getShippingConfig(tenantId);
  return config.yamato;
}
