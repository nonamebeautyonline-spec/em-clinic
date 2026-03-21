// lib/medical-fields.ts — マルチ分野（診療科目）ヘルパー
import { supabaseAdmin } from "@/lib/supabase";
import { getSetting } from "@/lib/settings";
import { withTenant } from "@/lib/tenant";

/** 分野の型定義 */
export interface MedicalField {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  color_theme: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** マルチ分野設定 */
export interface MedicalFieldConfig {
  multiFieldEnabled: boolean;
}

const DEFAULT_CONFIG: MedicalFieldConfig = {
  multiFieldEnabled: false,
};

/**
 * テナントのマルチ分野モードが有効かチェック
 * デフォルトは false（単一分野モード = 現在の動作を維持）
 */
export async function isMultiFieldEnabled(tenantId: string | null): Promise<boolean> {
  if (!tenantId) return false;
  try {
    const raw = await getSetting("medical_fields", "config", tenantId);
    if (!raw) return false;
    const config: MedicalFieldConfig = JSON.parse(raw);
    return config.multiFieldEnabled ?? false;
  } catch {
    return false;
  }
}

/**
 * テナントのマルチ分野設定を取得
 */
export async function getMedicalFieldConfig(tenantId: string): Promise<MedicalFieldConfig> {
  try {
    const raw = await getSetting("medical_fields", "config", tenantId);
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * テナントのアクティブな分野一覧を取得
 */
export async function getMedicalFields(tenantId: string | null): Promise<MedicalField[]> {
  const query = withTenant(
    supabaseAdmin
      .from("medical_fields")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    tenantId
  );
  const { data } = await query;
  return (data as MedicalField[]) ?? [];
}

/**
 * テナントの全分野一覧を取得（管理画面用 — 非アクティブ含む）
 */
export async function getAllMedicalFields(tenantId: string | null): Promise<MedicalField[]> {
  const query = withTenant(
    supabaseAdmin
      .from("medical_fields")
      .select("*")
      .order("sort_order", { ascending: true }),
    tenantId
  );
  const { data } = await query;
  return (data as MedicalField[]) ?? [];
}

/**
 * 分野をIDで取得
 */
export async function getMedicalFieldById(id: string): Promise<MedicalField | null> {
  const { data } = await supabaseAdmin
    .from("medical_fields")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as MedicalField | null;
}

/**
 * テナントのデフォルト分野を取得（sort_order最小のアクティブ分野）
 */
export async function getDefaultMedicalField(tenantId: string): Promise<MedicalField | null> {
  const { data } = await supabaseAdmin
    .from("medical_fields")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as MedicalField | null;
}

/**
 * 分野別クエリフィルタ — マルチ分野モード時のみ field_id フィルタを適用
 *
 * 使い方:
 *   let query = supabaseAdmin.from("intake").select("...").eq("patient_id", pid);
 *   query = await applyFieldFilter(query, tenantId, fieldId);
 */
export async function applyFieldFilter<T>(
  query: T,
  tenantId: string | null,
  fieldId: string | null | undefined
): Promise<T> {
  if (!tenantId || !fieldId) return query;
  const enabled = await isMultiFieldEnabled(tenantId);
  if (!enabled) return query;
  return (query as T & { eq: (col: string, val: string) => T }).eq("field_id", fieldId);
}
