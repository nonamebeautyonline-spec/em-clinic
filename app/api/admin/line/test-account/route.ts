// テスト送信アカウント設定API（複数アカウント対応）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSetting, setSetting, deleteSetting } from "@/lib/settings";
import { resolveTenantId, withTenant } from "@/lib/tenant";

interface TestAccount {
  patient_id: string;
  patient_name: string;
  has_line_uid: boolean;
}

/** JSON配列のpatient IDsを取得（旧形式からの移行含む） */
async function getPatientIds(tenantId?: string): Promise<string[]> {
  // 新形式: JSON配列
  const idsJson = await getSetting("line", "test_send_patient_ids", tenantId);
  if (idsJson) {
    try {
      const ids = JSON.parse(idsJson);
      if (Array.isArray(ids)) return ids.filter((id: unknown) => typeof id === "string" && id);
    } catch {
      // パース失敗 → フォールバック
    }
  }

  // 旧形式: 単一patient_id → 移行
  const oldId = await getSetting("line", "test_send_patient_id", tenantId);
  if (oldId) {
    await setSetting("line", "test_send_patient_ids", JSON.stringify([oldId]), tenantId);
    await deleteSetting("line", "test_send_patient_id", tenantId);
    return [oldId];
  }

  return [];
}

async function savePatientIds(ids: string[], tenantId?: string): Promise<boolean> {
  if (ids.length === 0) {
    await deleteSetting("line", "test_send_patient_ids", tenantId);
    return true;
  }
  return await setSetting("line", "test_send_patient_ids", JSON.stringify(ids), tenantId);
}

// テスト送信アカウント一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const patientIds = await getPatientIds(tenantId ?? undefined);

  if (patientIds.length === 0) {
    // 後方互換: 旧形式のレスポンスも含める
    return NextResponse.json({ accounts: [], patient_id: null, patient_name: null, has_line_uid: false });
  }

  // 患者情報を一括取得
  const { data: patients } = await withTenant(
    supabaseAdmin.from("patients").select("patient_id, name, line_id").in("patient_id", patientIds),
    tenantId
  );

  const patientMap = new Map((patients || []).map(p => [p.patient_id, p]));
  const accounts: TestAccount[] = patientIds
    .map(id => {
      const p = patientMap.get(id);
      return p ? { patient_id: id, patient_name: p.name || "", has_line_uid: !!p.line_id } : null;
    })
    .filter((a): a is TestAccount => a !== null);

  // 後方互換: 最初のアカウントを旧形式でも返す
  const first = accounts[0] || null;
  return NextResponse.json({
    accounts,
    patient_id: first?.patient_id || null,
    patient_name: first?.patient_name || null,
    has_line_uid: first?.has_line_uid || false,
  });
}

// テスト送信アカウント追加
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const body = await req.json();
  const patientId = body.patient_id?.trim();
  if (!patientId) {
    return NextResponse.json({ error: "patient_idは必須です" }, { status: 400 });
  }

  // 患者存在確認
  const { data: patient } = await withTenant(
    supabaseAdmin.from("patients").select("name, line_id").eq("patient_id", patientId),
    tenantId
  ).maybeSingle();

  if (!patient) {
    return NextResponse.json({ error: "患者が見つかりません" }, { status: 404 });
  }

  // 既存リストに追加（重複チェック）
  const ids = await getPatientIds(tenantId ?? undefined);
  if (ids.includes(patientId)) {
    return NextResponse.json({ error: "既に登録されています" }, { status: 400 });
  }

  // 最大10人まで
  if (ids.length >= 10) {
    return NextResponse.json({ error: "テストアカウントは最大10人までです" }, { status: 400 });
  }

  ids.push(patientId);
  const ok = await savePatientIds(ids, tenantId ?? undefined);
  if (!ok) {
    return NextResponse.json({ error: "設定の保存に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    account: { patient_id: patientId, patient_name: patient.name || "", has_line_uid: !!patient.line_id },
  });
}

// テスト送信アカウント削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const body = await req.json().catch(() => ({}));
  const patientId = body.patient_id?.trim();

  if (!patientId) {
    // patient_id未指定 → 全削除（後方互換）
    await deleteSetting("line", "test_send_patient_ids", tenantId ?? undefined);
    await deleteSetting("line", "test_send_patient_id", tenantId ?? undefined);
    return NextResponse.json({ ok: true });
  }

  // 指定patient_idのみ削除
  const ids = await getPatientIds(tenantId ?? undefined);
  const newIds = ids.filter(id => id !== patientId);
  await savePatientIds(newIds, tenantId ?? undefined);

  return NextResponse.json({ ok: true });
}
