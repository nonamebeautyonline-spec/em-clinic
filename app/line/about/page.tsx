import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "Lオペ for LINEとは？ — LINE公式アカウント運用プラットフォーム",
  description:
    "Lオペ for LINEはLINE公式アカウントの配信・セグメント・リッチメニュー・予約・フォーム・分析をオールインワンで管理できるプラットフォームです。あらゆる業種のLINE運用を効率化します。",
  keywords: "Lオペ for LINE, Lオペ for LINEとは, LINE公式アカウント 運用, LINE配信ツール, セグメント配信, リッチメニュー, LINE CRM, LINE運用 効率化",
  alternates: { canonical: `${SITE_URL}/line/about` },
  openGraph: {
    title: "Lオペ for LINEとは？ — LINE公式アカウント運用プラットフォーム",
    description: "セグメント配信・シナリオ配信・リッチメニュー・予約・フォーム・分析をオールインワンで。あらゆる業種のLINE運用を効率化。",
    url: `${SITE_URL}/line/about`,
    siteName: "Lオペ for LINE",
    locale: "ja_JP",
    type: "website",
  },
};

/* JSON-LD */
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Lオペ for LINEとは？",
    description: "LINE公式アカウント運用プラットフォーム",
    url: `${SITE_URL}/line/about`,
    isPartOf: { "@type": "WebSite", name: "Lオペ for LINE", url: SITE_URL },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Lオペ for LINE", item: `${SITE_URL}/line` },
        { "@type": "ListItem", position: 3, name: "Lオペ for LINEとは？", item: `${SITE_URL}/line/about` },
      ],
    },
  },
];

/* ミッション */
const missions = [
  { title: "シンプルさ", desc: "LINE運用に必要な機能をひとつの管理画面に集約。複数ツールの使い分けによる煩雑さを解消します。" },
  { title: "低コスト", desc: "フリープランから始められ、ビジネスの成長に合わせてスケールアップ。複数SaaSの費用を大幅に削減。" },
  { title: "全業種対応", desc: "飲食・美容・EC・不動産・教育・士業など、あらゆる業種のLINE運用をテンプレートとサポートで支援。" },
];

/* 主要機能 */
const coreFeatures = [
  "セグメント配信", "シナリオ配信", "リッチメニュー管理",
  "予約管理", "フォーム作成", "分析ダッシュボード",
  "チャットボット", "A/Bテスト", "API連携",
];

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-white text-slate-800" style={{ fontFeatureSettings: "'palt'" }}>
        {/* ヘッダー */}
        <header className="border-b border-slate-100/60 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex h-[60px] max-w-6xl items-center px-5">
            <Link href="/line" className="flex items-center gap-2.5">
              <Image src="/icon.png" alt="Lオペ for LINE" width={36} height={36} className="rounded-lg object-contain" />
              <span className="text-[15px] font-bold tracking-tight">Lオペ for LINE</span>
            </Link>
          </div>
        </header>

        {/* パンくず */}
        <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-5 pt-6 pb-0">
          <ol className="flex items-center gap-1.5 text-[11px] text-slate-400 list-none m-0 p-0">
            <li><Link href="/line" className="hover:text-emerald-600 transition">Lオペ for LINE</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-slate-600 font-medium">Lオペ for LINEとは</li>
          </ol>
        </nav>

        <main className="mx-auto max-w-4xl px-5 py-12 md:py-16">
          {/* ヒーロー */}
          <div className="mb-16 text-center">
            <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              LINE公式アカウント運用を、<br /><span className="bg-gradient-to-r from-[#06C755] to-emerald-500 bg-clip-text text-transparent">もっとシンプルに。</span>
            </h1>
            <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-slate-500">
              Lオペ for LINEは、LINE公式アカウントの配信・セグメント・リッチメニュー・予約・フォーム・分析をオールインワンで管理できるプラットフォームです。
            </p>
          </div>

          {/* ミッション */}
          <section className="mb-16">
            <h2 className="mb-8 text-center text-xl font-extrabold text-slate-900">Lオペ for LINEが大切にしていること</h2>
            <div className="grid gap-5 md:grid-cols-3">
              {missions.map((m) => (
                <div key={m.title} className="rounded-2xl border border-slate-100 bg-white p-6">
                  <h3 className="mb-2 text-[15px] font-bold text-[#06C755]">{m.title}</h3>
                  <p className="text-[13px] leading-relaxed text-slate-500">{m.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 主要機能 */}
          <section className="mb-16">
            <h2 className="mb-8 text-center text-xl font-extrabold text-slate-900">主要機能</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {coreFeatures.map((f) => (
                <span key={f} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] font-semibold text-emerald-700">{f}</span>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href="/line/features" className="text-[13px] font-semibold text-[#06C755] hover:underline">全機能一覧を見る →</Link>
            </div>
          </section>

          {/* 運営会社 */}
          <section className="mb-16">
            <h2 className="mb-8 text-center text-xl font-extrabold text-slate-900">運営会社</h2>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
              <table className="w-full text-[13px]">
                <tbody className="divide-y divide-slate-200">
                  <tr><td className="py-3 pr-4 font-semibold text-slate-700 w-32">会社名</td><td className="py-3 text-slate-500">株式会社ORDIX</td></tr>
                  <tr><td className="py-3 pr-4 font-semibold text-slate-700">URL</td><td className="py-3 text-slate-500"><a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="text-[#06C755] hover:underline">https://ordix.co.jp</a></td></tr>
                  <tr><td className="py-3 pr-4 font-semibold text-slate-700">メール</td><td className="py-3 text-slate-500">info@l-ope.jp</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* CTA */}
          <div className="text-center">
            <Link href="/line/contact" className="inline-block rounded-xl bg-gradient-to-r from-[#06C755] to-emerald-500 px-10 py-4 text-[13px] font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-xl">
              お問い合わせ・無料で始める
            </Link>
          </div>
        </main>

        {/* フッター */}
        <footer className="border-t border-slate-100 bg-slate-50 px-5 py-8 text-center text-[11px] text-slate-400">
          <p>運営: <a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">株式会社ORDIX</a></p>
          <p className="mt-1">&copy; 2026 株式会社ORDIX. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}
