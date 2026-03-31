import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "Lオペ for SALONとは？ — サロン特化LINE運用プラットフォーム",
  description:
    "Lオペ for SALONは美容室・ネイル・エステ等のサロン向けに、予約管理・顧客管理・セグメント配信・リッチメニュー・スタンプカード・物販をオールインワンで提供するLINE運用プラットフォームです。",
  keywords: "Lオペ for SALON, Lオペ サロンとは, サロン LINE運用, サロン LINE管理, 美容室 LINE, ネイルサロン LINE, エステ LINE",
  alternates: { canonical: `${SITE_URL}/salon/about` },
  openGraph: {
    title: "Lオペ for SALONとは？ — サロン特化LINE運用プラットフォーム",
    description: "予約管理・顧客管理・配信・スタンプカード・物販をオールインワンで。サロンのLINE運用を効率化。",
    url: `${SITE_URL}/salon/about`,
    siteName: "Lオペ for SALON",
    locale: "ja_JP",
    type: "website",
  },
};

/* JSON-LD */
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Lオペ for SALONとは？",
    description: "サロン特化LINE運用プラットフォーム",
    url: `${SITE_URL}/salon/about`,
    isPartOf: { "@type": "WebSite", name: "Lオペ for SALON", url: SITE_URL },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Lオペ for SALON", item: `${SITE_URL}/salon` },
        { "@type": "ListItem", position: 3, name: "Lオペ for SALONとは？", item: `${SITE_URL}/salon/about` },
      ],
    },
  },
];

/* ミッション */
const missions = [
  { title: "サロン特化", desc: "予約管理・スタンプカード・来店履歴など、汎用ツールにはないサロン専用の機能を標準搭載。業態ごとのテンプレートも充実。" },
  { title: "リピート率改善", desc: "来店データに基づくセグメント配信とデジタルスタンプカードで、リピート率を平均20%改善。休眠顧客の掘り起こしも自動化。" },
  { title: "かんたん導入", desc: "初期設定はサポートチームが代行。スマホ対応の管理画面でITが苦手なスタッフでも即戦力。最短3日で運用開始。" },
];

/* 主要機能 */
const coreFeatures = [
  "予約管理", "ホットペッパー連携", "顧客管理・来店履歴",
  "セグメント配信", "リッチメニュー管理", "スタンプカード・ポイント",
  "物販・EC機能", "配信分析", "発送管理",
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
            <Link href="/salon" className="flex items-center gap-2.5">
              <Image src="/icon.png" alt="Lオペ for SALON" width={36} height={36} className="rounded-lg object-contain" />
              <span className="text-[15px] font-bold tracking-tight">Lオペ <span className="text-pink-500">for SALON</span></span>
            </Link>
          </div>
        </header>

        {/* パンくず */}
        <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-5 pt-6 pb-0">
          <ol className="flex items-center gap-1.5 text-[11px] text-slate-400 list-none m-0 p-0">
            <li><Link href="/salon" className="hover:text-pink-600 transition">Lオペ for SALON</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-slate-600 font-medium">Lオペ for SALONとは</li>
          </ol>
        </nav>

        <main className="mx-auto max-w-4xl px-5 py-12 md:py-16">
          {/* ヒーロー */}
          <div className="mb-16 text-center">
            <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              サロンのLINE運用を、<br /><span className="bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">ひとつに。</span>
            </h1>
            <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-slate-500">
              Lオペ for SALONは、美容室・ネイル・エステ等のサロン向けに予約管理・顧客管理・セグメント配信・スタンプカード・物販をオールインワンで提供するLINE運用プラットフォームです。
            </p>
          </div>

          {/* ミッション */}
          <section className="mb-16">
            <h2 className="mb-8 text-center text-xl font-extrabold text-slate-900">Lオペ for SALONが大切にしていること</h2>
            <div className="grid gap-5 md:grid-cols-3">
              {missions.map((m) => (
                <div key={m.title} className="rounded-2xl border border-slate-100 bg-white p-6">
                  <h3 className="mb-2 text-[15px] font-bold text-pink-600">{m.title}</h3>
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
                <span key={f} className="rounded-full border border-pink-200 bg-pink-50 px-4 py-2 text-[13px] font-semibold text-pink-700">{f}</span>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href="/salon/features" className="text-[13px] font-semibold text-pink-600 hover:underline">全機能一覧を見る →</Link>
            </div>
          </section>

          {/* 運営会社 */}
          <section className="mb-16">
            <h2 className="mb-8 text-center text-xl font-extrabold text-slate-900">運営会社</h2>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
              <table className="w-full text-[13px]">
                <tbody className="divide-y divide-slate-200">
                  <tr><td className="py-3 pr-4 font-semibold text-slate-700 w-32">会社名</td><td className="py-3 text-slate-500">株式会社ORDIX</td></tr>
                  <tr><td className="py-3 pr-4 font-semibold text-slate-700">URL</td><td className="py-3 text-slate-500"><a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline">https://ordix.co.jp</a></td></tr>
                  <tr><td className="py-3 pr-4 font-semibold text-slate-700">メール</td><td className="py-3 text-slate-500">info@l-ope.jp</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* CTA */}
          <div className="text-center">
            <Link href="/salon/contact" className="inline-block rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 px-10 py-4 text-[13px] font-bold text-white shadow-lg shadow-pink-500/20 transition hover:shadow-xl">
              お問い合わせ・無料で相談する
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
