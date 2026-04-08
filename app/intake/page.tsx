// app/intake/page.tsx
"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import LegalSection from "@/app/reserve/_components/LegalSection";
import type { IntakeFormField, IntakeFormSettings } from "@/lib/intake-form-defaults";
import { DEFAULT_INTAKE_FIELDS, DEFAULT_INTAKE_SETTINGS } from "@/lib/intake-form-defaults";

// SWRProviderのスコープ外（患者向けページ）なのでfetcherを明示指定
const swrFetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

type AnswerMap = Record<string, string>;

interface ActiveForm {
  id: string;
  name: string;
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

// ============================================================
// 問診フォーム選択画面
// ============================================================

function FormSelectUI({
  forms,
  onSelect,
  onBack,
}: {
  forms: ActiveForm[];
  onSelect: (templateId: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-semibold">問診フォーム選択</h1>
      </header>
      <main className="flex-1 px-4 py-6">
        <p className="text-sm text-gray-600 mb-4">
          該当する問診を選択してください
        </p>
        <div className="space-y-3">
          {forms.map((form) => (
            <button
              key={form.id}
              onClick={() => onSelect(form.id)}
              className="w-full bg-white rounded-xl shadow-sm p-4 text-left hover:bg-blue-50 active:bg-blue-100 transition-colors border border-gray-200"
            >
              <span className="text-base font-semibold text-gray-800">{form.name}</span>
              <span className="block text-xs text-gray-400 mt-0.5">タップして問診を開始</span>
            </button>
          ))}
        </div>
      </main>
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
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

// ============================================================
// メイン問診コンポーネント
// ============================================================

function IntakePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fieldId = searchParams.get("fieldId");
  const urlTemplateId = searchParams.get("templateId");

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const [blocked, setBlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [legalAgreed, setLegalAgreed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 入力不足などフォーム内の軽いエラー
  const [inlineError, setInlineError] = useState<string | null>(null);

  // ★ 入場時のPID既回答チェック
  const [checking, setChecking] = useState(true);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [checkError, setCheckError] = useState<string>("");

  // ★ テンプレート選択
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(urlTemplateId);

  // テナント設定（予約制かどうか）
  const { data: mpSettings } = useSWR<{
    config?: { sections?: { showReserveButton?: boolean } };
  }>("/api/mypage/settings", swrFetcher);
  const showReserve = mpSettings?.config?.sections?.showReserveButton !== false;

  // アクティブフォーム一覧を取得（選択画面用）
  const { data: activeFormsData, isLoading: formsLoading } = useSWR<{ forms: ActiveForm[] }>(
    "/api/intake/active-forms",
    swrFetcher,
  );
  const activeForms = activeFormsData?.forms ?? [];

  // フォームが1つだけなら自動選択
  useEffect(() => {
    if (!selectedTemplateId && activeForms.length === 1) {
      setSelectedTemplateId(activeForms[0].id);
    }
  }, [activeForms, selectedTemplateId]);

  // ★ 動的フォーム定義（SWRで取得）
  const formDefinitionUrl = selectedTemplateId
    ? `/api/intake/form-definition?templateId=${selectedTemplateId}`
    : fieldId
      ? `/api/intake/form-definition?fieldId=${fieldId}`
      : selectedTemplateId === null && activeForms.length <= 1
        ? "/api/intake/form-definition"
        : null; // 未選択時はフェッチしない

  const { data: formData, isLoading: formLoading } = useSWR<{
    templateId?: string;
    fields?: IntakeFormField[];
    settings?: Partial<IntakeFormSettings>;
  }>(formDefinitionUrl, swrFetcher);

  const questionItems = formData?.fields?.length ? formData.fields : DEFAULT_INTAKE_FIELDS;
  const formSettings = formData?.settings
    ? { ...DEFAULT_INTAKE_SETTINGS, ...formData.settings }
    : DEFAULT_INTAKE_SETTINGS;

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

  const getNextIndex = useCallback((index: number) => {
    let next = index + 1;
    while (next < total && !isVisible(questionItems[next])) next++;
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, questionItems, answers]);

  const getPrevIndex = useCallback((index: number) => {
    let prev = index - 1;
    while (prev >= 0 && !isVisible(questionItems[prev])) prev--;
    return prev;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionItems, answers]);

  const isLastVisible = useMemo(
    () => getNextIndex(currentIndex) >= total,
    [getNextIndex, currentIndex, total]
  );

  const progressPercent = ((currentIndex + 1) / total) * 100;

  // 確認画面用: 表示対象のフィールド一覧
  const visibleFields = useMemo(
    () => questionItems.filter((f) => isVisible(f)),
    [questionItems, answers], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const goToMypage = () => {
    router.push("/mypage");
  };

const runPidCheck = useCallback(async () => {
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

    const j = await res.json().catch(() => ({} as Record<string, unknown>));

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
}, []);

  useEffect(() => {
    let canceled = false;
    (async () => {
      await runPidCheck();
      if (canceled) return;
    })();
    return () => {
      canceled = true;
    };
  }, [runPidCheck]);

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

    // 最終問の次 → 確認画面を表示
    if (isLast) {
      setShowConfirm(true);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // 次の設問へ
    setCurrentIndex(nextIndex);
  };

  // 確認画面から送信
  const handleConfirmSubmit = async () => {
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
          field_id: fieldId || undefined,
          template_id: selectedTemplateId || formData?.templateId || undefined,
          submittedAt: new Date().toISOString(),
        }),
      });

      if (res.status === 401) {
        alert("患者情報が取得できませんでした。マイページからやり直してください。");
        router.push("/mypage");
        return;
      }

      if (!res.ok) throw new Error("failed");
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!data.ok) throw new Error("failed");

      if (typeof window !== "undefined") {
        window.localStorage.setItem("has_intake", "1");
      }

      if (!showReserve) {
        router.push("/mypage");
      } else {
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
        } catch {}
        router.push("/reserve");
      }
    } catch (e) {
      console.error(e);
      alert("送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSubmitting(false);
    }
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
      case "date":
        return (
          <input
            type="date"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
            value={answers[current.id] || ""}
            onChange={(e) =>
              setAnswers({ ...answers, [current.id]: e.target.value })
            }
          />
        );
      case "image": {
        const currentUrl = answers[current.id] || "";
        const [uploading, setUploading] = React.useState(false);
        const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          // 10MBチェック
          if (file.size > 10 * 1024 * 1024) {
            alert("ファイルサイズは10MB以下にしてください");
            return;
          }
          // 画像MIMEチェック
          if (!file.type.startsWith("image/")) {
            alert("画像ファイル（jpeg、jpg、png、gif、heic）のみ添付できます。");
            return;
          }
          setUploading(true);
          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("field_id", current.id);
            const res = await fetch("/api/intake/upload", {
              method: "POST",
              credentials: "include",
              body: formData,
            });
            if (!res.ok) throw new Error("アップロードに失敗しました");
            const data = await res.json();
            setAnswers({ ...answers, [current.id]: data.file_url });
          } catch (err) {
            alert(err instanceof Error ? err.message : "アップロードに失敗しました");
          } finally {
            setUploading(false);
          }
        };
        return (
          <div className="space-y-2">
            <label className="flex items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100 transition">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/heic"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <span className="text-sm text-gray-500">
                {uploading ? "アップロード中..." : currentUrl ? "画像を変更する" : "画像を選択してください"}
              </span>
            </label>
            {currentUrl && (
              <div className="relative">
                <img src={currentUrl} alt="アップロード画像" className="w-full max-h-48 object-contain rounded-lg border border-gray-200" />
                <p className="text-xs text-green-600 mt-1">アップロード完了</p>
              </div>
            )}
            <p className="text-xs text-gray-400">画像（jpeg、jpg、png、gif、heic）のみ添付できます。</p>
          </div>
        );
      }
      default:
        return null;
    }
  };

  // ★ 入場時チェック or フォーム一覧ロード中
  if (checking || formsLoading) return <CheckingUI />;

  if (checkError) {
    return <CheckErrorUI message={checkError} onRetry={runPidCheck} onBack={goToMypage} />;
  }

  if (alreadyAnswered) {
    return <AlreadyAnsweredUI onBack={goToMypage} />;
  }

  // ★ 複数フォームがある場合はテンプレート選択画面を表示
  if (!selectedTemplateId && activeForms.length > 1) {
    return (
      <FormSelectUI
        forms={activeForms}
        onSelect={(id) => setSelectedTemplateId(id)}
        onBack={goToMypage}
      />
    );
  }

  // フォーム定義ロード中
  if (formLoading) return <CheckingUI />;

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

  // 確認画面
  if (showConfirm) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">回答内容の確認</h1>
        </header>

        <div className="h-1.5 bg-gray-200">
          <div className="h-1.5 bg-blue-500 w-full" />
        </div>

        <main className="flex-1 px-4 py-6 space-y-4 pb-32">
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <p className="text-sm text-gray-600">以下の内容で問診を送信します。内容をご確認ください。</p>
            {visibleFields.map((field) => {
              const val = answers[field.id];
              if (val === undefined || val === null || val === "") return null;
              // optionsがある場合はvalueをlabelに変換して表示
              const toLabel = (v: string) => {
                if (!field.options?.length) return v;
                const opt = field.options.find((o: { value?: string; label?: string }) =>
                  (o.value ?? o.label) === v
                );
                return opt?.label || v;
              };
              const displayVal = Array.isArray(val) ? val.map(toLabel).join(", ") : toLabel(String(val));
              const fieldIndex = questionItems.indexOf(field);
              return (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(fieldIndex);
                    setShowConfirm(false);
                  }}
                  className="w-full text-left border-b border-gray-100 pb-2 hover:bg-gray-50 rounded px-1 -mx-1 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{field.label}</p>
                      <p className="text-sm text-gray-900 mt-0.5">{displayVal}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>

          <LegalSection agreed={legalAgreed} onAgree={setLegalAgreed} />
        </main>

        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex gap-3">
          <button
            onClick={() => { setShowConfirm(false); }}
            className="flex-1 rounded-full border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 bg-white active:bg-gray-100"
          >
            戻る
          </button>
          <button
            onClick={handleConfirmSubmit}
            disabled={submitting || !legalAgreed}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium text-white ${
              submitting || !legalAgreed ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 active:bg-blue-700"
            }`}
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                送信中…
              </div>
            ) : "同意して送信する"}
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

export default function IntakePage() {
  return (
    <Suspense fallback={<CheckingUI />}>
      <IntakePageInner />
    </Suspense>
  );
}
