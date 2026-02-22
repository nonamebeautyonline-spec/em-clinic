// lib/ehr/sync.ts — 電子カルテ同期エンジン

import { supabaseAdmin } from "@/lib/supabase";
import { getSetting } from "@/lib/settings";
import { OrcaAdapter } from "./orca-adapter";
import { CsvAdapter } from "./csv-adapter";
import { FhirAdapter } from "./fhir-adapter";
import { toEhrPatient, fromEhrPatient, toEhrKarte, fromEhrKarte } from "./mapper";
import type {
  EhrAdapter,
  EhrProvider,
  SyncResult,
  SyncDirection,
  OrcaConfig,
  FhirConfig,
} from "./types";

// ──────────────────── アダプター生成 ────────────────────

/** テナント設定からアダプターを生成 */
export async function createAdapter(
  tenantId?: string,
): Promise<EhrAdapter | null> {
  const provider = await getSetting("ehr", "provider", tenantId) as EhrProvider | null;
  if (!provider) return null;

  switch (provider) {
    case "orca":
      return createOrcaAdapter(tenantId);
    case "csv":
      return new CsvAdapter();
    case "fhir":
      return createFhirAdapter(tenantId);
    default:
      return null;
  }
}

async function createOrcaAdapter(tenantId?: string): Promise<OrcaAdapter> {
  const [host, port, user, password, isWeb] = await Promise.all([
    getSetting("ehr", "orca_host", tenantId),
    getSetting("ehr", "orca_port", tenantId),
    getSetting("ehr", "orca_user", tenantId),
    getSetting("ehr", "orca_password", tenantId),
    getSetting("ehr", "orca_is_web", tenantId),
  ]);

  const config: OrcaConfig = {
    host: host || "localhost",
    port: port ? parseInt(port, 10) : 8000,
    user: user || "",
    password: password || "",
    isWeb: isWeb === "true",
  };

  return new OrcaAdapter(config);
}

async function createFhirAdapter(tenantId?: string): Promise<FhirAdapter> {
  const [baseUrl, authType, token, username, password] = await Promise.all([
    getSetting("ehr", "fhir_base_url", tenantId),
    getSetting("ehr", "fhir_auth_type", tenantId),
    getSetting("ehr", "fhir_token", tenantId),
    getSetting("ehr", "fhir_username", tenantId),
    getSetting("ehr", "fhir_password", tenantId),
  ]);

  const config: FhirConfig = {
    baseUrl: baseUrl || "",
    authType: (authType as FhirConfig["authType"]) || "bearer",
    token: token || undefined,
    username: username || undefined,
    password: password || undefined,
  };

  return new FhirAdapter(config);
}

// ──────────────────── 同期ログ ────────────────────

async function logSync(
  result: SyncResult,
  tenantId?: string,
): Promise<void> {
  try {
    await supabaseAdmin.from("ehr_sync_logs").insert({
      tenant_id: tenantId || null,
      provider: result.provider,
      direction: result.direction,
      resource_type: result.resourceType,
      patient_id: result.patientId || null,
      external_id: result.externalId || null,
      status: result.status,
      detail: result.detail || null,
    });
  } catch (e) {
    console.error("[ehr-sync] ログ記録失敗:", e);
  }
}

// ──────────────────── マッピング管理 ────────────────────

/** 患者IDマッピングを取得 */
async function getMapping(
  patientId: string,
  provider: EhrProvider,
  tenantId?: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("ehr_patient_mappings")
    .select("external_id")
    .eq("patient_id", patientId)
    .eq("provider", provider)
    .eq("tenant_id", tenantId || null)
    .maybeSingle();

  return data?.external_id || null;
}

/** 外部IDからマッピングを逆引き */
async function getMappingByExternalId(
  externalId: string,
  provider: EhrProvider,
  tenantId?: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("ehr_patient_mappings")
    .select("patient_id")
    .eq("external_id", externalId)
    .eq("provider", provider)
    .eq("tenant_id", tenantId || null)
    .maybeSingle();

  return data?.patient_id || null;
}

/** マッピングを登録/更新 */
async function upsertMapping(
  patientId: string,
  externalId: string,
  provider: EhrProvider,
  tenantId?: string,
): Promise<void> {
  await supabaseAdmin.from("ehr_patient_mappings").upsert(
    {
      tenant_id: tenantId || null,
      patient_id: patientId,
      provider,
      external_id: externalId,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,provider,external_id" },
  );
}

// ──────────────────── 患者同期 ────────────────────

/** 患者をプッシュ（Lオペ→外部カルテ） */
export async function pushPatient(
  patientId: string,
  adapter: EhrAdapter,
  tenantId?: string,
): Promise<SyncResult> {
  try {
    // Lオペから患者データ取得
    const { data: patient } = await supabaseAdmin
      .from("patients")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (!patient) {
      return {
        provider: adapter.provider,
        direction: "push",
        resourceType: "patient",
        patientId,
        status: "skipped",
        detail: "患者が見つかりません",
      };
    }

    // 最新のintakeを取得（補完情報用）
    const { data: intake } = await supabaseAdmin
      .from("intake")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ehrPatient = toEhrPatient(patient, intake);

    // 既存マッピングがあれば外部IDを設定
    const existingExtId = await getMapping(patientId, adapter.provider, tenantId);
    if (existingExtId) {
      ehrPatient.externalId = existingExtId;
    }

    // 外部カルテにプッシュ
    const { externalId } = await adapter.pushPatient(ehrPatient);

    // マッピング更新
    await upsertMapping(patientId, externalId, adapter.provider, tenantId);

    const result: SyncResult = {
      provider: adapter.provider,
      direction: "push",
      resourceType: "patient",
      patientId,
      externalId,
      status: "success",
      detail: `外部カルテに送信完了 (外部ID: ${externalId})`,
    };

    await logSync(result, tenantId);
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const result: SyncResult = {
      provider: adapter.provider,
      direction: "push",
      resourceType: "patient",
      patientId,
      status: "error",
      detail: msg,
    };
    await logSync(result, tenantId);
    return result;
  }
}

/** 患者をプル（外部カルテ→Lオペ） */
export async function pullPatient(
  externalId: string,
  adapter: EhrAdapter,
  tenantId?: string,
): Promise<SyncResult> {
  try {
    const ehrPatient = await adapter.getPatient(externalId);
    if (!ehrPatient) {
      return {
        provider: adapter.provider,
        direction: "pull",
        resourceType: "patient",
        externalId,
        status: "skipped",
        detail: "外部カルテに患者が見つかりません",
      };
    }

    // 既存マッピングで Lオペ患者IDを取得
    const existingPatientId = await getMappingByExternalId(
      externalId,
      adapter.provider,
      tenantId,
    );

    const updates = fromEhrPatient(ehrPatient);

    if (existingPatientId) {
      // 既存患者を更新
      await supabaseAdmin
        .from("patients")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("patient_id", existingPatientId);

      const result: SyncResult = {
        provider: adapter.provider,
        direction: "pull",
        resourceType: "patient",
        patientId: existingPatientId,
        externalId,
        status: "success",
        detail: "既存患者データを更新しました",
      };
      await logSync(result, tenantId);
      return result;
    } else {
      // 新規患者として登録
      const patientId = `EHR_${adapter.provider}_${externalId}`;
      await supabaseAdmin.from("patients").insert({
        patient_id: patientId,
        ...updates,
        tenant_id: tenantId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // マッピング登録
      await upsertMapping(patientId, externalId, adapter.provider, tenantId);

      const result: SyncResult = {
        provider: adapter.provider,
        direction: "pull",
        resourceType: "patient",
        patientId,
        externalId,
        status: "success",
        detail: "新規患者として登録しました",
      };
      await logSync(result, tenantId);
      return result;
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const result: SyncResult = {
      provider: adapter.provider,
      direction: "pull",
      resourceType: "patient",
      externalId,
      status: "error",
      detail: msg,
    };
    await logSync(result, tenantId);
    return result;
  }
}

// ──────────────────── カルテ同期 ────────────────────

/** カルテをプッシュ（Lオペ→外部カルテ） */
export async function pushKarte(
  patientId: string,
  adapter: EhrAdapter,
  tenantId?: string,
): Promise<SyncResult> {
  try {
    const { data: patient } = await supabaseAdmin
      .from("patients")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (!patient) {
      return {
        provider: adapter.provider,
        direction: "push",
        resourceType: "karte",
        patientId,
        status: "skipped",
        detail: "患者が見つかりません",
      };
    }

    // 外部IDを取得
    const externalId = await getMapping(patientId, adapter.provider, tenantId);
    if (!externalId) {
      return {
        provider: adapter.provider,
        direction: "push",
        resourceType: "karte",
        patientId,
        status: "skipped",
        detail: "患者の外部IDマッピングがありません。先に患者を同期してください",
      };
    }

    // intake のカルテ（note有り）を取得
    const { data: intakes } = await supabaseAdmin
      .from("intake")
      .select("*")
      .eq("patient_id", patientId)
      .not("note", "is", null)
      .order("created_at", { ascending: false });

    let pushed = 0;
    for (const intake of intakes || []) {
      const karte = toEhrKarte(intake, patient);
      karte.patientExternalId = externalId;
      await adapter.pushKarte(karte);
      pushed++;
    }

    const result: SyncResult = {
      provider: adapter.provider,
      direction: "push",
      resourceType: "karte",
      patientId,
      externalId,
      status: "success",
      detail: `カルテ${pushed}件を送信しました`,
    };
    await logSync(result, tenantId);
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const result: SyncResult = {
      provider: adapter.provider,
      direction: "push",
      resourceType: "karte",
      patientId,
      status: "error",
      detail: msg,
    };
    await logSync(result, tenantId);
    return result;
  }
}

/** カルテをプル（外部カルテ→Lオペ） */
export async function pullKarte(
  patientId: string,
  adapter: EhrAdapter,
  tenantId?: string,
): Promise<SyncResult> {
  try {
    const externalId = await getMapping(patientId, adapter.provider, tenantId);
    if (!externalId) {
      return {
        provider: adapter.provider,
        direction: "pull",
        resourceType: "karte",
        patientId,
        status: "skipped",
        detail: "患者の外部IDマッピングがありません",
      };
    }

    const kartes = await adapter.getKarteList(externalId);
    if (kartes.length === 0) {
      return {
        provider: adapter.provider,
        direction: "pull",
        resourceType: "karte",
        patientId,
        externalId,
        status: "skipped",
        detail: "外部カルテにデータがありません",
      };
    }

    // 各カルテをintakeとして保存（note有りレコード）
    let imported = 0;
    for (const karte of kartes) {
      const { note } = fromEhrKarte(karte);
      if (!note) continue;

      // 重複チェック: 同じ日付・同じ内容がないか
      const { data: existing } = await supabaseAdmin
        .from("intake")
        .select("id")
        .eq("patient_id", patientId)
        .eq("note", note)
        .limit(1)
        .maybeSingle();

      if (existing) continue;

      await supabaseAdmin.from("intake").insert({
        patient_id: patientId,
        note,
        status: "OK",
        tenant_id: tenantId || null,
        created_at: karte.date ? new Date(karte.date).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      imported++;
    }

    const result: SyncResult = {
      provider: adapter.provider,
      direction: "pull",
      resourceType: "karte",
      patientId,
      externalId,
      status: "success",
      detail: `カルテ${imported}件をインポートしました（${kartes.length - imported}件スキップ）`,
    };
    await logSync(result, tenantId);
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const result: SyncResult = {
      provider: adapter.provider,
      direction: "pull",
      resourceType: "karte",
      patientId,
      status: "error",
      detail: msg,
    };
    await logSync(result, tenantId);
    return result;
  }
}

// ──────────────────── バッチ同期 ────────────────────

const BATCH_SIZE = 50;

/** 複数患者をバッチ同期 */
export async function syncBatch(
  patientIds: string[],
  direction: SyncDirection,
  adapter: EhrAdapter,
  tenantId?: string,
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (let i = 0; i < patientIds.length; i += BATCH_SIZE) {
    const batch = patientIds.slice(i, i + BATCH_SIZE);

    for (const patientId of batch) {
      if (direction === "push") {
        results.push(await pushPatient(patientId, adapter, tenantId));
      } else {
        // pullの場合は外部IDが必要。マッピングから取得
        const externalId = await getMapping(patientId, adapter.provider, tenantId);
        if (externalId) {
          results.push(await pullPatient(externalId, adapter, tenantId));
        } else {
          results.push({
            provider: adapter.provider,
            direction: "pull",
            resourceType: "patient",
            patientId,
            status: "skipped",
            detail: "外部IDマッピングなし",
          });
        }
      }
    }
  }

  return results;
}

/** 同期ログを取得 */
export async function getSyncLogs(
  tenantId?: string,
  limit = 50,
): Promise<unknown[]> {
  const query = supabaseAdmin
    .from("ehr_sync_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (tenantId) {
    query.eq("tenant_id", tenantId);
  }

  const { data } = await query;
  return data || [];
}
