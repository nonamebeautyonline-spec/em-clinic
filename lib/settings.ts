// lib/settings.ts — テナント設定の読み書き
import { supabaseAdmin } from "@/lib/supabase";
import { encrypt, decrypt } from "@/lib/crypto";

export type SettingCategory = "square" | "gmo" | "line" | "gas" | "general" | "payment" | "mypage" | "flex" | "sms" | "dashboard" | "ehr" | "feature_flags" | "consultation" | "notification" | "report";
/** DB から設定を取得（復号済み） */
export async function getSetting(
  category: SettingCategory,
  key: string,
  tenantId?: string
): Promise<string | null> {
  try {
    let query = supabaseAdmin
      .from("tenant_settings")
      .select("value")
      .eq("category", category)
      .eq("key", key);
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    } else {
      query = query.is("tenant_id", null);
    }
    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    try {
      return decrypt(data.value);
    } catch {
      // 暗号化前のデータの場合はそのまま返す
      return data.value;
  } catch {
    return null;
  }
}
/** DB 優先、なければ環境変数にフォールバック */
export async function getSettingOrEnv(
  envName: string,
): Promise<string | undefined> {
  const dbValue = await getSetting(category, key, tenantId);
  if (dbValue) return dbValue;
  return process.env[envName];
/** 設定を暗号化して保存（upsert） */
export async function setSetting(
  value: string,
): Promise<boolean> {
    const encrypted = encrypt(value);
    const { error } = await supabaseAdmin
      .upsert(
        {
          tenant_id: tenantId || null,
          category,
          key,
          value: encrypted,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,category,key" }
      );
    if (error) {
      console.error("[settings] upsert failed:", error.message);
      return false;
    return true;
  } catch (e) {
    console.error("[settings] setSetting error:", e);
    return false;
/** 複数カテゴリの全設定を一括取得（復号済み） */
export async function getSettingsBulk(
  categories: SettingCategory[],
): Promise<Map<string, string>> {
      .select("category, key, value")
      .in("category", categories);
    const { data, error } = await query;
    if (error || !data) return new Map();
    const map = new Map<string, string>();
    for (const row of data) {
      try {
        map.set(`${row.category}:${row.key}`, decrypt(row.value));
      } catch {
        map.set(`${row.category}:${row.key}`, row.value);
      }
    return map;
    return new Map();
/** カテゴリ内の全設定を取得（キー一覧、値はマスク済み） */
export async function getSettingsByCategory(
): Promise<{ key: string; hasValue: boolean }[]> {
      .select("key, value")
      .eq("category", category);
    if (error || !data) return [];
    return data.map((row) => ({
      key: row.key,
      hasValue: !!row.value,
    }));
    return [];
/** 設定を削除 */
export async function deleteSetting(
      .delete()
    const { error } = await query;
    return !error;
