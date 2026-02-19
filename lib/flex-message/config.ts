// lib/flex-message/config.ts — FLEX通知メッセージ設定のDB読み書き
import { getSetting, setSetting } from "@/lib/settings";
import { DEFAULT_FLEX_CONFIG, type FlexMessageConfig } from "./types";

const CATEGORY = "flex" as any;
const SETTING_KEY = "config";

/** DB からFLEX設定を取得（なければデフォルト） */
export async function getFlexConfig(tenantId?: string): Promise<FlexMessageConfig> {
  const raw = await getSetting(CATEGORY, SETTING_KEY, tenantId);
  if (!raw) return DEFAULT_FLEX_CONFIG;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_FLEX_CONFIG,
      ...parsed,
      colors: { ...DEFAULT_FLEX_CONFIG.colors, ...parsed.colors },
      reservation: { ...DEFAULT_FLEX_CONFIG.reservation, ...parsed.reservation },
      shipping: { ...DEFAULT_FLEX_CONFIG.shipping, ...parsed.shipping },
    };
  } catch {
    return DEFAULT_FLEX_CONFIG;
  }
}

/** DB にFLEX設定を保存 */
export async function setFlexConfig(config: Partial<FlexMessageConfig>, tenantId?: string): Promise<boolean> {
  const current = await getFlexConfig(tenantId);
  const merged: FlexMessageConfig = {
    ...current,
    ...config,
    colors: { ...current.colors, ...(config.colors || {}) },
    reservation: { ...current.reservation, ...(config.reservation || {}) },
    shipping: { ...current.shipping, ...(config.shipping || {}) },
  };
  return setSetting(CATEGORY, SETTING_KEY, JSON.stringify(merged), tenantId);
}
