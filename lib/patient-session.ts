// lib/patient-session.ts
// 患者セッション管理: JWT署名付きトークンによる認証
// 旧Cookie（平文patient_id）からの移行期間中はフォールバック対応

import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Cookie名
const PATIENT_SESSION_COOKIE = "patient_session";
const LEGACY_PATIENT_ID_COOKIES = ["__Host-patient_id", "patient_id"];
const LEGACY_LINE_UID_COOKIES = ["__Host-line_user_id", "line_user_id"];

// 有効期限: 365日
const SESSION_DURATION_SECONDS = 365 * 24 * 60 * 60;

export type PatientSession = {
  patientId: string;
  lineUserId: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.PATIENT_SESSION_SECRET;
  if (!secret) {
    throw new Error("PATIENT_SESSION_SECRET 環境変数が未設定です");
  }
  return new TextEncoder().encode(secret);
}

/**
 * JWT患者セッショントークンを生成
 */
export async function createPatientToken(
  patientId: string,
  lineUserId: string,
  tenantId?: string,
): Promise<string> {
  const secret = getSecret();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  return new SignJWT({
    pid: patientId,
    lid: lineUserId,
    tid: tenantId || null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);
}

/**
 * Cookie属性（JWT患者セッション用）
 */
export function patientSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}

/**
 * APIルート用: リクエストから患者セッションを検証
 * 1. patient_session JWT Cookie → 検証
 * 2. フォールバック: 旧Cookie（平文patient_id + line_user_id）→ DB照合
 */
export async function verifyPatientSession(
  req: NextRequest,
): Promise<PatientSession | null> {
  // 1. JWT Cookie
  const token = req.cookies.get(PATIENT_SESSION_COOKIE)?.value;
  if (token) {
    try {
      const secret = getSecret();
      const { payload } = await jwtVerify(token, secret);
      const pid = payload.pid as string | undefined;
      const lid = payload.lid as string | undefined;
      if (pid && lid) {
        console.log(`[patient-session] JWT認証: pid=${pid}`);
        return { patientId: pid, lineUserId: lid };
      }
    } catch {
      console.log(`[patient-session] JWT検証失敗 → フォールバック`);
    }
  }

  // 2. フォールバック: 旧Cookie
  const patientId = findCookieValue(req, LEGACY_PATIENT_ID_COOKIES);
  const lineUserId = findCookieValue(req, LEGACY_LINE_UID_COOKIES);
  if (!patientId || !lineUserId) return null;

  // DB照合: patient_id + line_id の一致を確認（改ざん検出）
  const { data } = await supabaseAdmin
    .from("patients")
    .select("patient_id")
    .eq("patient_id", patientId)
    .eq("line_id", lineUserId)
    .maybeSingle();

  if (!data) return null;

  return { patientId, lineUserId };
}

/**
 * サーバーコンポーネント用: CookieStoreから患者セッションを検証
 */
export async function verifyPatientSessionFromCookies(
  cookieStore: { get(name: string): { value: string } | undefined },
): Promise<PatientSession | null> {
  // 1. JWT Cookie
  const token = cookieStore.get(PATIENT_SESSION_COOKIE)?.value;
  if (token) {
    try {
      const secret = getSecret();
      const { payload } = await jwtVerify(token, secret);
      const pid = payload.pid as string | undefined;
      const lid = payload.lid as string | undefined;
      if (pid && lid) {
        return { patientId: pid, lineUserId: lid };
      }
    } catch {
      // JWT検証失敗 → フォールバックへ
    }
  }

  // 2. フォールバック: 旧Cookie
  const patientId = findCookieValueFromStore(cookieStore, LEGACY_PATIENT_ID_COOKIES);
  const lineUserId = findCookieValueFromStore(cookieStore, LEGACY_LINE_UID_COOKIES);
  if (!patientId || !lineUserId) return null;

  // DB照合
  const { data } = await supabaseAdmin
    .from("patients")
    .select("patient_id")
    .eq("patient_id", patientId)
    .eq("line_id", lineUserId)
    .maybeSingle();

  if (!data) return null;

  return { patientId, lineUserId };
}

/** Cookie名の優先順位で値を取得（NextRequest用） */
function findCookieValue(req: NextRequest, names: string[]): string {
  for (const name of names) {
    const val = req.cookies.get(name)?.value;
    if (val) return val;
  }
  return "";
}

/** Cookie名の優先順位で値を取得（CookieStore用） */
function findCookieValueFromStore(
  store: { get(name: string): { value: string } | undefined },
  names: string[],
): string {
  for (const name of names) {
    const val = store.get(name)?.value;
    if (val) return val;
  }
  return "";
}

// エクスポート（テスト用）
export { PATIENT_SESSION_COOKIE, LEGACY_PATIENT_ID_COOKIES, LEGACY_LINE_UID_COOKIES };
