// lib/legal/config.ts — 利用規約・PPのDB読み書き
import { getSetting, setSetting } from "@/lib/settings";
import { DEFAULT_LEGAL_CONFIG, type LegalConfig } from "./types";

const SETTING_KEY = "legal_config";

/** DB から利用規約設定を取得（なければデフォルト） */
export async function getLegalConfig(tenantId?: string): Promise<LegalConfig> {
  const raw = await getSetting("general", SETTING_KEY, tenantId);
  if (!raw) return DEFAULT_LEGAL_CONFIG;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_LEGAL_CONFIG,
      ...parsed,
    };
  } catch {
    return DEFAULT_LEGAL_CONFIG;
  }
}

/** DB に利用規約設定を保存 */
export async function setLegalConfig(config: Partial<LegalConfig>, tenantId?: string): Promise<boolean> {
  const current = await getLegalConfig(tenantId);
  const merged = { ...current, ...config };
  return setSetting("general", SETTING_KEY, JSON.stringify(merged), tenantId);
}
