// app/mypage/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import PatientDashboardInner from "./PatientDashboardInner";

export default function MyPagePage() {
  const cookieStore = cookies();
  const lineUserId = cookieStore.get("line_user_id")?.value;

  // LINEログイン未完了 → LINEログインへ飛ばす
  if (!lineUserId) {
    redirect("/api/line/login");
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
