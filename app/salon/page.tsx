import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Problems from "./components/Problems";

/* ATF（Above The Fold）以外は遅延読み込みで初期JS削減 */
const Features = dynamic(() => import("./components/Features"));
const Strengths = dynamic(() => import("./components/Strengths"));
const MidCTA = dynamic(() => import("./components/MidCTA").then((m) => ({ default: m.MidCTA })));
const MobileCTA = dynamic(() => import("./components/MobileCTA").then((m) => ({ default: m.MobileCTA })));
const UseCases = dynamic(() => import("./components/UseCases"));
const Flow = dynamic(() => import("./components/Flow").then((m) => ({ default: m.Flow })));
const Pricing = dynamic(() => import("./components/Pricing").then((m) => ({ default: m.Pricing })));
const FAQ = dynamic(() => import("./components/FAQ").then((m) => ({ default: m.FAQ })));
const FinalCTA = dynamic(() => import("./components/FinalCTA").then((m) => ({ default: m.FinalCTA })));
const Footer = dynamic(() => import("./components/Footer").then((m) => ({ default: m.Footer })));

export const metadata: Metadata = {
  alternates: {
    canonical: "https://l-ope.jp/salon",
  },
};

export default function SalonLPPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-800" style={{ fontFeatureSettings: "'palt'" }}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-lg focus:bg-pink-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg">メインコンテンツへスキップ</a>
      <Nav />
      <main id="main-content">
        {/* パンくずリスト */}
        <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-5 pt-[90px] md:pt-[72px] pb-0">
          <ol className="flex items-center gap-1.5 text-[11px] text-slate-400 list-none m-0 p-0">
            <li><a href="https://l-ope.jp" className="hover:text-pink-600 transition">ホーム</a></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-slate-600 font-medium">Lオペ for SALON</li>
          </ol>
        </nav>
        <Hero />
        <Problems />
        <Features />
        <MidCTA title="サロンに必要な機能がオールインワン" sub="予約管理・顧客管理・配信・リッチメニュー・スタンプカード・物販まで。複数ツールの月額を大幅に削減できます。" />
        <Strengths />
        <MidCTA title="まずは無料相談から" sub="サロンの業態・規模に合わせた最適な活用方法をご提案します。お気軽にお問い合わせください。" />
        <UseCases />
        <MidCTA title="あなたのサロンでも成果を出しませんか？" sub="業態別のテンプレートと導入事例をもとに、最適な活用方法をご提案します。" />
        <Flow />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <MobileCTA />
      <Footer />
    </div>
  );
}
