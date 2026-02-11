// app/mypage/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import PatientDashboardInner from "./PatientDashboardInner";

export default async function MyPagePage() {
  // ★ cookies() を await する（ここがポイント）
  const cookieStore = await cookies();
  const lineUserId = cookieStore.get("line_user_id")?.value;

  // LINEログイン未完了 → LINEログインへ飛ばす
  if (!lineUserId) {
    redirect("/api/line/login");
  }

  // 個人情報・電話番号の登録状態をチェック
  const patientId = cookieStore.get("__Host-patient_id")?.value
    || cookieStore.get("patient_id")?.value;
  if (patientId) {
    const { data: answerer } = await supabaseAdmin
      .from("answerers")
      .select("name, tel")
      .eq("patient_id", patientId)
      .maybeSingle();
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
