"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";

// ============================================================
// 型定義
// ============================================================

interface FormField {
  id: string;
  type: string;
  label: string;
  description: string;
  placeholder: string;
  required: boolean;
  options: string[];
  min_length: number | null;
  max_length: number | null;
}

interface FormDisplayData {
  title: string;
  description: string;
  fields: FormField[];
  settings: {
    confirm_dialog: boolean;
    confirm_text: string;
    confirm_button_text: string;
  };
}

const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県",
  "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県",
  "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

// ============================================================
// フィールドレンダラー
// ============================================================

function FieldRenderer({
  field,
  value,
  onChange,
  slug,
}: {
  field: FormField;
  value: unknown;
  onChange: (val: unknown) => void;
  slug: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const inputCls = "w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-400/30 focus:border-pink-400 transition-all";

  switch (field.type) {
    case "heading_sm":
      return <h3 className="text-base font-bold text-slate-800 pt-2">{field.label}</h3>;

    case "heading_md":
      return <h2 className="text-lg font-bold text-slate-900 pt-3 pb-1 border-b border-slate-200">{field.label}</h2>;

    case "text":
      return (
        <input
          type="text"
          value={(value as string) || ""}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.max_length || undefined}
          className={inputCls}
        />
      );

    case "textarea":
      return (
        <textarea
          value={(value as string) || ""}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.max_length || undefined}
          rows={4}
          className={`${inputCls} resize-none`}
        />
      );

    case "radio":
      return (
        <div className="space-y-2">
          {field.options.map((opt, i) => (
            <label
              key={i}
              onClick={() => onChange(opt)}
              className={`flex items-center gap-3 cursor-pointer px-4 py-2.5 rounded-lg border transition-all ${
                value === opt ? "border-pink-400 bg-pink-50/50" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${value === opt ? "border-pink-500" : "border-slate-300"}`}>
                {value === opt && <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />}
              </div>
              <span className="text-sm text-slate-800">{opt}</span>
            </label>
          ))}
        </div>
      );

    case "checkbox":
      return (
        <div className="space-y-2">
          {field.options.map((opt, i) => {
            const checked = Array.isArray(value) && value.includes(opt);
            return (
              <label
                key={i}
                className={`flex items-center gap-3 cursor-pointer px-4 py-2.5 rounded-lg border transition-all ${
                  checked ? "border-pink-400 bg-pink-50/50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const arr = Array.isArray(value) ? [...value] : [];
                    if (checked) onChange(arr.filter(v => v !== opt));
                    else onChange([...arr, opt]);
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-pink-500 focus:ring-pink-400"
                />
                <span className="text-sm text-slate-800">{opt}</span>
              </label>
            );
          })}
        </div>
      );

    case "dropdown":
      return (
        <select
          value={(value as string) || ""}
          onChange={e => onChange(e.target.value)}
          className={inputCls}
        >
          <option value="">選択してください</option>
          {field.options.map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case "prefecture":
      return (
        <select
          value={(value as string) || ""}
          onChange={e => onChange(e.target.value)}
          className={inputCls}
        >
          <option value="">選択してください</option>
          {PREFECTURES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      );

    case "date":
      return (
        <input
          type="date"
          value={(value as string) || ""}
          onChange={e => onChange(e.target.value)}
          className={inputCls}
        />
      );

    case "file":
      return (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={async e => {
              const f = e.target.files?.[0];
              if (!f) return;
              setUploading(true);
              const fd = new FormData();
              fd.append("file", f);
              fd.append("field_id", field.id);
              const res = await fetch(`/api/forms/${slug}/upload`, { method: "POST", body: fd });
              const data = await res.json();
              setUploading(false);
              if (data.ok) {
                onChange({ url: data.file_url, name: data.file_name });
              }
            }}
          />
          {value && (value as { name: string }).name ? (
            <div className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-lg bg-slate-50">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              <span className="text-sm text-slate-600 flex-1 truncate">{(value as { name: string }).name}</span>
              <button onClick={() => onChange(null)} className="text-xs text-red-500 hover:underline">削除</button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-slate-400 hover:text-slate-600 transition-all w-full"
            >
              {uploading ? "アップロード中..." : "ファイルを選択"}
            </button>
          )}
        </div>
      );

    default:
      return null;
  }
}

// ============================================================
// メインコンポーネント
// ============================================================

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  const [formData, setFormData] = useState<FormDisplayData | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [thanksMessage, setThanksMessage] = useState("");

  useEffect(() => {
    const url = isPreview ? `/api/forms/${slug}?preview=1` : `/api/forms/${slug}`;
    fetch(url, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.error) setPageError(data.error);
        else if (data.form) setFormData(data.form);
      })
      .catch(() => setPageError("読み込みに失敗しました"));
  }, [slug, isPreview]);

  const handleSubmit = async () => {
    if (!formData) return;
    setError(null);

    // 確認ダイアログ
    if (formData.settings.confirm_dialog) {
      if (!confirm(formData.settings.confirm_text || "この内容で送信しますか？")) return;
    }

    setSubmitting(true);

    // LINEユーザーIDを取得（LIFF等から、未実装の場合はnull）
    let lineUserId: string | null = null;
    if (typeof window !== "undefined") {
      // LIFFからの取得は今後対応
      const params = new URLSearchParams(window.location.search);
      lineUserId = params.get("line_user_id");
    }

    // プレビューモードでは実際に送信しない
    if (isPreview) {
      setSubmitting(false);
      setThanksMessage(
        (formData?.settings as unknown as Record<string, string>)?.confirm_text
          ? "（プレビュー）送信は行われませんでした。"
          : "（プレビュー）送信は行われませんでした。"
      );
      setDone(true);
      return;
    }

    const res = await fetch(`/api/forms/${slug}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers,
        line_user_id: lineUserId,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || "送信に失敗しました");
      return;
    }

    // 完了
    if (data.thanks_url) {
      window.location.href = data.thanks_url;
    } else {
      setThanksMessage(data.thanks_message || "回答を受け付けました。");
      setDone(true);
    }
  };

  // ローディング
  if (!formData && !pageError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f0f0]">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-400 rounded-full animate-spin" />
      </div>
    );
  }

  // エラーページ
  if (pageError) {
    return (
      <div className="min-h-screen bg-[#f0f0f0]">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
          <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between">
            <Image src="/images/company-name-v2.png" alt="clinic logo" width={150} height={40} className="object-contain" />
          </div>
        </header>
        <main className="mx-auto max-w-lg pb-10">
          <div className="bg-white mt-2 px-6 py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm text-slate-600">{pageError}</p>
          </div>
        </main>
      </div>
    );
  }

  // 完了
  if (done) {
    return (
      <div className="min-h-screen bg-[#f0f0f0]">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
          <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between">
            <Image src="/images/company-name-v2.png" alt="clinic logo" width={150} height={40} className="object-contain" />
          </div>
        </header>
        <main className="mx-auto max-w-lg pb-10">
          <div className="bg-white mt-2 px-6 py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{thanksMessage}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!formData) return null;

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      {/* プレビューバナー */}
      {isPreview && (
        <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium sticky top-0 z-30">
          プレビューモード（回答は送信されません）
        </div>
      )}
      {/* ヘッダー */}
      <header className={`${isPreview ? "" : "sticky top-0"} z-20 bg-white border-b border-slate-200 shadow-sm`}>
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between">
          <Image src="/images/company-name-v2.png" alt="clinic logo" width={150} height={40} className="object-contain" />
          <span className="text-[10px] text-slate-400">{formData.title}</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg pb-10">
        {/* タイトル */}
        <div className="bg-white px-6 pt-6 pb-4 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900">{formData.title}</h1>
          {formData.description && (
            <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-line">{formData.description}</p>
          )}
        </div>

        {/* エラー */}
        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs text-red-700 whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* フィールド */}
        <div className="bg-white mt-2 px-6 py-6 space-y-6">
          {formData.fields.map(field => {
            if (field.type === "heading_sm" || field.type === "heading_md") {
              return (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={null}
                  onChange={() => {}}
                  slug={slug}
                />
              );
            }

            return (
              <div key={field.id}>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-1.5">
                  {field.label}
                  {field.required && (
                    <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">必須</span>
                  )}
                </label>
                {field.description && (
                  <p className="text-xs text-slate-400 mb-2">{field.description}</p>
                )}
                <FieldRenderer
                  field={field}
                  value={answers[field.id]}
                  onChange={val => setAnswers(prev => ({ ...prev, [field.id]: val }))}
                  slug={slug}
                />
              </div>
            );
          })}

          {/* 送信ボタン */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-[#5B9BD5] hover:bg-[#4A8BC5] text-white text-base font-semibold shadow-lg shadow-blue-200/50 disabled:opacity-60 transition-all"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                送信中...
              </span>
            ) : (
              formData.settings.confirm_button_text || "送信"
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
