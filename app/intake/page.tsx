// app/intake/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { IntakeFormField, IntakeFormSettings } from "@/lib/intake-form-defaults";
import { DEFAULT_INTAKE_FIELDS, DEFAULT_INTAKE_SETTINGS } from "@/lib/intake-form-defaults";

type AnswerMap = Record<string, string>;

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
        <h1 className="text-lg font-semibold">問診は回答済みです</h1>
      </header>
      <main className="flex-1 px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm p-4 text-sm text-gray-700 space-y-3">
          <p>問診は1回のみ入力できます。</p>
          <p>予約や発送状況はマイページでご確認ください。</p>
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

export default function IntakePage() {
  const router = useRouter();

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const [blocked, setBlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 入力不足などフォーム内の軽いエラー
  const [inlineError, setInlineError] = useState<string | null>(null);

  // ★ 入場時のPID既回答チェック
  const [checking, setChecking] = useState(true);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [checkError, setCheckError] = useState<string>("");

  // ★ 動的フォーム定義
  const [questionItems, setQuestionItems] = useState<IntakeFormField[]>(DEFAULT_INTAKE_FIELDS);
  const [formSettings, setFormSettings] = useState<IntakeFormSettings>(DEFAULT_INTAKE_SETTINGS);
  const [formLoading, setFormLoading] = useState(true);

  // フォーム定義をAPIから取得
  useEffect(() => {
    fetch("/api/intake/form-definition")
      .then((r) => r.json())
      .then((data) => {
        if (data.fields?.length) {
          setQuestionItems(data.fields);
        }
        if (data.settings) {
          setFormSettings({ ...DEFAULT_INTAKE_SETTINGS, ...data.settings });
        }
      })
      .catch(() => {
        // フォールバック: デフォルト値を使用
      })
      .finally(() => setFormLoading(false));
  }, []);

  const total = questionItems.length;
  const current = questionItems[currentIndex];

  const isVisible = (q: IntakeFormField) => {
    if (!q.conditional) return true;
    return answers[q.conditional.when] === q.conditional.value;
  };

  const validate = () => {
    if (!current.required) return true;
    if (!isVisible(current)) return true;
    const v = answers[current.id]?.trim();
    return !!v;
  };

  const getNextIndex = (index: number) => {
    let next = index + 1;
    while (next < total && !isVisible(questionItems[next])) next++;
    return next;
  };

  const getPrevIndex = (index: number) => {
    let prev = index - 1;
    while (prev >= 0 && !isVisible(questionItems[prev])) prev--;
    return prev;
  };

  const isLastVisible = useMemo(
    () => getNextIndex(currentIndex) >= total,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIndex, answers, questionItems]
  );

  const progressPercent = ((currentIndex + 1) / total) * 100;

  const goToMypage = () => {
    router.push("/mypage");
  };

const runPidCheck = async () => {
  setChecking(true);
  setCheckError("");

  try {
    const res = await fetch("/api/mypage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({}),
    });

    // 未ログイン（patient_id cookie なし）など
    if (res.status === 401) {
      setCheckError("ログイン情報が確認できませんでした。マイページからやり直してください。");
      setAlreadyAnswered(false);
      return;
    }

    const j = await res.json().catch(() => ({} as any));

    if (!res.ok || !j?.ok) {
      setCheckError("サーバーとの通信に失敗しました。");
      setAlreadyAnswered(false);
      return;
    }

    // ★ /api/mypage の真実源
    setAlreadyAnswered(j.hasIntake === true);

  } catch {
    setCheckError("通信エラーが発生しました。");
    setAlreadyAnswered(false);
  } finally {
    setChecking(false);
  }
};

  useEffect(() => {
    let canceled = false;
    (async () => {
      await runPidCheck();
      if (canceled) return;
    })();
    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = async () => {
    if (!validate()) {
      setInlineError("入力が必要です");
      return;
    }
    setInlineError(null);

    // ★ 動的NG判定: ng_block フラグが立っているフィールドで値が一致したらブロック
    if (current.ng_block && answers[current.id] === current.ng_block_value) {
      setBlocked(true);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    const nextIndex = getNextIndex(currentIndex);
    const isLast = nextIndex >= total;

    // 最終送信
    if (isLast) {
      if (submitting) return;
      setSubmitting(true);

      try {
        const res = await fetch("/api/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            type: "intake",
            answers,
            submittedAt: new Date().toISOString(),
          }),
        });

        // 未連携（patient_id cookie無し）など
        if (res.status === 401) {
          alert("患者情報が取得できませんでした。マイページからやり直してください。");
          router.push("/mypage");
          return;
        }

        if (!res.ok) throw new Error("failed");
        const data = await res.json().catch(() => ({} as any));
        if (!data.ok) throw new Error("failed");

        // 問診済みフラグ（真偽値だけ）
        if (typeof window !== "undefined") {
          window.localStorage.setItem("has_intake", "1");
        }

        // 予約済みならマイページへ、未予約なら予約ページへ
        try {
          const mpRes = await fetch("/api/mypage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ refresh: true }),
          });
          const mpData = await mpRes.json().catch(() => ({}));
          if (mpData.nextReservation) {
            router.push("/mypage");
            return;
          }
        } catch {
          // エラー時はデフォルトで予約ページへ
        }
        router.push("/reserve");
      } catch (e) {
        console.error(e);
        alert("送信に失敗しました。時間をおいて再度お試しください。");
      } finally {
        setSubmitting(false);
      }

      return;
    }

    // 次の設問へ
    setCurrentIndex(nextIndex);
  };

  const handlePrev = () => {
    const prev = getPrevIndex(currentIndex);
    if (prev >= 0) setCurrentIndex(prev);
  };

  const renderInput = () => {
    switch (current.type) {
      case "textarea":
        return (
          <textarea
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
            rows={4}
            placeholder={current.placeholder}
            value={answers[current.id] || ""}
            onChange={(e) =>
              setAnswers({ ...answers, [current.id]: e.target.value })
            }
          />
        );
      case "text":
        return (
          <input
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
            placeholder={current.placeholder}
            value={answers[current.id] || ""}
            onChange={(e) =>
              setAnswers({ ...answers, [current.id]: e.target.value })
            }
          />
        );
      case "radio":
        return (
          <div className="flex flex-col gap-2">
            {current.options?.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={current.id}
                  value={opt.value}
                  checked={answers[current.id] === opt.value}
                  onChange={() =>
                    setAnswers({ ...answers, [current.id]: opt.value })
                  }
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        );
      case "dropdown":
        return (
          <select
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
            value={answers[current.id] || ""}
            onChange={(e) =>
              setAnswers({ ...answers, [current.id]: e.target.value })
            }
          >
            <option value="">選択してください</option>
            {current.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case "checkbox":
        return (
          <div className="flex flex-col gap-2">
            {current.options?.map((opt) => {
              const vals = answers[current.id] ? answers[current.id].split(",") : [];
              const checked = vals.includes(opt.value);
              return (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? vals.filter((v) => v !== opt.value)
                        : [...vals, opt.value];
                      setAnswers({ ...answers, [current.id]: next.filter(Boolean).join(",") });
                    }}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        );
      default:
        return null;
    }
  };

  // ★ 入場時チェック or フォーム定義ロード中
  if (checking || formLoading) return <CheckingUI />;

  if (checkError) {
    return <CheckErrorUI message={checkError} onRetry={runPidCheck} onBack={goToMypage} />;
  }

  if (alreadyAnswered) {
    return <AlreadyAnsweredUI onBack={goToMypage} />;
  }

  // 禁忌に該当した場合の画面（動的メッセージ対応）
  if (blocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">
            {formSettings.ng_block_title || "オンライン処方の対象外です"}
          </h1>
        </header>

        <main className="flex-1 px-4 py-6">
          <div className="bg-white rounded-xl shadow-sm p-4 text-sm text-gray-700 space-y-3">
            <p>
              {formSettings.ng_block_message ||
                "恐れ入りますが、問診項目のいずれかに該当する場合はオンラインでの処方ができかねます。"}
            </p>
            <p>お手数ですが、対面診療が可能な医療機関でのご相談をご検討ください。</p>
          </div>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
          <button
            type="button"
            onClick={goToMypage}
            className="w-full rounded-full bg-blue-600 px-3 py-2 text-sm font-medium text-white active:bg-blue-700"
          >
            マイページに戻る
          </button>
        </footer>
      </div>
    );
  }

  // 通常の問診画面（動的設定対応）
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{formSettings.header_title || "問診"}</h1>
        </div>
        <div className="text-right text-xs text-gray-500">
          {formSettings.estimated_time && (
            <span className="block">{formSettings.estimated_time}</span>
          )}
          <span className="block mt-1">
            質問 {currentIndex + 1} / {total}
          </span>
        </div>
      </header>

      {/* 進捗バー */}
      <div className="h-1.5 bg-gray-200">
        <div className="h-1.5 bg-blue-500 transition-all" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* 本文 */}
      <main className="flex-1 px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-base font-semibold whitespace-pre-line">{current.label}</h2>

          {current.description && (
            <p className="mt-2 text-xs text-gray-600 whitespace-pre-line">{current.description}</p>
          )}

          <div className="mt-4">{renderInput()}</div>

          {inlineError && <p className="mt-2 text-xs text-red-600 font-medium">{inlineError}</p>}
        </div>
      </main>

      {/* フッター */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex gap-3">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium ${
            currentIndex === 0
              ? "border-gray-200 text-gray-300 bg-gray-50"
              : "border-gray-300 text-gray-700 bg-white active:bg-gray-100"
          }`}
        >
          戻る
        </button>

        <button
          onClick={handleNext}
          disabled={submitting}
          className={`flex-1 rounded-full px-3 py-2 text-sm font-medium text-white ${
            submitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 active:bg-blue-700"
          }`}
        >
          {submitting ? (
            <div className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              送信中…
            </div>
          ) : isLastVisible ? (
            "回答を送信する"
          ) : (
            "次へ"
          )}
        </button>
      </footer>
    </div>
  );
}
