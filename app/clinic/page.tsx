import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Problems from "./components/Problems";
import About from "./components/About";

/* ATF（Above The Fold）以外は遅延読み込みで初期JS削減 */
const Features = dynamic(() => import("./components/Features"));
const Strengths = dynamic(() => import("./components/Strengths"));
const MidCTA = dynamic(() => import("./components/MidCTA").then((m) => ({ default: m.MidCTA })));
const MobileCTA = dynamic(() => import("./components/MobileCTA").then((m) => ({ default: m.MobileCTA })));
const UseCases = dynamic(() => import("./components/UseCases"));
const Flow = dynamic(() => import("./components/Flow").then((m) => ({ default: m.Flow })));
const Pricing = dynamic(() => import("./components/Pricing").then((m) => ({ default: m.Pricing })));
const ColumnPickup = dynamic(() => import("./components/ColumnPickup"));
const FAQ = dynamic(() => import("./components/FAQ").then((m) => ({ default: m.FAQ })));
const FinalCTA = dynamic(() => import("./components/FinalCTA").then((m) => ({ default: m.FinalCTA })));
const Footer = dynamic(() => import("./components/Footer").then((m) => ({ default: m.Footer })));

export const metadata: Metadata = {
  alternates: {
    canonical: "https://l-ope.jp/clinic",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

/* FAQPage JSON-LD — サーバーサイドで確実にレンダリング */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { q: "保険診療のクリニックでも使えますか？", a: "はい。自由診療・保険診療を問わずご利用いただけます。予約管理・患者CRM・リマインド配信など、診療形態に関わらず活用できます。" },
    { q: "院長と事務スタッフ1人だけで運用できますか？", a: "はい。Lオペはカルテ・予約・LINE配信・CRM・決済・配送まで1つの管理画面に集約されており、事務スタッフ1人で全業務を回せる設計です。" },
    { q: "既存の予約システムや電子カルテとの連携は可能ですか？", a: "連携の可否はシステムによります。EHR連携機能でCSV/APIによる双方向同期に対応しており、貴院の既存システムに合わせた連携方法をご提案します。" },
    { q: "Lステップなどの汎用LINE配信ツールとの違いは何ですか？", a: "Lステップ・Liny等の汎用ツールは飲食・EC向けに設計されており、医療特有の導線に対応していません。Lオペ for CLINICは患者CRM・カルテ管理・配送追跡・決済管理までクリニック業務フローに完全特化しています。" },
    { q: "オンライン診療にも対応していますか？", a: "はい。LINEビデオ通話・電話音声通話によるオンライン診療に対応しています。予約・問診・診察・処方・決済・配送までLINE公式アカウント上で完結できます。" },
    { q: "導入にどのくらいの期間がかかりますか？", a: "最短2週間で導入可能です。LINE連携・リッチメニュー構築・問診フォーム作成・患者データ移行はサポートチームが代行します。" },
    { q: "複数のツールをLオペに一本化するとどのくらいコスト削減できますか？", a: "カルテ＋予約＋LINE配信を個別導入すると月額15〜30万＋管理人件費がかかります。Lオペならオールインワンで大幅に削減できます。" },
  ].map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function LPPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-800" style={{ fontFeatureSettings: "'palt'" }}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg">メインコンテンツへスキップ</a>
      <Nav />
      {/* FAQ JSON-LD — サーバーサイドで確実にレンダリング（Googlebotが確実に取得） */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <main id="main-content">
        {/* パンくずリスト（視覚表示） */}
        <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-5 pt-[90px] md:pt-[72px] pb-0">
          <ol className="flex items-center gap-1.5 text-[11px] text-slate-400 list-none m-0 p-0">
            <li><a href="https://l-ope.jp" className="hover:text-blue-600 transition">ホーム</a></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-slate-600 font-medium">Lオペ for CLINIC</li>
          </ol>
        </nav>
        <Hero />
        <Problems />
        <About />
        <Features />
        <MidCTA title="これだけの機能をオールインワンで" sub="予約・問診・LINE配信・決済・配送管理まで、すべて込み。複数ツールの月額を大幅に削減できます。" />
        <Strengths />
        <MidCTA title="まずは無料で資料請求" sub="貴院の課題に合わせたデモのご案内も可能です。お気軽にお問い合わせください。" />
        <UseCases />
        <MidCTA title="貴院でも同じ効果を実現しませんか？" sub="導入クリニックの業務効率化事例をもとに、最適なプランをご提案します。" />
        <Flow />
        <Pricing />
        <ColumnPickup />
        <FAQ />
        <FinalCTA />
      </main>
      <MobileCTA />
      <Footer />
    </div>
  );
}
