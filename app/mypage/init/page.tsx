// app/mypage/init/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import VerifyInner from "./VerifyInner";

export default async function MypageInitPage() {
  const cookieStore = await cookies();
  const lineUserId = cookieStore.get("line_user_id")?.value;

  // LINEログイン未完了 → LINEログインへ
  if (!lineUserId) {
    redirect("/api/line/login");
  }

  // テナントID解決
  const tenantId = resolveTenantId();

  // 個人情報未入力 → 個人情報フォームへ
  const patientId = cookieStore.get("__Host-patient_id")?.value
    || cookieStore.get("patient_id")?.value;
  if (patientId) {
    const { data: answerer } = await withTenant(
      supabaseAdmin
        .from("patients")
        .select("name")
        .eq("patient_id", patientId),
      tenantId
    ).maybeSingle();
    if (!answerer?.name) {
      redirect("/register");
    }
  }

  return <VerifyInner />;
}
