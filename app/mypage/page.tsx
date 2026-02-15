// app/mypage/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import PatientDashboardInner from "./PatientDashboardInner";

export default async function MyPagePage() {
  // ★ cookies() を await する（ここがポイント）
  const cookieStore = await cookies();
  const lineUserId = cookieStore.get("line_user_id")?.value;

  // LINEログイン未完了 → LINEログインへ飛ばす
  if (!lineUserId) {
    redirect("/api/line/login");
  }

  // テナントID解決
  const tenantId = resolveTenantId();

  // 個人情報・電話番号の登録状態をチェック
  let patientId = cookieStore.get("__Host-patient_id")?.value
    || cookieStore.get("patient_id")?.value;

  // ★ line_user_id と patient_id の整合性チェック（patients テーブルの line_id を使用）
  // 端末でLINEアカウントを切り替えた場合、古い patient_id cookie が残り
  // 別人のデータが表示される問題を防止
  if (patientId) {
    const { data: patient } = await withTenant(
      supabaseAdmin
        .from("patients")
        .select("line_id")
        .eq("patient_id", patientId),
      tenantId
    ).maybeSingle();

    if (!patient) {
      // cookie の patient_id に対応する patients が存在しない（統合等で削除された場合）
      // → line_user_id で正しい patient_id を探す
      console.log(`[mypage] PID not found: cookie=${patientId}, looking up by line_uid=${lineUserId}`);
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
        console.log(`[mypage] Resolved to ${patientId} via line_uid`);
        // cookie は register/complete で再設定されるため、ここではリダイレクトで対応
        redirect(`/api/register/complete-redirect?pid=${patientId}`);
      } else {
        // patients が無い → 新規登録へ
        redirect("/register");
      }
    } else if (patient.line_id && patient.line_id !== lineUserId) {
      // cookie の patient_id が現在の LINE ユーザーと不一致
      // → LINE 再ログインで正しい cookie を取得させる
      console.log(`[mypage] PID mismatch: cookie=${patientId} line_id=${patient.line_id} current=${lineUserId}`);
      redirect("/api/line/login");
    }
  }

  if (patientId) {
    const { data: answerer } = await withTenant(
      supabaseAdmin
        .from("patients")
        .select("name, tel")
        .eq("patient_id", patientId),
      tenantId
    ).maybeSingle();
    // 個人情報未入力 → 個人情報フォームへ
    if (!answerer?.name) {
      redirect("/register");
    }
    // 電話番号未登録 → SMS認証画面へ
    if (!answerer?.tel) {
      redirect("/mypage/init");
    }
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">読み込み中です…</p>
        </div>
      }
    >
      <PatientDashboardInner />
    </Suspense>
  );
}
