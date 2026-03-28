"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const TIMING_OPTIONS = [
  "すぐにでも",
  "1ヶ月以内",
  "3ヶ月以内",
  "半年以内",
  "時期未定・情報収集中",
];

export default function ContactPage() {
  return (
    <Suspense>
      <ContactForm />
    </Suspense>
  );
}

function ContactForm() {
  const searchParams = useSearchParams();
  const refPage = searchParams.get("ref") || "";
  const utmSource = searchParams.get("utm_source") || "";
  const utmMedium = searchParams.get("utm_medium") || "";
  const utmCampaign = searchParams.get("utm_campaign") || "";

  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    service_name: "",
    implementation_timing: "",
    has_existing_line: false,
    existing_line_detail: "",
    message: "",
    email: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, value: string | boolean) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          referrer_page: refPage,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
      } else {
        setError(data.message || "送信に失敗しました。時間を置いて再度お試しください。");
      }
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  };

  // 送信完了画面
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50">
        <header className="border-b border-slate-100/60 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex h-[60px] max-w-6xl items-center px-5">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/icon.png" alt="Lオペ" width={36} height={36} className="rounded-lg object-contain" />
              <span className="text-[15px] font-bold tracking-tight">Lオペ <span className="text-blue-600">for CLINIC</span></span>
            </Link>
          </div>
        </header>
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mb-4 text-2xl font-bold text-slate-900">お問い合わせを受け付けました</h1>
          <p className="mb-8 text-slate-500">2営業日以内に担当者よりご連絡いたします。</p>
          <Link href="/" className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:shadow-xl">
            トップページに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50">
      {/* ヘッダー */}
      <header className="border-b border-slate-100/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-6xl items-center px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/icon.png" alt="Lオペ" width={36} height={36} className="rounded-lg object-contain" />
            <span className="text-[15px] font-bold tracking-tight">Lオペ <span className="text-blue-600">for CLINIC</span></span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-12 md:py-16">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-2xl font-extrabold text-slate-900 md:text-3xl">お問い合わせ</h1>
          <p className="text-sm text-slate-500">資料請求・ご質問など、お気軽にお問い合わせください。<br />2営業日以内に担当者よりご連絡いたします。</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          {/* 組織区分 */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              会社名 / 医院名
              <span className="ml-2 text-xs font-normal text-slate-400">個人の方は空欄で構いません</span>
            </label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              placeholder="例: 株式会社ORDIX / ○○クリニック"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          {/* 担当者名 */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              お名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.contact_name}
              onChange={(e) => set("contact_name", e.target.value)}
              placeholder="例: 山田 太郎"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          {/* サービス名 */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              サービス名
              <span className="ml-2 text-xs font-normal text-slate-400">ご利用中のサービスがあれば</span>
            </label>
            <input
              type="text"
              value={form.service_name}
              onChange={(e) => set("service_name", e.target.value)}
              placeholder="例: LINE公式アカウント / Lステップ"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          {/* 導入希望時期 */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">導入希望時期</label>
            <select
              value={form.implementation_timing}
              onChange={(e) => set("implementation_timing", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            >
              <option value="">選択してください</option>
              {TIMING_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* 既存LINEシステム */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">既存のLINE公式アカウント・連携システムはありますか？</label>
            <div className="mt-2 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg py-2 px-3 text-sm text-slate-600 transition hover:bg-slate-50">
                <input
                  type="radio"
                  name="has_existing_line"
                  checked={form.has_existing_line === true}
                  onChange={() => set("has_existing_line", true)}
                  className="accent-blue-600"
                />
                あり
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg py-2 px-3 text-sm text-slate-600 transition hover:bg-slate-50">
                <input
                  type="radio"
                  name="has_existing_line"
                  checked={form.has_existing_line === false}
                  onChange={() => set("has_existing_line", false)}
                  className="accent-blue-600"
                />
                なし
              </label>
            </div>
            {form.has_existing_line && (
              <input
                type="text"
                value={form.existing_line_detail}
                onChange={(e) => set("existing_line_detail", e.target.value)}
                placeholder="例: LINE公式アカウント運用中 / Lステップ利用中"
                className="mt-3 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
            )}
          </div>

          {/* 自由記述欄 */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">お問い合わせ内容</label>
            <textarea
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              rows={5}
              placeholder="ご質問やご要望など、ご自由にご記入ください"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none resize-y"
            />
          </div>

          {/* メールアドレス */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="example@clinic.jp"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          {/* 電話番号 */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">電話番号</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="例: 03-1234-5678"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl disabled:opacity-50"
          >
            {submitting ? "送信中..." : "お問い合わせを送信する"}
          </button>

          <p className="text-center text-[11px] text-slate-400">
            送信いただいた情報は<Link href="/lp/privacy" className="underline hover:text-slate-600">プライバシーポリシー</Link>に基づき適切に管理いたします。
          </p>
        </form>

        {/* FAQ セクション */}
        <div className="mt-12">
          <h2 className="mb-6 text-center text-xl font-bold text-slate-900">よくある質問</h2>
          <div className="space-y-3">
            {[
              { q: "資料請求後、すぐに営業の連絡が来ますか？", a: "いいえ、まず資料をお送りし、ご希望の場合のみオンラインデモをご案内します。" },
              { q: "費用は発生しますか？", a: "資料請求・ご相談は完全無料です。" },
              { q: "どのような資料がもらえますか？", a: "機能概要・導入事例・料金プランをまとめた資料をお送りします。" },
            ].map((item) => (
              <details key={item.q} className="group rounded-xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-[15px] font-semibold text-slate-800 select-none">
                  {item.q}
                  <span className="shrink-0 text-slate-400 transition group-open:rotate-180">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
                  </span>
                </summary>
                <div className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
