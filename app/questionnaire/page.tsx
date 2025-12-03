// app/questionnaire/page.tsx
"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import QuestionnairePage from "./QuestionnairePage";

function QuestionnaireInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const reserveId = searchParams.get("reserveId");

  // 予約→問診に付けてきたクエリをここで受け取る
  const customerId =
    searchParams.get("customer_id") || searchParams.get("lineId") || undefined;
  const name = searchParams.get("name") || undefined;
  const kana = searchParams.get("kana") || undefined;
  const sex = searchParams.get("sex") || undefined;
  const birth = searchParams.get("birth") || undefined;
  const phone = searchParams.get("phone") || undefined;

  // reserveId が無い / 空のときは問診を出さない
  if (!reserveId) {
    return (
      <div className="min-h-screen bg-gray-50password flex flex-col">
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">予約情報が見つかりません</h1>
        </header>
        <main className="flex-1 px-4 py-6">
          <div className="bg-white rounded-xl shadow-sm p-4 text-sm text-gray-700 space-y-3">
            <p>予約情報が確認できないため、問診画面を表示できません。</p>
            <p>お手数ですが、マイページから再度ご予約・問診にお進みください。</p>
          </div>
        </main>
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
          <button
            type="button"
            onClick={() => router.push("/mypage")}
            className="w-full rounded-full bg-blue-600 px-3 py-2 text-sm font-medium text-white active:bg-blue-700"
          >
            マイページに戻る
          </button>
        </footer>
      </div>
    );
  }

  return (
    <QuestionnairePage
      reserveId={reserveId}
      customerId={customerId}
      name={name}
      kana={kana}
      sex={sex}
      birth={birth}
      phone={phone}
    />
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-gray-600">問診フォームを読み込み中です…</p>
        </div>
      }
    >
      <QuestionnaireInner />
    </Suspense>
  );
}
