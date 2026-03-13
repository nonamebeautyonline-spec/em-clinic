// app/questionnaire/page.tsx
"use client";

import React, { Suspense } from "react";
import useSWR from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import QuestionnairePage from "./QuestionnairePage";

// SWRProviderのスコープ外（患者向けページ）なのでfetcherを明示指定
const swrFetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

function MissingReserveUI({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
          onClick={onBack}
          className="w-full rounded-full bg-blue-600 px-3 py-2 text-sm font-medium text-white active:bg-blue-700"
        >
          マイページに戻る
        </button>
      </footer>
    </div>
  );
}

function CheckingUI() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-gray-600">問診状況を確認中です…</p>
    </div>
  );
}

function AlreadyAnsweredUI({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-semibold">この予約の問診は回答済みです</h1>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm p-4 text-sm text-gray-700 space-y-3">
          <p>同じ予約に対して問診は1回のみ回答できます。</p>
          <p>内容の修正が必要な場合は、クリニック側で対応します。</p>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-full bg-blue-600 px-3 py-2 text-sm font-medium text-white active:bg-blue-700"
        >
          マイページに戻る
        </button>
      </footer>
    </div>
  );
}

function CheckErrorUI({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-semibold">問診状況の確認に失敗しました</h1>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm p-4 text-sm text-gray-700 space-y-3">
          <p>{message}</p>
          <p>通信状況をご確認のうえ、再度お試しください。</p>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 space-y-2">
        <button
          type="button"
          onClick={onRetry}
          className="w-full rounded-full bg-blue-600 px-3 py-2 text-sm font-medium text-white active:bg-blue-700"
        >
          再読み込み
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 border active:bg-slate-50"
        >
          マイページに戻る
        </button>
      </footer>
    </div>
  );
}

function QuestionnaireInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const reserveId = String(searchParams.get("reserveId") || "").trim();

  const { data: checkData, error: swrError, isLoading: checking, mutate } = useSWR<{
    ok?: boolean;
    exists?: boolean;
    error?: string;
  }>(
    reserveId ? `/api/intake/has?reserveId=${encodeURIComponent(reserveId)}` : null,
    swrFetcher
  );

  const exists = !!checkData?.exists;
  const error = swrError
    ? swrError.message?.includes("401")
      ? "ログイン情報が確認できませんでした。LINEログイン後に再度お試しください。"
      : "通信エラーが発生しました。"
    : checkData && !checkData.ok
      ? checkData.error === "unauthorized"
        ? "ログイン情報が確認できませんでした。LINEログイン後に再度お試しください。"
        : "サーバーとの通信に失敗しました。"
      : "";

  // reserveId が無い / 空のときは問診を出さない
  if (!reserveId) {
    return <MissingReserveUI onBack={() => router.push("/mypage")} />;
  }

  // 確認中
  if (checking) {
    return <CheckingUI />;
  }

  // 確認エラー
  if (error) {
    return (
      <CheckErrorUI
        message={error}
        onRetry={() => mutate()}
        onBack={() => router.push("/mypage")}
      />
    );
  }

  // 既に回答済み
  if (exists) {
    return <AlreadyAnsweredUI onBack={() => router.push("/mypage")} />;
  }

  // 未回答 → 通常の問診
  return <QuestionnairePage reserveId={reserveId} />;
}

export default function Page() {
  return (
    <Suspense fallback={<CheckingUI />}>
      <QuestionnaireInner />
    </Suspense>
  );
}
