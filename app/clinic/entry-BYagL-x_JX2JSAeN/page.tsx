"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  INDUSTRIES,
  FEATURE_PLANS,
  AI_OPTIONS,
  EXTRA_OPTIONS,
  MSG_PLANS,
  SETUP_OPTIONS,
  getFeaturePlanPrice,
  getFeaturePlanInitialCost,
  getMsgPlanPrice,
  getAiOptionsTotal,
  getExtraOptionsTotal,
  getSetupOptionsTotal,
} from "@/lib/validations/apply";

type FormState = {
  company_name: string;
  platform_name: string;
  sameAsCompany: boolean;
  industry: string;
  contact_phone: string;
  email: string;
  feature_plan: string;
  msg_plan: string;
  ai_options: string[];
  extra_options: string[];
  setup_options: string[];
  admin_password: string;
  admin_password_confirm: string;
  note: string;
  agreed_terms: boolean;
};

const initial: FormState = {
  company_name: "",
  platform_name: "",
  sameAsCompany: false,
  industry: "",
  contact_phone: "",
  email: "",
  feature_plan: "",
  msg_plan: "",
  ai_options: [],
  extra_options: [],
  setup_options: [],
  admin_password: "",
  admin_password_confirm: "",
  note: "",
  agreed_terms: false,
};

const fmt = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

const featureDescMap: Record<string, string> = {
  "管理画面": "すべての機能を一元操作できるダッシュボード",
  "友だち管理（CRM）": "属性・タグ・来院履歴で患者を一元管理",
  "LINEトーク": "患者とのチャットを管理画面から一括対応",
  "セグメント配信": "年齢・施術歴などで絞り込み一斉配信",
  "ステップシナリオ": "友だち追加後に自動フォローを段階配信",
  "リッチメニュー": "LINE画面下部のメニューをノーコードで作成",
  "フォームビルダー": "問い合わせ・アンケートフォームを簡単作成",
  "アクション自動化": "条件に応じたタグ付けや配信を自動実行",
  "自動リマインド": "予約前日や来院後にリマインドを自動送信",
  "クーポン配信": "期間限定クーポンをLINEで配信・管理",
  "予約カレンダー": "LINEから直接予約。空き枠をリアルタイム表示",
  "カルテ管理": "SOAP形式の診察記録・処方履歴をデジタル管理",
  "問診フォーム": "来院前にLINEで問診を完了。受付業務を削減",
  "処方タイムライン": "処方履歴を時系列で確認。再処方もスムーズ",
  "決済管理": "オンライン決済・振込の請求〜入金確認を自動化",
  "配送管理": "処方薬の発送状況をトラッキング・自動通知",
  "在庫管理": "薬剤・消耗品の在庫をリアルタイムで把握",
  "ダッシュボード": "売上・予約数・KPIをリアルタイムで可視化",
  "売上管理": "日次・月次の売上集計とレポートを自動生成",
  "NPS調査": "患者満足度をLINEで自動収集・分析",
};

export default function ApplyPage() {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // 規約の開閉・閲覧済み管理
  const [openPolicy, setOpenPolicy] = useState<string | null>(null);
  const [viewedPolicies, setViewedPolicies] = useState<Set<string>>(new Set());

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const toggleArray = (key: "ai_options" | "extra_options" | "setup_options", val: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(val)
        ? prev[key].filter((v) => v !== val)
        : [...prev[key], val],
    }));
  };

  const togglePolicy = (id: string) => {
    if (openPolicy === id) {
      setOpenPolicy(null);
    } else {
      setOpenPolicy(id);
      setViewedPolicies((prev) => new Set(prev).add(id));
    }
  };

  const allPoliciesViewed = viewedPolicies.has("terms") && viewedPolicies.has("privacy") && viewedPolicies.has("cancel");

  // 見積もり計算（税込）
  const featurePrice = getFeaturePlanPrice(form.feature_plan);
  const msgPrice = getMsgPlanPrice(form.msg_plan);
  const aiPrice = getAiOptionsTotal(form.ai_options);
  const extraPrice = getExtraOptionsTotal(form.extra_options);
  const monthlyTotal = featurePrice + msgPrice + aiPrice + extraPrice;
  const planInitialCost = getFeaturePlanInitialCost(form.feature_plan);
  const setupTotal = getSetupOptionsTotal(form.setup_options);
  const initialTotal = planInitialCost + setupTotal;


  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.company_name.trim()) errs.company_name = "会社名は必須です";
    if (!form.industry) errs.industry = "業種を選択してください";
    if (!form.contact_phone.trim()) errs.contact_phone = "電話番号は必須です";
    else if (!/^[0-9\-]+$/.test(form.contact_phone))
      errs.contact_phone = "電話番号の形式が不正です";
    if (!form.email.trim()) errs.email = "メールアドレスは必須です";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "メールアドレスの形式が不正です";
    if (!form.feature_plan) errs.feature_plan = "機能プランを選択してください";
    if (!form.msg_plan) errs.msg_plan = "メッセージ通数を選択してください";
    if (!form.admin_password) {
      errs.admin_password = "パスワードは必須です";
    } else {
      const missing: string[] = [];
      if (form.admin_password.length < 8) missing.push("8文字以上");
      if (!/[A-Z]/.test(form.admin_password)) missing.push("大文字");
      if (!/[a-z]/.test(form.admin_password)) missing.push("小文字");
      if (!/[0-9]/.test(form.admin_password)) missing.push("数字");
      if (!/[^A-Za-z0-9]/.test(form.admin_password)) missing.push("記号");
      if (missing.length > 0) errs.admin_password = `${missing.join("・")}を含めてください`;
    }
    if (form.admin_password && form.admin_password !== form.admin_password_confirm) {
      errs.admin_password_confirm = "パスワードが一致しません";
    }
    if (!allPoliciesViewed) errs.agreed_terms = "すべての規約を確認してから同意してください";
    else if (!form.agreed_terms) errs.agreed_terms = "利用規約への同意が必要です";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    setError("");
    try {
      const body = {
        company_name: form.company_name.trim(),
        platform_name: form.sameAsCompany
          ? undefined
          : form.platform_name.trim() || undefined,
        industry: form.industry,
        contact_phone: form.contact_phone.trim(),
        email: form.email.trim(),
        feature_plan: form.feature_plan,
        msg_plan: form.msg_plan,
        ai_options: form.ai_options,
        extra_options: form.extra_options,
        setup_options: form.setup_options,
        admin_password: form.admin_password,
        note: form.note.trim() || undefined,
        agreed_terms: true,
      };
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "送信に失敗しました");
      }
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "送信に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-20">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <svg className="h-10 w-10 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mb-3 text-2xl font-extrabold text-slate-800">
              お申し込みありがとうございます
            </h2>
            <p className="mb-2 text-sm leading-relaxed text-slate-500">
              お申し込み内容を受け付けました。<br />
              ご入力いただいたメールアドレスに確認メールをお送りしています。
            </p>
            <p className="mb-8 text-sm leading-relaxed text-slate-500">
              2営業日以内に担当者よりご連絡いたします。
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
              <p className="mb-1 text-xs text-slate-400">お見積もり（税込）</p>
              <p className="text-lg font-bold text-blue-600">
                月額 {fmt(monthlyTotal)}/月
              </p>
              {initialTotal > 0 && (
                <p className="text-sm font-semibold text-slate-700">
                  初期費用 {fmt(initialTotal)}
                </p>
              )}
            </div>
            <Link
              href="/"
              className="mt-8 inline-block rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              トップに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      {/* ヒーロー */}
      <div className="bg-gradient-to-br from-blue-600 to-sky-500 px-5 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-white md:text-3xl">
          お申し込み
        </h1>
        <p className="mt-2 text-sm text-blue-100">
          プランとオプションを選択して、お見積もりをご確認ください
        </p>
      </div>

      <div className="mx-auto w-full max-w-5xl px-5 py-10">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 基本情報 */}
        <SectionTitle num={1} title="基本情報" />
        <div className="space-y-4">
          <Field label="会社名" required error={fieldErrors.company_name}>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              placeholder="株式会社○○クリニック"
              className={inputCls(fieldErrors.company_name)}
            />
          </Field>

          <Field label="プラットフォーム名">
            <label className="mb-2 flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={form.sameAsCompany}
                onChange={(e) => set("sameAsCompany", e.target.checked)}
                className="rounded border-slate-300"
              />
              会社名と同じ
            </label>
            {!form.sameAsCompany && (
              <input
                type="text"
                value={form.platform_name}
                onChange={(e) => set("platform_name", e.target.value)}
                placeholder="○○ビューティークリニック"
                className={inputCls()}
              />
            )}
          </Field>

          <Field label="業種" required error={fieldErrors.industry}>
            <select
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
              className={inputCls(fieldErrors.industry)}
            >
              <option value="">選択してください</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* 連絡先 */}
        <SectionTitle num={2} title="連絡先" />
        <div className="space-y-4">
          <Field label="代表者連絡先（電話番号）" required error={fieldErrors.contact_phone}>
            <input
              type="tel"
              value={form.contact_phone}
              onChange={(e) => set("contact_phone", e.target.value)}
              placeholder="090-1234-5678"
              className={inputCls(fieldErrors.contact_phone)}
            />
          </Field>
          <Field label="メールアドレス" required error={fieldErrors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="info@example.com"
              className={inputCls(fieldErrors.email)}
            />
          </Field>
        </div>

        {/* 機能プラン */}
        <SectionTitle num={3} title="機能プラン" />
        <p className="mb-3 text-xs text-slate-400">
          上位プランは下位プランの全機能を含みます
        </p>
        {fieldErrors.feature_plan && (
          <p className="mb-2 text-xs text-red-500">{fieldErrors.feature_plan}</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURE_PLANS.map((p, idx) => {
            const selected = form.feature_plan === p.key;
            const allFeatures: string[] = [];
            for (let i = 0; i <= idx; i++) {
              allFeatures.push(...FEATURE_PLANS[i].features);
            }
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => set("feature_plan", p.key)}
                className={`relative flex flex-col rounded-xl border-2 bg-white p-5 text-left transition hover:shadow-md ${
                  selected
                    ? "border-blue-500 ring-2 ring-blue-200 shadow-md"
                    : "border-slate-200"
                }`}
              >
                {"popular" in p && p.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">
                    人気
                  </span>
                )}
                <p className="text-center text-base font-bold text-slate-800">{p.key}</p>
                <p className="mt-1 text-center text-[11px] text-slate-400">{p.desc}</p>
                <p className="mt-3 text-center text-2xl font-extrabold text-blue-600">
                  {fmt(p.price)}
                  <span className="text-xs font-normal text-slate-400">/月</span>
                </p>
                <p className="mt-1 text-center text-xs text-slate-500">
                  初期費用 {fmt(p.initialCost)}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-[11px]">
                  {allFeatures.map((f) => {
                    const isNew = (FEATURE_PLANS[idx].features as readonly string[]).includes(f);
                    return (
                      <li key={f} className={isNew ? "text-slate-700" : "text-slate-400"}>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] ${isNew ? "text-blue-500" : "text-slate-300"}`}>✓</span>
                          <span className="font-medium">{f}</span>
                        </div>
                        {featureDescMap[f] && (
                          <p className={`ml-4 mt-0.5 text-[10px] leading-snug ${isNew ? "text-slate-400" : "text-slate-300"}`}>
                            {featureDescMap[f]}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 text-center">
                  <div
                    className={`mx-auto h-5 w-5 rounded-full border-2 ${
                      selected
                        ? "border-blue-500 bg-blue-500"
                        : "border-slate-300"
                    }`}
                  >
                    {selected && (
                      <svg className="h-full w-full text-white p-0.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>


        {/* メッセージ通数 */}
        <SectionTitle num={4} title="メッセージ通数" />
        <p className="mb-3 text-xs text-slate-400">
          月間のLINEメッセージ送信数に応じて選択してください
        </p>
        {fieldErrors.msg_plan && (
          <p className="mb-2 text-xs text-red-500">{fieldErrors.msg_plan}</p>
        )}

        {/* 通常プラン（カード） */}
        <div className="grid gap-3 sm:grid-cols-2">
          {MSG_PLANS.slice(0, 4).map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => set("msg_plan", p.key)}
              className={`relative rounded-xl border-2 bg-white p-5 text-center transition hover:shadow-md ${
                form.msg_plan === p.key
                  ? "border-blue-500 ring-2 ring-blue-200 shadow-md"
                  : "border-slate-200"
              }`}
            >
              {"popular" in p && p.popular && (
                <span className="absolute -top-2.5 right-3 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  人気
                </span>
              )}
              <p className="text-sm font-bold text-slate-800">{p.key}</p>
              <p className="mt-2 text-xl font-extrabold text-blue-600">
                {fmt(p.price)}
                <span className="text-xs font-normal text-slate-400">
                  /月
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                超過分 {p.per}
              </p>
            </button>
          ))}
        </div>

        {/* 大量プラン（テーブル） */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="px-4 py-2.5 text-left font-semibold">大量送信プラン</th>
                <th className="px-4 py-2.5 text-left font-semibold">月額（税込）</th>
                <th className="px-4 py-2.5 text-left font-semibold">超過単価</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {MSG_PLANS.slice(4).map((p) => (
                <tr
                  key={p.key}
                  onClick={() => set("msg_plan", p.key)}
                  className={`cursor-pointer border-t border-slate-100 transition ${
                    form.msg_plan === p.key ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-700">
                    {p.key}
                  </td>
                  <td className="px-4 py-2.5 font-bold text-slate-900">
                    {fmt(p.price)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{p.per}</td>
                  <td className="px-4 py-2.5 text-center">
                    <div
                      className={`h-4 w-4 rounded-full border-2 ${
                        form.msg_plan === p.key
                          ? "border-blue-500 bg-blue-500"
                          : "border-slate-300"
                      }`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          ※ 表示価格はすべて税込です。
        </p>

        {/* AIオプション */}
        <SectionTitle num={5} title="AIオプション（月額追加・税込）" />
        <div className="space-y-3">
          {AI_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => toggleArray("ai_options", o.key)}
              className={`flex w-full items-center gap-4 rounded-xl border-2 bg-white p-4 text-left transition hover:shadow-md ${
                form.ai_options.includes(o.key)
                  ? "border-blue-500 ring-2 ring-blue-200 shadow-md"
                  : "border-slate-200"
              }`}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                  form.ai_options.includes(o.key)
                    ? "border-blue-500 bg-blue-500"
                    : "border-slate-300"
                }`}
              >
                {form.ai_options.includes(o.key) && (
                  <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">{o.key}</p>
                <p className="text-[11px] text-slate-400">{o.desc}</p>
              </div>
              <p className="shrink-0 text-sm font-bold text-blue-600">
                +{fmt(o.price)}/月
              </p>
            </button>
          ))}
        </div>

        {/* その他オプション */}
        <SectionTitle num={6} title="その他オプション（月額追加・税込）" />
        <div className="space-y-3">
          {EXTRA_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => toggleArray("extra_options", o.key)}
              className={`flex w-full items-center gap-4 rounded-xl border-2 bg-white p-4 text-left transition hover:shadow-md ${
                form.extra_options.includes(o.key)
                  ? "border-blue-500 ring-2 ring-blue-200 shadow-md"
                  : "border-slate-200"
              }`}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                  form.extra_options.includes(o.key)
                    ? "border-blue-500 bg-blue-500"
                    : "border-slate-300"
                }`}
              >
                {form.extra_options.includes(o.key) && (
                  <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">{o.key}</p>
                <p className="text-[11px] text-slate-400">{o.desc}</p>
              </div>
              <p className="shrink-0 text-sm font-bold text-blue-600">
                +{fmt(o.price)}/月
              </p>
            </button>
          ))}
        </div>

        {/* 構築オプション */}
        <SectionTitle num={7} title="構築オプション（初期費用・税込）" />
        <div className="space-y-3">
          {SETUP_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => toggleArray("setup_options", o.key)}
              className={`flex w-full items-center gap-4 rounded-xl border-2 bg-white p-4 text-left transition hover:shadow-md ${
                form.setup_options.includes(o.key)
                  ? "border-blue-500 ring-2 ring-blue-200 shadow-md"
                  : "border-slate-200"
              }`}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                  form.setup_options.includes(o.key)
                    ? "border-blue-500 bg-blue-500"
                    : "border-slate-300"
                }`}
              >
                {form.setup_options.includes(o.key) && (
                  <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">{o.key}</p>
                <p className="text-[11px] text-slate-400">{o.desc}</p>
              </div>
              <p className="shrink-0 text-sm font-bold text-blue-600">
                {fmt(o.price)}
              </p>
            </button>
          ))}
        </div>

        {/* 管理者パスワード */}
        <SectionTitle num={8} title="管理者パスワード" />
        <p className="mb-3 text-xs text-slate-400">
          テナント管理画面にログインするためのパスワードを設定してください
        </p>
        <div className="space-y-4">
          <Field label="パスワード" required error={fieldErrors.admin_password}>
            <input
              type="password"
              value={form.admin_password}
              onChange={(e) => set("admin_password", e.target.value)}
              placeholder="8文字以上（大文字・小文字・数字・記号を含む）"
              className={inputCls(fieldErrors.admin_password)}
            />
            <div className="mt-2 space-y-1">
              {[
                { label: "8文字以上", ok: form.admin_password.length >= 8 },
                { label: "大文字を含む", ok: /[A-Z]/.test(form.admin_password) },
                { label: "小文字を含む", ok: /[a-z]/.test(form.admin_password) },
                { label: "数字を含む", ok: /[0-9]/.test(form.admin_password) },
                { label: "記号を含む", ok: /[^A-Za-z0-9]/.test(form.admin_password) },
              ].map((req) => (
                <div key={req.label} className="flex items-center gap-1.5">
                  <span className={`text-xs ${req.ok ? "text-green-600" : "text-slate-300"}`}>
                    {req.ok ? "✓" : "○"}
                  </span>
                  <span className={`text-xs ${req.ok ? "text-slate-900 font-medium" : "text-slate-400"}`}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </Field>
          <Field label="パスワード確認" required error={fieldErrors.admin_password_confirm}>
            <input
              type="password"
              value={form.admin_password_confirm}
              onChange={(e) => set("admin_password_confirm", e.target.value)}
              placeholder="パスワードを再入力"
              className={inputCls(fieldErrors.admin_password_confirm)}
            />
            {form.admin_password_confirm && form.admin_password === form.admin_password_confirm && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-green-600">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                パスワードが一致しています
              </p>
            )}
          </Field>
        </div>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          <p className="font-bold">このパスワードは必ず控えてください</p>
          <p className="mt-1 leading-relaxed">
            テナント開設後、管理画面へのログインに必要です。パスワードを忘れた場合、再設定のお手続きが必要になります。
          </p>
        </div>

        {/* 備考 */}
        <SectionTitle num={9} title="備考（任意）" />
        <textarea
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="ご要望・ご質問があればご記入ください"
          rows={4}
          maxLength={1000}
          className={inputCls() + " resize-none"}
        />

        {/* 規約確認・同意 */}
        <SectionTitle num={10} title="規約確認・同意" />
        <p className="mb-3 text-xs text-slate-400">
          以下の規約をすべて確認してから同意してください
        </p>

        <div className="space-y-3">
          {/* 利用規約 */}
          <PolicyAccordion
            title="利用規約"
            isOpen={openPolicy === "terms"}
            isViewed={viewedPolicies.has("terms")}
            onToggle={() => togglePolicy("terms")}
          >
            <TermsContent />
          </PolicyAccordion>

          {/* プライバシーポリシー */}
          <PolicyAccordion
            title="プライバシーポリシー"
            isOpen={openPolicy === "privacy"}
            isViewed={viewedPolicies.has("privacy")}
            onToggle={() => togglePolicy("privacy")}
          >
            <PrivacyContent />
          </PolicyAccordion>

          {/* キャンセル・解約ポリシー */}
          <PolicyAccordion
            title="キャンセル・解約ポリシー"
            isOpen={openPolicy === "cancel"}
            isViewed={viewedPolicies.has("cancel")}
            onToggle={() => togglePolicy("cancel")}
          >
            <CancelContent />
          </PolicyAccordion>
        </div>

        {/* 同意チェック */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <label className={`flex items-start gap-3 ${!allPoliciesViewed ? "opacity-50" : ""}`}>
            <input
              type="checkbox"
              checked={form.agreed_terms}
              onChange={(e) => set("agreed_terms", e.target.checked)}
              disabled={!allPoliciesViewed}
              className="mt-0.5 rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">
              利用規約、プライバシーポリシー、キャンセル・解約ポリシーに同意します
            </span>
          </label>
          {!allPoliciesViewed && (
            <p className="mt-1.5 pl-7 text-xs text-amber-600">
              すべての規約を開いて確認してください
            </p>
          )}
          {fieldErrors.agreed_terms && (
            <p className="mt-1.5 pl-7 text-xs text-red-500">
              {fieldErrors.agreed_terms}
            </p>
          )}
        </div>

        {/* 送信ボタン */}
        <div className="mt-8 pb-32">
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-10 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl disabled:opacity-60"
          >
            {saving ? "送信中..." : "この内容で申し込む"}
          </button>
          <p className="mt-3 text-center text-[11px] text-slate-400">
            ※ 無理な営業は一切行いません
          </p>
        </div>
      </div>

      {/* 見積もりバー（sticky下部） */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              お見積もり（税込）
            </p>
            <div className="flex items-baseline gap-3">
              <p className="text-lg font-extrabold text-blue-600">
                {form.feature_plan && form.msg_plan ? fmt(monthlyTotal) : "---"}
                <span className="text-xs font-normal text-slate-400">
                  /月
                </span>
              </p>
              {initialTotal > 0 && (
                <p className="text-sm font-semibold text-slate-700">
                  + 初期費用 {fmt(initialTotal)}
                </p>
              )}
            </div>
          </div>
          {form.feature_plan && form.msg_plan && (
            <div className="text-right">
              <p className="text-[11px] text-slate-400">
                機能: {fmt(featurePrice)} + 通数: {fmt(msgPrice)}
                {aiPrice > 0 && ` + AI: ${fmt(aiPrice)}`}
                {extraPrice > 0 && ` + 他: ${fmt(extraPrice)}`}
              </p>
              {initialTotal > 0 && (
                <p className="text-[11px] text-slate-400">初期: {fmt(planInitialCost)}{setupTotal > 0 ? ` + 構築: ${fmt(setupTotal)}` : ""}</p>
              )}
              <p className="mt-1 border-t border-slate-200 pt-1 text-sm font-extrabold text-slate-800">
                合計 {fmt(monthlyTotal + initialTotal)}
                {initialTotal > 0 && (
                  <span className="text-[10px] font-normal text-slate-400">（初年度）</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 共通コンポーネント ─── */

function Header() {
  return (
    <header className="flex items-center justify-between bg-white px-5 py-3 shadow-sm">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/images/l-ope-logo.png"
          alt="Lオペ"
          width={100}
          height={100}
          className="object-contain"
        />
        <span className="text-sm font-bold text-slate-800">
          Lオペ for CLINIC
        </span>
      </Link>
      <Link
        href="/"
        className="text-xs text-slate-500 transition hover:text-slate-700"
      >
        トップに戻る
      </Link>
    </header>
  );
}

function SectionTitle({ num, title }: { num: number; title: string }) {
  return (
    <div className="mb-4 mt-10 flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
        {num}
      </span>
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-800">
        {label}
        {required && (
          <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            必須
          </span>
        )}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function inputCls(error?: string) {
  return `w-full rounded-lg border ${
    error ? "border-red-400" : "border-slate-300"
  } bg-white px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all`;
}

/* ─── 規約アコーディオン ─── */

function PolicyAccordion({
  title,
  isOpen,
  isViewed,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  isViewed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border-2 bg-white transition ${isViewed ? "border-green-300" : "border-slate-200"}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          {isViewed ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
              <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 text-[10px] text-slate-400">
              !
            </span>
          )}
          <span className="text-sm font-bold text-slate-800">{title}</span>
          {isViewed && <span className="text-[10px] text-green-600">確認済み</span>}
          {!isViewed && <span className="text-[10px] text-amber-600">要確認</span>}
        </div>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="max-h-80 overflow-y-auto border-t border-slate-100 px-5 py-4">
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── 規約コンテンツ（インライン） ─── */

function TermsContent() {
  const articles = [
    { title: "第1条（総則）", paragraphs: ["本利用規約（以下「本規約」といいます）は、株式会社ORDIX（以下「当社」といいます）が提供するクリニック向けSaaSサービス「Lオペ for CLINIC」（以下「本サービス」といいます）の利用に関する条件を定めるものです。", "本サービスを利用するすべての法人・個人事業主（以下「利用者」といいます）は、本規約に同意のうえ本サービスを利用するものとします。"] },
    { title: "第2条（定義）", paragraphs: ["本規約において、以下の用語は次の意味を有するものとします。", "「本サービス」とは、当社が「Lオペ for CLINIC」の名称で提供する、LINE公式アカウントを活用したクリニック業務支援プラットフォームをいいます。", "「利用契約」とは、本規約に基づき当社と利用者の間で締結されるサービス利用に関する契約をいいます。", "「利用者データ」とは、利用者が本サービスの利用に際して入力・登録・送信・保存した一切のデータをいいます。"] },
    { title: "第3条（サービス内容）", paragraphs: ["当社は、利用者に対し、LINE公式アカウントとの連携による患者CRM、予約管理・問診フォーム、セグメント配信、リッチメニュー作成・管理、会計・決済連携、カルテ管理等の機能を含むクリニック業務支援サービスを提供します。", "当社は、本サービスの機能追加・改善を随時行うことができるものとします。"] },
    { title: "第4条（利用申込・契約成立）", paragraphs: ["本サービスの利用を希望する者は、当社所定の方法により利用申込を行うものとします。当社が利用申込を承諾した時点で利用契約が成立するものとします。"] },
    { title: "第5条（アカウント管理）", paragraphs: ["利用者は、アカウント情報を自己の責任で適切に管理・保管するものとし、第三者に使用させ、または譲渡・貸与してはなりません。"] },
    { title: "第6条（料金・支払い）", paragraphs: ["利用者は、当社が別途定める料金表に基づき、本サービスの利用料金を支払うものとします。", "利用料金の支払いを遅延した場合、年14.6％の割合による遅延損害金を支払うものとします。", "理由の如何を問わず、すでに支払われた利用料金は返金しないものとします。"] },
    { title: "第7条（禁止事項）", paragraphs: ["利用者は、法令違反、知的財産権侵害、サーバーへの過度な負荷、不正アクセス、リバースエンジニアリング、医療法違反の態様での利用等の行為を行ってはなりません。"] },
    { title: "第8条（知的財産権）", paragraphs: ["本サービスに関する一切の知的財産権は、当社または正当な権利者に帰属します。"] },
    { title: "第9条（データの取扱い）", paragraphs: ["利用者データの所有権は利用者に帰属します。当社は本サービスの提供に必要な範囲でのみ取り扱います。", "利用契約終了後、当社は利用者データを原則90日間保管した後、適切な方法で削除します。"] },
    { title: "第10条（サービスの変更・中断・終了）", paragraphs: ["当社は、システム保守・天災・障害等の場合に事前通知なく本サービスを一時中断できるものとします。", "当社は、3ヶ月前までに通知することにより本サービスの全部を終了できるものとします。"] },
    { title: "第11条（免責事項）", paragraphs: ["当社は、本サービスの目的適合性、正確性、有用性を保証しません。", "LINEプラットフォームの仕様変更・障害に起因する制限について責任を負いません。"] },
    { title: "第12条（損害賠償）", paragraphs: ["当社の故意または重大な過失による損害賠償の上限は、直近12ヶ月間に利用者が支払った利用料金の合計額とします。"] },
    { title: "第13条（契約期間・解約）", paragraphs: ["最低契約期間は契約成立日から6ヶ月間とします。満了後は1ヶ月単位で自動更新されます。", "解約は最低契約期間満了後、解約希望日の30日前までに申し出てください。"] },
    { title: "第14条（反社会的勢力の排除）", paragraphs: ["利用者は、反社会的勢力に該当しないことを表明・保証するものとします。"] },
    { title: "第15条（規約の変更）", paragraphs: ["当社は、合理的な理由がある場合、変更の30日前までに通知のうえ本規約を変更できるものとします。"] },
    { title: "第16条（準拠法・管轄裁判所）", paragraphs: ["本規約は日本法に準拠し、東京地方裁判所を第一審の専属的合意管轄裁判所とします。"] },
  ];
  return (
    <div className="space-y-4 text-sm text-slate-600">
      {articles.map((a, i) => (
        <div key={i}>
          <h3 className="font-bold text-slate-800">{a.title}</h3>
          {a.paragraphs.map((p, j) => (
            <p key={j} className="mt-1 leading-relaxed whitespace-pre-line">{p}</p>
          ))}
        </div>
      ))}
      <p className="mt-4 text-right text-xs text-slate-400">2026年3月10日 制定・施行</p>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="space-y-4 text-sm text-slate-600">
      <p className="leading-relaxed">株式会社ORDIX（以下「当社」）は、「Lオペ for CLINIC」の提供にあたり、個人情報を適切に取り扱います。</p>

      <h3 className="font-bold text-slate-800">1. 基本方針</h3>
      <p className="leading-relaxed">当社は、個人情報保護法その他の関連法令を遵守し、医療関連情報については特に慎重な取り扱いを行います。</p>

      <h3 className="font-bold text-slate-800">2. 収集する個人情報</h3>
      <p className="leading-relaxed">クリニック事業者情報（名称、所在地、連絡先等）、患者情報（氏名、問診・診察記録、LINE UID等）、利用ログ・端末情報を収集する場合があります。</p>

      <h3 className="font-bold text-slate-800">3. 利用目的</h3>
      <p className="leading-relaxed">サービスの提供・運営・改善、LINE連携支援、AI自動返信の精度向上、予約・決済・配送処理、本人確認、障害対応・セキュリティ対策等に利用します。</p>

      <h3 className="font-bold text-slate-800">4. 第三者提供</h3>
      <p className="leading-relaxed">法令に基づく場合等を除き、同意なく第三者に提供しません。業務委託先（LINE社、決済代行、クラウドインフラ、AI関連サービス）には適切な契約のもと共有する場合があります。</p>

      <h3 className="font-bold text-slate-800">5. 安全管理措置</h3>
      <p className="leading-relaxed">SSL/TLS暗号化、行レベルセキュリティ、CSRF対策、監査ログ、マルチテナント分離等の措置を講じています。</p>

      <h3 className="font-bold text-slate-800">6. 開示・訂正・削除の請求</h3>
      <p className="leading-relaxed">本人確認のうえ、合理的な期間内に対応いたします。患者の医療情報についてはクリニック事業者にお問い合わせください。</p>

      <h3 className="font-bold text-slate-800">7. Cookie・アクセス解析</h3>
      <p className="leading-relaxed">Cookieおよびアクセス解析ツールを利用する場合があります。ブラウザ設定でCookieを無効にできますが、一部機能が制限されることがあります。</p>

      <h3 className="font-bold text-slate-800">8. お問い合わせ窓口</h3>
      <p className="leading-relaxed">株式会社ORDIX 個人情報管理責任者 — メール: contact@l-ope.jp</p>

      <h3 className="font-bold text-slate-800">9. ポリシーの改定</h3>
      <p className="leading-relaxed">法令やサービス内容の変更により本ポリシーを改定する場合があります。重要な変更は本サービス上でお知らせします。</p>

      <p className="mt-4 text-right text-xs text-slate-400">2026年3月10日 制定</p>
    </div>
  );
}

function CancelContent() {
  return (
    <div className="space-y-4 text-sm text-slate-600">
      <h3 className="font-bold text-slate-800">1. 解約手続き</h3>
      <p className="leading-relaxed">管理画面の「アカウント設定」→「契約情報」→「解約申請」、またはサポート窓口（メール・LINE）から手続きできます。</p>

      <h3 className="font-bold text-slate-800">2. 最低契約期間</h3>
      <p className="leading-relaxed">最低契約期間は利用開始日から6ヶ月間です。期間中の解約はできません。満了後は1ヶ月単位の自動更新となります。</p>

      <h3 className="font-bold text-slate-800">3. 解約通知期間</h3>
      <p className="leading-relaxed">解約希望月の前月末日までに申請してください。期日を過ぎた場合は翌月末日での解約となります。</p>

      <h3 className="font-bold text-slate-800">4. 解約時のデータ取扱い</h3>
      <p className="leading-relaxed">解約日から30日間データを保持します。期間終了後、すべてのデータを完全に削除します。データエクスポートは解約前に管理画面またはサポート窓口にてお申し付けください。</p>

      <h3 className="font-bold text-slate-800">5. 返金ポリシー</h3>
      <p className="leading-relaxed">月途中の解約でも日割り返金は行いません。初期費用はサービス提供開始後の返金はいたしかねます。</p>

      <h3 className="font-bold text-slate-800">6. プラン変更・ダウングレード</h3>
      <p className="leading-relaxed">プラン変更は翌月1日から適用されます。差額の日割り精算・差額返金は行いません。</p>

      <h3 className="font-bold text-slate-800">7. アカウント一時停止</h3>
      <p className="leading-relaxed">最大3ヶ月間の一時停止が可能です。停止中は月額の50%でデータを維持し、全機能が停止されます。</p>

      <h3 className="font-bold text-slate-800">8. お問い合わせ窓口</h3>
      <p className="leading-relaxed">Lオペ for CLINIC サポート窓口 — 受付時間：平日 10:00〜18:00</p>

      <p className="mt-4 text-right text-xs text-slate-400">2026年3月10日 制定</p>
    </div>
  );
}
