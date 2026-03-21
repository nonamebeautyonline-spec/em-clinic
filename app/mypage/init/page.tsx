// app/mypage/init/page.tsx
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { verifyPatientSessionFromCookies } from "@/lib/patient-session";
import VerifyInner from "./VerifyInner";

export default async function MypageInitPage() {
  const cookieStore = await cookies();
  const lineUserId = cookieStore.get("line_user_id")?.value;

  // LINEログイン未完了 → LINEログインへ
  if (!lineUserId) {
    redirect("/api/line/login");
  }

  // テナントID解決（middleware が設定した x-tenant-id ヘッダーを取得）
  const headerStore = await headers();
  const tenantId = resolveTenantId({ headers: headerStore as unknown as Headers });

  // JWT セッションまたは旧Cookieで患者IDを取得
  const session = await verifyPatientSessionFromCookies(cookieStore);
  let patientId = session?.patientId;

  // セッションがない場合は line_user_id で検索（フォールバック）
  if (!patientId && lineUserId) {
    const { data: byLine } = await withTenant(
      supabaseAdmin
        .from("patients")
        .select("patient_id")
        .eq("line_id", lineUserId)
        .not("patient_id", "like", "LINE_%")
        .limit(1),
      tenantId
    ).maybeSingle();

    if (byLine?.patient_id) {
      patientId = byLine.patient_id;
    }
  }

  // LINE_仮IDのまま個人情報フォーム未提出 → 個人情報フォームへ
  if (patientId?.startsWith("LINE_")) {
    redirect("/register");
  }

  // 個人情報未入力 → 個人情報フォームへ
  if (patientId) {
    const { data: answerer } = await withTenant(
      supabaseAdmin
        .from("patients")
        .select("name, name_kana")
        .eq("patient_id", patientId),
      tenantId
    ).maybeSingle();
    // 個人情報未入力（氏名・カナ両方必須） → 個人情報フォームへ
    if (!answerer?.name || !answerer?.name_kana) {
      redirect("/register");
    }
  } else {
    // 患者レコードが見つからない → 新規登録へ
    redirect("/register");
  }

  return <VerifyInner />;
}
