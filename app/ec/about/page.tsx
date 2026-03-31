import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "Lオペ for ECとは？ — EC・小売向けLINE運用プラットフォーム",
  description:
    "Lオペ for ECはEC・小売・D2CブランドのLINE公式アカウント運用を効率化するプラットフォームです。カゴ落ち対策・発送通知・CRM・セグメント配信・クーポン管理をオールインワンで提供。",
  keywords: "Lオペ for EC, Lオペ for ECとは, EC LINE運用, ECサイト LINE連携, カゴ落ち対策 LINE, 発送通知 LINE, EC CRM",
  alternates: { canonical: `${SITE_URL}/ec/about` },
  openGraph: {
    title: "Lオペ for ECとは？ — EC・小売向けLINE運用プラットフォーム",
    description: "カゴ落ち対策・発送通知・CRM・セグメント配信・クーポン管理をオールインワンで。EC特化のLINE運用プラットフォーム。",
    url: `${SITE_URL}/ec/about`,
    siteName: "Lオペ for EC",
    locale: "ja_JP",
    type: "website",
  },
};

/* JSON-LD */
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Lオペ for ECとは？",
    description: "EC・小売向けLINE運用プラットフォーム",
    url: `${SITE_URL}/ec/about`,
    isPartOf: { "@type": "WebSite", name: "Lオペ for EC", url: SITE_URL },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Lオペ for EC", item: `${SITE_URL}/ec` },
        { "@type": "ListItem", position: 3, name: "Lオペ for ECとは？", item: `${SITE_URL}/ec/about` },
      ],
    },
  },
];

/* ミッション */
const missions = [
  { title: "EC特化", desc: "購買データ・配送ステータス・在庫情報とLINEを自動連携。ECに特化した機能設計で、汎用ツールでは実現できない高精度なマーケティングを支援。" },
  { title: "売上直結", desc: "カゴ落ち回収・リピート促進・セグメント配信など、売上に直結する施策をワンストップで実行。ROIが見える運用を実現。" },
  { title: "かんたん導入", desc: "主要ECカートとのワンクリック連携で、技術的な設定不要。業態別テンプレートですぐに運用開始できます。" },
];

/* 主要機能 */
const coreFeatures = [
  "カゴ落ち対策", "発送通知", "顧客CRM", "セグメント配信",
  "クーポン管理", "リッチメニュー", "分析ダッシュボード",
  "A/Bテスト", "Stripe連携", "API連携",
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
        <header className="border-b border-stone-100/60 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex h-[60px] max-w-6xl items-center px-5">
            <Link href="/ec" className="flex items-center gap-2.5">
              <Image src="/icon.png" alt="Lオペ for EC" width={36} height={36} className="rounded-lg object-contain" />
              <span className="text-[15px] font-bold tracking-tight">Lオペ <span className="text-[11px] font-semibold text-stone-500">for EC</span></span>
            </Link>
          </div>
        </header>

        {/* パンくず */}
        <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-5 pt-6 pb-0">
          <ol className="flex items-center gap-1.5 text-[11px] text-slate-400 list-none m-0 p-0">
            <li><Link href="/ec" className="hover:text-amber-700 transition">Lオペ for EC</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-slate-600 font-medium">Lオペ for ECとは</li>
          </ol>
        </nav>

        <main className="mx-auto max-w-4xl px-5 py-12 md:py-16">
          {/* ヒーロー */}
          <div className="mb-16 text-center">
            <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              ECのLINE運用を、<br /><span className="bg-gradient-to-r from-[#8B7355] to-[#B8A080] bg-clip-text text-transparent">売上に直結させる。</span>
            </h1>
            <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-slate-500">
              Lオペ for ECは、ECサイト・小売・D2CブランドのLINE公式アカウント運用を効率化するプラットフォームです。カゴ落ち対策から発送通知、CRM、セグメント配信まで、売上拡大に必要な機能をオールインワンで提供します。
            </p>
          </div>

          {/* ミッション */}
          <section className="mb-16">
            <h2 className="mb-8 text-center text-xl font-extrabold text-slate-900">Lオペ for ECが大切にしていること</h2>
            <div className="grid gap-5 md:grid-cols-3">
              {missions.map((m) => (
                <div key={m.title} className="rounded-2xl border border-stone-100 bg-white p-6">
                  <h3 className="mb-2 text-[15px] font-bold text-amber-700">{m.title}</h3>
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
                <span key={f} className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[13px] font-semibold text-amber-800">{f}</span>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href="/ec/features" className="text-[13px] font-semibold text-amber-700 hover:underline">全機能一覧を見る →</Link>
            </div>
          </section>

          {/* 運営会社 */}
          <section className="mb-16">
            <h2 className="mb-8 text-center text-xl font-extrabold text-slate-900">運営会社</h2>
            <div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-6">
              <table className="w-full text-[13px]">
                <tbody className="divide-y divide-stone-200">
                  <tr><td className="py-3 pr-4 font-semibold text-slate-700 w-32">会社名</td><td className="py-3 text-slate-500">株式会社ORDIX</td></tr>
                  <tr><td className="py-3 pr-4 font-semibold text-slate-700">URL</td><td className="py-3 text-slate-500"><a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:underline">https://ordix.co.jp</a></td></tr>
                  <tr><td className="py-3 pr-4 font-semibold text-slate-700">メール</td><td className="py-3 text-slate-500">info@l-ope.jp</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* CTA */}
          <div className="text-center">
            <Link href="/ec/contact" className="inline-block rounded-xl bg-gradient-to-r from-stone-700 to-amber-700 px-10 py-4 text-[13px] font-bold text-white shadow-lg shadow-stone-500/20 transition hover:shadow-xl">
              お問い合わせ・無料トライアル
            </Link>
          </div>
        </main>

        {/* フッター */}
        <footer className="border-t border-stone-100 bg-stone-50 px-5 py-8 text-center text-[11px] text-slate-400">
          <p>運営: <a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">株式会社ORDIX</a></p>
          <p className="mt-1">&copy; 2026 株式会社ORDIX. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}
