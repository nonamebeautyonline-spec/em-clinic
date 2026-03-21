// lib/purchase/config.ts — 購入画面設定のDB読み書き
import { getSetting, setSetting } from "@/lib/settings";
import { DEFAULT_PURCHASE_CONFIG, type PurchaseConfig } from "./types";

const CATEGORY = "purchase" as const;
const SETTING_KEY = "config";

/** DB から購入画面設定を取得（なければデフォルト） */
export async function getPurchaseConfig(tenantId?: string): Promise<PurchaseConfig> {
  const raw = await getSetting(CATEGORY, SETTING_KEY, tenantId);
  if (!raw) return DEFAULT_PURCHASE_CONFIG;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PURCHASE_CONFIG,
      ...parsed,
      // groups は配列なのでマージではなく上書き（存在する場合のみ）
      groups: parsed.groups ?? DEFAULT_PURCHASE_CONFIG.groups,
    };
  } catch {
    return DEFAULT_PURCHASE_CONFIG;
  }
}

/** DB に購入画面設定を保存 */
export async function setPurchaseConfig(config: Partial<PurchaseConfig>, tenantId?: string): Promise<boolean> {
  const current = await getPurchaseConfig(tenantId);
  const merged: PurchaseConfig = {
    ...current,
    ...config,
    // groups は配列なので丸ごと上書き
    groups: config.groups ?? current.groups,
  };
  return setSetting(CATEGORY, SETTING_KEY, JSON.stringify(merged), tenantId);
}
