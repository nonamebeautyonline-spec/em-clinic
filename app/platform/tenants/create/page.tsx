"use client";

// app/platform/tenants/create/page.tsx
// テナント作成ウィザード — 3ステップ + 確認画面

import { useState } from "react";
import { useRouter } from "next/navigation";

// ステップの定義
type WizardStep = 1 | 2 | 3 | 4; // 4 = 確認画面

interface FormData {
  // Step 1: 基本情報
  name: string;
  slug: string;
  industry: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  // Step 2: 初期管理者
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminPasswordConfirm: string;
  // Step 3: LINE設定 + プラン
  lineChannelId: string;
  lineChannelSecret: string;
  lineAccessToken: string;
  planName: string;
  monthlyFee: number;
  setupFee: number;
  messageQuota: number;
  overageUnitPrice: number;
  // AIオプション
  aiOptions: string[];
}

const initialFormData: FormData = {
  name: "",
  slug: "",
  industry: "clinic",
  contactEmail: "",
  contactPhone: "",
  address: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  adminPasswordConfirm: "",
  lineChannelId: "",
  lineChannelSecret: "",
  lineAccessToken: "",
  planName: "standard",
  monthlyFee: 17000,
  setupFee: 300000,
  messageQuota: 30000,
  overageUnitPrice: 0.7,
  aiOptions: [],
};

// メッセージプラン定義（Lステップ2割減・税込）
const PLANS = [
  {
    key: "light",
    label: "ライト",
    desc: "5,000通/月",
    monthly: 4000,
    setup: 300000,
    quota: 5000,
    overagePrice: 1.0,
    color: "border-slate-300 bg-slate-50",
    badge: "bg-slate-100 text-slate-700",
  },
  {
    key: "standard",
    label: "スタンダード",
    desc: "30,000通/月",
    monthly: 17000,
    setup: 300000,
    quota: 30000,
    overagePrice: 0.7,
    color: "border-blue-300 bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
    recommended: true,
  },
  {
    key: "pro",
    label: "プロ",
    desc: "50,000通/月",
    monthly: 26000,
    setup: 300000,
    quota: 50000,
    overagePrice: 0.6,
    color: "border-indigo-300 bg-indigo-50",
    badge: "bg-indigo-100 text-indigo-700",
  },
  {
    key: "business",
    label: "ビジネス",
    desc: "100,000通/月",
    monthly: 70000,
    setup: 300000,
    quota: 100000,
    overagePrice: 0.5,
    color: "border-purple-300 bg-purple-50",
    badge: "bg-purple-100 text-purple-700",
  },
  {
    key: "business_30",
    label: "ビジネス30万",
    desc: "300,000通/月",
    monthly: 105000,
    setup: 300000,
    quota: 300000,
    overagePrice: 0.4,
    color: "border-emerald-300 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
  },
  {
    key: "business_50",
    label: "ビジネス50万",
    desc: "500,000通/月",
    monthly: 115000,
    setup: 300000,
    quota: 500000,
    overagePrice: 0.3,
    color: "border-teal-300 bg-teal-50",
    badge: "bg-teal-100 text-teal-700",
  },
  {
    key: "business_100",
    label: "ビジネス100万",
    desc: "1,000,000通/月",
    monthly: 158000,
    setup: 300000,
    quota: 1000000,
    overagePrice: 0.2,
    color: "border-amber-300 bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
  },
];

// AIオプション定義
const AI_OPTIONS_UI = [
  { key: "ai_reply", label: "AI返信", price: 20000, desc: "AIによるLINE自動返信" },
  { key: "voice_input", label: "音声入力", price: 15000, desc: "音声からテキスト変換" },
  { key: "ai_karte", label: "AIカルテ", price: 20000, desc: "AI自動カルテ生成" },
];

export default function CreateTenantPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showToast, setShowToast] = useState(false);

  // フォーム値更新ヘルパー
  const updateField = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // エラーをクリア
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // slug自動生成（名前から）
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, "")
      .replace(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, "")
      .slice(0, 30);
  };

  // ステップ1バリデーション
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = "クリニック名は必須です";
    if (!formData.slug.trim()) {
      errs.slug = "スラグは必須です";
    } else if (formData.slug.length < 2) {
      errs.slug = "スラグは2文字以上です";
    } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(formData.slug) && formData.slug.length >= 2) {
      errs.slug = "英小文字・数字・ハイフンのみ（先頭末尾はハイフン不可）";
    }
    if (
      formData.contactEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)
    ) {
      errs.contactEmail = "有効なメールアドレスを入力してください";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ステップ2バリデーション
  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.adminName.trim()) errs.adminName = "管理者名は必須です";
    if (!formData.adminEmail.trim()) {
      errs.adminEmail = "メールアドレスは必須です";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      errs.adminEmail = "有効なメールアドレスを入力してください";
    }
    if (!formData.adminPassword) {
      errs.adminPassword = "パスワードは必須です";
    } else if (formData.adminPassword.length < 8) {
      errs.adminPassword = "パスワードは8文字以上です";
    }
    if (formData.adminPassword !== formData.adminPasswordConfirm) {
      errs.adminPasswordConfirm = "パスワードが一致しません";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // 次のステップへ
  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(s + 1, 4) as WizardStep);
  };

  // 前のステップへ
  const goBack = () => {
    setStep((s) => Math.max(s - 1, 1) as WizardStep);
  };

  // プラン選択
  const selectPlan = (plan: (typeof PLANS)[number]) => {
    updateField("planName", plan.key);
    updateField("monthlyFee", plan.monthly);
    updateField("setupFee", plan.setup);
    updateField("messageQuota", plan.quota);
    updateField("overageUnitPrice", plan.overagePrice);
  };

  // AIオプション切替
  const toggleOption = (optionKey: string) => {
    setFormData((prev) => {
      const current = prev.aiOptions;
      const next = current.includes(optionKey)
        ? current.filter((k) => k !== optionKey)
        : [...current, optionKey];
      return { ...prev, aiOptions: next };
    });
  };

  // 月額合計計算
  const totalMonthly =
    formData.monthlyFee +
    AI_OPTIONS_UI.filter((o) => formData.aiOptions.includes(o.key)).reduce(
      (sum, o) => sum + o.price,
      0
    );

  // テナント作成実行
  const handleSubmit = async () => {
    setSubmitting(true);
    setApiError("");

    try {
      const res = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          industry: formData.industry,
          contactEmail: formData.contactEmail || undefined,
          contactPhone: formData.contactPhone || undefined,
          address: formData.address || undefined,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
          lineChannelId: formData.lineChannelId || undefined,
          lineChannelSecret: formData.lineChannelSecret || undefined,
          lineAccessToken: formData.lineAccessToken || undefined,
          planName: formData.planName,
          monthlyFee: formData.monthlyFee,
          setupFee: formData.setupFee,
          messageQuota: formData.messageQuota,
          overageUnitPrice: formData.overageUnitPrice,
          aiOptions: formData.aiOptions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "テナントの作成に失敗しました");
      }

      // 成功トースト表示
      setShowToast(true);
      setTimeout(() => {
        router.push("/platform/tenants");
      }, 1500);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  // 金額フォーマット
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);

  // ステップ情報
  const steps = [
    { num: 1, label: "基本情報" },
    { num: 2, label: "管理者" },
    { num: 3, label: "LINE/プラン" },
    { num: 4, label: "確認" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 成功トースト */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          テナントを作成しました
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* ヘッダー + 戻るボタン */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/platform/tenants")}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            テナント一覧に戻る
          </button>
          <h1 className="text-2xl font-bold text-slate-900">テナント新規作成</h1>
          <p className="mt-1 text-sm text-slate-500">新しいクリニックテナントを登録します</p>
        </div>

        {/* ステップインジケーター */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {steps.map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      step >= s.num
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {step > s.num ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      s.num
                    )}
                  </div>
                  <span
                    className={`mt-1.5 text-xs font-medium ${
                      step >= s.num ? "text-blue-600" : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 mt-[-18px] ${
                      step > s.num ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          {/* プログレスバー */}
          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* APIエラー */}
        {apiError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {apiError}
          </div>
        )}

        {/* ステップ内容 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 sm:p-8">
          {/* Step 1: 基本情報 */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-6">基本情報</h2>
              <div className="space-y-5">
                {/* クリニック名 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    クリニック名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      updateField("name", e.target.value);
                      // slugが未入力なら自動生成
                      if (!formData.slug || formData.slug === generateSlug(formData.name)) {
                        updateField("slug", generateSlug(e.target.value));
                      }
                    }}
                    placeholder="例: のなめ美容クリニック"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? "border-red-300 bg-red-50" : "border-slate-300"
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* slug */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    スラグ (URL) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) =>
                        updateField(
                          "slug",
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                        )
                      }
                      placeholder="例: noname-beauty"
                      className={`flex-1 px-4 py-2.5 border rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${
                        errors.slug ? "border-red-300 bg-red-50" : "border-slate-300"
                      }`}
                    />
                    <span className="px-4 py-2.5 bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg text-sm text-slate-500 font-mono">
                      .lope.jp
                    </span>
                  </div>
                  {formData.slug && !errors.slug && (
                    <p className="mt-1 text-xs text-slate-500">
                      URL: https://{formData.slug}.lope.jp
                    </p>
                  )}
                  {errors.slug && (
                    <p className="mt-1 text-xs text-red-600">{errors.slug}</p>
                  )}
                </div>

                {/* メールアドレス */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    連絡先メール
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => updateField("contactEmail", e.target.value)}
                    placeholder="info@example.com"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.contactEmail ? "border-red-300 bg-red-50" : "border-slate-300"
                    }`}
                  />
                  {errors.contactEmail && (
                    <p className="mt-1 text-xs text-red-600">{errors.contactEmail}</p>
                  )}
                </div>

                {/* 電話番号 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => updateField("contactPhone", e.target.value)}
                    placeholder="03-1234-5678"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* 住所 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    所在地
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="東京都渋谷区..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* 業種 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    業種
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {([
                      { key: "clinic", label: "クリニック", icon: "🏥" },
                      { key: "salon", label: "サロン", icon: "💇" },
                      { key: "retail", label: "小売", icon: "🏪" },
                      { key: "other", label: "その他", icon: "🏢" },
                    ] as const).map((ind) => (
                      <button
                        key={ind.key}
                        type="button"
                        onClick={() => updateField("industry", ind.key)}
                        className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          formData.industry === ind.key
                            ? "border-amber-500 bg-amber-50 text-amber-800"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-xl">{ind.icon}</span>
                        <span>{ind.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">業種によって管理画面に表示される機能セクションが変わります</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 初期管理者 */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">初期管理者</h2>
              <p className="text-sm text-slate-500 mb-6">
                テナントにログインする初期管理者アカウントを設定します
              </p>
              <div className="space-y-5">
                {/* 管理者名 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    管理者名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.adminName}
                    onChange={(e) => updateField("adminName", e.target.value)}
                    placeholder="田中太郎"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.adminName ? "border-red-300 bg-red-50" : "border-slate-300"
                    }`}
                  />
                  {errors.adminName && (
                    <p className="mt-1 text-xs text-red-600">{errors.adminName}</p>
                  )}
                </div>

                {/* メールアドレス */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => updateField("adminEmail", e.target.value)}
                    placeholder="admin@example.com"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.adminEmail ? "border-red-300 bg-red-50" : "border-slate-300"
                    }`}
                  />
                  {errors.adminEmail && (
                    <p className="mt-1 text-xs text-red-600">{errors.adminEmail}</p>
                  )}
                </div>

                {/* パスワード */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    パスワード <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => updateField("adminPassword", e.target.value)}
                    placeholder="8文字以上"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.adminPassword ? "border-red-300 bg-red-50" : "border-slate-300"
                    }`}
                  />
                  {errors.adminPassword && (
                    <p className="mt-1 text-xs text-red-600">{errors.adminPassword}</p>
                  )}
                  {formData.adminPassword && formData.adminPassword.length >= 8 && (
                    <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      8文字以上
                    </p>
                  )}
                </div>

                {/* パスワード確認 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    パスワード確認 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.adminPasswordConfirm}
                    onChange={(e) => updateField("adminPasswordConfirm", e.target.value)}
                    placeholder="パスワードを再入力"
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.adminPasswordConfirm ? "border-red-300 bg-red-50" : "border-slate-300"
                    }`}
                  />
                  {errors.adminPasswordConfirm && (
                    <p className="mt-1 text-xs text-red-600">{errors.adminPasswordConfirm}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: LINE設定 + プラン */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">LINE設定とプラン</h2>
              <p className="text-sm text-slate-500 mb-6">
                LINE連携は後から設定することもできます
              </p>

              {/* メッセージプラン選択 */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">メッセージプラン</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.key}
                      type="button"
                      onClick={() => selectPlan(plan)}
                      className={`relative text-left p-4 rounded-lg border-2 transition-all ${
                        formData.planName === plan.key
                          ? `${plan.color} border-opacity-100 shadow-sm`
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {plan.recommended && (
                        <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                          おすすめ
                        </span>
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${plan.badge}`}>
                          {plan.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">{plan.desc}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-slate-900">
                          {formatCurrency(plan.monthly)}
                        </span>
                        <span className="text-xs text-slate-400">/月</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        超過: {plan.overagePrice}円/通
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* AIオプション選択 */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">AIオプション（月額追加）</h3>
                <div className="space-y-2">
                  {AI_OPTIONS_UI.map((opt) => (
                    <label
                      key={opt.key}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.aiOptions.includes(opt.key)
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={formData.aiOptions.includes(opt.key)}
                          onChange={() => toggleOption(opt.key)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div>
                          <span className="text-sm font-medium text-slate-900">{opt.label}</span>
                          <span className="text-xs text-slate-500 ml-2">{opt.desc}</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-slate-700">
                        +{formatCurrency(opt.price)}/月
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 月額合計 */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">月額合計（税込）</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(totalMonthly)}/月
                  </span>
                </div>
                {formData.setupFee > 0 && (
                  <p className="text-xs text-slate-400 mt-1 text-right">
                    初期費用: {formatCurrency(formData.setupFee)}
                  </p>
                )}
              </div>

              {/* LINE設定 */}
              <div className="border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700">LINE Messaging API設定</h3>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">任意</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Channel ID
                    </label>
                    <input
                      type="text"
                      value={formData.lineChannelId}
                      onChange={(e) => updateField("lineChannelId", e.target.value)}
                      placeholder="1234567890"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Channel Secret
                    </label>
                    <input
                      type="password"
                      value={formData.lineChannelSecret}
                      onChange={(e) => updateField("lineChannelSecret", e.target.value)}
                      placeholder="channel secret"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      アクセストークン
                    </label>
                    <input
                      type="password"
                      value={formData.lineAccessToken}
                      onChange={(e) => updateField("lineAccessToken", e.target.value)}
                      placeholder="long-lived access token"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: 確認画面 */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-6">入力内容の確認</h2>

              {/* 基本情報 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  基本情報
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <ConfirmRow label="クリニック名" value={formData.name} />
                  <ConfirmRow label="URL" value={`${formData.slug}.lope.jp`} mono />
                  <ConfirmRow label="業種" value={{ clinic: "クリニック", salon: "サロン", retail: "小売", other: "その他" }[formData.industry] || formData.industry} />
                  {formData.contactEmail && (
                    <ConfirmRow label="連絡先メール" value={formData.contactEmail} />
                  )}
                  {formData.contactPhone && (
                    <ConfirmRow label="電話番号" value={formData.contactPhone} />
                  )}
                  {formData.address && (
                    <ConfirmRow label="所在地" value={formData.address} />
                  )}
                </div>
              </div>

              {/* 管理者情報 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  初期管理者
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <ConfirmRow label="管理者名" value={formData.adminName} />
                  <ConfirmRow label="メールアドレス" value={formData.adminEmail} />
                  <ConfirmRow label="パスワード" value="********" />
                </div>
              </div>

              {/* プラン */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  プラン・オプション
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <ConfirmRow
                    label="プラン"
                    value={PLANS.find((p) => p.key === formData.planName)?.label || formData.planName}
                  />
                  <ConfirmRow label="込み通数" value={`${formData.messageQuota.toLocaleString()}通/月`} />
                  <ConfirmRow label="プラン月額" value={formatCurrency(formData.monthlyFee)} />
                  {formData.aiOptions.length > 0 && (
                    <ConfirmRow
                      label="AIオプション"
                      value={formData.aiOptions
                        .map((k) => AI_OPTIONS_UI.find((o) => o.key === k)?.label)
                        .filter(Boolean)
                        .join("・")}
                    />
                  )}
                  <ConfirmRow
                    label="月額合計"
                    value={formatCurrency(totalMonthly)}
                  />
                  <ConfirmRow label="初期費用" value={formatCurrency(formData.setupFee)} />
                </div>
              </div>

              {/* LINE設定 */}
              {(formData.lineChannelId || formData.lineChannelSecret || formData.lineAccessToken) && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    LINE設定
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    {formData.lineChannelId && (
                      <ConfirmRow label="Channel ID" value={formData.lineChannelId} mono />
                    )}
                    <ConfirmRow
                      label="Channel Secret"
                      value={formData.lineChannelSecret ? "設定済み" : "未設定"}
                    />
                    <ConfirmRow
                      label="アクセストークン"
                      value={formData.lineAccessToken ? "設定済み" : "未設定"}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ナビゲーションボタン */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                戻る
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                次へ
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    作成中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    テナントを作成
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 確認画面の行コンポーネント
function ConfirmRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start">
      <span className="text-sm text-slate-500 w-32 flex-shrink-0">{label}</span>
      <span className={`text-sm text-slate-900 font-medium ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
