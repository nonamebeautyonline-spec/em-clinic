// lib/mypage/config.ts — マイページ設定のDB読み書き
import { getSetting, setSetting } from "@/lib/settings";
import { DEFAULT_MYPAGE_CONFIG, type MypageConfig } from "./types";

const CATEGORY = "mypage" as any;
const SETTING_KEY = "config";

/** DB からマイページ設定を取得（なければデフォルト） */
export async function getMypageConfig(tenantId?: string): Promise<MypageConfig> {
  const raw = await getSetting(CATEGORY, SETTING_KEY, tenantId);
  if (!raw) return DEFAULT_MYPAGE_CONFIG;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_MYPAGE_CONFIG,
      ...parsed,
      colors: { ...DEFAULT_MYPAGE_CONFIG.colors, ...parsed.colors },
      sections: { ...DEFAULT_MYPAGE_CONFIG.sections, ...parsed.sections },
      content: { ...DEFAULT_MYPAGE_CONFIG.content, ...parsed.content },
      labels: { ...DEFAULT_MYPAGE_CONFIG.labels, ...parsed.labels },
    };
  } catch {
    return DEFAULT_MYPAGE_CONFIG;
  }
}

/** DB にマイページ設定を保存 */
export async function setMypageConfig(config: Partial<MypageConfig>, tenantId?: string): Promise<boolean> {
  const current = await getMypageConfig(tenantId);
  const merged: MypageConfig = {
    ...current,
    ...config,
    colors: { ...current.colors, ...(config.colors || {}) },
    sections: { ...current.sections, ...(config.sections || {}) },
    content: { ...current.content, ...(config.content || {}) },
    labels: { ...current.labels, ...(config.labels || {}) },
  };
  return setSetting(CATEGORY, SETTING_KEY, JSON.stringify(merged), tenantId);
}
